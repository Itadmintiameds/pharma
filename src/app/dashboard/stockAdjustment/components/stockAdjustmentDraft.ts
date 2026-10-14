import { formatAmount } from "@/utils/billingTotals";

export const REASONS = [
  "Damaged Stock",
  "Physical Count Difference",
  "Expired Stock",
  "Data Entry Correction",
  "Missing Stock",
  "Other",
];

/** Picking this reason makes Remarks mandatory. */
export const OTHER_REASON = "Other";

export const REASON_OPTIONS = REASONS.map((reason) => ({
  label: reason,
  value: reason,
}));

// Figma "boxShadowCard" — the three-layer shadow every create/review card uses
export const CARD_SHADOW =
  "shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]";

// Shared look of the footer buttons — Figma 48px high, 8px corners, 16/24 medium label
export const FOOTER_BUTTON =
  "h-12! max-h-13 min-h-12 min-w-27 shrink-0 gap-xsm rounded-lg! px-md text-label-l4! font-medium!";

/** One batch the pharmacy holds, in the purchase units the screens work in. */
export interface AdjustableBatch {
  /** productId-batchId-packagingId — a batch comes back once per packaging. */
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  batchId: string;
  batchNo: string;
  packagingId: string;
  /** "Aug 2028" */
  expiry: string;
  purchaseUnit: string;
  /** Smallest units in one purchase unit — the backend stores stock in smallest units. */
  unitContains: number;
  /** Current system stock, in purchase units. */
  currentStock: number;
  /** Purchase price per purchase unit. */
  purchasePrice: number;
}

/** Everything the create step collects — what Review shows and Confirm saves. */
export interface StockAdjustmentDraft {
  location: string;
  batch: AdjustableBatch;
  actualStock: number;
  reason: string;
  remarks: string;
}

// Shape of one batch row from GET /product/batches and /product/batch/{id}.
export type BatchApiRow = {
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  productId?: string;
  productName?: string;
  brandName?: string;
  purchaseUnit?: string;
  purchaseSmallestUnitName?: string;
  purchaseUnitContains?: number;
  packagingId?: string;
  totalStock?: number;
  stockQty?: number;
  purchasePrice?: number;
  purchasePricePerUnit?: number;
};

/** "2028-08-31" → "Aug 2028". */
const formatExpiry = (expiryDate?: string) => {
  const date = new Date(expiryDate ?? "");
  if (Number.isNaN(date.getTime())) return expiryDate || "—";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

/** Stock is stored in smallest units; the adjustment screens work in purchase units. */
export const toAdjustableBatch = (row: BatchApiRow): AdjustableBatch | null => {
  if (!row.productId || !row.batchId) return null;
  const unitContains = Number(row.purchaseUnitContains) > 0 ? Number(row.purchaseUnitContains) : 1;
  const stockBase = Number(row.stockQty ?? row.totalStock) || 0;

  return {
    id: `${row.productId}-${row.batchId}-${row.packagingId ?? ""}`,
    productId: row.productId,
    productName: row.productName || "Unknown Product",
    brandName: row.brandName || "—",
    batchId: row.batchId,
    batchNo: row.batchNumber || "N/A",
    packagingId: row.packagingId || "",
    expiry: formatExpiry(row.expiryDate),
    purchaseUnit: row.purchaseUnit || row.purchaseSmallestUnitName || "",
    unitContains,
    currentStock: Number((stockBase / unitContains).toFixed(2)),
    purchasePrice:
      Number(row.purchasePrice) || (Number(row.purchasePricePerUnit) || 0) * unitContains,
  };
};

/** ISO date-time from the API → "01-Oct-2026, 03:15 PM". */
export const formatAdjustedAt = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${day}-${month}-${date.getFullYear()}, ${time}`;
};

/** Actual minus system stock: negative removes stock, positive adds it. */
export const adjustmentQty = (draft: Pick<StockAdjustmentDraft, "batch" | "actualStock">) =>
  Number((draft.actualStock - draft.batch.currentStock).toFixed(2));

export const adjustmentType = (qty: number) =>
  qty < 0 ? "Decrease" : qty > 0 ? "Increase" : "No Change";

/** Signed number with a true minus sign, as the design shows it ("−5", "+12"). */
export const formatSigned = (value: number, format: (abs: number) => string) =>
  `${value < 0 ? "−" : "+"}${format(Math.abs(value))}`;

export const formatRupees = (value: number) => `₹${formatAmount(value)}`;

export const formatSignedRupees = (value: number) => formatSigned(value, formatRupees);

export const signedTextClass = (value: number) =>
  value < 0 ? "text-warning-600" : "text-success-800";

/** "120 Strips" — a quantity followed by its purchase unit. */
export const formatQtyWithUnit = (qty: number, unit: string) =>
  unit ? `${qty} ${unit}` : String(qty);

/** "Strips" → "Strip", for the "₹40.00 / Strip" price label. */
export const singularUnit = (unit: string) =>
  unit.length > 1 && /s$/i.test(unit) ? unit.slice(0, -1) : unit;
