import type { CustomerType } from "./BillingData";

export type SalesReturnStatus = "Completed";

export type BillReturnStatus = "Not Returned" | "Partially Returned" | "Returned";

export interface SalesReturnData {
  salesReturnId?: number;
  
  billingId: number;
  billNo?: string;
  billReturnStatus?: BillReturnStatus;
  customerId?: number | null;
  customerName?: string | null;
  customerPhoneNo?: string | null;
  customerType?: CustomerType | null;

  pharmacyId?: string;

  salesReturnNo?: string;
  salesReturnStatus?: SalesReturnStatus;
  salesReturnDate?: string;
  totalGrossAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
  itemCount?: number;
  /** Who allowed a return past the return window; null otherwise. */
  returnAuthorizedBy?: string | null;
  /** How the return was paid back: CASH, CARD, UPI or NET_BANKING. */
  returnPaymentMode?: string | null;
  /** Reference of a non-cash refund; null for cash. */
  returnTransactionId?: string | null;

  createdBy?: string;
  createdAt?: string;

  salesReturnDetails: SalesReturnDetailData[];
}

export interface SalesReturnDetailData {
  salesReturnDetailId?: number;
  productId: string;
  productName?: string;
  batchId: string;
  batchNumber?: string;
  salesReturnQuantity: number;
  salesReturnReason?: string;
  grossAmount: number;
  gstAmount: number;
  netAmount: number;

}

export interface SalesReturnCreatePayload {
  billingId: number;
  salesReturnDate?: string;
  totalGrossAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
  /** Full name (no role) of who authorized a late return. Sent only then. */
  returnAuthorizedBy?: string;
  /** Sent only when money is actually paid back. */
  returnPaymentMode?: string;
  /** Sent only for a non-cash refund. */
  returnTransactionId?: string;
  salesReturnDetails: SalesReturnCreateDetail[];
}

export interface SalesReturnCreateDetail {
  productId: string;
  batchId: string;
  salesReturnQuantity: number;
  salesReturnReason: string;
  grossAmount: number;
  gstAmount: number;
  netAmount: number;
}


export interface SalesReturnKpiResponse {
  totalSalesReturns: number;
  totalReturnAmount: number;
}
