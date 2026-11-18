// The lines picked on Create Sales Return, handed to Review & Confirm (and back
// again on "Back / Modify Return Items"). Kept in sessionStorage per bill so the
// hand-off survives the view change and a refresh; nothing is saved to the
// server until the return is confirmed.

export interface SalesReturnDraftLine {
  /** The bill line being returned — BillingDetailRecord.billingDetailsId. */
  billingDetailsId: number;
  returnQty: number;
  reason: string;
  /** Required when the reason is "Other". */
  remarks: string;
}

const draftKey = (billingId: string | number) => `salesReturnDraft:${billingId}`;
const refundKey = (billingId: string | number) => `salesReturnRefund:${billingId}`;

export type RefundMode = "CASH" | "CARD" | "UPI" | "NET_BANKING";

/** How the return is paid back. transactionId is "" for cash. */
export interface SalesReturnRefund {
  refundMode: RefundMode | "";
  transactionId: string;
}

export const EMPTY_REFUND: SalesReturnRefund = { refundMode: "", transactionId: "" };

export const saveSalesReturnRefund = (
  billingId: string | number,
  refund: SalesReturnRefund
) => {
  try {
    sessionStorage.setItem(refundKey(billingId), JSON.stringify(refund));
  } catch {
    // Storage blocked — the refund fields simply come back empty.
  }
};

export const loadSalesReturnRefund = (billingId: string | number): SalesReturnRefund => {
  try {
    const raw = sessionStorage.getItem(refundKey(billingId));
    return raw ? { ...EMPTY_REFUND, ...JSON.parse(raw) } : EMPTY_REFUND;
  } catch {
    return EMPTY_REFUND;
  }
};

export const saveSalesReturnDraft = (
  billingId: string | number,
  lines: SalesReturnDraftLine[]
) => {
  try {
    sessionStorage.setItem(draftKey(billingId), JSON.stringify(lines));
  } catch {
    // Storage blocked (private mode, quota) — Review will show no items.
  }
};

export const loadSalesReturnDraft = (
  billingId: string | number
): SalesReturnDraftLine[] => {
  try {
    const raw = sessionStorage.getItem(draftKey(billingId));
    const lines = raw ? JSON.parse(raw) : [];
    return Array.isArray(lines) ? lines : [];
  } catch {
    return [];
  }
};

export const clearSalesReturnDraft = (billingId: string | number) => {
  try {
    sessionStorage.removeItem(draftKey(billingId));
    sessionStorage.removeItem(refundKey(billingId));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};
