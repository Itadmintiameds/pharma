import type { BadgeStatus } from "@/app/components/common/table/StatusBadge";
import type {
  ProductBatchDetails,
  ProductListItem,
  StockStatus,
} from "@/types/ProductData";

/** A batch expiring within this many days is flagged "Near Expiry". */
export const NEAR_EXPIRY_DAYS = 30;

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
  brandName: string;
  /** Pack description, e.g. "1 Box = 15 Tablet". Empty when the product has no package. */
  variant: string;
  totalStock: number;
  nearestExpiryDate: string | null;
  status: BadgeStatus;
  /** The source item, so callers can reach batches/HSN/GST when adding stock. */
  source: ProductListItem;
}

/** Every batch of a product, whether it sits under a package or unassigned. */
const allBatches = (item: ProductListItem): ProductBatchDetails[] => [
  ...(item.packages?.flatMap((pkg) => pkg.batches ?? []) ?? []),
  ...(item.unassignedBatches ?? []),
];

const firstVariant = (item: ProductListItem): string => {
  const pkg = item.packages?.[0];
  if (!pkg) return "";
  return `1 ${pkg.purchaseUnit} = ${pkg.purchaseUnitContains} ${pkg.smallestUnit}`;
};

/**
 * Collapse a product into the single row the search table renders.
 * Stock and expiry come from the batches when present, otherwise from the
 * pre-aggregated fields the stock-summary shape provides.
 */
export const toProductStockRow = (item: ProductListItem): ProductStockRow => {
  const batches = allBatches(item);

  const totalStock = batches.length
    ? batches.reduce((sum, b) => sum + (b.stockQuantity ?? 0), 0)
    : item.totalStock ?? 0;

  const inStockExpiries = batches
    .filter((b) => (b.stockQuantity ?? 0) > 0)
    .map((b) => b.expiryDate)
    .filter(Boolean);

  const nearestExpiryDate = inStockExpiries.length
    ? inStockExpiries.reduce((earliest, d) => (d < earliest ? d : earliest))
    : item.nearestExpiryDate ?? null;

  let status: BadgeStatus;
  if (totalStock <= 0) {
    status = "Out of Stock";
  } else if (nearestExpiryDate) {
    const days = daysUntil(nearestExpiryDate);
    status = days < 0 ? "Expired" : days <= NEAR_EXPIRY_DAYS ? "Near Expiry" : "Healthy";
  } else {
    status = item.overallStatus ? STOCK_STATUS_BADGE[item.overallStatus] : "Healthy";
  }

  return {
    productId: item.productId,
    productName: item.productName,
    brandName: item.brandName ?? "",
    variant: firstVariant(item),
    totalStock,
    nearestExpiryDate,
    status,
    source: item,
  };
};

/** Case-insensitive match on product name, brand, or product id. */
export const matchesProductQuery = (row: ProductStockRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.productName.toLowerCase().includes(q) ||
    row.brandName.toLowerCase().includes(q) ||
    row.productId.toLowerCase().includes(q)
  );
};
