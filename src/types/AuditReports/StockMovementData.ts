// Types for GET /auditReports/stock-movement (StockMovementReportController in pharma-backend).

/** Movement Type codes; the backend sends a display label with each row. */
export type StockMovementType =
  | "PURCHASE_RECEIPT"
  | "ALLOCATION_IN"
  | "ALLOCATION_OUT"
  | "STOCK_TRANSFER_IN"
  | "STOCK_TRANSFER_OUT"
  | "PHARMACY_SALE"
  | "SALES_RETURN"
  | "PURCHASE_RETURN"
  | "DAMAGE_CAPTURE"
  | "DAMAGE_RETURN"
  | "EXPIRED_STOCK_RETURN"
  | "STOCK_ADJUSTMENT";

/** Holder of a movement row's stock. */
export type StockMovementLocationType = "PHARMACY" | "WAREHOUSE";

export type StockMovementReportSortBy =
  | "transactionDate"
  | "movementType"
  | "referenceNo"
  | "locationName"
  | "productName"
  | "batchNo"
  | "source"
  | "destination"
  | "stockIn"
  | "stockOut"
  | "balanceQuantity";

/**
 * Query filters for the Stock Movement Report (StockMovementReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface StockMovementReportFilter {
  // Reporting period as YYYY-MM-DD, both inclusive. Today / Specific Day /
  // By Month / By Date Range all resolve to this pair on the client.
  // Backend default today.
  fromDate?: string;
  toDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access;
  // only one sent = just those locations of that kind.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Product Name: by id, or by exact name (case-insensitive).
  productIds?: string[];
  productNames?: string[];
  // Free-text search on the batch number.
  batchNo?: string;
  movementTypes?: StockMovementType[];
  // Free-text search on the transaction reference number.
  referenceNo?: string;
  // Pharmacy or warehouse ids on either side of an internal movement
  // (allocation, transfer, warehouse return).
  sourceLocationIds?: string[];
  destinationLocationIds?: string[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default transactionDate.
  sortBy?: StockMovementReportSortBy;
  // Backend default asc.
  sortDir?: "asc" | "desc";
}

/** One movement row of the Stock Movement Details table (StockMovementReportRowDto). */
export interface StockMovementReportRow {
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  transactionDate: string;
  // Code for filtering, label (e.g. "Allocation In") for display.
  movementType: StockMovementType;
  movementTypeLabel: string;
  referenceNo: string;
  // Pharmacy or warehouse whose stock moved.
  locationType: StockMovementLocationType;
  locationName: string;
  // null where the movement has no such side (shown as "---").
  source: string | null;
  destination: string | null;
  // Both stay 0 on a Damage Capture row: damaged units never enter stock.
  stockIn: number;
  stockOut: number;
  // Opening stock plus every movement up to and including this one.
  balanceQuantity: number;
}

/** One page of the Stock Movement Details table (StockMovementReportPageDto). */
export interface StockMovementReportPage {
  data: StockMovementReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/**
 * KPI cards and the "Total Movement" row, over every row matching the filters,
 * not just the current page (StockMovementReportSummaryDto). Opening / closing
 * stock ignore the movementTypes, referenceNo and source / destination filters;
 * the stock in / out totals honour them.
 */
export interface StockMovementReportSummary {
  openingStock: number;
  totalStockIn: number;
  totalStockOut: number;
  closingStock: number;
}

/** GET /auditReports/stock-movement (StockMovementReportResponse). */
export interface StockMovementReportResponse {
  summary: StockMovementReportSummary;
  movementDetails: StockMovementReportPage;
  // Already formatted by the backend, e.g. "08-Oct-2026".
  fromDate: string;
  toDate: string;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
