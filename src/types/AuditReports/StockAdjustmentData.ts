// Types for GET /auditReports/stock-adjustment (StockAdjustmentReportController in pharma-backend).
// The controller is still a stub, so these follow the Stock Adjustment Report design
// and the other /auditReports/* endpoints; align them with the DTOs once they exist.

// As stored in adjustment_type; the backend also accepts the labels "Stock Increase" / "Stock Decrease".
export type StockAdjustmentType = "INCREASE" | "DECREASE";

/**
 * Query filters for the Stock Adjustment Report.
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface StockAdjustmentReportFilter {
  // Reporting period on the adjustment date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair
  // on the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Empty = every pharmacy the logged-in user can access.
  pharmacyIds?: string[];
  // Product Name: exact product names (case-insensitive).
  productNames?: string[];
  productCategoryIds?: number[];
  // Brand Name: exact brand names (case-insensitive).
  brandNames?: string[];
  // Batch No.: free-text search on the batch number.
  batchNo?: string;
  // Expiry month of the batch as YYYY-MM.
  expiryMonth?: string;
  // Supplier on the purchase invoice the batch came in on.
  supplierIds?: number[];
  // A single value, not a list. Empty or ALL = both directions.
  adjustmentType?: StockAdjustmentType | "ALL";
  // The reason text as saved by Stock Adjustment ("Damaged Stock", "Other" ...),
  // matched exactly (case-insensitive). Empty = every reason.
  adjustmentReasons?: string[];
  // Adjustment Ref. No.: free-text search on the adjustment number.
  referenceNumber?: string;
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Print / PDF: every matching row on one page, ignoring page and size.
  // Refused by the backend above 2,000 rows.
  unpaged?: boolean;
  // Backend default adjustmentDate.
  sortBy?: StockAdjustmentReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type StockAdjustmentReportSortBy = "adjustmentDate" | "productName";

/** One adjustment line of the Adjustment Transactions table. */
export interface StockAdjustmentReportRow {
  // Already "dd-MMM-yyyy" from the backend.
  adjustmentDate: string;
  pharmacyName: string;
  referenceNumber: string;
  productName: string;
  batchNo: string;
  // Already "MM/yyyy" from the backend, e.g. "12/2027".
  expiryDate: string;
  adjustmentType: StockAdjustmentType;
  // "Stock Increase" / "Stock Decrease".
  adjustmentTypeLabel: string;
  // As entered on the adjustment, e.g. "Damaged Stock".
  adjustmentReason: string;
  stockBefore: number;
  adjustmentIn: number;
  adjustmentOut: number;
  // adjustmentIn - adjustmentOut.
  netAdjustment: number;
  stockAfter: number;
}

/** One page of the Adjustment Transactions table. */
export interface StockAdjustmentReportPage {
  data: StockAdjustmentReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI cards and the table's Total row, over every row matching the filters. */
export interface StockAdjustmentReportSummary {
  // Units added and the number of Stock Increase adjustments.
  stockIncreaseQuantity: number;
  stockIncreaseCount: number;
  // Units removed and the number of Stock Decrease adjustments.
  stockDecreaseQuantity: number;
  stockDecreaseCount: number;
  // stockIncreaseQuantity - stockDecreaseQuantity.
  netAdjustment: number;
}

/** GET /auditReports/stock-adjustment. */
export interface StockAdjustmentReportResponse {
  summary: StockAdjustmentReportSummary;
  adjustmentTransactions: StockAdjustmentReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
