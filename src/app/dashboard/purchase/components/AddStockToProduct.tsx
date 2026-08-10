"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import Button from "@/app/components/common/Button";
import PackagingDetails, {
  PackagingDetailsRef,
  PackagingUnits,
} from "@/app/dashboard/products/component/PackagingDetails";
import BatchDetails, {
  BatchDetailsRef,
} from "@/app/dashboard/products/component/BatchDetails";
import { addProductBatches, addProductPackage, getProductDetails } from "@/services/InventoryService";
import {
  packageSmallestUnitName,
  type NewBatchPayload,
  type ProductBatchDetails,
  type ProductDetails,
} from "@/types/ProductData";
import { usePurchaseStore } from "@/store/usePurchaseStore";

const TABS = ["Packaging & Order Details", "Batch & Stock Details"];

interface AddStockToProductProps {
  productId: string;
  /** Shown in the header while the details call is still in flight. */
  fallbackName?: string;
  onCancel: () => void;
  /** Fired once the batch is created and pushed onto the purchase store. */
  onAdded: () => void;
}

/** Every batch on the product, whether under a package or unassigned. */
const allBatches = (details: ProductDetails): ProductBatchDetails[] => [
  ...(details.packages?.flatMap((pkg) => pkg.batches ?? []) ?? []),
  ...(details.unassignedBatches ?? []),
];

/**
 * Both POST endpoints answer with the product's full details rather than the
 * row they created, so the new batch is whichever id wasn't there before.
 * Falls back to matching on what was sent, since /batch can echo a snapshot
 * taken before the insert.
 */
const findNewBatch = (
  details: ProductDetails,
  knownBatchIds: Set<string>,
  sent: NewBatchPayload,
  packagingId: string
): ProductBatchDetails | undefined => {
  const batches = allBatches(details);

  const unseen = batches.filter((b) => !knownBatchIds.has(b.batchId));
  if (unseen.length) {
    // With several unseen rows, prefer one under the package we targeted.
    return (
      (packagingId && unseen.find((b) => b.packagingId === packagingId)) ||
      unseen[unseen.length - 1]
    );
  }

  return [...batches]
    .reverse()
    .find(
      (b) =>
        b.batchNumber === sent.batchNumber &&
        b.expiryDate === sent.expiryDate &&
        (!packagingId || b.packagingId === packagingId)
    );
};

/**
 * Books stock against a product the pharmacy already carries: either a new
 * batch on one of its packages, or a whole new package with its first batch.
 * Mirrors the onboarding wizard minus the Product Details step.
 */
