"use client";

import Button from "@/app/components/common/Button";
import { showToast } from "@/app/components/common/Toast";
import {
  ConsumableProductSchema,
  CosmeticProductSchema,
  DrugProductSchema,
  FoodInfantProductSchema,
  NonConsumableProductSchema,
  SupplementProductSchema,
} from "@/app/schema/ProductSchemas";
import type { z } from "zod";
import { usePurchaseSmallestUnits } from "@/hooks/usePurchaseSmallestUnits";
import { ProductService } from "@/services/ProductService";
import type {
  ProductBatchDetails,
  ProductDetails as ProductDetailsData,
  ProductPackageDetails,
  PurchaseSmallestUnit,
} from "@/types/ProductData";
import { packageSmallestUnitName } from "@/types/ProductData";
import { handleApiError } from "@/utils/errorHandler";
import {
  buildVariantUpdatePayload,
  type VariantFormSnapshot,
} from "@/utils/productUpdatePayload";
import axios from "axios";
import Image from "next/image";
import { useRef, useState } from "react";
import BatchDetails, { BatchDetailsRef } from "./BatchDetails";
import PackagingDetails, { PackagingDetailsRef, PackagingUnits } from "./PackagingDetails";
import ProductDetails from "./ProductDetails";
import type { ProductDetailsRef } from "./categories/DrugProductDetails";
import { PRODUCT_CATEGORIES } from "./productCategories";

/**
 * Masters → Products: edits one variant (package) of a product, laid out the
 * same way as the purchase flow's Add Item wizard and built from the same
 * three step forms — Product Details, Packaging & Order Details, and Batch &
 * Stock Details (one batch form per batch the variant holds). Saved in a
 * single PUT /product/{productId}/edit (needs PRODUCTS / PRODUCTS / EDIT).
 */

interface EditProductViewProps {
  details: ProductDetailsData;
  packagingId: string;
  /** From the stock summary — the details API does not carry it. */
  manufacturerName?: string | null;
  onCancel: () => void;
  onSaved: () => void;
}

const TABS = ["Product Details", "Packaging & Order Details", "Batch & Stock Details"] as const;
type Tab = (typeof TABS)[number];

const str = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

/* ----------------------------- what may change ---------------------------- */
// Product: name, brand, manufacturer, HSN and every optional field stay
// editable; the category's other required fields (and GST) are read-only.
// Packaging: fully editable. Batch: only manufacturing date, expiry and MRP.

const PRODUCT_LOCKED_FIELDS: Record<number, string[]> = {
  1: ["gst"],
  2: ["dosageForm", "strength", "netQuantity", "netQuantityUnit", "ageGroup", "gender", "gst"],
  3: ["productCategory", "ageGroup", "netQuantity", "netQuantityUnit", "gst"],
  4: ["productType", "ageGroup", "gender", "netQuantity", "netQuantityUnit", "gst"],
  5: ["deviceCategory", "sterile", "disposable", "isIsoCertified", "gst"],
  6: ["deviceCategory", "deviceClassification", "warrantyPeriod", "amcServiceAvailability", "gst"],
};

const BATCH_LOCKED_FIELDS = ["batchNumber", "purchasePricePerBox", "rackLocation", "minimumStockLevel"];

const PRODUCT_SCHEMAS: Record<number, z.ZodObject> = {
  1: DrugProductSchema,
  2: SupplementProductSchema,
  3: FoodInfantProductSchema,
  4: CosmeticProductSchema,
  5: ConsumableProductSchema,
  6: NonConsumableProductSchema,
};

/** Form values are strings or string lists; compare them as such. */
const formValue = (value: unknown): string =>
  Array.isArray(value) ? JSON.stringify(value) : str(value);

/* ------------------------- API → step form state ------------------------- */

/**
 * Only the fields the details API returns. Category attributes (molecules,
 * net quantity, …) are not part of that response, so their fields open blank;
 * since both sides of the diff carry them blank, nothing is sent for them
 * unless the user fills one in.
 */
