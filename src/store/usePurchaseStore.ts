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
  paymentType: "CASH" | "CREDIT" | "";
  creditDays: number;
  supplierPaymentStatus: string;
  totalGrossAmount: number;
  totalDiscount: number;
  totalGst: number;
  totalNetAmount: number;
  purchaseDetails: PurchaseDetail[];
  
  setPurchaseHeader: (data: Partial<PurchaseState>) => void;
  addPurchaseDetail: (detail: PurchaseDetail) => void;
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
