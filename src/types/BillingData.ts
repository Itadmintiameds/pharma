/**
 * Types for the Sales & Billing (POS) module.
 *
 * The billing APIs are not wired up yet — these mirror the fields the POS
 * screens capture so the components can be swapped onto real endpoints without
 * reshaping the UI.
 */

/** Mirrors the backend CustomerType enum exactly. */
export type CustomerType =
  | "WALK_IN"
  | "REGISTERED"
  | "OP_PATIENT"
  | "IP_PATIENT"
  | "DAYCARE"
  | "CORPORATE"
  | "BUSINESS"
  | "INSURANCE";

export type PaymentMode = "CASH" | "CARD" | "UPI" | "CREDIT";

export type BillStatus = "Paid" | "Pending" | "Cancelled";

export interface CustomerInfo {
  /** Empty until the counter staff picks a customer type. */
  customerType: CustomerType | "";
  /** Set when an existing customer was picked; null creates one on submit. */
  customerId?: number | null;
  customerName: string;
  mobileNo: string;
  age: string;
  gender: string;
  doctorName: string;
  /** Referring doctor — the name shown, the id sent. */
  referredBy: string;
  doctorId?: number | null;
  /** The hospital's patient id, for the patient types. */
  patientNumber?: string;
  /** The visit number — OP for outpatients, IP for inpatients and daycare. */
  visitNumber?: string;
  address: string;
}

/** A customer as the customer API returns it. */
export interface CustomerRecord {
  customerId: number;
  customerName: string;
  customerPhoneNo: string;
  /** The patient id, when the customer is registered as a patient. */
  patientNo?: string | null;
  patientNumber?: string | null;
  pharmacyId?: string;
  createdAt?: string;
  createdBy?: string;
  modifiedAt?: string | null;
  modifiedBy?: string | null;
}

/** A referring doctor as the doctor API returns it. */
export interface DoctorRecord {
  doctorId: number;
  doctorName: string;
  pharmacyId?: string;
  createdAt?: string;
  createdBy?: string;
  modifiedAt?: string | null;
  modifiedBy?: string | null;
}

/**
 * One line of the billing/create payload.
 *
 * MRP is tax-inclusive, so the amounts here are not a build-up from a rate:
 * `netAmount` is (MRP x qty) less the discount, `gstAmount` is the tax found
 * inside it, and `grossAmount` is what is left — the taxable value. Hence
 * `grossAmount + gstAmount = netAmount`.
 */
export interface BillingDetailPayload {
  productId: string;
  batchId: string;
  unit: string;
  billQuantity: number;
  /** MRP x billQuantity — the line before any discount. Despite the name it is
   *  the line total, not a per-unit price. */
  totalMrpAmountPerUnit: number;
  /** The taxable value — net less the GST inside it, NOT MRP x qty. */
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
}

/**
 * How much of the bill is settled. Lives on the bill, not the payment, and
 * mirrors the backend PaymentType enum.
 */
export type PaymentType = "PAID" | "PARTIAL" | "UNPAID";

export interface BillingPaymentPayload {
  paymentMode: PaymentMode;
  transactionId: string | null;
  receivedAmount: number;
  /** What is still owed after this payment. */
  pendingAmount: number;
}

/** Body of POST /billing/{billingId}/payment — settling an open bill. */
export interface SettlePaymentPayload {
  paymentMode: PaymentMode;
  transactionId: string | null;
  receivedAmount: number;
}

export interface CreateBillingPayload {
  /** Omitted for a new customer — send name and phone instead and the API
   *  creates the customer and keeps its id. */
  customerId?: number;
  customerName?: string;
  customerPhoneNo?: string;
  /** Only sent when it isn't already on the customer record. */
  patientNumber?: string;
  /** The visit number for the patient types — OP or IP. */
  opIpNumber?: string;
  customerType: CustomerType;
  doctorId?: number;
  customerAddress?: string;
  /** PAID unless the customer still owes something. */
  paymentType: PaymentType;
  /** Sum of the lines' MRP totals, before any discount. */
  totalMrpAmount: number;
  /** Sum of the lines' taxable values — see BillingDetailPayload. */
  totalGrossAmount: number;
  /** The whole discount given, per-line and bill level together, as a share of
   *  the cart's MRP total. */
  totalDiscountPercentage: number;
  totalDiscountAmount: number;
  totalGstAmount: number;
  /**
   * totalGrossAmount + totalGstAmount — the arithmetic result, to the paisa,
   * before the bill is rounded. This is what the lines add up to.
   */
  totalNetAmount: number;
  /**
   * The paise the rounding gives up or takes: negative when the bill rounds
   * down, positive when it rounds up, and 0 when the net is already whole.
   * Always totalNetAmountAfterRoundOff - totalNetAmount.
   */
  roundOffAmount: number;
  /** What the customer actually pays — totalNetAmount to the whole rupee. */
  totalNetAmountAfterRoundOff: number;
  billingDetails: BillingDetailPayload[];
  billingPayments: BillingPaymentPayload[];
}

