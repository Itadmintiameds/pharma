"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRightLeft, CircleCheck, Info } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import { getPurchaseById } from "@/services/PurchaseServiceNew";
import {
  editPurchaseReturn,
  getAllPurchaseReturn,
  getPurchaseReturnById,
} from "@/services/PurchaseReturnService";
import type { PurchaseDetailsData } from "@/types/PurchaseData";
import type { PurchaseReturnData } from "@/types/PurchaseReturnData";
import { formatMonthYear } from "@/utils/formatDate";
import {
  buildReturnedByPurchase,
  eligibleForLine,
  returnedForLine,
  returnLineKey,
  type ReturnedQuantities,
} from "@/utils/purchaseReturnTotals";
import {
  lineAmounts,
  sumLineAmounts,
  toMoney,
  type ReturnLineAmounts,
} from "@/utils/purchaseReturnAmounts";
import { buildInvoiceRow, type InvoiceRow } from "./AddPurchaseReturn";

interface ReturnedItem {
  /** purchaseReturnDetailId — the line the edit endpoint revises. */
  id: number;
  productName: string;
  batchNo: string;
  expiry: string;
  /** Quantities saved on the current revision — the "Existing" side. */
  existingPurchaseQty: number;
  existingFreeQty: number;
  /** Amounts as saved on the current revision. */
  existingAmounts: ReturnLineAmounts;
  returnPurchaseQty: number;
  returnFreeQty: number;
  /** Paid units the line may hold: purchased, less what other returns took. */
  maxPurchaseQty: number;
  /** Free units the line may hold: received free, less what other returns took. */
  maxFreeQty: number;
  /** Paid + free together may not exceed this — see buildReturnedItem. */
  maxTotalQty: number;
  /** The purchase line, for pricing a revised quantity at its original rate. */
  detail: PurchaseDetailsData;
}

/** The return's money figures, one set per revision. */
interface ReturnFinancials {
  taxableValue: number;
  gst: number;
  totalReturnAmount: number;
  adjustedAgainstPayable: number;
  payableAfterReturn: number;
  amountDueFromSupplier: number;
}

interface PurchaseReturnEditProps {
  /** purchaseReturnId of the return being revised. */
  purchaseReturnId: number;
  /** Back to the Purchase Return list — also where a saved edit lands. */
  onBack?: () => void;
}

