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

/** A confirmed adjustment — what the success modal and View screen show. */
export interface StockAdjustmentRecord extends StockAdjustmentDraft {
  adjustmentNo: string;
  /** "01-Oct-2026, 03:15 PM" */
  adjustedAt: string;
  status: string;
}

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
