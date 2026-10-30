// Types for GET /auditReports/current-stock-summary (CurrentStockSummaryController in pharma-backend).

/** Stock Status filter values; the backend defaults to ALL. */
export type CurrentStockStatus =
  | "ALL"
  | "IN_STOCK"
  | "OUT_OF_STOCK"
  | "DAMAGED_STOCK_HELD"
  | "EXPIRED_STOCK_HELD";

/** Holder of a Stock Details row. */
export type CurrentStockLocationType = "PHARMACY" | "WAREHOUSE";

export type CurrentStockSummarySortBy =
  | "locationName"
  | "productName"
  | "batchNo"
  | "expiryDate"
  | "closingStock"
  | "damagedStock"
  | "expiredStock"
  | "availableStock";

/**
 * Query filters for the Current Stock Summary Report (CurrentStockSummaryFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface CurrentStockSummaryFilter {
  // Stock is reported as it stood at the end of this day (YYYY-MM-DD). Defaults to today.
  asOfDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access;
  // only one sent = just those locations of that kind.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Product Name: by id, or by exact name (case-insensitive).
  productIds?: string[];
  productNames?: string[];
  productCategoryIds?: number[];
  // Exact brand names (case-insensitive).
  brandNames?: string[];
  // Free-text search on the batch number.
  batchNo?: string;
  // Batch expiry range as YYYY-MM-DD, both inclusive.
  expiryFromDate?: string;
  expiryToDate?: string;
  stockStatus?: CurrentStockStatus;
  // 0-based; offset = page * size. Backend default 0 / 10.
  page?: number;
  size?: number;
  // Backend default availableStock desc.
  sortBy?: CurrentStockSummarySortBy;
  sortDir?: "asc" | "desc";
}

/**
 * One location + product + batch row of the Stock Details table (CurrentStockSummaryRowDto).
 * closingStock = damagedStock + expiredStock + availableStock.
 */
export interface CurrentStockSummaryRow {
  locationType: CurrentStockLocationType;
  locationName: string;
  productName: string;
  batchNo: string;
  // Already formatted by the backend, e.g. "08-Oct-2026".
  expiryDate: string;
  closingStock: number;
  damagedStock: number;
  expiredStock: number;
  availableStock: number;
}

/** One page of the Stock Details table (CurrentStockSummaryPageDto). */
export interface CurrentStockSummaryPage {
  data: CurrentStockSummaryRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI totals over every row matching the filters, not just the current page (CurrentStockSummaryTotalsDto). */
export interface CurrentStockSummaryTotals {
  totalClosingStock: number;
  totalDamagedStock: number;
  totalExpiredStock: number;
  totalAvailableStock: number;
}

/** GET /auditReports/current-stock-summary (CurrentStockSummaryResponse). */
export interface CurrentStockSummaryResponse {
  summary: CurrentStockSummaryTotals;
  stockDetails: CurrentStockSummaryPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