const toProductForm = (details: ProductDetailsData, manufacturerName?: string | null) => ({
  productName: str(details.productName),
  brandName: str(details.brandName),
  gst: str(details.gstPercentage),
  hsnCode: str(details.hsnNo),
  manufacturerName: str(manufacturerName),
});

const toPackagingForm = (pkg: ProductPackageDetails, units: PurchaseSmallestUnit[]) => {
  const smallestUnit = packageSmallestUnitName(pkg, units);
  const pairId =
    pkg.purchaseSmallestUnitId ??
    units.find(
      (u) => u.purchaseUnitName === pkg.purchaseUnit && u.purchaseSmallestUnitName === smallestUnit
    )?.purchaseSmallestUnitId;
  return {
    purchaseUnit: str(pkg.purchaseUnit),
    eachStripContains: str(pkg.purchaseUnitContains),
    smallestUnit,
    purchaseSmallestUnitId: str(pairId),
  };
};

const toBatchForm = (batch: ProductBatchDetails) => ({
  batchId: batch.batchId,
  batchNumber: str(batch.batchNumber),
  manufacturingDate: str(batch.manufacturingDate),
  expiryDate: str(batch.expiryDate),
  purchaseUnit: str(batch.purchaseUnit),
  purchasePricePerBox: str(batch.purchasePrice),
  mrpPerBox: str(batch.mrp),
  sellingPricePerBox: str(batch.sellingPrice),
  purchasePricePerSmallestUnit: str(batch.purchasePricePerUnit),
  mrpPerSmallestUnit: str(batch.mrpPerUnit),
  sellingPricePerSmallestUnit: str(batch.sellingPricePerUnit),
  rackLocation: str(batch.rackLocation),
  minimumStockLevel: str(batch.minimumStockLevel),
});

/* ----------- what an untouched batch form reports via getFormData ---------- */
// The batch form works at month precision and derives per-unit prices from the
// pack size, so an untouched form does not hand back the raw API values. The
// baseline is put through the same steps, so an untouched batch diffs as
// unchanged and only real edits reach the payload.