/** A medicine the counter staff can pull into the cart. */
export interface BillableProduct {
  productId: string;
  productName: string;
  brandName?: string;
  batchId: string;
  batchNumber: string;
  unit?: string | number;
  /** The product's HSN, shown on the cart grid and the invoice. */
  hsnCode?: string;
  expiryDate: string;
  /** Units on hand for this batch. */
  availableQuantity: number;
  mrpPerUnit: number;
  sellingPricePerUnit?: number;
  gstPercentage: number;
  rackNo?: string;
}

/** One line of the bill. Amounts are per line, inclusive of its own discount. */
export interface BillLine {
  lineId: string;
  productId: string;
  productName: string;
  brandName?: string;
  batchId: string;
  batchNumber: string;
  unit?: string | number;
  /** The product's HSN, shown on the cart grid and the invoice. */
  hsnCode?: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  mrpPerUnit: number;
  sellingPricePerUnit?: number;
  discountPercentage: number;
  gstPercentage: number;
  availableQuantity: number;
}

/** Everything the totals strip and the invoice need. */
export interface BillTotals {
  totalItems: number;
  totalQuantity: number;
  /**
   * MRP x qty summed, before any discount. Not shown on the summaries — MRP is
   * tax-inclusive, so taxable leads there — but it is the base the bill level
   * discount is converted against, and the payload carries it.
   */
  grossAmount: number;
  /** Sum of the per-row discounts only. */
  itemDiscount: number;
  /** The bill level discount as entered, in rupees. */
  billDiscount: number;
  /** The same bill level discount as a percentage of gross. */
  billDiscountPercentage: number;
  taxableAmount: number;
  gstAmount: number;
  roundOff: number;
  netAmount: number;
}

export interface PaymentDetails {
  paymentMode: PaymentMode;
  amountReceived: number;
  referenceNo: string;
  remarks: string;
  /** Cash handed back. Zero for every non-cash mode. */
  changeDue: number;
  /** Still owed after this payment — non-zero only for an in-patient, who may
   *  pay in part through any mode or bill the whole amount to credit. */
  pendingAmount: number;
}

/** One line of a bill as the billing API returns it. */
export interface BillingDetailRecord {
  billingDetailsId: number;
  billingId: number;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  /** Not on every saved bill — the batch is read back when it is absent. */
  expiryDate?: string | null;
  unit: string;
  billQuantity: number;
  /** Stored on the line, so nothing has to be derived back out of the amounts. */
  gstPercentage?: number;
  /** The product's HSN, as the billing API names it. */
  hsnNo?: string;
  /** MRP x billQuantity. Absent on bills saved before the column existed, so
   *  the reader falls back to netAmount + discountAmount. */
  totalMrpAmountPerUnit?: number;
  /** The taxable value — see BillingDetailPayload. */
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
}

export interface BillingPaymentRecord {
  paymentId: number;
  billingId: number;
  paymentMode: PaymentMode;
  receivedAmount: number;
  pendingAmount: number;
  transactionId: string | null;
}

/** A saved bill, from /billing/allBilling and /billing/{id}. */
export interface BillingRecord {
  billingId: number;
  billNo: string;
  createdAt: string;
  customerId: number | null;
  customerName: string | null;
  customerPhoneNo: string | null;
  customerAddress: string | null;
  customerType: CustomerType | null;
  doctorId: number | null;
  doctorName: string | null;
  paymentType: PaymentType | null;
  prescriptionUrl: string | null;
  sellingType: string | null;
  pharmacyId?: string;
  /** Sum of the lines' MRP totals. Absent on bills saved before the column
   *  existed. */
  totalMrpAmount?: number;
  totalGrossAmount: number;
  totalDiscountPercentage: number;
  totalDiscountAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
  /** Absent on bills saved before the round-off columns existed. */
  roundOffAmount?: number;
  totalNetAmountAfterRoundOff?: number;
  billingDetails: BillingDetailRecord[];
  billingPayments: BillingPaymentRecord[];
}

/** One row of the bills list on the Sales & Billing landing page. */
export interface BillRecord {
  billId: number;
  invoiceNo: string;
  billDate: string;
  customerName: string;
  mobileNo: string;
  totalItems: number;
  paymentMode: PaymentMode;
  status: BillStatus;
  netAmount: number;
}
