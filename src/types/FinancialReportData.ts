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

/** Totals of every line matching the filters. */
export interface DetailedSaleKpi {
  totalGrossAmount: number;
  totalDiscountAmount: number;
  /** CGST + SGST */
  totalGstAmount: number;
  totalNetAmount: number;
}

/** One product line of a bill — a bill with two products is two rows. */
export interface DetailedSaleRow {
  billingId: number;
  billingDetailsId: number;
  billNo: string;
  /** ISO local date-time. */
  billedDate: string;
  pharmacyId: string;
  pharmacyName: string;
  customerId: number | null;
  patientName: string | null;
  patientMobileNo: string | null;
  doctorId: number | null;
  referredBy: string | null;
  productId: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  /** In the unit it was billed in. */
  quantity: number;
  unit: string | null;
  purchaseUnit: string | null;
  smallestSaleUnit: string | null;
  hsnNo: string | null;
  /** The product's current rate, e.g. "5". */
  gstPercentage: string | null;
  grossAmount: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  netAmount: number;
}

export type DetailedSaleResponse = FinancialReportResponse<DetailedSaleKpi, DetailedSaleRow>;

export interface DoctorWiseKpi {
  totalSaleValue: number;
  totalReturnValue: number;
  /** totalSaleValue − totalReturnValue */
  netSaleValue: number;
}

/** One product sold on bills referred by one doctor, in one pharmacy. */
export interface DoctorWiseRow {
  pharmacyId: string;
  pharmacyName: string;
  doctorId: number;
  referredBy: string;
  productId: string;
  productName: string;
  /** In the smallest sale unit. */
  saleQuantity: number;
  returnQuantity: number;
  saleValue: number;
  returnValue: number;
  netSaleValue: number;
}

export type DoctorWiseResponse = FinancialReportResponse<DoctorWiseKpi, DoctorWiseRow>;

export interface BillDueKpi {
  totalIpBillAmount: number;
  totalAmountReceived: number;
  /** totalIpBillAmount − totalAmountReceived */
  totalPendingAmount: number;
}

export type BillDueStatus = "PENDING" | "FULLY_PAID";

/** One In-Patient bill and what is still owed on it. */
export interface BillDueRow {
  pharmacyId: string;
  pharmacyName: string;
  billingId: number;
  billNo: string;
  /** ISO local date-time. */
  billedDate: string;
  customerId: number | null;
  patientName: string | null;
  patientMobileNo: string | null;
  patientNumber: string | null;
  ipNumber: string | null;
  doctorId: number | null;
  referredBy: string | null;
  totalAmount: number;
  /** Every payment recorded against the bill. */
  amountReceived: number;
  /** Never below zero. */
  pendingAmount: number;
  status: BillDueStatus;
}

export type BillDueResponse = FinancialReportResponse<BillDueKpi, BillDueRow>;

export interface SalesSummaryKpi {
  totalSales: number;
  totalSalesReturn: number;
  /** totalSales − totalSalesReturn */
  netSales: number;
  /** Outstanding on IP bills as of the period's end. */
  ipPendingAmount: number;
}

/** One cumulative figure across the selected pharmacies and period. */
export interface SalesSummaryRow {
  /** Stable key: TOTAL_SALES, TOTAL_DISCOUNT, TOTAL_SALES_RETURN, NET_SALES, IP_PENDING_AMOUNT. */
  code: string;
  /** Display label, e.g. "Total Sales". */
  metric: string;
  /** Where the figure comes from, e.g. "Pharmacy Bill". */
  source: string;
  /** How it is calculated. */
  calculation: string;
  amount: number;
}

/** Always a single page holding all five rows. */
export type SalesSummaryResponse = FinancialReportResponse<SalesSummaryKpi, SalesSummaryRow>;

/** Amount received through each payment mode. */
export interface PaymentModeKpi {
  cash: number;
  card: number;
  upi: number;
  credit: number;
  totalReceived: number;
}

export interface PaymentModeRow {
  /** CASH, CARD, UPI, CREDIT, or TOTAL for the closing total line. */
  code: string;
  /** Display label, e.g. "Cash". */
  paymentMode: string;
  amountReceived: number;
}

/** Always a single page: one row per mode, then the TOTAL row. */
export type PaymentModeResponse = FinancialReportResponse<PaymentModeKpi, PaymentModeRow>;
