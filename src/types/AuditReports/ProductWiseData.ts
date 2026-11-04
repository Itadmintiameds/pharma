// Types for GET /auditReports/product-wise (ProductWiseReportController in pharma-backend).

/**
 * Query filters for the Product-wise Purchase and Sales Analysis Report (ProductWiseReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface ProductWiseReportFilter {
  // Reporting period as YYYY-MM-DD, both inclusive. Today / Specific Day /
  // By Month / By Date Range all resolve to this pair on the client.
  // Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Both empty = every pharmacy and warehouse the logged-in user can access
  // (Reporting Scope: Organization).
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Product Name: by id, or by exact name (case-insensitive).
  productIds?: string[];
  productNames?: string[];
  // Batch No.: free-text search.
  batchNo?: string;
  // Supplier Name: supplier master ids. Purchases and supplier returns are
  // narrowed to the supplier; sales to batches bought from that supplier.
  supplierIds?: number[];
  productCategoryIds?: number[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10, capped at 100.
  size?: number;
  // Print / PDF: every matching row on one page, ignoring page and size.
  // Refused by the backend above 2,000 rows.
  unpaged?: boolean;
  // Backend default productName.
  sortBy?: ProductWiseReportSortBy;
  // Backend default asc.
  sortDir?: "asc" | "desc";
}

export type ProductWiseReportSortBy =
  | "productName"
  | "batchNo"
  | "purchaseQuantity"
  | "supplierReturnQuantity"
  | "netPurchaseQuantity"
  | "saleQuantity"
  | "salesReturnQuantity"
  | "netSaleQuantity"
  | "purchaseAmount"
  | "supplierReturnAmount"
  | "netPurchaseAmount"
  | "saleAmount"
  | "salesReturnAmount"
  | "netSaleAmount";

/**
 * One product batch (ProductWiseReportRowDto): feeds both the Quantity Analysis
 * and the Purchase and Sales Value Analysis tables. Quantities are in stock
 * (smallest) units, so purchase and sales sides are comparable.
 */
export interface ProductWiseReportRow {
  productId: string;
  productName: string;
  batchNo: string;
  purchaseQuantity: number;
  supplierReturnQuantity: number;
  netPurchaseQuantity: number;
  saleQuantity: number;
  salesReturnQuantity: number;
  netSaleQuantity: number;
  purchaseAmount: number;
  supplierReturnAmount: number;
  netPurchaseAmount: number;
  saleAmount: number;
  salesReturnAmount: number;
  netSaleAmount: number;
}

/** One page of the Product-wise Analysis tables (ProductWiseReportPageDto). */
export interface ProductWiseReportPage {
  data: ProductWiseReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/**
 * KPI cards and both tables' Total rows, over every row matching the filters,
 * not just the current page (ProductWiseReportSummaryDto).
 */
export interface ProductWiseReportSummary {
  // "4 products" badge: distinct products; lineItemCount counts product batches.
  productCount: number;
  lineItemCount: number;
  totalPurchaseQuantity: number;
  // Net Purchase Qty card: "95 units returned to suppliers".
  totalSupplierReturnQuantity: number;
  totalNetPurchaseQuantity: number;
  totalSaleQuantity: number;
  // Net Sales Qty card: "35 units returned by customers".
  totalSalesReturnQuantity: number;
  totalNetSaleQuantity: number;
  totalPurchaseAmount: number;
  // Net Purchase Amount card: "₹4,850 returned to suppliers".
  totalSupplierReturnAmount: number;
  totalNetPurchaseAmount: number;
  totalSaleAmount: number;
  // Net Sales Amount card: "₹2,000 returned by customers".
  totalSalesReturnAmount: number;
  totalNetSaleAmount: number;
}

/** GET /auditReports/product-wise (ProductWiseReportResponse). */
export interface ProductWiseReportResponse {
  summary: ProductWiseReportSummary;
  productDetails: ProductWiseReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "12-Oct-2026 05:30 PM".
  generatedOn: string;
}
