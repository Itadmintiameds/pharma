/**
 * A purchase return credits the supplier at the price the goods were bought
 * at, so every amount here is derived from the purchase line itself rather
 * than from MRP: the rate is the line's gross over the quantity received, and
 * the GST ratio is the one the line was actually charged at. Returning the
 * whole line therefore reproduces the invoice figures exactly.
 *
 * The purchase's invoice discount is credited back too. The purchase line keeps
 * its gross undiscounted and charges GST on (gross - its discount share), so
 * that share is recovered as gross + gst - net and returned pro rata with the
 * quantity, with GST then charged on the discounted value exactly as it was on
 * the purchase.
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
    /** Rate X quantity, before the discount — as on the purchase line. */
    grossAmount: number;
    /** The returned quantity's share of the purchase line's discount. */
    discountAmount: number;
    /** gross - discount: the value GST is charged on. */
    taxableAmount: number;
    gstAmount: number;
    netAmount: number;
}

const ZERO: ReturnLineAmounts = {
    rate: 0,
    grossAmount: 0,
    discountAmount: 0,
    taxableAmount: 0,
    gstAmount: 0,
    netAmount: 0,
};

/**
 * The discount a purchase line carried. A line saved without a discount has
 * net = gross + gst, which reads back as 0; a line with no net at all is
 * treated the same way rather than as one discounted to nothing.
 */
const purchaseLineDiscount = (detail: PurchaseDetailsData): number => {
    const gross = Number(detail.grossAmount) || 0;
    const gst = Number(detail.gst) || 0;
    const net = Number(detail.netAmount) || 0;
    if (net <= 0) return 0;
    return Math.min(Math.max(toMoney(gross + gst - net), 0), gross);
};

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
    const purchasedDiscount = purchaseLineDiscount(detail);
    const purchasedTaxable = purchasedGross - purchasedDiscount;
    // The ratio actually charged on the line's taxable value reproduces the
    // invoice exactly; the printed slab is the fallback for a line with no
    // taxable value to divide by.
    const gstRatio =
        purchasedTaxable > 0
            ? (Number(detail.gst) || 0) / purchasedTaxable
            : parseGstPercentage(detail.gstPercentage);

    const grossAmount = toMoney(rate * qty);
    const discountAmount = toMoney((purchasedDiscount * qty) / purchasedQty);
    const taxableAmount = toMoney(grossAmount - discountAmount);
    const gstAmount = toMoney(taxableAmount * gstRatio);

    return {
        rate: toMoney(rate),
        grossAmount,
        discountAmount,
        taxableAmount,
        gstAmount,
        netAmount: toMoney(taxableAmount + gstAmount),
    };
};

/**
 * Splits a saved return line's amounts back out. The discount and taxable
 * value are not stored on the return, but follow from gross, GST and net the
 * same way they do on a purchase line.
 */
export const savedLineAmounts = (
    rate: number,
    saved: { grossAmount?: number; gstAmount?: number; netAmount?: number }
): ReturnLineAmounts => {
    const grossAmount = toMoney(Number(saved.grossAmount) || 0);
    const gstAmount = toMoney(Number(saved.gstAmount) || 0);
    const netAmount = toMoney(Number(saved.netAmount) || 0);
    const taxableAmount = toMoney(netAmount - gstAmount);

    return {
        rate,
        grossAmount,
        discountAmount: toMoney(Math.max(grossAmount - taxableAmount, 0)),
        taxableAmount,
        gstAmount,
        netAmount,
    };
};

export interface ReturnTotals {
    totalGrossAmount: number;
    totalDiscount: number;
    totalGstAmount: number;
    totalNetAmount: number;
}

export const sumLineAmounts = (lines: ReturnLineAmounts[]): ReturnTotals => ({
    totalGrossAmount: toMoney(lines.reduce((sum, line) => sum + line.grossAmount, 0)),
    totalDiscount: toMoney(lines.reduce((sum, line) => sum + line.discountAmount, 0)),
    totalGstAmount: toMoney(lines.reduce((sum, line) => sum + line.gstAmount, 0)),
    totalNetAmount: toMoney(lines.reduce((sum, line) => sum + line.netAmount, 0)),
});

/** Taxable total — gross less discount — for summaries. */
export const totalTaxable = (totals: ReturnTotals): number =>
    toMoney(totals.totalGrossAmount - totals.totalDiscount);
