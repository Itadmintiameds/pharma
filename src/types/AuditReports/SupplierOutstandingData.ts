// Types for GET /auditReports/supplier-outstanding (SupplierOutstandingReportController in pharma-backend).

/**
 * Query filters for the Supplier Outstanding Report (SupplierOutstandingReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface SupplierOutstandingReportFilter {
  // Reporting period on the purchase invoice date as YYYY-MM-DD, both inclusive.
  // Today / Specific Day / By Month / By Date Range all resolve to this pair on
  // the client. Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Send one kind only: warehouseIds for a multi-pharmacy organization with
  // centralized inventory, pharmacyIds otherwise; the other kind is rejected.
  // Empty = every location of that kind the logged-in user can access.
  pharmacyIds?: string[];
  warehouseIds?: string[];
  // Supplier: supplier master ids, and/or a free-text search on the name.
  supplierIds?: number[];
  supplierSearch?: string;
  // Purchase Invoice No. / GRN No.: free-text search.
  invoiceNumber?: string;
  grnNumber?: string;
  // Payment Due Date range (invoice date + credit days) as YYYY-MM-DD, both
  // inclusive. Either end may be left open.
  dueFromDate?: string;
  dueToDate?: string;
  // Backend default ALL.
  outstandingStatus?: SupplierOutstandingStatusFilter;
  // Current Outstanding range, both inclusive.
  minOutstanding?: number;
  maxOutstanding?: number;
  // Backend default ALL.
  supplierCredit?: SupplierCreditFilter;
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Backend default currentOutstanding.
  sortBy?: SupplierOutstandingReportSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
}

// OUTSTANDING_ONLY = Unpaid + Partially Settled.
export type SupplierOutstandingStatusFilter =
  | "ALL"
  | "OUTSTANDING_ONLY"
  | "UNPAID"
  | "PARTIALLY_SETTLED"
  | "FULLY_SETTLED";

// CREDIT = payments and returns exceed the invoice amount.
export type SupplierCreditFilter = "ALL" | "CREDIT" | "WITHOUT_CREDIT";

export type SupplierOutstandingReportSortBy =
  | "supplierName"
  | "invoiceNumber"
  | "grnNumber"
  | "invoiceDate"
  | "dueDate"
  | "invoiceAmount"
  | "totalPaid"
  | "purchaseReturnAdjusted"
  | "currentOutstanding"
  | "overdueDays"
  | "supplierCredit";

// The row's display status, as the backend labels it.
export type SupplierOutstandingStatus = "Unpaid" | "Partially Settled" | "Fully Settled";

/** One purchase invoice row of the Outstanding Invoices table (SupplierOutstandingReportRowDto). */
export interface SupplierOutstandingReportRow {
  // For the Purchase Invoice No. link.
  purchaseId: number;
  // Pharmacy or warehouse the purchase was received into.
  locationName: string;
  supplierName: string;
  invoiceNumber: string;
  grnNumber: string;
  // Already formatted by the backend, e.g. "01-Oct-2026".
  invoiceDate: string;
  // invoiceDate + credit days, e.g. "10-Oct-2026"; shown in red once overdue.
  dueDate: string;
  invoiceAmount: number;
  // Sum of supplier payments against the invoice.
  totalPaid: number;
  // Sum of confirmed purchase returns against the invoice.
  purchaseReturnAdjusted: number;
  // invoiceAmount - totalPaid - purchaseReturnAdjusted, floored at 0.
  currentOutstanding: number;
  // What payments and returns push past the invoice amount; 0 otherwise.
  supplierCredit: number;
  // Days past the due date while still outstanding; null ("—") otherwise.
  overdueDays: number | null;
  outstandingStatus: SupplierOutstandingStatus;
}

/** One page of the Outstanding Invoices table (SupplierOutstandingReportPageDto). */
export interface SupplierOutstandingReportPage {
  data: SupplierOutstandingReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** KPI totals over every row matching the filters, not just the current page (SupplierOutstandingReportSummaryDto). */
export interface SupplierOutstandingReportSummary {
  // Total Credit Invoice Amount card: "4 invoices with outstanding balance".
  totalCreditInvoiceAmount: number;
  outstandingInvoiceCount: number;
  // Total Supplier Payable card: "50% of invoice amount".
  totalSupplierPayable: number;
  payableSharePercentage: number;
  // Overdue Payable card: "2 invoices past due date".
  overduePayable: number;
  overdueInvoiceCount: number;
  // Supplier Credit card: "Amount due from suppliers".
  supplierCredit: number;
  // Total row: Total Paid and Purchase Return Adjusted columns.
  totalPaid: number;
  totalPurchaseReturnAdjusted: number;
}

/** GET /auditReports/supplier-outstanding (SupplierOutstandingReportResponse). */
export interface SupplierOutstandingReportResponse {
  summary: SupplierOutstandingReportSummary;
  outstandingInvoices: SupplierOutstandingReportPage;
  // Report header, already formatted by the backend, e.g. "01-Oct-2026".
  fromDate: string;
  toDate: string;
  outstandingAsOf: string;
  generatedBy: string;
  // Already formatted by the backend, e.g. "12-Oct-2026 05:30 PM".
  generatedOn: string;
}
