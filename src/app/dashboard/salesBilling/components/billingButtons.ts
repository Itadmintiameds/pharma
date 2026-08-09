/**
 * The three button treatments the POS flow uses, shared so Billing, the payment
 * screen and the invoice summary stay identical.
 *
 * All are Large / Square: 56px tall, 4px corners, and an 18px medium label in
 * the heading face. `font-work-sans` is spelled out rather than `font-heading`
 * — the latter is not a real utility, so at this size the label would fall back
 * to the body face.
 */

const BASE =
    "h-14 min-w-[108px] flex items-center justify-center gap-2 rounded-[4px] " +
    "font-work-sans text-[18px] leading-6 font-medium transition-all " +
    "cursor-pointer disabled:opacity-50";

/** Tertiary / Outline — Back. */
export const BACK_BUTTON = `${BASE} border-[2.5px] border-pneutral-900 bg-white hover:bg-pneutral-50 text-pneutral-900`;

/** Brand fill — Save, Proceed to Payment, Generate Invoice. */
export const PRIMARY_BUTTON = `${BASE} bg-primary-800 hover:opacity-90 text-pneutral-50 shadow-md`;

/** Neutral fill — Clear Cart. */
export const DARK_BUTTON = `${BASE} bg-pneutral-900 hover:opacity-90 text-pneutral-50`;
