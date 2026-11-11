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
  /** User ids from /user/names, e.g. "USR-2026-00003": who raised the bill (Day Close reports). */
  userIds?: string[];
  /** GST report: warehouses to include beside `pharmacyIds`. */
  warehouseIds?: string[];
  /** GST report: only the locations filing under this GSTIN. */
  gstin?: string;
  /** GST report: ALL (default), SALES or PURCHASES. */
  transactionType?: GstTransactionType;
  /** GST report: ALL (default), LOCAL or CENTRAL. */
  gstClassification?: GstClassification;
  /**
   * Which screen asks: SUMMARY (default) or DAY_CLOSING. Only sales-summary,
   * payment-mode-summary and receipt-details read it — on DAY_CLOSING they
   * leave out IP pending and the export carries the day closing title.
   */
  view?: ReportView;
  /** Zero-based. */
  page?: number;
  size?: number;
  /**
   * Print / PDF: every matching row on one page, ignoring page and size. The
   * backend refuses it past its print limit (2,000 rows).
   */
  unpaged?: boolean;
}

/** Report keys for /financial-report/export: each report's own path. */
export type ReportExportKey =
  | 'bill-summary'
  | 'detailed-sale-report'
  | 'doctor-wise-sales-report'
  | 'bill-due-summary'
  | 'sales-summary'
  | 'payment-mode-summary'
  | 'receipt-details'
  | 'bill-count-summary'
  | 'billing-by-patient-type'
  | 'billing-by-user'
  | 'receipt-by-user'
  | 'current-bill-details'
  | 'sales-return-details'
  | 'gst-sales-purchase-summary';

export type ReportExportFormat = 'xlsx' | 'csv';

// ---------------------------------------------------------------- GST report

export type ReportView = 'SUMMARY' | 'DAY_CLOSING';

export type GstTransactionType = 'ALL' | 'SALES' | 'PURCHASES';
export type GstClassification = 'ALL' | 'LOCAL' | 'CENTRAL';

/**
 * One line of the sales or purchase ledger: a month, a GST rate's subtotal or
 * the ledger total. Amounts exclude GST except the tax columns.
 */
export interface GstLedgerRow {
  rowType: 'MONTH' | 'SUBTOTAL' | 'TOTAL';
  /** "2026-09" on MONTH rows; null otherwise. */
  month: string | null;
  /** "September 2026", "GST LOCAL SALES 5% - Subtotal", "TOTAL SALES". */
  label: string;
  /** Net Sale / Net Purchase: amount − crDrNote. */
  netAmount: number;
  /** taxAmount − taxReturn */
  netTax: number;
  /** Sale / Purchase Amount: taxable value before returns. */
  amount: number;
  taxAmount: number;
  /** Taxable value of the returns: credit note on sales, debit note on purchases. */
  crDrNote: number;
  /** GST on the returns. */
  taxReturn: number;
  /** Not recorded yet: always zero. */
  taxRefund: number;
}

/** "GST LOCAL SALES 5%": a row per month with transactions, then the subtotal. */
export interface GstRateGroup {
  gstRate: number;
  title: string;
  months: GstLedgerRow[];
  subtotal: GstLedgerRow;
}

/** "SALES LOCAL", "PURCHASE CENTRAL", …; no rate groups when nothing happened. */
export interface GstLedgerSection {
  classification: 'LOCAL' | 'CENTRAL';
  title: string;
  rateGroups: GstRateGroup[];
}

export interface GstLedger {
  sections: GstLedgerSection[];
  /** TOTAL SALES / TOTAL PURCHASES */
  total: GstLedgerRow;
}

export interface GstSummaryRow {
  rowType: 'MONTH' | 'TOTAL';
  /** "2026-09" on MONTH rows; null on the total. */
  month: string | null;
  /** "September 2026" or "Grand Total". */
  label: string;
  outputGst: number;
  inputGst: number;
  /** outputGst − inputGst; negative when more GST was paid than collected. */
  netGst: number;
}

