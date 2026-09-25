/**
 * The purchase-return APIs carry no "how much of this invoice is already
 * returned" field, so it is folded up here from the returns themselves:
 * /purchase-return/allPurchaseReturn lists every return with its purchaseId
 * and its per-batch lines, which is enough to net each purchase line off
 * against what has gone back to the supplier.
 */

import type { PurchaseData, PurchaseDetailsData } from "@/types/PurchaseData";
import type { PurchaseReturnData } from "@/types/PurchaseReturnData";

export interface ReturnedQuantities {
    /** Quantity returned out of what was paid for. */
    paid: number;
    /** Quantity returned out of what came free with the purchase. */
    free: number;
}

export type ReturnStatus = "Not Returned" | "Partially Returned" | "Fully Returned";

const NOTHING_RETURNED: ReturnedQuantities = { paid: 0, free: 0 };

/** A purchase line is identified by its product *and* batch — the same product
 *  can appear twice on one invoice under different batches. */
export const returnLineKey = (productId: string, batchId: string): string =>
    `${productId}::${batchId}`;

/** Per purchaseId, per product+batch, the quantities already returned. */
export type ReturnedByPurchase = Map<number, Map<string, ReturnedQuantities>>;

export const buildReturnedByPurchase = (
    returns: PurchaseReturnData[]
): ReturnedByPurchase => {
    const byPurchase: ReturnedByPurchase = new Map();

    returns.forEach((purchaseReturn) => {
        // A cancelled return put the stock back, so it must not count against
        // what is still returnable.
        if (purchaseReturn.isCancel) return;

        const lines = byPurchase.get(purchaseReturn.purchaseId) ?? new Map();
        byPurchase.set(purchaseReturn.purchaseId, lines);

        (purchaseReturn.purchaseReturnDetails ?? []).forEach((detail) => {
            const key = returnLineKey(detail.productId, detail.batchId);
            const running = lines.get(key) ?? { paid: 0, free: 0 };
            lines.set(key, {
                paid: running.paid + (Number(detail.purchaseReturnQuantity) || 0),
                free: running.free + (Number(detail.freeReturnQuantity) || 0),
            });
        });
    });

    return byPurchase;
};

export const returnedForLine = (
    lines: Map<string, ReturnedQuantities> | undefined,
    detail: PurchaseDetailsData
): ReturnedQuantities =>
    lines?.get(returnLineKey(detail.productId, detail.batchId)) ?? NOTHING_RETURNED;

/** What is still returnable on a purchase line: what was received, less what
 *  has already gone back. */
export const eligibleForLine = (
    detail: PurchaseDetailsData,
    returned: ReturnedQuantities
): ReturnedQuantities => ({
    paid: Math.max((Number(detail.purchaseQuantity) || 0) - returned.paid, 0),
    free: Math.max((Number(detail.freeQuantity) || 0) - returned.free, 0),
});

export const deriveReturnStatus = (
    purchase: PurchaseData,
    lines: Map<string, ReturnedQuantities> | undefined
): ReturnStatus => {
    const details = purchase.purchaseDetails ?? [];
    if (!lines || lines.size === 0 || details.length === 0) return "Not Returned";

    let anyReturned = false;
    let allExhausted = true;

    details.forEach((detail) => {
        const returned = returnedForLine(lines, detail);
        if (returned.paid > 0 || returned.free > 0) anyReturned = true;

        const eligible = eligibleForLine(detail, returned);
        if (eligible.paid > 0 || eligible.free > 0) allExhausted = false;
    });

    if (!anyReturned) return "Not Returned";
    return allExhausted ? "Fully Returned" : "Partially Returned";
};
