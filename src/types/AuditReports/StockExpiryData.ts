// Types for GET /auditReports/stock-expiry (StockExpiryReportController in pharma-backend).

// Relative to asOfDate. EXPIRED: past expiry; EXPIRING_THIS_MONTH: expires later
// this month; EXPIRING_SOON: after this month but within 3 months (fixed on the
// backend, independent of Expiry Within); VALID: everything else.
export type StockExpiryStatus = "EXPIRED" | "EXPIRING_THIS_MONTH" | "EXPIRING_SOON" | "VALID";

/**
 * Query filters for the Stock Expiry Report (StockExpiryReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface StockExpiryReportFilter {
  // YYYY-MM-DD. Expiry status, days to expiry, "this month" and Expiry Within
  // are all worked out relative to this day. Backend default today.
  asOfDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access; only one
  // sent = just those locations of that kind.
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
  // Suppliers on the purchase invoice the batch came in on.
  supplierIds?: number[];
  // Backend default ALL. With no Expiry Within or expiry month range, ALL leaves
  // VALID batches out; send VALID to see them.
  expiryStatus?: StockExpiryStatus | "ALL";
  // Expiry Within: batches not yet expired that expire within this many months
  // (dropdown) or days (Custom). Send at most one.
  expiryWithinMonths?: number;
  expiryWithinDays?: number;
  // Expiry month range on the batch as YYYY-MM, both months inclusive.
  expiryFromMonth?: string;
  expiryToMonth?: string;
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default expiryDate.
  sortBy?: StockExpiryReportSortBy;
  // Backend default asc.
  sortDir?: "asc" | "desc";
}

export type StockExpiryReportSortBy =
  | "locationName"
  | "productName"
  | "batchNo"
  | "supplierName"
  | "expiryDate"
  | "monthsToExpiry"
  | "quantity"
  | "damagedQuantity";

/** One location + product + batch row of the Expiry Details table (StockExpiryReportRowDto). */
export interface StockExpiryReportRow {
  locationType: "PHARMACY" | "WAREHOUSE";
  locationName: string;
  productName: string;
  batchNo: string;
  supplierName: string;
  // Already "dd-MMM-yyyy" from the backend.
  expiryDate: string;
  // Despite the name, days left until expiry (negative once expired).
  monthsToExpiry: number;
  expiryStatus: StockExpiryStatus;
  // Units on hand.
  quantity: number;
  // Damaged units received at the location and not sent back (never in inventory).
  damagedQuantity: number;
}

/** One page of the Expiry Details table (StockExpiryReportPageDto). */
export interface StockExpiryReportPage {
  data: StockExpiryReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/**
 * KPI totals over every row matching the filters, not just the current page
 * (StockExpiryReportSummaryDto). Batches are location + product + batch rows.
 */
export interface StockExpiryReportSummary {
  expiredStock: number;
  expiredBatches: number;
  expiringThisMonthQuantity: number;
  expiringThisMonthBatches: number;
  expiringSoonQuantity: number;
  expiringSoonBatches: number;
  totalStock: number;
  totalStockBatches: number;
}

/** GET /auditReports/stock-expiry (StockExpiryReportResponse). */
export interface StockExpiryReportResponse {
  summary: StockExpiryReportSummary;
  expiryDetails: StockExpiryReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
