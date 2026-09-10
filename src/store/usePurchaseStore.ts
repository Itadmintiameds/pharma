import { create } from 'zustand';

export interface PurchaseDetail {
  productId: string;
  productName?: string;
  brandName?: string;
  batchId: string;
  batchNumber?: string;
  packagingId?: string;
  expiryDate?: string;
  hsnCode?: string;
  variant?: string;
  /**
   * What the supplier charges for one purchase unit. The invoice is what we pay
   * them, so the line is priced on this rather than on MRP.
   */
  purchasePrice?: number;
  /** Printed rate for one purchase unit — shown on the invoice, not priced on. */
  mrp?: number;
  /** The slab the line sits on; `gst` below is the amount it works out to. */
  gstPercentage?: number;
  /** The product's GST slab was the non-numeric "Exempted" one, rather than a
   *  real 0% product — `gstPercentage` above cannot tell the two apart, since
   *  both cost out to a 0 rate. */
  isGstExempted?: boolean;
  /** Per-line discount. Nothing captures one yet, so it reads as 0. */
  discountPercentage?: number;
  freeQty: string | number;
  /** Unit name, e.g. "BOX" — the backend column is a varchar. */
  freeQtyUnit: string;
  purchaseQuantity: number;
  grossAmount: number;
  gst: number;
  netAmount: number;
}

interface PurchaseState {
  pharmacyId: string;
  supplierId: number | null;
  supplierName: string;
  grnNo: string;
  invoiceNo: string;
  invoiceDate: string;
  /** The total printed on the supplier's own invoice — entered on Goods
   *  Receipt, not derived from the lines. */
  invoiceAmount: number;
  paymentType: "CASH" | "CREDIT" | "";
  creditDays: number;
  supplierPaymentStatus: string;
  /**
   * Running sums kept as the lines are added, so they are all *pre-discount*.
   * The invoice discount is typed after the lines exist and re-bases every
   * line's GST, so anything shown or saved goes through
   * `calculatePurchaseTotals` instead of reading these.
   */
  totalGrossAmount: number;
  totalDiscount: number;
  totalGst: number;
  totalNetAmount: number;
  purchaseDetails: PurchaseDetail[];
  
  setPurchaseHeader: (data: Partial<PurchaseState>) => void;
  addPurchaseDetail: (detail: PurchaseDetail) => void;
  /**
   * Replaces the fields given on one line, keeping the rest. Used when a
   * product already on the invoice is edited before the purchase is saved: the
   * product master is updated on the server, and the line has to follow.
   */
  updatePurchaseDetail: (index: number, patch: Partial<PurchaseDetail>) => void;
  removePurchaseDetail: (index: number) => void;
  resetPurchase: () => void;
}

const initialState = {
  pharmacyId: "",
  supplierId: null,
  supplierName: "",
  grnNo: "",
  invoiceNo: "",
  invoiceDate: "",
  invoiceAmount: 0,
  paymentType: "" as const,
  creditDays: 0,
  supplierPaymentStatus: "PENDING",
  totalGrossAmount: 0,
  totalDiscount: 0,
  totalGst: 0,
  totalNetAmount: 0,
  purchaseDetails: [],
};

export const usePurchaseStore = create<PurchaseState>((set) => ({
  ...initialState,
  
  setPurchaseHeader: (data) => 
    set((state) => ({ ...state, ...data })),
    
  addPurchaseDetail: (detail) =>
    set((state) => ({
      purchaseDetails: [...state.purchaseDetails, detail],
      totalGrossAmount: state.totalGrossAmount + detail.grossAmount,
      totalGst: state.totalGst + detail.gst,
      totalNetAmount: state.totalNetAmount + detail.netAmount
    })),
    
  updatePurchaseDetail: (index, patch) =>
    set((state) => {
      const previous = state.purchaseDetails[index];
      if (!previous) return {};

      const next = { ...previous, ...patch };
      const details = [...state.purchaseDetails];
      details[index] = next;

      // The running sums are kept as the lines are added, so an edited line has
      // to be taken back out of them before its new figures go in.
      return {
        purchaseDetails: details,
        totalGrossAmount:
          state.totalGrossAmount - previous.grossAmount + next.grossAmount,
        totalGst: state.totalGst - previous.gst + next.gst,
        totalNetAmount:
          state.totalNetAmount - previous.netAmount + next.netAmount,
      };
    }),

  removePurchaseDetail: (index) =>
    set((state) => {
      const details = [...state.purchaseDetails];
      const removed = details.splice(index, 1)[0];
      return {
        purchaseDetails: details,
        totalGrossAmount: state.totalGrossAmount - (removed?.grossAmount || 0),
        totalGst: state.totalGst - (removed?.gst || 0),
        totalNetAmount: state.totalNetAmount - (removed?.netAmount || 0)
      };
    }),
    
  resetPurchase: () => set(initialState)
}));
