import type { PurchaseDetail } from "@/store/usePurchaseStore";

/**
 * Costing for a purchase invoice, where the one discount the user types on the
 * summary screen has to reach every product line.
 *
 * The money flows the opposite way from a bill (see `billingTotals.ts`): the
 * supplier prices per purchase unit *before* tax, so a line is built up as
 * gross -> less discount -> plus GST, rather than having GST extracted out of an
 * inclusive MRP.
 *
 * The discount is spread as a single rate shared by every line, not as an
 * amount carved up between them — so each product is discounted by the same
 * percentage of its own value. The two are numerically identical, and that is
 * what makes the invoice foot: the per-line taxable values add back up to
 * (gross - discount) exactly.
 *
 * The discounted value never appears on a product line — the line still shows
 * its full gross. Only the line's GST (charged on the discounted value) and its
 * amount carry the discount, so the Amount column still sums to NET PAYABLE.
 */

/** Money is only ever compared and summed at paise precision. */
const toPaise = (value: number) => Math.round((Number(value) || 0) * 100);
const round2 = (value: number) => toPaise(value) / 100;

export interface PurchaseLineBreakdown {
  /** Purchase price X quantity, before any discount. This is what the line shows. */
  grossAmount: number;
  /** This line's share of the invoice discount. Not shown on the line. */
  discountAmount: number;
  /** gross - discount: the value GST is charged on. Not shown on the line. */
  taxableAmount: number;
  gstPercentage: number;
  gstAmount: number;
  /** taxable + GST. Sums across the lines to the invoice's net payable. */
  netAmount: number;
}

export interface PurchaseTotals {
  totalItems: number;
  totalQuantity: number;
  totalFreeQuantity: number;
  grossAmount: number;
  /** The discount as entered, which is also the sum of the line shares. */
  discountAmount: number;
  /** The rate every line was discounted by, as a percentage. */
  discountPercentage: number;
  taxableAmount: number;
  gstAmount: number;
  netAmount: number;
  lines: PurchaseLineBreakdown[];
}

/**
 * Splits `discount` across the lines in proportion to their gross, to the
 * paise.
 *
 * Rounding each share on its own leaves the split short or over — ₹100 across
 * three equal lines rounds to ₹33.33 X 3 = ₹99.99 — and the invoice then fails
 * to foot by a paisa. So the shares are floored and the remaining paise handed
 * out largest-remainder-first, which keeps the sum exact.
 */
const splitDiscount = (grossPaise: number[], discountPaise: number): number[] => {
  const total = grossPaise.reduce((sum, value) => sum + value, 0);
  if (total <= 0 || discountPaise <= 0) return grossPaise.map(() => 0);

  const exact = grossPaise.map((gross) => (gross * discountPaise) / total);
  const shares = exact.map((value) => Math.floor(value));

  let leftover = discountPaise - shares.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; leftover > 0 && i < byRemainder.length; i += 1, leftover -= 1) {
    shares[byRemainder[i].index] += 1;
  }

  return shares;
};

/**
 * Costs out the purchase lines with the invoice level discount folded in.
 *
 * `gstPercentage` is read per line, so an invoice mixing slabs is taxed
 * correctly rather than at one blended rate.
 */
export const calculatePurchaseTotals = (
  lines: PurchaseDetail[],
  discount = 0,
): PurchaseTotals => {
  const grossPaise = lines.map((line) =>
    toPaise(
      // Prefer the priced-out figure so a line stays consistent with what was
      // shown when it was added; fall back to price X quantity.
      line.grossAmount ??
        Number(line.purchasePrice || 0) * Number(line.purchaseQuantity || 0),
    ),
  );
  const grossTotalPaise = grossPaise.reduce((sum, value) => sum + value, 0);

  // A discount can never take the invoice past its own gross.
  const discountPaise = Math.min(
    Math.max(toPaise(discount), 0),
    grossTotalPaise,
  );
  const shares = splitDiscount(grossPaise, discountPaise);

  const breakdowns: PurchaseLineBreakdown[] = lines.map((line, index) => {
    const grossAmount = grossPaise[index] / 100;
    const discountAmount = shares[index] / 100;
    const taxableAmount = round2(grossAmount - discountAmount);
    const gstPercentage = Number(line.gstPercentage || 0);
    const gstAmount = round2((taxableAmount * gstPercentage) / 100);

    return {
      grossAmount,
      discountAmount,
      taxableAmount,
      gstPercentage,
      gstAmount,
      netAmount: round2(taxableAmount + gstAmount),
    };
  });

  // Totals are the sum of the rounded lines, so the columns on screen add up to
  // the figures beside them.
  const sum = (pick: (row: PurchaseLineBreakdown) => number) =>
    round2(breakdowns.reduce((total, row) => total + pick(row), 0));

  const grossAmount = grossTotalPaise / 100;
  const discountAmount = discountPaise / 100;

  return {
    totalItems: lines.length,
    totalQuantity: lines.reduce(
      (total, line) => total + Number(line.purchaseQuantity || 0),
      0,
    ),
    totalFreeQuantity: lines.reduce(
      (total, line) => total + Number(line.freeQty || 0),
      0,
    ),
    grossAmount,
    discountAmount,
    discountPercentage:
      grossAmount > 0 ? (discountAmount / grossAmount) * 100 : 0,
    taxableAmount: sum((row) => row.taxableAmount),
    gstAmount: sum((row) => row.gstAmount),
    netAmount: sum((row) => row.netAmount),
    lines: breakdowns,
  };
};
