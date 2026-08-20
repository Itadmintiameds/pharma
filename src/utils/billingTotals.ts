import { BillLine, BillTotals } from "@/types/BillingData";

/**
 * MRP is what a line is billed at — the printed price, which already includes
 * GST. So the money flows the other way round from a supplier invoice: the net
 * is known first and the tax is *extracted* out of it, rather than a taxable
 * amount being built up and GST added on top.
 */
export const lineRate = (line: BillLine) => line.mrpPerUnit ?? 0;

/** MRP X qty — the line before any discount. */
export const lineGross = (line: BillLine) => line.quantity * lineRate(line);

/** The row's own discount, off the MRP total. */
export const lineDiscount = (line: BillLine) =>
  (lineGross(line) * (line.discountPercentage || 0)) / 100;

/** What the customer pays for the line: (MRP X qty) - discount. Nothing is
 *  added for GST, because MRP is inclusive of it. */
export const lineNet = (line: BillLine) => lineGross(line) - lineDiscount(line);

/**
 * The GST sitting inside a tax-inclusive amount — 12% inside ₹900 is
 * 900 X 12/112 = ₹96.43, not 900 X 12/100. This is the only place the rate is
 * applied, so every taxable figure in the module comes out of one formula.
 */
export const gstWithin = (inclusiveAmount: number, gstPercentage = 0) =>
  (inclusiveAmount * gstPercentage) / (100 + gstPercentage);

/** The GST inside the line's net. */
export const lineGst = (line: BillLine) =>
  gstWithin(lineNet(line), line.gstPercentage || 0);

/** Net less the GST inside it. */
export const lineTaxable = (line: BillLine) => lineNet(line) - lineGst(line);

/**
 * Half up to the whole rupee — 45.78 becomes 46, 50.50 becomes 51, 37.30 stays
 * 37, and a figure already whole is returned unchanged.
 *
 * The two-decimal pass first is not decorative: the net is a sum of products of
 * floats, so an amount that reads 50.50 on screen can hold 50.49999999999999,
 * which Math.round would send down to 50. Rounding what is displayed is the
 * only behaviour a cashier can predict.
 *
 * Math.round is already half *up* rather than half to even, and a bill total is
 * never negative, so it needs no help beyond that.
 */
export const roundToRupee = (amount: number) =>
  Math.round(Number((amount || 0).toFixed(2)));

export type DiscountType = "PERCENTAGE" | "AMOUNT";

/**
 * The bill level discount in both units. Whichever one the cashier typed, the
 * other is derived against the cart's MRP total — that pair is what the summary
 * shows and what the billing API is sent.
 *
 * The MRP total is the right base for the conversion: since the percentage is
 * then charged against each line's own MRP total, the shares add back up to
 * exactly the rupees that were typed.
 */
export const billDiscountBothWays = (
  cartMrpTotal: number,
  billDiscountValue = 0,
  discountType: DiscountType = "PERCENTAGE"
): { amount: number; percentage: number } => {
  if (!billDiscountValue) return { amount: 0, percentage: 0 };

  if (discountType === "PERCENTAGE") {
    return {
      amount: (cartMrpTotal * billDiscountValue) / 100,
      percentage: billDiscountValue,
    };
  }

  return {
    amount: billDiscountValue,
    percentage: cartMrpTotal > 0 ? (billDiscountValue / cartMrpTotal) * 100 : 0,
  };
};

/**
 * A single line costed out with the bill level discount folded in. The bill
 * discount reaches the line as a percentage that adds to whatever discount the
 * line already carries — an amount is converted against the cart's MRP total
 * first, so 15 rupees off a 170 cart is 8.82% off every line. GST is then
 * extracted from what is left, so the totals are nothing more than the sum of
 * the lines.
 */
export interface LineBreakdown {
  grossAmount: number;
  discountPercentage: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  netAmount: number;
}

