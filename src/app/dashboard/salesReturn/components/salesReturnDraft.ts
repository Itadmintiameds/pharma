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
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};