const monthOf = (date: string) => /^(\d{4}-\d{2})/.exec(date)?.[1] ?? "";
const firstOfMonth = (date: string) => (monthOf(date) ? `${monthOf(date)}-01` : date);
const lastOfMonth = (date: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return date;
  const lastDay = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  return `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
};
const divideToUnit = (perBox: string, count: number) =>
  perBox.trim() === "" || !Number.isFinite(Number(perBox)) || count <= 0
    ? ""
    : String(Math.round((Number(perBox) / count) * 100) / 100);

const batchBaseline = (
  form: ReturnType<typeof toBatchForm>,
  purchaseUnit: string,
  contains: number
) => ({
  ...form,
  purchaseUnit,
  manufacturingDate: form.manufacturingDate ? firstOfMonth(form.manufacturingDate) : "",
  expiryDate: form.expiryDate ? lastOfMonth(form.expiryDate) : "",
  purchasePricePerSmallestUnit:
    contains > 0 ? divideToUnit(form.purchasePricePerBox, contains) : form.purchasePricePerSmallestUnit,
  mrpPerSmallestUnit: contains > 0 ? divideToUnit(form.mrpPerBox, contains) : form.mrpPerSmallestUnit,
});

/* ---------------------------------- view ---------------------------------- */

const EditProductView = (props: EditProductViewProps) => {
  const { units, isLoading } = usePurchaseSmallestUnits(props.details.productCategoryId);

  // The packaging form reads its pairing id from the unit master on mount, so
  // the step forms wait until it is in.
  if (isLoading) {
    return (
      <div className="flex h-60 w-full items-center justify-center text-label-l4 text-pneutral-500">
        Loading…
      </div>
    );
  }
  return <EditVariantForms {...props} units={units} />;
};

const EditVariantForms = ({
  details,
  packagingId,
  manufacturerName,
  onCancel,
  onSaved,
  units,
}: EditProductViewProps & { units: PurchaseSmallestUnit[] }) => {
  const categoryId = details.productCategoryId;
  // Medical Devices (5) carries its real category in the sub-category.
  const isMedicalDevice = categoryId === 5 || categoryId === 6;
  const selectedCategory = isMedicalDevice ? 5 : categoryId;
  const pkg = details.packages.find((p) => p.packagingId === packagingId);

  // Everything the forms open with, and the baseline they are diffed against.
  // Built once: the forms only read their initial data on mount.
  const [initial] = useState(() => {
    const productData = toProductForm(details, manufacturerName);
    const packagingData = pkg ? toPackagingForm(pkg, units) : undefined;
    const batches = (pkg?.batches ?? []).map(toBatchForm);
    const contains = Number(packagingData?.eachStripContains) || 0;
    const before: VariantFormSnapshot = {
      productData,
      packagingData,
      batches: batches.map((b) => ({
        batchId: b.batchId,
        data: batchBaseline(b, packagingData?.purchaseUnit ?? "", contains),
      })),
    };
    return { productData, packagingData, batches, before };
  });

  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]);
  const [activeBatchId, setActiveBatchId] = useState(initial.batches[0]?.batchId ?? "");
  const [saving, setSaving] = useState(false);
  const [packagingUnits, setPackagingUnits] = useState<PackagingUnits>({
    purchaseUnit: initial.packagingData?.purchaseUnit ?? "",
    smallestUnit: initial.packagingData?.smallestUnit ?? "",
    unitContains: initial.packagingData?.eachStripContains ?? "",
  });

  const productRef = useRef<ProductDetailsRef>(null);
  const packagingRef = useRef<PackagingDetailsRef>(null);
  const batchRefs = useRef<Record<string, BatchDetailsRef | null>>({});

  if (!pkg) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-label-l4 text-danger-600">This variant could not be found.</p>
        <Button variant="outline" onClick={onCancel} className="w-[120px]">
          Back
        </Button>
      </div>
    );
  }

  /**
   * Checked against the category's own schema, but only on fields the user
   * changed — the category forms also require attributes the details API does
   * not return (and that are locked here), so judging every field would refuse
   * any save.
   */
  const productError = (data: Record<string, unknown>): string | null => {
    const schema = PRODUCT_SCHEMAS[categoryId];
    if (!schema) return null;
    const result = schema.safeParse(data);
    if (result.success) return null;
    const before = initial.productData as Record<string, unknown>;
    const issue = result.error.issues.find((i) => {
      const field = String(i.path[0]);
      return formValue(data[field]) !== formValue(before[field]);
    });
    return issue ? issue.message : null;
  };

  /** Runs one step's checks; on failure it is shown with its errors. */
  const validateTab = (tab: Tab): boolean => {
    switch (tab) {
      case "Product Details": {
        const error = productError(productRef.current?.getFormData() ?? {});
        if (error) showToast.error(error);
        return !error;
      }
      case "Packaging & Order Details":
        return packagingRef.current?.validate() ?? false;
      case "Batch & Stock Details":
        for (const b of initial.batches) {
          if (!batchRefs.current[b.batchId]?.validate()) {
            setActiveBatchId(b.batchId);
            if (initial.batches.length > 1) showToast.error(`Please fix batch ${b.batchNumber}.`);
            return false;
          }
        }
        return true;
    }
  };

  const tabIndex = TABS.indexOf(activeTab);

  const handleNext = () => {
    if (!validateTab(activeTab)) return;
    if (tabIndex < TABS.length - 1) setActiveTab(TABS[tabIndex + 1]);
  };

  const handleBack = () => {
    if (tabIndex > 0) setActiveTab(TABS[tabIndex - 1]);
    else onCancel();
  };

  // Every step is already filled in, so moving back is free; moving forward
  // passes through the checks of each step on the way, like the wizard.
  const handleTabClick = (tab: Tab) => {
    const target = TABS.indexOf(tab);
    for (let i = tabIndex; i < target; i++) {
      if (!validateTab(TABS[i])) {
        setActiveTab(TABS[i]);
        return;
      }
    }
    setActiveTab(tab);
  };

  const handleSave = async () => {
    for (const tab of TABS) {
      if (!validateTab(tab)) {
        setActiveTab(tab);
        return;
      }
    }

    const productData = productRef.current?.getFormData();
    const after: VariantFormSnapshot = {
      productData,
      packagingData: packagingRef.current?.getFormData(),
      batches: initial.batches.map((b) => ({
        batchId: b.batchId,
        data: batchRefs.current[b.batchId]?.getFormData(),
      })),
    };

    const { payload, hasChanges } = buildVariantUpdatePayload(
      categoryId,
      packagingId,
      initial.before,
      after
    );
    if (!hasChanges) {
      showToast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      // Same guard as onboarding: a new name / brand / HSN must not collide
      // with another product of this organization.
      const identityChanged = ["productName", "brandName", "hsnNo"].some((k) => k in payload);
      if (identityChanged) {
        const result = await ProductService.checkProductExists(
          str(productData?.productName).trim(),
          str(productData?.brandName).trim() || undefined,
          str(productData?.hsnCode).trim() || undefined
        );
        if (result?.exists) {
          setActiveTab("Product Details");
          showToast.error(
            result.message ||
              "A product with the same name, brand and HSN already exists for this organization"
          );
          return;
        }
      }

      await ProductService.editProductMaster(details.productId, payload);
      showToast.success("Product updated successfully.");
      onSaved();
    } catch (err) {
      // The edit endpoint is permission-gated; the button is hidden without
      // the grant, but a role changed mid-session can still hit this.
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        showToast.error("You don't have permission to edit products.");
        return;
      }
      try {
        handleApiError(err, "Failed to update product.");
      } catch (apiError) {
        showToast.error((apiError as Error).message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-4">
      {/* Top Header */}
      <div className="mb-1 flex w-full flex-col gap-1">
        <h2 className="text-[24px] font-semibold leading-[32px] text-pneutral-900">
          Edit Item Details
        </h2>
        <p className="text-label-l3 text-pneutral-600">
          {details.productName} · {pkg.purchaseUnit} of {pkg.purchaseUnitContains}{" "}
          {packageSmallestUnitName(pkg, units)} · {pkg.packagingId}
        </p>
      </div>

      {/* Product Category — fixed once a product is created. */}
      <div className="flex h-[194px] w-full min-w-0 flex-col gap-[16px] overflow-hidden rounded-xl border-[0.89px] border-pneutral-200 bg-white p-[16px]">
        <div className="flex flex-col gap-1">
          <h3 className="text-[18px] font-semibold leading-[28px] text-[#1E1E1D]">
            Select Product Category
          </h3>
          <p className="text-[16px] font-normal leading-[24px] text-[#1E1E1D]">
            The category is fixed once a product is created, so it can&apos;t be changed here.
          </p>
        </div>
        <div className="flex h-[90px] w-full flex-nowrap gap-[16px] overflow-x-auto pb-2">
          {PRODUCT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                className={`flex h-[74px] shrink-0 items-center gap-[4px] rounded-[20px] border p-[8px] transition-all ${cat.width} ${
                  isSelected
                    ? "border-secondary-700 bg-secondary-50 shadow-[0px_4px_6px_-2px_#00000008,0px_12px_16px_-4px_#00000014]"
                    : "cursor-not-allowed border-[#D5D5D4] bg-white opacity-50"
                }`}
              >
                <Image src={cat.iconPath} alt={cat.label} width={58} height={58} className="shrink-0 object-contain" />
                <span className="whitespace-pre-line text-[14px] font-semibold leading-tight text-gray-800">
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Medical Device Sub-Category */}
      {isMedicalDevice && (
        <div className="flex h-[150px] w-full min-w-0 flex-col gap-[16px] overflow-hidden rounded-xl border-[0.89px] border-pneutral-200 bg-white p-[16px]">
          <h3 className="text-[18px] font-semibold leading-[28px] text-[#1E1E1D]">
            Select Medical Device and Equipment Sub Category
          </h3>
          <div className="flex h-[60px] w-full gap-[16px]">
            {[
              { id: 5, label: "Consumable Medical Devices" },
              { id: 6, label: "Non-Consumable Medical Devices" },
            ].map((sub) => (
              <div
                key={sub.id}
                className={`flex flex-1 items-center justify-center rounded-[12px] border p-[8px] transition-all ${
                  categoryId === sub.id
                    ? "border-secondary-700 bg-secondary-50 shadow-sm"
                    : "cursor-not-allowed border-[#D5D5D4] bg-white opacity-50"
                }`}
              >
                <span className="text-[14px] font-semibold text-gray-800">{sub.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details Tabs */}
      <div className="mt-2 flex h-[46px] w-full max-w-[600px] items-center gap-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`relative h-full px-1 text-[14px] font-medium transition-colors ${
              activeTab === tab
                ? "font-semibold text-secondary-700"
                : "text-pneutral-500 hover:text-pneutral-700"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-md bg-secondary-700" />
            )}
          </button>
        ))}
      </div>

      {/* Every step stays mounted, inactive ones hidden, so refs and entered
          values survive switching tabs and batches. */}
      <div className={activeTab === "Product Details" ? "flex w-full flex-col gap-3" : "hidden"}>
        <p className="rounded-lg border border-pneutral-200 bg-pneutral-50 px-3 py-2 text-p3 text-pneutral-700">
          Product details apply to the whole product, across all its variants. Name,
          brand, manufacturer, HSN and optional fields can be changed; the rest are
          read-only. Category details (such as molecules) aren&apos;t loaded for existing
          products yet. Leave them blank to keep what is saved.
        </p>
        <ProductDetails
          ref={productRef}
          categoryId={categoryId}
          initialData={initial.productData}
          lockedFields={PRODUCT_LOCKED_FIELDS[categoryId]}
        />
      </div>

      <div className={activeTab === "Packaging & Order Details" ? "block w-full" : "hidden"}>
        <PackagingDetails
          ref={packagingRef}
          categoryId={categoryId}
          initialData={initial.packagingData}
          onUnitsChange={setPackagingUnits}
        />
      </div>

      <div className={activeTab === "Batch & Stock Details" ? "flex w-full flex-col gap-3" : "hidden"}>
        {initial.batches.length === 0 ? (
          <p className="py-10 text-center text-label-l4 text-pneutral-500">
            This variant has no batches.
          </p>
        ) : (
          <>
            {/* One form per batch of the variant; pick which one to edit. */}
            {initial.batches.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-l3 font-medium text-pneutral-700">
                  Batches ({initial.batches.length}):
                </span>
                {initial.batches.map((b) => (
                  <button
                    key={b.batchId}
                    type="button"
                    onClick={() => setActiveBatchId(b.batchId)}
                    className={`rounded-full border px-3 py-1.5 text-label-l3 font-medium transition-colors ${
                      activeBatchId === b.batchId
                        ? "border-secondary-700 bg-secondary-50 text-secondary-700"
                        : "border-pneutral-200 bg-white text-pneutral-700 hover:border-pneutral-400"
                    }`}
                  >
                    {b.batchNumber || b.batchId}
                  </button>
                ))}
              </div>
            )}
            {initial.batches.map((b) => (
              <div key={b.batchId} className={activeBatchId === b.batchId ? "block" : "hidden"}>
                <BatchDetails
                  ref={(el) => {
                    batchRefs.current[b.batchId] = el;
                  }}
                  {...packagingUnits}
                  productId={details.productId}
                  packagingId={packagingId}
                  initialData={b}
                  editExisting
                  lockedFields={BATCH_LOCKED_FIELDS}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Navigation Buttons — same layout as the purchase wizard. */}
      <div className="mt-4 flex w-full items-center justify-between border-t border-gray-100 pb-8 pt-4">
        <Button variant="outline" onClick={handleBack} disabled={saving} className="w-[120px]">
          Back
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="w-[120px]">
            Cancel
          </Button>
          {tabIndex === TABS.length - 1 ? (
            <Button variant="primary" onClick={handleSave} disabled={saving} className="w-[150px]">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} className="w-[120px]">
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProductView;
