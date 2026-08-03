import type { BadgeStatus } from "@/app/components/common/table/StatusBadge";
import type { ProductStockSummary, StockStatus } from "@/types/ProductData";

/** Whole days from today (midnight) to the given date; negative if past. */
export const daysUntil = (iso: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

/** Shelf-life text for an expiry date, e.g. "185 days" / "Expired". */
export const formatShelfLife = (iso: string | null): string => {
  if (!iso) return "—";
  const days = daysUntil(iso);
  if (Number.isNaN(days)) return "—";
  return days < 0 ? "Expired" : `${days} days`;
};

const STOCK_STATUS_BADGE: Record<StockStatus, BadgeStatus> = {
  ACTIVE: "Healthy",
  NEAR_EXPIRY: "Near Expiry",
  EXPIRED: "Expired",
  OUT_OF_STOCK: "Out of Stock",
};

/** One row of the purchase product-search table. */
export interface ProductStockRow {
  productId: string;
  productName: string;
  totalStock: number;
  nearestExpiryDate: string | null;
  status: BadgeStatus;
  /** The source row, so callers can reach the batch counts. */
  source: ProductStockSummary;
}

/**
 * Maps a stock-summary row onto the search table's row shape. The status comes
 * straight from `overallStatus` — the backend derives it from batch-level data
 * the summary doesn't expose, so it is more accurate than anything we could
 * recompute from `nearestExpiryDate` alone.
 */
export const toProductStockRow = (item: ProductStockSummary): ProductStockRow => ({
  productId: item.productId,
  productName: item.productName,
  totalStock: item.totalStock ?? 0,
  nearestExpiryDate: item.nearestExpiryDate ?? null,
  status: item.overallStatus
    ? STOCK_STATUS_BADGE[item.overallStatus]
    : (item.totalStock ?? 0) > 0
      ? "Healthy"
      : "Out of Stock",
  source: item,
});

/** Case-insensitive match on product name or product id. */
export const matchesProductQuery = (row: ProductStockRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.productName.toLowerCase().includes(q) ||
    row.productId.toLowerCase().includes(q)
  );
};