const formatAmount = (value: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "CONFIRMED" → "Confirmed", for the header badge. */
const titleCase = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

/** Stock is held in smallest units, quantities here in purchase units — same
 *  rounding-down rule as the create wizard (PurchaseReturnItems). */
const availableInPurchaseUnits = (detail: PurchaseDetailsData): number => {
  const stock = Number(detail.availableStock) || 0;
  const perPack = Number(detail.unitContains) || 0;
  return perPack > 0 ? Math.floor(stock / perPack) : stock;
};

/**
 * One saved line, with the limits a revision has to stay inside:
 *   - paid / free can each go up to what was received of that kind, less what
 *     *other* returns on this purchase already took (this return's own saved
 *     quantity is not counted against it, it is what is being revised).
 *   - together they are capped by stock. A CONFIRMED return already took its
 *     saved quantity out of stock, so that quantity is headroom on top of what
 *     is on hand; a DRAFT has moved nothing yet.
 */
const buildReturnedItem = (
  line: NonNullable<PurchaseReturnData["purchaseReturnDetails"]>[number],
  detail: PurchaseDetailsData,
  returnedByOthers: Map<string, ReturnedQuantities>,
  isConfirmed: boolean
): ReturnedItem => {
  const existingPurchaseQty = Number(line.purchaseReturnQuantity) || 0;
  const existingFreeQty = Number(line.freeReturnQuantity) || 0;
  const unreturned = eligibleForLine(detail, returnedForLine(returnedByOthers, detail));
  const stock = availableInPurchaseUnits(detail);

  return {
    id: Number(line.purchaseReturnDetailId),
    productName: line.productName ?? detail.productName ?? detail.productId,
    batchNo: line.batchNumber ?? detail.batchNumber ?? detail.batchId,
    expiry: formatMonthYear(detail.expiryDate),
    existingPurchaseQty,
    existingFreeQty,
    existingAmounts: {
      rate: lineAmounts(detail, 1).rate,
      grossAmount: toMoney(Number(line.grossAmount) || 0),
      gstAmount: toMoney(Number(line.gstAmount) || 0),
      netAmount: toMoney(Number(line.netAmount) || 0),
    },
    returnPurchaseQty: existingPurchaseQty,
    returnFreeQty: existingFreeQty,
    maxPurchaseQty: unreturned.paid,
    maxFreeQty: unreturned.free,
    maxTotalQty: isConfirmed ? stock + existingPurchaseQty + existingFreeQty : stock,
    detail,
  };
};

const isChanged = (item: ReturnedItem) =>
  item.returnPurchaseQty !== item.existingPurchaseQty ||
  item.returnFreeQty !== item.existingFreeQty;

/** An unchanged line keeps its saved amounts to the paisa; a changed one is
 *  re-priced by the same rule that priced it on create. */
const revisedAmounts = (item: ReturnedItem): ReturnLineAmounts =>
  item.returnPurchaseQty === item.existingPurchaseQty
    ? item.existingAmounts
    : lineAmounts(item.detail, item.returnPurchaseQty);

interface ItemErrors {
  purchase?: string;
  free?: string;
}

const validateItem = (item: ReturnedItem): ItemErrors => {
  const errors: ItemErrors = {};
  if (item.returnPurchaseQty > item.maxPurchaseQty) {
    errors.purchase = `Cannot exceed ${item.maxPurchaseQty}.`;
  }
  if (item.returnFreeQty > item.maxFreeQty) {
    errors.free = `Cannot exceed ${item.maxFreeQty}.`;
  }
  // Only once both fields are valid on their own, so one problem gets one message.
  if (
    !errors.purchase &&
    !errors.free &&
    item.returnPurchaseQty + item.returnFreeQty > item.maxTotalQty
  ) {
    errors.purchase = `Only ${item.maxTotalQty} in stock for this batch.`;
  }
  return errors;
};

/**
 * Same settlement rule as the review step (PurchaseReturnView): the return is
 * set against what is still owed on the invoice first, and anything beyond
 * that is due back from the supplier.
 */
const buildFinancials = (
  amounts: ReturnLineAmounts[],
  currentPayable: number
): ReturnFinancials => {
  const totals = sumLineAmounts(amounts);
  const adjustedAgainstPayable = toMoney(Math.min(totals.totalNetAmount, currentPayable));

  return {
    taxableValue: totals.totalGrossAmount,
    gst: totals.totalGstAmount,
    totalReturnAmount: totals.totalNetAmount,
    adjustedAgainstPayable,
    payableAfterReturn: toMoney(currentPayable - adjustedAgainstPayable),
    amountDueFromSupplier: toMoney(totals.totalNetAmount - adjustedAgainstPayable),
  };
};

const OTHER_REASON = "OTHER_REASON";

const EDIT_REASON_OPTIONS = [
  { label: "Wrong Return Quantity", value: "WRONG_RETURN_QUANTITY" },
  { label: "Wrong Return Reason", value: "WRONG_RETURN_REASON" },
  { label: "Data Entry Error", value: "DATA_ENTRY_ERROR" },
  // Not "OTHER": the shared Dropdown reserves that value for its own
  // allowOther mode and swallows the selection (it calls onChange("")).
  { label: "Other", value: OTHER_REASON },
];

/** A blank field reads as 0; anything else is floored to a whole, non-negative unit. */
const toQty = (raw: string) => Math.max(0, Math.floor(Number(raw) || 0));

/** Figma's ".Input-Size" at 48px (node 3813:41085): 16/24 Medium label with 4px
 *  side padding flush on an 8px-radius field, 16/24 text with 12px padding. */
const QtyField = ({
  label,
  value,
  onChange,
  error,
  containerClassName,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  containerClassName?: string;
}) => (
  <Input
    label={label}
    type="number"
    min={0}
    // A string, not the number: React leaves a number input alone when its text
    // already parses to the same value, so typing "45" after "0" would stay
    // on screen as "045". The string forces the field to the clean "45".
    value={String(value)}
    onChange={(e) => onChange(toQty(e.target.value))}
    error={error}
    labelClassName="mb-0! px-xxsm"
    className="rounded-lg!"
    containerClassName={containerClassName}
  />
);

/** Figma node 3813:41417 ("Diff Value Row"): a changed value reads old → new,
 *  an unchanged one is just the value in 13px SemiBold. */
const DiffValue = ({ existing, revised }: { existing: string; revised: string }) =>
  existing === revised ? (
    <span className="font-noto-sans text-[13px] font-semibold text-pneutral-900">
      {revised}
    </span>
  ) : (
    <span className="inline-flex items-center gap-xxsm font-noto-sans text-[13px] whitespace-nowrap">
      <span className="font-regular text-pneutral-500">{existing}</span>
      <ArrowRightLeft size={14} className="shrink-0 text-pneutral-500" />
      <span className="font-semibold text-primary-800">{revised}</span>
    </span>
  );

const CHANGED_ITEM_COLUMNS = [
  "PRODUCT",
  "RETURN QTY",
  "FREE QTY",
  "TAXABLE VALUE (₹)",
  "GST (₹)",
];

/** Figma node 3813:41554 — the fixed set of return-level totals. "Supplier
 *  Payable After Return" is the headline figure, set in 16/24 SemiBold. */
const FINANCIAL_IMPACT_ROWS: {
  label: string;
  key: keyof ReturnFinancials;
  emphasis?: boolean;
}[] = [
  { label: "Total Purchase Return Amount (₹)", key: "totalReturnAmount" },
  { label: "Adjusted Against Supplier Payable (₹)", key: "adjustedAgainstPayable" },
  { label: "Supplier Payable After Return (₹)", key: "payableAfterReturn", emphasis: true },
  { label: "Amount Due from Supplier (₹)", key: "amountDueFromSupplier" },
];

const InvoiceField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="text-label-l4 font-semibold break-words text-pneutral-900">
      {value}
    </p>
  </div>
);

