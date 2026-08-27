import { PurchaseData } from "@/types/PurchaseData";
import { DailySeriesPoint, lastNDays, toDateKey } from "../dailySeries";

/**
 * There is no backend purchase-summary endpoint yet, so this trend chart is
 * aggregated client-side from the full list returned by getAllPurchases().
 * Fine at current data volumes; if that list grows large this should move to
 * a backend KPI endpoint instead (matching the pattern of
 * getUserPharmacyKPIs / getBatchExpiryKpi).
 */

/** Daily purchase spend for the last `days` days, oldest first. */
export const getPurchaseSpendByDay = (
  purchases: PurchaseData[],
  days = 30
): DailySeriesPoint[] => {
  const series = lastNDays(days);
  const byDate = new Map(series.map((point) => [point.date, point]));

  for (const purchase of purchases) {
    if (!purchase.invoiceDate) continue;
    const key = toDateKey(new Date(purchase.invoiceDate));
    const point = byDate.get(key);
    if (point) point.value += purchase.totalNetAmount ?? 0;
  }

  return series;
};

/** Total value of every purchase (all time). */
export const getTotalPurchaseAmount = (purchases: PurchaseData[]): number =>
  purchases.reduce((sum, purchase) => sum + (purchase.totalNetAmount ?? 0), 0);

/**
 * Total product quantity across every purchase's line items (all time).
 * getAllPurchases() doesn't always nest purchaseDetails on every row (see the
 * same caveat in the Sales & Billing invoice code), so this can undercount —
 * best available without an extra per-purchase fetch.
 */
export const getTotalProductsPurchased = (purchases: PurchaseData[]): number =>
  purchases.reduce(
    (sum, purchase) =>
      sum +
      (purchase.purchaseDetails ?? []).reduce(
        (lineSum, line) => lineSum + (line.purchaseQuantity ?? 0),
        0
      ),
    0
  );
