// Types for GET /auditReports/supplier-purchase-return (SupplierPurchaseReturnReportController in pharma-backend).

// PurchaseReturnStatus in pharma-backend.
export type PurchaseReturnStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

/**
 * Query filters for the Supplier Purchase Return Report (SupplierPurchaseReturnReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface SupplierPurchaseReturnReportFilter {
  // Reporting period on the purchase return date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair
  // on the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Neither sent = every pharmacy and warehouse the user can access; only one
  // sent = just those locations of that kind. Pharmacy = single-pharmacy
  // returns, warehouse = centrally managed returns.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Supplier master ids, taken from the original purchase invoice.
  supplierIds?: number[];
  // Purchase Return No.: free-text search on the return number.
  purchaseReturnNo?: string;
  // Purchase Invoice No.: free-text search on the original invoice number.
  purchaseInvoiceNo?: string;
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
  // Not sent = CONFIRMED (the screen's default); ALL = every status.
  statuses?: (PurchaseReturnStatus | "ALL")[];
  // GST Rate: 0, 5, 12, 18, 28 ("Exempted" lines count as 0).
  gstPercentages?: number[];
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Print / PDF: every matching row on one page, ignoring page and size.
  // Refused by the backend above 2,000 rows.
  unpaged?: boolean;
  // Backend default returnDate.
  sortBy?: SupplierPurchaseReturnReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type SupplierPurchaseReturnReportSortBy =
  | "returnDate"
  | "purchaseReturnNo"
  | "purchaseInvoiceNo"
  | "supplierName"
  | "locationName"
  | "productName"
  | "batchNo"
  | "expiryDate"
  | "returnReason"
  | "returnQuantity"
  | "freeReturnQuantity"
  | "returnRate"
  | "grossAmount"
  | "discount"
  | "taxableAmount"
  | "gstPercentage"
  | "gstAmount"
  | "totalAmount"
  | "status";

/** One purchase return line of the Purchase Return Details table (SupplierPurchaseReturnReportRowDto). */
export interface SupplierPurchaseReturnReportRow {
  // Already "dd-MMM-yyyy" from the backend.
  returnDate: string;
  purchaseReturnNo: string;
  // Invoice number of the purchase the goods are going back against.
  purchaseInvoiceNo: string;
  supplierName: string;
  // Pharmacy or warehouse the stock was returned from.
  locationName: string;
  productName: string;
  batchNo: string;
  // Already "MM/yyyy" from the backend, e.g. "12/2027".
  expiryDate: string;
  // As entered on the return line: "Damaged", "Expired" ...
  returnReason: string;
  returnQuantity: number;
  freeReturnQuantity: number;
  // Gross amount / return quantity.
  returnRate: number;
  grossAmount: number;
  discount: number;
  // grossAmount - discount.
  taxableAmount: number;
  // GST slab of the original invoice line: "5%", "18%", "Exempted".
  gstPercentage: string;
  gstAmount: number;
  // taxableAmount + gstAmount.
  totalAmount: number;
  status: PurchaseReturnStatus;
}

/** One page of the Purchase Return Details table (SupplierPurchaseReturnReportPageDto). */
export interface SupplierPurchaseReturnReportPage {
  data: SupplierPurchaseReturnReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI cards, over every row matching the filters (SupplierPurchaseReturnReportSummaryDto). */
export interface SupplierPurchaseReturnReportSummary {
  // Confirmed Purchase Returns card: "5", "5 invoices returned against".
  purchaseReturnCount: number;
  purchaseInvoiceCount: number;
  // Total Return Amount card: "₹3,334.31", "₹3,002.00 taxable amount".
  totalReturnAmount: number;
  taxableAmount: number;
  // GST Reversal Amount card: "₹332.31", "10% of return amount".
  gstReversalAmount: number;
  gstSharePercentage: number;
  // Total Physical Return Qty card: "69", "4 free units included".
  // Return quantity + free return quantity.
  totalPhysicalReturnQuantity: number;
  freeReturnQuantity: number;
  // Table Total row and the Supplier Purchase Return Summary table:
  // Return Purchase Qty "65", Gross Return Amount "₹3,160.00", Discount "₹158.00".
  // grossAmount - discountAmount = taxableAmount.
  returnQuantity: number;
  grossAmount: number;
  discountAmount: number;
}

/** One metric of the Supplier Purchase Return Summary table (SupplierPurchaseReturnReportReturnSummaryRowDto). */
export interface SupplierPurchaseReturnReportReturnSummaryRow {
  // RETURN_PURCHASE_QUANTITY, GST_REVERSAL_AMOUNT ...
  code: string;
  // "Return Purchase Quantity", "GST Reversal Amount" ...
  label: string;
  // COUNT = whole number; AMOUNT = rupees, shown as "₹332.31".
  valueType: "COUNT" | "AMOUNT";
  value: number;
}

/** Supplier Purchase Return Summary table, over every matching row (SupplierPurchaseReturnReportReturnSummaryDto). */
export interface SupplierPurchaseReturnReportReturnSummary {
  rows: SupplierPurchaseReturnReportReturnSummaryRow[];
  // The highlighted Total Purchase Return Amount row.
  totalPurchaseReturnAmount: number;
}

/** GET /auditReports/supplier-purchase-return (SupplierPurchaseReturnReportResponse). */
export interface SupplierPurchaseReturnReportResponse {
  summary: SupplierPurchaseReturnReportSummary;
  purchaseReturnDetails: SupplierPurchaseReturnReportPage;
  // Metric / Value table below the details.
  purchaseReturnSummary: SupplierPurchaseReturnReportReturnSummary;
  generatedBy: string;
  // Already formatted by the backend, e.g. "08-Oct-2026 05:30 PM".
  generatedOn: string;
}
