// Types for GET /auditReports/* (AuditReportsController in pharma-backend).

/**
 * Query filters for the Inventory Sales Report (InventorySalesReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface InventorySalesReportFilter {
  // Reporting period as YYYY-MM-DD, both inclusive. Today / Specific Day /
  // By Month / By Date Range all resolve to this pair on the client.
  fromDate?: string;
  toDate?: string;
  // Empty = every pharmacy the logged-in user can access.
  pharmacyIds?: string[];
  // Product Name: by id, or by exact name (case-insensitive).
  productIds?: string[];
  productNames?: string[];
  productCategoryIds?: number[];
  // HSN Code: picked codes, and/or a free-text prefix search.
  hsnCodes?: string[];
  hsnSearch?: string;
  gstPercentages?: number[];
  // Referred By. Walk-in bills carry no doctor, so they drop out when this is set.
  doctorIds?: number[];
  // WALK_IN, OP_PATIENT, IP_PATIENT, DAYCARE.
  patientTypes?: string[];
  // H, H1, X ... as stored on the molecule master.
  drugSchedules?: string[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default netSales.
  sortBy?: InventorySalesReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type InventorySalesReportSortBy =
  | "productName"
  | "saleQuantity"
  | "returnQuantity"
  | "netSaleQuantity"
  | "saleAmount"
  | "returnAmount"
  | "netSales";

/** One pharmacy + product row of the Product Sales Details table (InventorySalesReportRowDto). */
export interface InventorySalesReportRow {
  pharmacyName: string;
  productName: string;
  saleQuantity: number;
  returnQuantity: number;
  netSaleQuantity: number;
  saleAmount: number;
  returnAmount: number;
  netSales: number;
}

/** One page of the Product Sales Details table (InventorySalesReportPageDto). */
export interface InventorySalesReportPage {
  data: InventorySalesReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI totals over every row matching the filters, not just the current page (InventorySalesReportSummaryDto). */
export interface InventorySalesReportSummary {
  totalSaleAmount: number;
  totalReturnAmount: number;
  totalNetSales: number;
  totalNetSaleQuantity: number;
}

/** GET /auditReports/inventory-sales (InventorySalesReportResponse). */
export interface InventorySalesReportResponse {
  summary: InventorySalesReportSummary;
  productSalesDetails: InventorySalesReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
