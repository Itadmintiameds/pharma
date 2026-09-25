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
  /** The pack the quantity was bought in ("Blister"), what it breaks down into
   *  ("Tablet") and how many of the latter are in one of the former. */
  purchaseUnit?: string;
  smallestUnit?: string;
  unitContains?: number;
  expiryDate?: string;
  /** Stock still on hand for this batch, in smallest units — returned by
   *  GET /purchase/{id} only, not by /purchase/allPurchase. Divide by
   *  unitContains to get it in purchase units. */
  availableStock?: number;
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

