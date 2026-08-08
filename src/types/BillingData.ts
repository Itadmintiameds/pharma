/**
 * Types for the Sales & Billing (POS) module.
 *
 * The billing APIs are not wired up yet — these mirror the fields the POS
 * screens capture so the components can be swapped onto real endpoints without
 * reshaping the UI.
 */

export type CustomerType = "WALK_IN" | "REGISTERED" | "OP_PATIENT" | "IP_PATIENT" | "DAYCARE" | "CORPORATE" | "BUSINESS" | "INSURANCE" | "DOCTOR";

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
  address: string;
}

/** A customer as the customer API returns it. */
export interface CustomerRecord {
  customerId: number;
  customerName: string;
  customerPhoneNo: string;
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

/** One line of the billing/create payload. */
export interface BillingDetailPayload {
  productId: string;
  batchId: string;
  unit: string;
  billQuantity: number;
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  gstAmount: number;
  netAmount: number;
}

export interface BillingPaymentPayload {
  paymentMode: PaymentMode;
  transactionId: string;
  receivedAmount: number;
  paymentType: "PAID" | "PENDING";
}

export interface CreateBillingPayload {
  /** Omitted for a new customer — send name and phone instead and the API
   *  creates the customer and keeps its id. */
  customerId?: number;
  customerName?: string;
  customerPhoneNo?: string;
  customerType: CustomerType;
  doctorId?: number;
  customerAddress?: string;
  totalGrossAmount: number;
  totalDiscountPercentage: number;
  totalDiscountAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
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
  creditDays?: number;
}

/** One line of a bill as the billing API returns it. */
export interface BillingDetailRecord {
  billingDetailsId: number;
  billingId: number;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  unit: string;
  billQuantity: number;
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
  paymentType: "PAID" | "PENDING";
  receivedAmount: number;
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
  prescriptionUrl: string | null;
  sellingType: string | null;
  pharmacyId?: string;
  totalGrossAmount: number;
  totalDiscountPercentage: number;
  totalDiscountAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
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
