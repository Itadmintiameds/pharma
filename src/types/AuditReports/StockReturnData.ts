// Types for GET /auditReports/stock-return (StockReturnReportController in pharma-backend).

// Return types and reasons the backend matches on; the table shows their labels.
export type StockReturnType = "PHARMACY_TO_WAREHOUSE" | "WAREHOUSE_TO_SUPPLIER" | "PHARMACY_TO_SUPPLIER";
export type StockReturnReason = "DAMAGE" | "EXPIRY" | "OTHER";

/**
 * Query filters for the Stock Return Report (StockReturnReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface StockReturnReportFilter {
  // Reporting period on the return date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair
  // on the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access; only one
  // sent = just those locations of that kind. A pharmacy → warehouse return is
  // in scope through its source pharmacy or its destination warehouse; a
  // return to a supplier through its source.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Product Name: exact product names (case-insensitive).
  productNames?: string[];
  productCategoryIds?: number[];
  // Brand Name: exact brand names (case-insensitive).
  brandNames?: string[];
  // Batch No.: free-text search on the batch number.
  batchNo?: string;
  // The supplier returned to, or for a return to a warehouse the supplier on
  // the purchase invoice the batch came in on.
  supplierIds?: number[];
  // Empty or ALL = every type. Labels ("Pharmacy → Warehouse") are also accepted.
  returnTypes?: (StockReturnType | "ALL")[];
  // Any other value matches the entered reason text exactly (case-insensitive).
  // Empty or ALL = every reason.
  returnReasons?: (StockReturnReason | "ALL")[];
  // Stock Return Reference No.: free-text search on the return number.
  referenceNumber?: string;
  // Source Location: PHARMACY, WAREHOUSE.
  sourceLocationTypes?: string[];
  // Destination: SUPPLIER, WAREHOUSE.
  destinationTypes?: string[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Print / PDF: every matching row on one page, ignoring page and size.
  // Refused by the backend above 2,000 rows.
  unpaged?: boolean;
  // Backend default returnDate.
  sortBy?: StockReturnReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type StockReturnReportSortBy =
  | "returnDate"
  | "referenceNumber"
  | "returnType"
  | "source"
  | "destination"
  | "productName"
  | "batchNo"
  | "expiryDate"
  | "returnReason"
  | "returnedQuantity";

/** One return line of the Return Transactions table (StockReturnReportRowDto). */
export interface StockReturnReportRow {
  // Already "dd-MMM-yyyy" from the backend.
  returnDate: string;
  referenceNumber: string;
  returnType: StockReturnType;
  // "Pharmacy → Warehouse" etc.
  returnTypeLabel: string;
  // Pharmacy / warehouse the stock left from.
  sourceName: string;
  // Warehouse or supplier the stock went to.
  destinationName: string;
  productName: string;
  batchNo: string;
  // Already "MM/yyyy" from the backend, e.g. "12/2027".
  expiryDate: string;
  returnReason: StockReturnReason;
  returnedQuantity: number;
}

/** One page of the Return Transactions table (StockReturnReportPageDto). */
export interface StockReturnReportPage {
  data: StockReturnReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI cards and the table's Total row, over every row matching the filters (StockReturnReportSummaryDto). */
export interface StockReturnReportSummary {
  totalReturnedQuantity: number;
  damageQuantity: number;
  expiryQuantity: number;
}

/** GET /auditReports/stock-return (StockReturnReportResponse). */
export interface StockReturnReportResponse {
  summary: StockReturnReportSummary;
  returnTransactions: StockReturnReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
