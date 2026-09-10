export interface PurchaseData {
  purchaseId?: number;
  pharmacyId?: string;
  supplierId: number;
  supplierName?: string;
  grnNo: string;
  invoiceNo: string;
  invoiceDate: string;
  /** The total printed on the supplier's own invoice, as entered on Goods
   *  Receipt — not derived from the purchase lines. */
  invoiceAmount?: number;
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
  freeUnit?: string;
  freeQuantity?: number;
  grossAmount: number;
  gst: number;
  /** The product's GST slab at the time of purchase — "5%", "28%", or the
   *  non-numeric "Exempted" slab. Absent on a purchase saved before this
   *  column existed. */
  gstPercentage?: string;
  netAmount: number;
}

