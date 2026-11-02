// Types for GET /auditReports/purchase-register (PurchaseRegisterReportController in pharma-backend).

/**
 * Query filters for the Purchase Register Report (PurchaseRegisterReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface PurchaseRegisterReportFilter {
  // Reporting period on the purchase invoice date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair
  // on the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access; only one
  // sent = just those locations of that kind. Pharmacy = direct pharmacy
  // purchases, warehouse = centrally managed purchases.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  supplierIds?: number[];
  // Purchase Invoice No.: free-text search on the supplier invoice number.
  invoiceNumber?: string;
  // Product Name: exact product names (case-insensitive).
  productNames?: string[];
  productCategoryIds?: number[];
  // Brand Name: exact brand names (case-insensitive).
  brandNames?: string[];
  // Batch No.: free-text search on the batch number.
  batchNo?: string;
  // Expiry Month/Year range as "yyyy-MM" (or "MM/yyyy"), both months inclusive.
  // Either end may be left open.
  expiryFrom?: string;
  expiryTo?: string;
  // GST Rate: 0, 5, 12, 18, 28 ("Exempted" lines count as 0).
  gstPercentages?: number[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default purchaseDate.
  sortBy?: PurchaseRegisterReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type PurchaseRegisterReportSortBy =
  | "purchaseDate"
  | "invoiceNumber"
  | "supplierName"
  | "locationName"
  | "productName"
  | "batchNo"
  | "expiryDate"
  | "purchasedQuantity"
  | "freeQuantity"
  | "purchaseRate"
  | "grossAmount"
  | "discount"
  | "taxableAmount"
  | "gstPercentage"
  | "gstAmount"
  | "totalAmount";

/** One purchase invoice line of the Purchase Details table (PurchaseRegisterReportRowDto). */
export interface PurchaseRegisterReportRow {
  // Already "dd-MMM-yyyy" from the backend.
  purchaseDate: string;
  invoiceNumber: string;
  supplierName: string;
  // Pharmacy or warehouse the purchase was received into.
  locationName: string;
  productName: string;
  batchNo: string;
  // Already "MM/yyyy" from the backend, e.g. "12/2027".
  expiryDate: string;
  purchasedQuantity: number;
  freeQuantity: number;
  // Gross amount / purchased quantity.
  purchaseRate: number;
  grossAmount: number;
  discount: number;
  // grossAmount - discount.
  taxableAmount: number;
  // GST slab as recorded on the invoice line: "5%", "18%", "Exempted".
  gstPercentage: string;
  gstAmount: number;
  // taxableAmount + gstAmount.
  totalAmount: number;
}

/** One page of the Purchase Details table (PurchaseRegisterReportPageDto). */
export interface PurchaseRegisterReportPage {
  data: PurchaseRegisterReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI cards and the table's Total row, over every row matching the filters (PurchaseRegisterReportSummaryDto). */
export interface PurchaseRegisterReportSummary {
  // Purchase Invoices card: "4", "5 line items purchased".
  purchaseInvoiceCount: number;
  lineItemCount: number;
  // Total Purchase Amount card: "₹16,026.50", "₹14,535.00 taxable value".
  totalPurchaseAmount: number;
  taxableAmount: number;
  // GST Amount card: "₹1,491.50", "9% of total amount".
  gstAmount: number;
  gstSharePercentage: number;
  // Purchased Quantity card: "410", "15 units received free".
  purchasedQuantity: number;
  freeQuantity: number;
}

/** GET /auditReports/purchase-register (PurchaseRegisterReportResponse). */
export interface PurchaseRegisterReportResponse {
  summary: PurchaseRegisterReportSummary;
  purchaseDetails: PurchaseRegisterReportPage;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