/** Every month of the period, then the Grand Total. */
export interface GstSummary {
  months: GstSummaryRow[];
  grandTotal: GstSummaryRow;
}

export interface GstLocation {
  locationType: 'PHARMACY' | 'WAREHOUSE';
  locationId: string;
  locationName: string;
  address: string | null;
}

/** A GSTIN among the selected locations, with the locations filing under it. */
export interface GstRegistration {
  gstin: string | null;
  dealerName: string | null;
  address: string | null;
  locations: GstLocation[];
}

export interface GstReportHeader {
  reportName: string;
  /** yyyy-mm-dd, inclusive. */
  fromDate: string;
  toDate: string;
  transactionType: GstTransactionType;
  gstClassification: GstClassification;
  /** Empty: every rate. */
  gstRates: string[];
  registrations: GstRegistration[];
}

/** Sales figures are null when only purchases were asked for, and vice versa; netGst unless both. */
export interface GstSalesPurchaseKpi {
  netSale: number | null;
  outputGst: number | null;
  netPurchase: number | null;
  inputGst: number | null;
  netGst: number | null;
}

/**
 * Not paged. salesLedger is null when only purchases were asked for,
 * purchaseLedger when only sales were, and gstSummary unless both were.
 */
export interface GstSalesPurchaseSummaryResponse {
  generatedBy: string;
  /** Server time, ISO local date-time. */
  generatedOn: string;
  header: GstReportHeader;
  kpi: GstSalesPurchaseKpi;
  salesLedger: GstLedger | null;
  purchaseLedger: GstLedger | null;
  gstSummary: GstSummary | null;
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

export type BillSummaryResponse = FinancialReportResponse<BillSummaryKpi, BillSummaryRow> & {
  /** Totals over every matching bill, for the Summary block under the table. */
  summary?: BillSummaryKpi | null;
};

/** Totals of every line matching the filters. */
export interface DetailedSaleKpi {
  totalGrossAmount: number;
  totalDiscountAmount: number;
  /** CGST + SGST */
  totalGstAmount: number;
  totalNetAmount: number;
  /** Round-off of the bills the matching lines belong to, each bill once. */
  totalRoundOffAmount: number;
  /** totalNetAmount + totalRoundOffAmount */
  totalNetAmountAfterRoundOff: number;
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
  /** The bill's round-off, repeated on every line of the bill; null on older bills. */
  billRoundOffAmount: number | null;
  /** The bill's net total after round-off, repeated on every line of the bill. */
  billNetAmountAfterRoundOff: number | null;
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

/**
 * Payments received in the period, split by whether the bill they settle was
 * raised in the period (current) or before it (previous).
 */
export interface ReceiptDetailsKpi {
  currentBillReceipts: number;
  previousBillReceipts: number;
  /** currentBillReceipts + previousBillReceipts */
  totalReceipts: number;
}

export interface ReceiptDetailsRow {
  /** CURRENT_BILL_RECEIPTS, PREVIOUS_BILL_RECEIPTS or TOTAL_RECEIPTS. */
  code: string;
  /** Display label, e.g. "Current Bill Receipts". */
  particular: string;
  /** Where the figure comes from, e.g. "Payment Records". */
  source: string;
  /** How it is calculated. */
  calculation: string;
  amount: number;
}

/** Always a single page holding all three rows. */
export type ReceiptDetailsResponse = FinancialReportResponse<ReceiptDetailsKpi, ReceiptDetailsRow>;

/** Finalized bills for the day (Day Close). */
export interface BillCountKpi {
  totalBills: number;
  fullyPaidBills: number;
  /** IP bills with a balance still owed — partially paid or not paid at all. */
  pendingIpBills: number;
}

export interface BillCountRow {
  /** TOTAL_BILLS, FULLY_PAID_BILLS or PENDING_IP_BILLS. */
  code: string;
  /** Display label, e.g. "Total Bills". */
  particular: string;
  count: number;
}

/** Always a single page holding all three rows. */
export type BillCountResponse = FinancialReportResponse<BillCountKpi, BillCountRow>;

export interface PatientTypeTotals {
  billCount: number;
  totalAmount: number;
}

/** Bills and amount for the day per patient type (Day Close). */
export interface BillingByPatientTypeKpi {
  ip: PatientTypeTotals;
  op: PatientTypeTotals;
  walkIn: PatientTypeTotals;
  dayCare: PatientTypeTotals;
}

export interface BillingByPatientTypeRow extends PatientTypeTotals {
  /** IP, OP, WALK_IN, DAY_CARE, or TOTAL for the closing total line. */
  code: string;
  /** Display label, e.g. "Walk-In". */
  patientType: string;
}

/** Always a single page: one row per patient type, then the TOTAL row. */
export type BillingByPatientTypeResponse = FinancialReportResponse<
  BillingByPatientTypeKpi,
  BillingByPatientTypeRow
>;

export interface BillingByUserKpi {
  totalBills: number;
  totalSales: number;
}

/** A user's bills in one pharmacy, or the closing total line. */
export interface BillingByUserRow {
  /** USER, or TOTAL for the closing total line. */
  code: string;
  /** Null on the TOTAL row. */
  pharmacyId: string | null;
  pharmacyName: string | null;
  userId: string | null;
  /** Falls back to the user id when the user has no name; "Total" on the TOTAL row. */
  userName: string;
  billCount: number;
  totalSales: number;
}

/** Always a single page: one row per user and pharmacy, then the TOTAL row. */
export type BillingByUserResponse = FinancialReportResponse<BillingByUserKpi, BillingByUserRow>;

export interface ReceiptByUserKpi {
  /** Payment transactions, credit entries excluded. */
  totalReceipts: number;
  totalAmountReceived: number;
}

/** What a user collected in one pharmacy, or the closing total line. */
export interface ReceiptByUserRow {
  /** USER, or TOTAL for the closing total line. */
  code: string;
  pharmacyId: string | null;
  pharmacyName: string | null;
  userId: string | null;
  userName: string;
  receiptCount: number;
  amountReceived: number;
}

/** Always a single page: one row per user and pharmacy, then the TOTAL row. */
export type ReceiptByUserResponse = FinancialReportResponse<ReceiptByUserKpi, ReceiptByUserRow>;

/** Totals over every matching bill, not just the page. */
export interface CurrentBillDetailsKpi {
  totalBills: number;
  totalAmount: number;
  totalAmountReceived: number;
  /** Still due on IP bills at the end of the day. */
  totalPendingAmount: number;
}

export interface CurrentBillDetailsRow {
  pharmacyId: string;
  pharmacyName: string;
  billingId: number;
  billNo: string;
  /** Null when the bill has no customer. */
  customerName: string | null;
  /** IP, OP, Walk-In, Day Care, or the stored type for any other. */
  patientType: string;
  /** ISO local date-time. */
  billedAt: string;
  totalAmount: number;
  /** Received up to the end of the business day. */
  amountReceived: number;
  /** Zero for every type but IP. */
  pendingAmount: number;
}

export type CurrentBillDetailsResponse = FinancialReportResponse<
  CurrentBillDetailsKpi,
  CurrentBillDetailsRow
>;

/** Totals over every matching return, not just the page. */
export interface SalesReturnDetailsKpi {
  totalReturns: number;
  totalReturnAmount: number;
}

export interface SalesReturnDetailsRow {
  pharmacyId: string;
  pharmacyName: string;
  salesReturnId: number;
  salesReturnNo: string;
  /** The original bill. */
  billNo: string;
  /** Customer of the original bill; null when it has none. */
  customerName: string | null;
  /** ISO local date-time. */
  returnedAt: string;
  returnAmount: number;
}

export type SalesReturnDetailsResponse = FinancialReportResponse<
  SalesReturnDetailsKpi,
  SalesReturnDetailsRow
>;
