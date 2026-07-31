export interface PurchaseData {
  purchaseId?: number;
  pharmacyId?: string;
  supplierId: number;
  supplierName?: string;
  grnNo: string;
  invoiceNo: string;
  invoiceDate: string;
  paymentType: string;
  creditDays?: number;
  supplierPaymentStatus: string;
  totalGrossAmount: number;
  totalDiscount: number;
  totalGst: number;
  totalNetAmount: number;
  purchaseDetails: PurchaseDetailsData[];
}

export interface PurchaseDetailsData {
  purchaseDetailsId?: number;
  productId: string;
  productName?: string;
  batchId: string;
  batchNumber?: string;
  packagingId?: number;
  packagingName?: string;
  purchaseQuantity: number;
  freeUnit?: number;
  freeQuantity?: number;
  grossAmount: number;
  gst: number;
  netAmount: number;
}

