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
  customerName: string;
  mobileNo: string;
  age: string;
  gender: string;
  doctorName: string;
  /** Who sent the customer in — doctor, staff, referral code. */
  referredBy: string;
  address: string;
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
  itemDiscount: number;
  billDiscount: number;
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
