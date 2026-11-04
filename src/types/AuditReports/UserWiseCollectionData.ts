// Types for GET /auditReports/user-wise-collection (UserWiseCollectionReportController in pharma-backend).

import type { CustomerType } from "@/types/BillingData";

/**
 * Query filters for the User-wise Collection Report (UserWiseCollectionReportFilter).
 * Every list is a multi-select; leave it out or empty for "no restriction".
 */
export interface UserWiseCollectionReportFilter {
  // Collection date period as YYYY-MM-DD, both inclusive. Today / Specific Day /
  // By Month / By Date Range all resolve to this pair on the client.
  fromDate?: string;
  toDate?: string;
  // Empty = every pharmacy the logged-in user can access.
  pharmacyIds?: string[];
  // User associated with the collection (the receipt's created_by).
  userIds?: string[];
  paymentModes?: CollectionPaymentMode[];
  // Customer/Patient Type: WALK_IN, OP_PATIENT, IP_PATIENT, DAYCARE.
  customerTypes?: CustomerType[];
  // Collection Transaction Details paging; 0-based page, backend default 0.
  page?: number;
  // Backend default 10.
  size?: number;
  // Print / PDF: every matching receipt on one page, ignoring page and size.
  // Refused by the backend above 2,000 rows.
  unpaged?: boolean;
  // Backend default collectionDate.
  sortBy?: UserWiseCollectionSortBy;
  // Backend default desc.
  sortDir?: "asc" | "desc";
  // User-wise Collection Summary order; backend default totalCollection.
  summarySortBy?: UserWiseCollectionSummarySortBy;
  // Backend default desc.
  summarySortDir?: "asc" | "desc";
}

// CREDIT is not a collection, so it is not offered.
export type CollectionPaymentMode = "CASH" | "UPI" | "CARD";

export type UserWiseCollectionSortBy =
  | "collectionDate"
  | "receiptNo"
  | "billNo"
  | "userName"
  | "customerType"
  | "paymentMode"
  | "collectedAmount";

export type UserWiseCollectionSummarySortBy =
  | "userName"
  | "noOfCollections"
  | "cash"
  | "upi"
  | "card"
  | "totalCollection";

/** One receipt of the Collection Transaction Details table (UserWiseCollectionReportRowDto). */
export interface UserWiseCollectionReportRow {
  // Already formatted by the backend, e.g. "12-Oct-2026".
  collectionDate: string;
  paymentId: number;
  // RCP- + payment id; receipts have no number of their own.
  receiptNo: string;
  billingId: number;
  billNo: string;
  pharmacyName: string;
  userId: string;
  userName: string;
  // As stored on the bill: WALK_IN, OP_PATIENT, IP_PATIENT, DAYCARE ...
  customerType: string;
  // CASH, UPI, CARD.
  paymentMode: string;
  // UPI / card reference, if any.
  transactionId: string | null;
  collectedAmount: number;
}

/** One page of the Collection Transaction Details table (UserWiseCollectionReportPageDto). */
export interface UserWiseCollectionReportPage {
  data: UserWiseCollectionReportRow[];
  // "Displayed Transactions Total": collected amount of this page only.
  displayedTotal: number;
  // 0-based; offset = page * size.
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

/**
 * KPI totals over every collection matching the filters, not just the current
 * page (UserWiseCollectionReportSummaryDto). Also the User-wise Collection Summary's Total row.
 */
export interface UserWiseCollectionReportSummary {
  // "30 collections recorded".
  totalCollections: number;
  totalCollection: number;
  totalCashCollection: number;
  totalUpiCollection: number;
  totalCardCollection: number;
  // Share of totalCollection, 0-100: "33% of total collection".
  cashPercentage: number;
  upiPercentage: number;
  cardPercentage: number;
}

/** One user of the User-wise Collection Summary table (UserWiseCollectionUserRowDto). */
export interface UserWiseCollectionUserRow {
  userId: string;
  userName: string;
  noOfCollections: number;
  cash: number;
  upi: number;
  card: number;
  // cash + upi + card.
  totalCollection: number;
}

/** GET /auditReports/user-wise-collection (UserWiseCollectionReportResponse). */
export interface UserWiseCollectionReportResponse {
  summary: UserWiseCollectionReportSummary;
  // Every matching user, not paged; its Total row is summary.
  userWiseSummary: UserWiseCollectionUserRow[];
  collectionTransactions: UserWiseCollectionReportPage;
  // Report header, already formatted by the backend, e.g. "12-Oct-2026".
  fromDate: string;
  toDate: string;
  generatedBy: string;
  // Already formatted by the backend, e.g. "12-Oct-2026 05:30 PM".
  generatedOn: string;
}
