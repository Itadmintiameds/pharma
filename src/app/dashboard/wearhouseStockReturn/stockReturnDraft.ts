import type { StockReturnSource } from "./components/StockReturnType";
import type { ConfirmDispatchContent } from "./components/ConfirmDispatchModal";

/**
 * A stock return being built, carried from CreateStockReturn into
 * StockReturnReview and back again, so going back to edit keeps every line.
 */
export interface StockReturnDraft {
  source: StockReturnSource;
  lines: StockReturnLine[];
}

/** One batch being returned — a batch *within a packaging*, as /product/batches lists it. */
export interface StockReturnLine {
  id: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNo: string;
  packagingId: string;
  /** yyyy-mm-dd, as the API returns it. */
  expiryDate: string;
  purchaseUnit: string;
  smallestUnit: string;
  /** Smallest units per purchase unit; 1 when the API gave none. */
  unitContains: number;
  /** In smallest units — what stock is actually stored in. */
  availableBase: number;
  /** As typed, in purchase units. Kept as a string so the box can be cleared. */
  returnQty: string;
  reason: string;
  /** Set only for damaged stock returned from an Inter-Store Transfer receipt. */
  transfer?: TransferOrigin;
}

/** The Inter-Store Transfer receipt a damaged line was recorded against. */
export interface TransferOrigin {
  distributionId: number;
  distributionDetailsId?: number;
  transferNo: string;
  /** yyyy-mm-dd. */
  transferDate: string;
  fromStore: string;
  /** Recorded as damaged at receipt, in smallest units. */
  damagedBase: number;
  /** Already sent back on earlier stock returns, in smallest units. */
  alreadyReturnedBase: number;
}

/** Smallest units → purchase units, for a qty the screen shows. */
export const toPurchaseQty = (line: StockReturnLine, baseQty: number): number =>
  Number((baseQty / line.unitContains).toFixed(2));

/** "Strip (10)" — the purchase unit with its pack size, as the design shows it. */
export const purchaseUnitLabel = (line: StockReturnLine): string => {
  const unit = line.purchaseUnit || line.smallestUnit || "—";
  return line.unitContains > 1 ? `${unit} (${line.unitContains})` : unit;
};

/** dd-mm-yyyy, the date format the stock-return screens use. */
export const formatDisplayDate = (isoDate: string): string => {
  const match = (isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : isoDate || "—";
};

export const SOURCE_LABELS: Record<StockReturnSource, string> = {
  PHARMACY_INVENTORY: "Pharmacy Inventory",
  DAMAGED_INTER_STORE: "Damaged – Inter-Store Transfer",
};

export const RETURN_REASONS = [
  "Damaged",
  "Near Expiry",
  "Excess Stock",
  "Slow/Non-moving Stock",
  "Product Recall/Withdrawal",
];

/** The screen works in purchase units; stock is stored in smallest units. */
export const availablePurchaseQty = (line: StockReturnLine): number =>
  toPurchaseQty(line, line.availableBase);

/** What the backend will need: the return qty converted to smallest units. */
export const returnBaseQty = (line: StockReturnLine): number =>
  (Number(line.returnQty) || 0) * line.unitContains;

export const returnQtyError = (line: StockReturnLine): string | undefined => {
  if (!line.returnQty) return "Enter a quantity";
  const qty = Number(line.returnQty);
  if (!(qty > 0)) return "Must be more than 0";
  if (qty > availablePurchaseQty(line)) {
    return `Cannot exceed ${availablePurchaseQty(line)} available`;
  }
  return undefined;
};

export const isLineValid = (line: StockReturnLine): boolean =>
  !returnQtyError(line) && !!line.reason;

/**
 * The dispatch dialog's wording for each return type — Figma 3749:36656
 * (pharmacy inventory) and 3772:40064 (damaged inter-store stock).
 */
export const dispatchContent = (draft: StockReturnDraft): ConfirmDispatchContent => {
  const products = draft.lines.length;
  const units = draft.lines.reduce((sum, line) => sum + (Number(line.returnQty) || 0), 0);
  const productLabel = `${products} ${products === 1 ? "product" : "products"}`;

  if (draft.source === "DAMAGED_INTER_STORE") {
    return {
      title: "Confirm dispatch of this damaged Stock Return to Central Warehouse?",
      description:
        "The damaged stock will be moved from the Pharmacy to Stock in Transit. It will continue to be classified as Damaged/Non-Saleable stock.",
      impactPoints: [
        `Pharmacy Damaged Stock: ${productLabel}, ${units} units will be deducted.`,
        `Damaged Stock in Transit: ${units} units will move toward Central Warehouse.`,
        "Central Warehouse stock will not increase until receipt is confirmed.",
      ],
    };
  }

  return {
    title: "Confirm dispatch of this Stock Return to Central Warehouse?",
    description:
      "This will dispatch the stock and update inventory. The Stock Return will move from Draft to Pending Receipt.",
    impactPoints: [
      `Pharmacy Stock: ${productLabel}, ${units} units will be deducted.`,
      `Stock in Transit: ${units} units will move toward Central Warehouse.`,
      "Central Warehouse stock will not increase until receipt is confirmed.",
    ],
  };
};

/** yyyy-mm-dd → "Dec 2027", as the design shows expiry. */
export const formatExpiry = (expiryDate: string): string => {
  const date = new Date(expiryDate);
  if (Number.isNaN(date.getTime())) return expiryDate || "—";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};
