import { getAllPurchases } from "@/services/PurchaseServiceNew";
import {
  getDestinationDistributions,
  getWarehouseDistribution,
} from "@/services/WarehouseDistributionService";
import { AdjustableBatch } from "./stockAdjustmentDraft";

/**
 * Where the current location's stock of a batch came in from:
 *  - "receipt": a pharmacy under centralized inventory — stock only arrives
 *    through Warehouse Receipt.
 *  - "purchase": a single pharmacy / multi-location without a warehouse, or the
 *    warehouse itself — stock arrives through Purchase.
 */
export type StockSource = "receipt" | "purchase";

/** The most an actual count can be: everything of the batch that came in. */
export interface ReceivedLimit {
  source: StockSource;
  /** In purchase units, like every quantity on the adjustment screens. */
  quantity: number;
}

const round2 = (value: number) => Number(value.toFixed(2));

const sameText = (a?: string, b?: string) =>
  Boolean(a) && Boolean(b) && a!.trim().toLowerCase() === b!.trim().toLowerCase();

/** Received quantities are stored in smallest units — summed over every received receipt. */
const receivedThroughReceipts = async (batch: AdjustableBatch) => {
  const receipts = (await getDestinationDistributions()).filter(
    (receipt) => receipt.currentStatus === "STOCK_RECEIVED"
  );
  const details = await Promise.all(
    receipts.map((receipt) => getWarehouseDistribution(receipt.warehouseDistributionId))
  );

  let smallestUnits = 0;
  details.forEach((distribution) => {
    (distribution?.lines ?? []).forEach((line) => {
      if (line.batchId !== batch.batchId) return;
      if (line.packagingId && batch.packagingId && line.packagingId !== batch.packagingId) return;
      smallestUnits += Number(line.receivedQuantity) || 0;
    });
  });
  return round2(smallestUnits / batch.unitContains);
};

/** Paid quantity is in purchase units; free stock may be entered in either unit. */
const receivedThroughPurchases = async (batch: AdjustableBatch) => {
  const purchases = await getAllPurchases();

  let purchaseUnits = 0;
  purchases.forEach((purchase) => {
    (purchase.purchaseDetails ?? []).forEach((detail) => {
      if (detail.batchId !== batch.batchId) return;
      const perPack = Number(detail.unitContains) > 0 ? Number(detail.unitContains) : batch.unitContains;
      const free = Number(detail.freeQuantity) || 0;
      const freeInSmallestUnits =
        sameText(detail.freeUnit, detail.smallestUnit) &&
        !sameText(detail.freeUnit, detail.purchaseUnit);
      purchaseUnits +=
        (Number(detail.purchaseQuantity) || 0) + (freeInSmallestUnits ? free / perPack : free);
    });
  });
  return round2(purchaseUnits);
};

export const fetchReceivedLimit = async (
  batch: AdjustableBatch,
  source: StockSource
): Promise<ReceivedLimit> => ({
  source,
  quantity:
    source === "receipt"
      ? await receivedThroughReceipts(batch)
      : await receivedThroughPurchases(batch),
});

export const receivedLimitError = (limit: ReceivedLimit, unit: string) => {
  const qty = unit ? `${limit.quantity} ${unit}` : String(limit.quantity);
  return limit.source === "receipt"
    ? `Cannot exceed ${qty} received through Warehouse Receipt.`
    : `Cannot exceed ${qty} purchased for this batch.`;
};
