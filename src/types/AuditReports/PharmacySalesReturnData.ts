// Types for GET /auditReports/pharmacy-sales-return (PharmacySalesReturnReportController in pharma-backend).

import type { CustomerType } from "@/types/BillingData";

/**
 * Query filters for the Pharmacy Sales Return Report (PharmacySalesReturnReportFilter).
 * Every list is a multi-select and every search is a case-insensitive "contains";
 * leave it out or empty for "no restriction".
 */
export interface PharmacySalesReturnReportFilter {
  // Return date period as YYYY-MM-DD, both inclusive. Today / Specific Day /
  // By Month / By Date Range all resolve to this pair on the client.
  // Backend default: today for fromDate, fromDate for toDate.
  fromDate?: string;
  toDate?: string;
  // Empty = every pharmacy the logged-in user can access.
  pharmacyIds?: string[];
  // Customer/Patient Type: WALK_IN, OP_PATIENT, IP_PATIENT, DAYCARE.
  customerTypes?: CustomerType[];
  // e.g. SLR-2026-00001
  salesReturnNo?: string;
  // Original Sales/Billing bill number.
  billNo?: string;
  // Inherited from the original bill's customer.
  customerName?: string;
  mobileNumber?: string;
  patientNumber?: string;
  // Both search the bill's OP/IP number: OP Number on OP Patient bills,
  // IP Number on IP Patient / Daycare bills.
  opNumber?: string;
  ipNumber?: string;
  // Product Name: pick products by id, and/or free-text search.
  productIds?: string[];
  productName?: string;
  productCategoryIds?: number[];
  batchNumber?: string;
  // Matched against the reason recorded on the return line, ignoring case.
  returnReasons?: string[];
  // Historical rate of the returned line (gst / taxable), not the current product master rate.
  gstPercentages?: number[];
  // Ranges on the whole sales return's settlement, both inclusive.
  minRefundAmount?: number;
  maxRefundAmount?: number;
  minOutstandingAdjustment?: number;
  maxOutstandingAdjustment?: number;
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Print / PDF: every matching row on one page, ignoring page and size.
  // Refused by the backend above 2,000 rows.
  unpaged?: boolean;
  // Backend default returnDate.
  sortBy?: PharmacySalesReturnReportSortBy;
  // Backend default asc.
  sortDir?: "asc" | "desc";
}

export type PharmacySalesReturnReportSortBy =
  | "returnDate"
  | "salesReturnNo"
  | "billNo"
  | "pharmacyName"
  | "customerType"
  | "productName"
  | "batchNumber"
  | "expiryDate"
  | "returnQuantity"
  | "returnReason"
  | "sellingAmount"
  | "discountAmount"
  | "taxableAmount"
  | "gstAmount"
  | "lineReturnAmount";

/** One returned product + batch line of the Sales Return Transactions table (PharmacySalesReturnReportRowDto). */
export interface PharmacySalesReturnReportRow {
  // Already formatted by the backend, e.g. "02-Oct-2026".
  returnDate: string;
  salesReturnId: number;
  salesReturnNo: string;
  billNo: string;
  pharmacyName: string;
  // As stored on the bill.
  customerType: CustomerType;
  productName: string;
  batchNumber: string;
  // Already formatted by the backend as MM/YYYY, e.g. "12/2027".
  expiryDate: string | null;
  returnQuantity: number;
  returnReason: string | null;
  // Historical amount = taxable + discount reversed.
  sellingAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  // taxable + gst, as recorded on the return line.
  lineReturnAmount: number;
}

/** One page of the Sales Return Transactions table (PharmacySalesReturnReportPageDto). */
export interface PharmacySalesReturnReportPage {
  data: PharmacySalesReturnReportRow[];
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/** One sales return of the Sales Return Settlement Summary table (PharmacySalesReturnSettlementRowDto). */
export interface PharmacySalesReturnSettlementRow {
  salesReturnId: number;
  salesReturnNo: string;
  customerType: CustomerType;
  // returnAmount = outstandingAdjustment + refundAmount.
  returnAmount: number;
  outstandingAdjustment: number;
  refundAmount: number;
}

/**
 * KPI cards and the Report Summary table, over every line matching the filters
 * (not just the current page); also the Total rows of both tables
 * (PharmacySalesReturnReportSummaryDto).
 */
export interface PharmacySalesReturnReportSummary {
  totalSalesReturnTransactions: number;
  // Product / batch lines returned.
  totalReturnLines: number;
  totalReturnQuantity: number;
  totalHistoricalAmount: number;
  totalDiscountReversed: number;
  totalTaxableAmountReversed: number;
  totalGstReversed: number;
  totalReturnAmount: number;
  totalOutstandingAdjustment: number;
  totalRefundAmount: number;
  // Share of totalReturnAmount, 0-100: "42% of return amount", "58% paid back".
  outstandingAdjustmentPercentage: number;
  refundPercentage: number;
}

/** One line of the Report Summary table (PharmacySalesReturnReportSummaryRowDto). */
export interface PharmacySalesReturnReportSummaryRow {
  // TOTAL_RETURN_QTY, TOTAL_GST_REVERSED ...
  code: string;
  // "Total Return Qty", "Total GST Reversed" ...
  label: string;
  // COUNT = whole number; AMOUNT = rupees, shown as "₹39.90".
  valueType: "COUNT" | "AMOUNT";
  value: number;
  // Shaded result row (Total Return Amount); it sits mid-table, not last.
  highlighted: boolean;
}

/** GET /auditReports/pharmacy-sales-return (PharmacySalesReturnReportResponse). */
export interface PharmacySalesReturnReportResponse {
  summary: PharmacySalesReturnReportSummary;
  salesReturnTransactions: PharmacySalesReturnReportPage;
  // Every matching return, not paged.
  settlementSummary: PharmacySalesReturnSettlementRow[];
  // Report Summary: Particulars / Value table, in display order.
  reportSummary: PharmacySalesReturnReportSummaryRow[];
  // Report header, e.g. "Completed".
  status: string;
  // Already formatted by the backend, e.g. "01-Oct-2026".
  fromDate: string;
  toDate: string;
  generatedBy: string;
  // Already formatted by the backend, e.g. "12-Oct-2026 05:30 PM".
  generatedOn: string;
}