const AddStockToProduct: React.FC<AddStockToProductProps> = ({
  productId,
  fallbackName,
  onCancel,
  onAdded,
}) => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Which saved package the user picked, so the batch picker can list its
  // batches. null means "Add New Package", where the batch is new by definition.
  const [selectedPackagingId, setSelectedPackagingId] = useState<string | null>(null);
  // Unit pairing chosen on the packaging step; the batch form labels and derives
  // its price fields from it.
  const [packagingUnits, setPackagingUnits] = useState<PackagingUnits>({
    purchaseUnit: "",
    smallestUnit: "",
    unitContains: "",
  });

  const packagingRef = useRef<PackagingDetailsRef>(null);
  const batchRef = useRef<BatchDetailsRef>(null);

  const selectedPackage = details?.packages?.find(
    (pkg) => pkg.packagingId === selectedPackagingId
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getProductDetails(productId);
        if (active) setDetails(data);
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load product details."
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [productId]);

  const validateTab = (tab: string): boolean =>
    tab === TABS[0]
      ? packagingRef.current?.validate() ?? false
      : batchRef.current?.validate() ?? false;

  const handleNext = () => {
    if (!validateTab(activeTab)) {
      toast.error("Please fill all mandatory fields before continuing");
      return;
    }
    setActiveTab(TABS[1]);
  };

  // Stepping back is always allowed; stepping forward re-runs this tab's checks.
  const handleTabClick = (tab: string) => {
    if (TABS.indexOf(tab) <= TABS.indexOf(activeTab)) {
      setActiveTab(tab);
      return;
    }
    handleNext();
  };

  const handleSubmit = async () => {
    if (!details) return;

    if (!validateTab(TABS[0])) {
      setActiveTab(TABS[0]);
      toast.error("Please fill all mandatory fields before submitting");
      return;
    }
    if (!validateTab(TABS[1])) {
      toast.error("Please fill all mandatory fields before submitting");
      return;
    }

    try {
      setIsSubmitting(true);

      const packagingData = packagingRef.current?.getFormData();
      const batchData = batchRef.current?.getFormData();

      const batchPayload: NewBatchPayload = {
        batchNumber: batchData?.batchNumber || "",
        manufacturingDate: batchData?.manufacturingDate || "",
        expiryDate: batchData?.expiryDate || "",
        purchaseUnit: batchData?.purchaseUnit || "",
        purchasePrice: Number(batchData?.purchasePricePerBox || 0),
        mrp: Number(batchData?.mrpPerBox || 0),
        sellingPrice: Number(batchData?.sellingPricePerBox || 0),
        purchasePricePerUnit: Number(batchData?.purchasePricePerSmallestUnit || 0),
        mrpPerUnit: Number(batchData?.mrpPerSmallestUnit || 0),
        sellingPricePerUnit: Number(batchData?.sellingPricePerSmallestUnit || 0),
        rackLocation: batchData?.rackLocation || "",
      };

      const knownBatchIds = new Set(allBatches(details).map((b) => b.batchId));
      const existingPackagingId: string = packagingData?.packagingId || "";
      const existingBatchId: string = batchData?.batchId || "";

      let updated = details;
      let batchId = existingBatchId;
      let packagingId = existingPackagingId;

      // Booking against a batch that already exists creates nothing — only the
      // quantities below are new, and /purchase/create is what records them.
      if (!existingBatchId) {
        updated = existingPackagingId
          ? await addProductBatches(productId, [
              { packagingId: existingPackagingId, ...batchPayload },
            ])
          : await addProductPackage(productId, {
              purchaseUnitContains: Number(packagingData?.eachStripContains || 0),
              purchaseSmallestUnitId: Number(packagingData?.purchaseSmallestUnitId || 0),
              batches: [batchPayload],
            });

        let newBatch = findNewBatch(
          updated,
          knownBatchIds,
          batchPayload,
          existingPackagingId
        );

        // /batch answers with a snapshot taken before the insert, so the batch it
        // just created isn't in its own response — read the product back to get it.
        if (!newBatch) {
          updated = await getProductDetails(productId);
          newBatch = findNewBatch(
            updated,
            knownBatchIds,
            batchPayload,
            existingPackagingId
          );
        }

        batchId = newBatch?.batchId || "";
        packagingId = newBatch?.packagingId || existingPackagingId;

        if (!batchId) {
          console.warn("Could not identify the created batch in:", updated);
          toast.error("Stock was saved but the new batch could not be identified");
          return;
        }
      }

      const pkg = updated.packages?.find((p) => p.packagingId === packagingId);
      const variant = pkg
        ? `1x${pkg.purchaseUnitContains} ${packageSmallestUnitName(pkg)}`.trim()
        : `1x${packagingData?.eachStripContains || 1} ${packagingData?.smallestUnit || ""}`.trim();

      // Stock and free quantities aren't part of the batch master — they ride
      // on the purchase payload, exactly as the onboarding flow does it.
      const purchaseQty = Number(batchData?.purchaseQuantity || 0);
      // Per purchase unit, to match purchaseQuantity — stock is bought by the
      // pack, so the per-smallest-unit price would under-state the line.
      const purchasePrice = Number(batchData?.purchasePricePerBox || 0);
      const gstPercentage = Number(updated.gstPercentage ?? details.gstPercentage ?? 0);

      const grossAmount = purchaseQty * purchasePrice;
      const gst = (grossAmount * gstPercentage) / 100;
      const netAmount = grossAmount + gst;

      usePurchaseStore.getState().addPurchaseDetail({
        productId,
        productName: updated.productName || details.productName,
        brandName: updated.brandName || details.brandName || "",
        batchId,
        batchNumber: batchPayload.batchNumber,
        packagingId,
        expiryDate: batchPayload.expiryDate,
        hsnCode: updated.hsnNo || details.hsnNo || "",
        variant,
        purchasePrice,
        mrp: Number(batchData?.mrpPerBox || 0),
        gstPercentage,
        freeQty: String(batchData?.freeQuantity || 0),
        freeQtyUnit: batchData?.freeUnit || "",
        purchaseQuantity: purchaseQty,
        grossAmount,
        gst,
        netAmount,
      });

      onAdded();
    } catch (error) {
      console.error("Failed to add stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add stock"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-pneutral-200 bg-white text-[14px] text-pneutral-500">
        Loading product details…
      </div>
    );
  }

  if (loadError || !details) {
    return (
      <div className="flex h-[300px] w-full flex-col items-center justify-center gap-4 rounded-xl border border-pneutral-200 bg-white">
        <p className="text-[14px] text-danger-600">
          {loadError || "Product details unavailable."}
        </p>
        <Button variant="outline" onClick={onCancel} className="w-[120px]">
          Back
        </Button>
      </div>
    );
  }

  const headerVariant = details.packages?.[0]
    ? `${details.packages[0].purchaseUnitContains}x${packageSmallestUnitName(details.packages[0])}`
    : "";

  return (
    <div className="flex w-full flex-col gap-4">
      <h2 className="text-[24px] font-semibold leading-[32px] text-pneutral-900">
        Add Items to Invoice
      </h2>

      {/* Product the stock is being booked against */}
      <div className="flex w-fit min-w-[300px] items-center gap-4 rounded-xl border border-pneutral-200 bg-white p-4 shadow-sm">
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-md bg-pneutral-900">
          <Image
            src="/ProductManagement/Drug.svg"
            alt=""
            width={32}
            height={32}
            className="opacity-80"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-[18px] font-bold text-pneutral-900">
              {details.productName || fallbackName}
            </span>
            {headerVariant && (
              <span className="text-[13px] text-pneutral-600">{headerVariant}</span>
            )}
          </div>
          <span className="text-[14px] text-pneutral-700">
            HSN {details.hsnNo || "—"} | GST {Number(details.gstPercentage ?? 0)}%
          </span>
          <span className="text-[14px] text-pneutral-700">
            {details.brandName || "—"}
          </span>
        </div>
      </div>

      {/* Step tabs */}
      <div className="mt-2 flex h-[46px] w-full max-w-[600px] items-center gap-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`relative h-full px-1 text-[14px] font-medium transition-colors ${
              activeTab === tab
                ? "font-semibold text-secondary-700"
                : "text-pneutral-500 hover:text-pneutral-700"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-md bg-secondary-700"></span>
            )}
          </button>
        ))}
      </div>

      {/* Both stay mounted so refs and entered values survive tab switches. */}
      <div className={activeTab === TABS[0] ? "block w-full" : "hidden"}>
        <PackagingDetails
          ref={packagingRef}
          mode="existing"
          categoryId={details.productCategoryId}
          packages={details.packages ?? []}
          onPackageChange={setSelectedPackagingId}
          onUnitsChange={setPackagingUnits}
        />
      </div>
      <div className={activeTab === TABS[1] ? "block w-full" : "hidden"}>
        {/* Remounted per package so the batch picker resets with its own list.
            A new package has no saved batches, so the batch is new too. */}
        {selectedPackagingId ? (
          <BatchDetails
            key={selectedPackagingId}
            ref={batchRef}
            mode="existing"
            batches={selectedPackage?.batches ?? []}
            productId={productId}
            packagingId={selectedPackagingId}
            {...packagingUnits}
          />
        ) : (
          <BatchDetails
            key="new-package"
            ref={batchRef}
            productId={productId}
            {...packagingUnits}
          />
        )}
      </div>

      <div className="mt-4 flex w-full items-center justify-between border-t border-gray-100 pb-8 pt-4">
        <div>
          {activeTab === TABS[1] && (
            <Button
              variant="outline"
              onClick={() => setActiveTab(TABS[0])}
              className="w-[120px]"
            >
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onCancel} className="w-[120px]">
            Cancel
          </Button>
          {activeTab === TABS[1] ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              className="w-[120px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
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

export default AddStockToProduct;
