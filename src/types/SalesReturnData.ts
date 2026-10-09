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
