export interface PurchaseReturnData {
  purchaseReturnId?: number;
  pharmacyId?: string;
  warehouseId?: string | null;
  /** The purchase this return was raised against — the join back to PurchaseData. */
  purchaseId: number;
  supplierId: number;
  supplierName?: string;
  returnNo: string;
  /** The date the return was raised. Newer responses name it
   *  `purchaseReturnDate`; `returnDate` is the older spelling. */
  purchaseReturnDate?: string;
  returnDate?: string;
  /** DRAFT until posted, then CONFIRMED — or CANCELLED once reversed. */
  status?: PurchaseReturnStatus;
  grnNo?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  itemCount?: number;
  returnRemarks?: string | null;
  isCancel?: boolean;
  cancelRemark?: string | null;
  cancelReason?: string | null;
  /** Why the latest revision was made — set by PUT /{id}/edit. */
  editReason?: string | null;
  totalGrossAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
  purchaseReturnDetails: PurchaseReturnDetailData[];

  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
}

/** "CANCELLED" exists on the backend but is not raised from this screen yet. */
export type PurchaseReturnStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

/** The body POSTed to /purchase-return/create. Amounts are computed in the
 *  browser from the purchase lines — see utils/purchaseReturnAmounts. */
export interface PurchaseReturnCreatePayload {
  purchaseId: number;
  /** Exactly one of these two is set, matching the location header the request
   *  travels with: a warehouse-scoped user sends warehouseId, everyone else
   *  sends pharmacyId. */
  pharmacyId: string | null;
  warehouseId: string | null;
  status: PurchaseReturnStatus;
  cancelReason: string | null;
  editReason: string | null;
  totalGrossAmount: number;
  totalGstAmount: number;
  totalNetAmount: number;
  purchaseReturnDetails: PurchaseReturnCreateDetail[];
}

export interface PurchaseReturnCreateDetail {
  productId: string;
  batchId: string;
  purchaseReturnQuantity: number;
  /** The API takes this one as a string, unlike the paid quantity above. */
  freeReturnQuantity: string;
  returnReason: string;
  grossAmount: number;
  gstAmount: number;
  netAmount: number;
}

export interface PurchaseReturnDetailData {
  purchaseReturnDetailId?: number;
  productId: string;
  productName?: string;
  batchId: string;
  batchNumber?: string;
  purchaseReturnQuantity: number;
  /** The API returns this one as a string ("10") while the paid quantity above
   *  is a number, so coerce before doing arithmetic with it. */
  freeReturnQuantity?: number | string;
  returnReason?: string;
  grossAmount: number;
  gstAmount: number;
  netAmount: number;

  /** Read-only revision info. Only a line's latest revision is returned; a
   *  row saved before revisioning reads as revision 1. */
  revisionNo?: number;
  isActive?: boolean;
  previousDetailId?: number | null;

  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
}

/** The body PUT to /purchase-return/{id}/edit. The server reads only these
 *  fields; a line left out keeps its current quantities. */
export interface PurchaseReturnEditPayload {
  editReason: string;
  purchaseReturnDetails: {
    purchaseReturnDetailId: number;
    purchaseReturnQuantity: number;
    freeReturnQuantity: number;
  }[];
}
