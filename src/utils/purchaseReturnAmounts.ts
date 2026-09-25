/**
 * A purchase return credits the supplier at the price the goods were bought
 * at, so every amount here is derived from the purchase line itself rather
 * than from MRP: the rate is the line's gross over the quantity received, and
 * the GST ratio is the one the line was actually charged at. Returning the
 * whole line therefore reproduces the invoice figures exactly.
 *
 * Free quantities carry no value on the purchase — the line's gross covers the
 * paid units only — so returning them moves stock without moving money.
 */

import type { PurchaseDetailsData } from "@/types/PurchaseData";

/** Money is carried to paise; anything finer is a rounding artefact. */
export const toMoney = (value: number): number =>
    Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

export interface ReturnLineAmounts {
    /** Per-unit purchase rate, for display on the review table. */
    rate: number;
    grossAmount: number;
    gstAmount: number;
    netAmount: number;
}

const ZERO: ReturnLineAmounts = { rate: 0, grossAmount: 0, gstAmount: 0, netAmount: 0 };

/** `"18%"` → 0.18. Non-numeric slabs such as "Exempted" give 0. */
const parseGstPercentage = (value?: string): number => {
    const match = (value ?? "").match(/([\d.]+)\s*%?/);
    if (!match) return 0;
    const percent = Number(match[1]);
    return Number.isFinite(percent) ? percent / 100 : 0;
};

export const lineAmounts = (
    detail: PurchaseDetailsData,
    returnQuantity: number
): ReturnLineAmounts => {
    const purchasedQty = Number(detail.purchaseQuantity) || 0;
    const purchasedGross = Number(detail.grossAmount) || 0;
    const qty = Number(returnQuantity) || 0;

    if (purchasedQty <= 0 || qty <= 0) return ZERO;

    const rate = purchasedGross / purchasedQty;
    // The ratio actually charged on the line reproduces the invoice exactly;
    // the printed slab is the fallback for a line with no gross to divide by.
    const gstRatio =
        purchasedGross > 0
            ? (Number(detail.gst) || 0) / purchasedGross
            : parseGstPercentage(detail.gstPercentage);

    const grossAmount = toMoney(rate * qty);
    const gstAmount = toMoney(grossAmount * gstRatio);

    return {
        rate: toMoney(rate),
        grossAmount,
        gstAmount,
        netAmount: toMoney(grossAmount + gstAmount),
    };
};

export interface ReturnTotals {
    totalGrossAmount: number;
    totalGstAmount: number;
    totalNetAmount: number;
}

export const sumLineAmounts = (lines: ReturnLineAmounts[]): ReturnTotals => ({
    totalGrossAmount: toMoney(lines.reduce((sum, line) => sum + line.grossAmount, 0)),
    totalGstAmount: toMoney(lines.reduce((sum, line) => sum + line.gstAmount, 0)),
    totalNetAmount: toMoney(lines.reduce((sum, line) => sum + line.netAmount, 0)),
});