/** Header row — Figma node 3589:7189; correction banner — node 3589:7196;
 *  original invoice card — node 3589:7201; returned items card — node 3813:41078;
 *  edit reason card — node 3589:7233; changed line items — node 3813:41382;
 *  financial impact — node 3813:41554; review footer row — node 3589:7366. */
const PurchaseReturnEdit = ({ purchaseReturnId, onBack }: PurchaseReturnEditProps) => {
  const [saved, setSaved] = useState<PurchaseReturnData>();
  const [invoice, setInvoice] = useState<InvoiceRow>();
  const [returnItems, setReturnItems] = useState<ReturnedItem[]>([]);
  const [editReason, setEditReason] = useState<string>("");
  /** Free-text reason, asked for only when "Other" is picked. */
  const [otherReason, setOtherReason] = useState("");
  const isOtherReason = editReason === OTHER_REASON;
  // "Other" is not a reason on its own — the text typed beside it is what
  // gets saved.
  const resolvedEditReason = isOtherReason ? otherReason.trim() : editReason;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    // isLoading starts true; the page remounts this screen for another id.
    let active = true;

    const load = async () => {
      const purchaseReturn = await getPurchaseReturnById(purchaseReturnId);
      const [purchase, allReturns] = await Promise.all([
        getPurchaseById(purchaseReturn.purchaseId),
        // Only needed to net off other returns on the same purchase; without
        // it the limits fall back to the full purchased quantities.
        getAllPurchaseReturn().catch((err) => {
          console.error("Failed to fetch other returns for this purchase:", err);
          return [] as PurchaseReturnData[];
        }),
      ]);

      const returnedByOthers =
        buildReturnedByPurchase(
          allReturns.filter((item) => item.purchaseReturnId !== purchaseReturnId)
        ).get(purchaseReturn.purchaseId) ?? new Map<string, ReturnedQuantities>();

      const detailByKey = new Map<string, PurchaseDetailsData>(
        (purchase.purchaseDetails ?? []).map((detail) => [
          returnLineKey(detail.productId, detail.batchId),
          detail,
        ])
      );

      const isConfirmed = (purchaseReturn.status ?? "").toUpperCase() === "CONFIRMED";
      const items = (purchaseReturn.purchaseReturnDetails ?? []).flatMap((line) => {
        const detail = detailByKey.get(returnLineKey(line.productId, line.batchId));
        // Without the purchase line there is no rate to re-price the line at.
        if (!detail || line.purchaseReturnDetailId == null) return [];
        return [buildReturnedItem(line, detail, returnedByOthers, isConfirmed)];
      });

      if (!active) return;
      setSaved(purchaseReturn);
      setInvoice(buildInvoiceRow(purchase, returnedByOthers));
      setReturnItems(items);
      setLoadError("");
    };

    load()
      .catch((err) => {
        if (!active) return;
        console.error("Failed to open the purchase return for editing:", err);
        setLoadError(err?.message || "Failed to open this purchase return.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [purchaseReturnId]);

  // Every line carries the revision it is on; the return as a whole is on the
  // highest of them, and this edit becomes the next one.
  const revision = Math.max(
    1,
    ...(saved?.purchaseReturnDetails ?? []).map((line) => Number(line.revisionNo) || 1)
  );

  const errorsById = useMemo(
    () => new Map(returnItems.map((item) => [item.id, validateItem(item)])),
    [returnItems]
  );
  const hasErrors = [...errorsById.values()].some((e) => e.purchase || e.free);

  // Only the lines whose quantities moved from the saved revision; money
  // columns follow the quantities as they're edited above.
  const changedItems = returnItems.filter(isChanged);

  const currentPayable = invoice?.outstanding ?? 0;
  const existingFinancials = useMemo(
    () => buildFinancials(returnItems.map((item) => item.existingAmounts), currentPayable),
    [returnItems, currentPayable]
  );
  const revisedFinancials = useMemo(
    () => buildFinancials(returnItems.map(revisedAmounts), currentPayable),
    [returnItems, currentPayable]
  );

  const updateItem = (id: number, patch: Partial<ReturnedItem>) =>
    setReturnItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  const handleConfirm = async () => {
    setIsSaving(true);
    setSaveError("");
    try {
      await editPurchaseReturn(purchaseReturnId, {
        editReason: resolvedEditReason,
        purchaseReturnDetails: changedItems.map((item) => ({
          purchaseReturnDetailId: item.id,
          purchaseReturnQuantity: item.returnPurchaseQty,
          freeReturnQuantity: item.returnFreeQty,
        })),
      });
      onBack?.();
    } catch (err) {
      console.error("Failed to save the purchase return edit:", err);
      setSaveError((err as Error)?.message || "Failed to save the purchase return edit.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <p className="py-8 text-center text-label-l4 text-pneutral-500">
        Loading purchase return...
      </p>
    );
  }

  if (loadError || !saved || !invoice) {
    return (
      <p
        role="alert"
        className="w-full rounded-lg bg-warning-50 p-md text-label-l4 font-medium text-warning-600"
      >
        {loadError || "This purchase return could not be opened."}
      </p>
    );
  }

  const returnNo = saved.returnNo;
  const status = titleCase(saved.status) || "Confirmed";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full items-center gap-md">
        <div className="flex min-w-0 flex-1 flex-col gap-xsm">
          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-h5 font-semibold text-pneutral-900">
              Edit Purchase Return
            </p>
            {/* The project's "danger" tokens are this Figma file's yellow scale. */}
            <span className="inline-flex shrink-0 items-center justify-center gap-xxsm rounded-lg border border-danger-600 bg-danger-50 px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap text-danger-600">
              Revision {revision} → {revision + 1}
            </span>
            <span className="inline-flex shrink-0 items-center justify-center gap-xxsm rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap text-success-800">
              {status}
            </span>
          </div>
          <p className="text-label-l4 font-regular text-pneutral-500">
            {returnNo} — This Purchase Return has already been confirmed. Changes
            will be recorded as a new revision.
          </p>
        </div>
      </div>

      {/* Controlled Correction Banner — Figma node 3589:7196 */}
      <div className="flex w-full items-start gap-sm rounded-2xl bg-secondary-100 p-md text-secondary-700">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
          <p className="text-label-l4 font-semibold">
            This is a controlled correction, not a direct overwrite.
          </p>
          <p className="text-p3 font-regular">
            Confirming your changes will create Revision {revision + 1} of this
            Purchase Return. The original Revision {revision} remains available in
            Audit History for reference.
          </p>
        </div>
      </div>

      {/* Selected Invoice Card — Figma node 3589:7201 */}
      <div className="flex w-full flex-col gap-sm rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Original Purchase Invoice (Read Only)
        </p>

        <div className="grid w-full grid-cols-2 gap-md sm:grid-cols-3 lg:flex lg:items-start">
          <InvoiceField label="Supplier" value={invoice.supplier} />
          <InvoiceField label="Invoice No." value={invoice.invoiceNo} />
          <InvoiceField label="GRN No." value={invoice.grnNo} />
          <InvoiceField label="Payment Type" value={invoice.paymentType} />
          <InvoiceField
            label="Original Invoice Amount (₹)"
            value={invoice.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          />
        </div>
      </div>

      {/* Editable Return Items Card — Figma node 3813:41078 */}
      <div className="flex w-full flex-col gap-md overflow-hidden rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">Returned Items</p>

        {/* Each row — Figma node 3813:41080: 200px product block, 180px and
            150px qty fields, then the badge pushed to the far edge. Below md
            the row stacks, with the two fields side by side from sm up. */}
        {returnItems.length === 0 && (
          <p className="text-p3 font-regular text-pneutral-500">
            This return has no lines that can be edited.
          </p>
        )}

        {returnItems.map((item) => {
          const errors = errorsById.get(item.id) ?? {};
          const isValid = !errors.purchase && !errors.free;

          return (
          <div
            key={item.id}
            className="flex w-full flex-col gap-md border-b border-pneutral-200 pb-md last:border-b-0 last:pb-0 md:flex-row md:items-center md:border-b-0 md:pb-0"
          >
            <div className="flex min-w-0 flex-col gap-xxsm md:w-50 md:shrink-0">
              <p className="text-p3 font-semibold wrap-break-word text-pneutral-900">
                {item.productName}
              </p>
              <p className="text-label-l2 font-regular text-pneutral-500">
                Batch {item.batchNo} · Exp {item.expiry}
              </p>
            </div>

            <div className="flex w-full flex-col gap-md sm:flex-row md:w-auto">
              <QtyField
                label="Return Purchase Qty"
                value={item.returnPurchaseQty}
                onChange={(value) => updateItem(item.id, { returnPurchaseQty: value })}
                error={errors.purchase}
                containerClassName="sm:flex-1 md:w-45 md:flex-none"
              />
              <QtyField
                label="Return Free Qty"
                value={item.returnFreeQty}
                onChange={(value) => updateItem(item.id, { returnFreeQty: value })}
                error={errors.free}
                containerClassName="sm:flex-1 md:w-37.5 md:flex-none"
              />
            </div>

            {/* The project's "warning" tokens are this Figma file's red scale. */}
            <span
              className={`inline-flex shrink-0 items-center justify-center gap-xxsm self-start rounded-lg border px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap md:ml-auto md:self-center ${
                isValid
                  ? "border-success-600 bg-success-50 text-success-800"
                  : "border-warning-600 bg-warning-50 text-warning-600"
              }`}
            >
              {isValid ? "Eligible" : "Exceeds Limit"}
            </span>
          </div>
          );
        })}
      </div>

      {/* Edit Reason Card — Figma node 3589:7233 */}
      <div className="flex w-full flex-col gap-sm rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">Edit Reason</p>

        {/* Figma's field: label flush on an 8px-radius box, 4px-padded label with
            a 14/20 Open Sans asterisk 4px after it. */}
        {/* Picking "Other" halves the dropdown (from sm up) to make room for
            the free-text field beside it; below sm the field stacks under. */}
        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Dropdown
            label="Reason for Edit"
            required
            options={EDIT_REASON_OPTIONS}
            value={editReason}
            onChange={(value) => setEditReason(String(value))}
            placeholder="Select reason for edit"
            className={`[&>div:first-child]:mb-0 [&_[role=combobox]]:rounded-lg ${
              isOtherReason ? "w-full sm:w-1/2" : "w-full"
            }`}
            labelClassName="px-xxsm [&>span]:ml-1 [&>span]:font-open-sans [&>span]:text-[14px] [&>span]:leading-5"
          />

          {isOtherReason && (
            <Input
              label="Specify Reason"
              required
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Enter reason for edit"
              maxLength={255}
              labelClassName="mb-0! px-xxsm [&>span]:ml-1 [&>span]:font-open-sans [&>span]:text-[14px] [&>span]:leading-5"
              className="rounded-lg!"
              containerClassName="w-full sm:w-1/2"
            />
          )}
        </div>
      </div>

      {/* Changed Line Items Card — Figma node 3813:41382 */}
      <div className="flex w-full flex-col gap-sm rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Changed Line Items
          </p>
          <span className="inline-flex shrink-0 rounded-lg bg-primary-100 px-sm text-p3 font-semibold whitespace-nowrap text-primary-800">
            {changedItems.length} of {returnItems.length} products changed
          </span>
        </div>

        <p className="text-p3 font-regular text-pneutral-500">
          Only line items where values were changed are shown below. Unchanged
          items are not affected by this revision.
        </p>

        {/* Table — Figma node 3813:41388: 50px purple header, 60px rows, a
            flexible product column and four 200px value columns. Scrolls
            sideways below that width rather than squeezing the diffs. */}
        <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200 bg-white">
          <table className="w-full min-w-225 border-collapse">
            <thead>
              <tr className="h-12.5 bg-secondary-600">
                {CHANGED_ITEM_COLUMNS.map((column, index) => (
                  <th
                    key={column}
                    className={`border-b border-r border-pneutral-200 px-sm py-xsm text-left font-work-sans text-[11px] font-semibold whitespace-nowrap text-pneutral-50 last:border-r-0 ${
                      index === 0 ? "" : "w-50"
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {changedItems.length === 0 && (
                <tr className="h-15">
                  <td
                    colSpan={CHANGED_ITEM_COLUMNS.length}
                    className="px-sm py-xsm text-center text-p3 font-regular text-pneutral-500"
                  >
                    No line items have been changed yet.
                  </td>
                </tr>
              )}

              {changedItems.map((item) => (
                <tr
                  key={item.id}
                  className="h-15 border-b border-pneutral-200 last:border-b-0 [&>td]:border-r [&>td]:border-pneutral-200 [&>td:last-child]:border-r-0"
                >
                  <td className="px-sm py-xsm align-middle">
                    <p className="font-noto-sans text-[13px] font-semibold whitespace-nowrap text-pneutral-900">
                      {item.productName}
                    </p>
                    <p className="font-noto-sans text-[11px] font-regular whitespace-nowrap text-pneutral-500">
                      Batch {item.batchNo}
                    </p>
                  </td>
                  <td className="px-sm py-xsm align-middle">
                    <DiffValue
                      existing={String(item.existingPurchaseQty)}
                      revised={String(item.returnPurchaseQty)}
                    />
                  </td>
                  <td className="px-sm py-xsm align-middle">
                    <DiffValue
                      existing={String(item.existingFreeQty)}
                      revised={String(item.returnFreeQty)}
                    />
                  </td>
                  <td className="px-sm py-xsm align-middle">
                    <DiffValue
                      existing={formatAmount(item.existingAmounts.grossAmount)}
                      revised={formatAmount(revisedAmounts(item).grossAmount)}
                    />
                  </td>
                  <td className="px-sm py-xsm align-middle">
                    <DiffValue
                      existing={formatAmount(item.existingAmounts.gstAmount)}
                      revised={formatAmount(revisedAmounts(item).gstAmount)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Level Financial Impact Card — Figma node 3813:41554 */}
      <div className="flex w-full flex-col gap-sm rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Return-Level Financial Impact
        </p>
        <p className="text-p3 font-regular text-pneutral-500">
          These totals reflect the entire Purchase Return and always show a fixed
          set of figures, regardless of how many line items it contains.
        </p>

        {FINANCIAL_IMPACT_ROWS.map(({ label, key, emphasis }) => (
          <div
            key={key}
            className="flex w-full flex-col gap-xxsm sm:flex-row sm:items-center sm:gap-md"
          >
            <p
              className={`min-w-0 flex-1 ${
                emphasis
                  ? "text-label-l4 font-semibold text-pneutral-900"
                  : "text-p3 font-regular text-pneutral-500"
              }`}
            >
              {label}
            </p>
            {/* Always old → new here, even when equal: this card is a fixed
                statement of both revisions, not a list of changes. */}
            <div className="flex shrink-0 items-center gap-xsm text-label-l4 whitespace-nowrap">
              <span className="font-regular text-pneutral-500">
                {formatAmount(existingFinancials[key])}
              </span>
              <ArrowRightLeft size={16} className="shrink-0 text-pneutral-500" />
              <span className="font-semibold text-primary-800">
                {formatAmount(revisedFinancials[key])}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Review Footer Row — Figma node 3589:7366 */}
      {saveError && (
        <p
          role="alert"
          className="w-full rounded-lg bg-warning-50 p-md text-label-l4 font-medium text-warning-600"
        >
          {saveError}
        </p>
      )}

      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-start sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full! gap-xsm border-secondary-700! px-md font-medium! text-secondary-700! sm:w-35.25!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back
        </Button>

        {/* Stays disabled until there is something valid to save and the
            required edit reason is picked — the server rejects an edit with
            no quantity changes. */}
        <Button
          type="button"
          variant="primary"
          disabled={!resolvedEditReason || changedItems.length === 0 || hasErrors || isSaving}
          onClick={handleConfirm}
          className="w-full min-w-27 gap-xsm bg-primary-800! px-md font-medium! text-pneutral-50! sm:w-auto"
        >
          {isSaving ? "Saving..." : "Confirm Purchase Return"}
          <CircleCheck size={20} className="shrink-0 fill-pneutral-50 text-primary-800" />
        </Button>
      </div>
    </div>
  );
};

export default PurchaseReturnEdit;
