// Types for GET /auditReports/stock-damage (StockDamageReportController in pharma-backend).

// STOCK_RETURN: damaged stock sent back to a warehouse or supplier.
// STOCK_ADJUSTMENT: damaged stock written off.
export type StockDamageTransactionType = "STOCK_RETURN" | "STOCK_ADJUSTMENT";

/**
 * Query filters for the Stock Damage Report (StockDamageReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface StockDamageReportFilter {
  // Reporting period on the transaction date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair
  // on the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access; only one
  // sent = just those locations of that kind. A stock return is in scope
  // through its source pharmacy or its destination warehouse.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Product Name: by id, or by exact name (case-insensitive).
  productIds?: string[];
  productNames?: string[];
  productCategoryIds?: number[];
  // Brand Name: exact brand names (case-insensitive).
  brandNames?: string[];
  // Batch No.: free-text search on the batch number.
  batchNo?: string;
  // Supplier on the purchase invoice the batch came in on.
  supplierIds?: number[];
  // Empty or ALL = both kinds. Labels ("Stock Return") are also accepted.
  transactionTypes?: (StockDamageTransactionType | "ALL")[];
  // Reference Number: free-text search on the return / adjustment number.
  referenceNumber?: string;
  // Destination: warehouses (stock returns from a pharmacy) and suppliers
  // (purchase returns). Adjustments have no destination, so sending either
  // list leaves them out.
  destinationWarehouseIds?: string[];
  destinationSupplierIds?: number[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default transactionDate.
  sortBy?: StockDamageReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type StockDamageReportSortBy =
  | "transactionDate"
  | "productName"
  | "batchNo"
  | "expiryDate"
  | "transactionType"
  | "referenceNumber"
  | "source"
  | "destination"
  | "returnedQuantity"
  | "adjustedQuantity"
  | "totalDamagedQuantity";

/** One return line or adjustment of the Damage Transactions table (StockDamageReportRowDto). */
export interface StockDamageReportRow {
  // Already "dd-MMM-yyyy" from the backend.
  transactionDate: string;
  productName: string;
  batchNo: string;
  // Already "MM/yyyy" from the backend, e.g. "12/2027".
  expiryDate: string;
  transactionType: StockDamageTransactionType;
  // "Stock Return" / "Stock Adjustment".
  transactionTypeLabel: string;
  referenceNumber: string;
  // Pharmacy / warehouse the stock left from.
  sourceName: string;
  // Warehouse or supplier; null for an adjustment (shown as "---").
  destinationName: string | null;
  // Long on the backend, so may come back null.
  returnedQuantity: number | null;
  adjustedQuantity: number | null;
  totalDamagedQuantity: number | null;
}

/** One page of the Damage Transactions table (StockDamageReportPageDto). */
export interface StockDamageReportPage {
  data: StockDamageReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI cards and the table's Total row, over every row matching the filters (StockDamageReportSummaryDto). */
export interface StockDamageReportSummary {
  returnedQuantity: number | null;
  adjustedQuantity: number | null;
  totalDamagedQuantity: number | null;
}

/** GET /auditReports/stock-damage (StockDamageReportResponse). */
export interface StockDamageReportResponse {
  summary: StockDamageReportSummary;
  damageTransactions: StockDamageReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
