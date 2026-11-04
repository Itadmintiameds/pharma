// Types for GET /auditReports/supplier-payment (SupplierPaymentReportController in pharma-backend).

/**
 * Query filters for the Supplier Payment Report (SupplierPaymentReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface SupplierPaymentReportFilter {
  // Reporting period on the supplier payment date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair on
  // the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Send one kind only: warehouseIds for a multi-pharmacy organization with
  // centralized inventory, pharmacyIds otherwise; the other kind is rejected.
  // Empty = every location of that kind the logged-in user can access.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  supplierIds?: number[];
  paymentModes?: SupplierPaymentMode[];
  // Supplier Payment No. / Purchase Invoice No. / GRN No. / Reference No.: free-text search.
  paymentNumber?: string;
  invoiceNumber?: string;
  grnNumber?: string;
  referenceNumber?: string;
  // Payment Amount range, both inclusive.
  minPaymentAmount?: number;
  maxPaymentAmount?: number;
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default paymentDate.
  sortBy?: SupplierPaymentReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

export type SupplierPaymentMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";

export type SupplierPaymentReportSortBy =
  | "paymentDate"
  | "paymentNumber"
  | "supplierName"
  | "invoiceNumber"
  | "grnNumber"
  | "invoiceAmount"
  | "paymentAmount"
  | "paymentMode"
  | "outstandingBefore"
  | "outstandingAfter";

/** One supplier payment of the Payment Transactions table (SupplierPaymentReportRowDto). */
export interface SupplierPaymentReportRow {
  // For the Supplier Payment No. link.
  supplierPaymentId: number;
  // Already formatted by the backend, e.g. "03-Oct-2026".
  paymentDate: string;
  paymentNumber: string;
  // For the Purchase Invoice No. link.
  purchaseId: number;
  // Pharmacy or warehouse the purchase was received into.
  locationName: string;
  supplierName: string;
  invoiceNumber: string;
  grnNumber: string;
  invoiceAmount: number;
  paymentAmount: number;
  // Display label: Cash / UPI / Bank Transfer / Cheque / Other.
  paymentMode: string;
  // Reference / Transaction No.; null ("---") when not recorded.
  transactionNumber: string | null;
  // Invoice amount less earlier payments and purchase returns confirmed up
  // to the payment date, floored at 0.
  outstandingBefore: number;
  // outstandingBefore - paymentAmount, floored at 0.
  outstandingAfter: number;
}

/** One page of the Payment Transactions table (SupplierPaymentReportPageDto). */
export interface SupplierPaymentReportPage {
  data: SupplierPaymentReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI totals over every payment matching the filters, not just the current page (SupplierPaymentReportSummaryDto). */
export interface SupplierPaymentReportSummary {
  // Total Payment Amount card: "4 payments in this period"; also the table's Total row.
  totalPaymentAmount: number;
  paymentCount: number;
  // Payment Transactions card: "₹15,000 average payment".
  averagePaymentAmount: number;
  // Suppliers Paid card: "A, B, C received payments".
  suppliersPaidCount: number;
  suppliersPaid: string[];
  // Invoices Paid Against card: "PI-1001 paid in 2 instalments" - the invoice
  // with the most payments in the period (null when none).
  invoicesPaidAgainstCount: number;
  topInvoiceNumber: string | null;
  topInvoiceInstalments: number | null;
}

/** One row of the Payment Mode-wise Summary table (SupplierPaymentModeSummaryDto). Every mode is listed. */
export interface SupplierPaymentModeSummaryRow {
  // Display label: Cash / UPI / Bank Transfer / Cheque / Other.
  paymentMode: string;
  transactionCount: number;
  totalAmount: number;
}

/** GET /auditReports/supplier-payment (SupplierPaymentReportResponse). */
export interface SupplierPaymentReportResponse {
  summary: SupplierPaymentReportSummary;
  paymentTransactions: SupplierPaymentReportPage;
  // Payment Mode-wise Summary table and its Total row.
  paymentModeSummary: SupplierPaymentModeSummaryRow[];
  paymentModeTotalCount: number;
  paymentModeTotalAmount: number;
  // Report header, already formatted by the backend, e.g. "01-Oct-2026".
  fromDate: string;
  toDate: string;
  generatedBy: string;
  // Already formatted by the backend, e.g. "12-Oct-2026 05:30 PM".
  generatedOn: string;
}
