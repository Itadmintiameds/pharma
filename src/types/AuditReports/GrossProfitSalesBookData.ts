// Types for GET /auditReports/gross-profit-sales-book (GrossProfitSalesBookController in pharma-backend).

/** Query filters for the G.P. on Consolidated Sales Book (GrossProfitSalesBookFilter). */
export interface GrossProfitSalesBookFilter {
  // Reporting period as YYYY-MM-DD, both inclusive.
  // Missing fromDate = today; missing toDate = fromDate.
  fromDate?: string;
  toDate?: string;
  // Empty = every pharmacy the logged-in user can access (All Pharmacies).
  pharmacyIds?: string[];
  // GST Rate: 5, 12, 18 ... matched against the product's GST percentage.
  gstRates?: number[];
  // DAY (default): one row per date. MONTH: one row per month.
  groupBy?: "DAY" | "MONTH";
  // 0-based page; backend default 0.
  page?: number;
  // Backend default 25.
  size?: number;
  // Print / PDF: every matching row on one page, ignoring page and size.
  unpaged?: boolean;
  // Backend default date.
  sortBy?: GrossProfitSalesBookSortBy;
  // Backend default asc.
  sortDir?: "asc" | "desc";
}

export type GrossProfitSalesBookSortBy = "date" | "billAmount" | "cost" | "grossProfit" | "grossProfitPercentage";

/** One date (or month) row, summed across the selected pharmacies and net of sales returns. */
export interface GrossProfitSalesBookRow {
  // dd-MM-yyyy; the first day of the month when grouped by MONTH.
  date: string;
  // What the DATE column shows: "01-09-2026", or "Sep-2026" by month.
  periodLabel: string;
  billAmount: number;
  cost: number;
  grossProfit: number;
  grossProfitPercentage: number;
}

/** Header details of one pharmacy the report covers. */
export interface GrossProfitSalesBookPharmacy {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  phoneNumber: string;
  emailAddress: string;
  gstin: string;
}

/** KPI tiles and the table's Total row, over every matching row (not just the page). */
export interface GrossProfitSalesBookSummary {
  totalBillAmount: number;
  daysWithSales: number;
  totalCost: number;
  costPercentageOfBillAmount: number;
  totalGrossProfit: number;
  averageGrossProfitPerDay: number;
  overallGrossProfitPercentage: number;
}

export interface GrossProfitSalesBookPage {
  data: GrossProfitSalesBookRow[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
}

export interface GrossProfitSalesBookResponse {
  // "G.P. ON CONSOLIDATED SALES BOOK"
  reportName: string;
  // dd-MM-yyyy
  fromDate: string;
  toDate: string;
  groupBy: "DAY" | "MONTH";
  pharmacies: GrossProfitSalesBookPharmacy[];
  summary: GrossProfitSalesBookSummary;
  salesBook: GrossProfitSalesBookPage;
  generatedBy: string;
  // "01-Oct-2026 09:30 AM"
  generatedOn: string;
}