export const lineBreakdown = (
  line: BillLine,
  billDiscountPercentage = 0
): LineBreakdown => {
  const grossAmount = lineGross(line);

  // The two discounts simply add. Capped at 100%, since a line can never
  // discount past its own MRP total.
  const discountPercentage = Math.min(
    100,
    (line.discountPercentage || 0) + billDiscountPercentage
  );
  const discountAmount = (grossAmount * discountPercentage) / 100;

  // (MRP x qty) - discount. This is what is paid; GST lives inside it.
  const netAmount = grossAmount - discountAmount;
  const gstAmount = gstWithin(netAmount, line.gstPercentage || 0);

  return {
    grossAmount,
    discountPercentage,
    discountAmount,
    taxableAmount: netAmount - gstAmount,
    gstAmount,
    netAmount,
  };
};

/**
 * Rolls the cart up into the numbers shown on the totals strip, the payment
 * screen and the invoice. Everything but `billDiscount` is a straight sum of
 * the lines; the discount shown is the bill level one as entered, not the sum
 * of every discount in the cart.
 */
export const calculateBillTotals = (
  lines: BillLine[],
  billDiscountValue = 0,
  discountType: DiscountType = "PERCENTAGE"
): BillTotals => {
  const grossAmount = lines.reduce((sum, line) => sum + lineGross(line), 0);
  const itemDiscount = lines.reduce((sum, line) => sum + lineDiscount(line), 0);

  const billDiscount = billDiscountBothWays(
    grossAmount,
    billDiscountValue,
    discountType
  );

  const rows = lines.map((line) => lineBreakdown(line, billDiscount.percentage));
  const taxableAmount = rows.reduce((sum, row) => sum + row.taxableAmount, 0);
  const gstAmount = rows.reduce((sum, row) => sum + row.gstAmount, 0);
  // What the lines add up to, to the paisa. Taxable + GST reconciles against
  // this, and it is what the payload sends as totalNetAmount — but it is never
  // the figure on screen.
  const exactNetAmount = rows.reduce((sum, row) => sum + row.netAmount, 0);
  const netAmount = roundToRupee(exactNetAmount);

  return {
    totalItems: lines.length,
    totalQuantity: lines.reduce(
      (sum, line) => sum + line.quantity + (line.freeQuantity || 0),
      0
    ),
    grossAmount,
    itemDiscount,
    billDiscount: billDiscount.amount,
    billDiscountPercentage: billDiscount.percentage,
    taxableAmount,
    gstAmount,
    /**
     * The paise the rounding gave up (negative) or took (positive) — the
     * payload's roundOffAmount.
     */
    roundOff: netAmount - exactNetAmount,
    /**
     * The whole-rupee payable: the payload's totalNetAmountAfterRoundOff, and
     * the only net the UI ever shows. Rounding once, here, is what keeps the
     * totals strip, the payment screen's amount due, the printed NET PAYABLE
     * and the saved record on the same number — the exact figure stays inside
     * buildBillingPayload, which derives it from the lines itself.
     */
    netAmount,
  };
};

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

const underThousand = (value: number): string => {
  if (value === 0) return "";
  if (value < 20) return ONES[value];
  if (value < 100)
    return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ""}`;
  return `${ONES[Math.floor(value / 100)]} Hundred${
    value % 100 ? ` ${underThousand(value % 100)}` : ""
  }`;
};

/** Indian grouping (crore / lakh / thousand) for the invoice footer. */
export const amountInWords = (amount: number): string => {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const groups: [number, string][] = [
    [Math.floor(rupees / 10000000), "Crore"],
    [Math.floor((rupees % 10000000) / 100000), "Lakh"],
    [Math.floor((rupees % 100000) / 1000), "Thousand"],
    [rupees % 1000, ""],
  ];

  const words = groups
    .filter(([count]) => count > 0)
    .map(([count, unit]) => `${underThousand(count)}${unit ? ` ${unit}` : ""}`)
    .join(" ");

  const paiseWords = paise ? ` and ${underThousand(paise)} Paise` : "";
  return `${words} Rupees${paiseWords} Only`;
};

/** ₹ amounts everywhere in the module read as 1,250.00. */
export const formatAmount = (value: number) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
