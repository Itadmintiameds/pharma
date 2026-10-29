/**
 * Query parameters shared by every /financial-report endpoint
 * (FinancialReportFilter on the backend). A report ignores the ones that do
 * not apply to it; empty values are left out of the request.
 */
export interface FinancialReportParams {
  /** Empty: the pharmacy in the X-Pharmacy-Id header. */
  pharmacyIds?: string[];
  /** yyyy-mm-dd. A single day (Today / Specific Day); when set, the range is ignored. */
  date?: string;
  /** yyyy-mm-dd. A month is sent as its first to last day. */
  fromDate?: string;
  toDate?: string;
  /** Patient / customer name or mobile number. */
  patientSearch?: string;
  /** One box matching patient no., IP / OP no. or bill no. */
  numberSearch?: string;
  patientNo?: string;
  ipNo?: string;
  opNo?: string;
  billNo?: string;
  /** Doctor ids from /doctor/allDoctor. */
  doctorIds?: number[];
  /** IP, OP, WALK_IN, DAY_CARE */
  patientTypes?: string[];
  /** CASH, UPI, CARD, CREDIT */
  paymentModes?: string[];
  productSearch?: string;
  productIds?: string[];
  hsnSearch?: string;
  hsnCodes?: string[];
  gstPercentages?: string[];
  /** PENDING, FULLY_PAID or ALL (default). */
  pendingStatus?: string;
  /** Zero-based. */
  page?: number;
  size?: number;
}

/** One page of report rows. `page` is zero-based, matching the request. */
export interface ReportPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Every financial report: K is its KPI card type, T its row type. */
export interface FinancialReportResponse<K, T> {
  generatedBy: string;
  /** Server time, ISO local date-time. */
  generatedOn: string;
  kpi: K;
  billDetails: ReportPage<T>;
}

/** KPI cards over every bill matching the filters, not just the current page. */
export interface BillSummaryKpi {
  totalSalesAmount: number;
  totalSalesReturnAmount: number;
  /** totalSalesAmount − totalSalesReturnAmount */
  netSalesAmount: number;
}

export interface BillSummaryRow {
  billingId: number;
  billNo: string;
  /** ISO local date-time. */
  billedDate: string;
  pharmacyId: string;
  pharmacyName: string;
  customerId: number | null;
  patientName: string | null;
  patientMobileNo: string | null;
  patientNumber: string | null;
  opIpNumber: string | null;
  doctorId: number | null;
  referredBy: string | null;
  /** Number of line items on the bill. */
  itemCount: number;
  /** Amount collected, after round off. */
  totalAmount: number;
}

export type BillSummaryResponse = FinancialReportResponse<BillSummaryKpi, BillSummaryRow>;
