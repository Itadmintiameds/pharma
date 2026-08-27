import { ProductStockSummary } from "@/types/ProductData";

/** How many products have no stock left at all. */
export const getOutOfStockCount = (summaries: ProductStockSummary[]): number =>
  summaries.filter((summary) => summary.overallStatus === "OUT_OF_STOCK").length;
