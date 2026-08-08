import { BillLine, BillTotals } from "@/types/BillingData";

/** Rate is sellingPricePerUnit (fallback to mrpPerUnit if missing). */
export const lineRate = (line: BillLine) => line.sellingPricePerUnit ?? line.mrpPerUnit ?? 0;

/** Gross is rate X qty. */
export const lineGross = (line: BillLine) => line.quantity * lineRate(line);

/** Discount applied to gross. */
export const lineDiscount = (line: BillLine) =>
  (lineGross(line) * (line.discountPercentage || 0)) / 100;

/** Taxable amount after item discount. */
export const lineTaxable = (line: BillLine) => lineGross(line) - lineDiscount(line);

/** Product GST added on taxable amount. */
export const lineGst = (line: BillLine) =>
  (lineTaxable(line) * (line.gstPercentage || 0)) / 100;

/** Net Amount is (Gross - Discount) + GST. */
export const lineNet = (line: BillLine) => lineTaxable(line) + lineGst(line);

/**
 * The bill level discount expressed as a percentage, so it can be pushed down
 * onto every line. An amount is converted against the cart's gross.
 */
export const billDiscountAsPercentage = (
  lines: BillLine[],
  billDiscountValue = 0,
  discountType: "PERCENTAGE" | "AMOUNT" = "PERCENTAGE"
): number => {
  if (!billDiscountValue) return 0;
  if (discountType === "PERCENTAGE") return billDiscountValue;

  const grossAmount = lines.reduce((sum, line) => sum + lineGross(line), 0);
  return grossAmount > 0 ? (billDiscountValue / grossAmount) * 100 : 0;
};

/**
 * A single line costed out with the bill level discount folded in — the bill
 * discount adds to whatever discount the line already carries, and GST is then
 * charged on what is left. This is the breakdown the billing API is sent, and
 * summing it gives the totals below.
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
  extraDiscountPercentage = 0
): LineBreakdown => {
  const grossAmount = lineGross(line);
  const discountPercentage = Math.min(
    100,
    (line.discountPercentage || 0) + extraDiscountPercentage
  );
  const discountAmount = (grossAmount * discountPercentage) / 100;
  const taxableAmount = grossAmount - discountAmount;
  const gstAmount = (taxableAmount * (line.gstPercentage || 0)) / 100;

  return {
    grossAmount,
    discountPercentage,
    discountAmount,
    taxableAmount,
    gstAmount,
    // (rate x qty - discount) + GST
    netAmount: taxableAmount + gstAmount,
  };
};

/**
 * Rolls the cart up into the numbers shown on the totals strip, the payment
 * screen and the invoice. `billDiscountValue` is the extra discount the cashier
 * applies on top of the per-line discounts; it is spread across the lines so
 * each one's GST is charged on its own discounted amount.
 */
export const calculateBillTotals = (
  lines: BillLine[],
  billDiscountValue = 0,
  discountType: "PERCENTAGE" | "AMOUNT" = "PERCENTAGE"
): BillTotals => {
  const extraDiscount = billDiscountAsPercentage(
    lines,
    billDiscountValue,
    discountType
  );

  const grossAmount = lines.reduce((sum, line) => sum + lineGross(line), 0);
  const itemDiscount = lines.reduce((sum, line) => sum + lineDiscount(line), 0);

  const rows = lines.map((line) => lineBreakdown(line, extraDiscount));
  const totalDiscount = rows.reduce((sum, row) => sum + row.discountAmount, 0);
  const taxableAmount = rows.reduce((sum, row) => sum + row.taxableAmount, 0);
  const gstAmount = rows.reduce((sum, row) => sum + row.gstAmount, 0);

  const totalPayable = taxableAmount + gstAmount;
  const netAmount = Math.round(totalPayable);

  return {
    totalItems: lines.length,
    totalQuantity: lines.reduce(
      (sum, line) => sum + line.quantity + (line.freeQuantity || 0),
      0
    ),
    grossAmount,
    itemDiscount,
    // What the bill level discount alone took off, on top of the line discounts.
    billDiscount: Math.max(0, totalDiscount - itemDiscount),
    taxableAmount,
    gstAmount,
    roundOff: netAmount - totalPayable,
    netAmount,
  };
};

/** Blended GST rate across the cart, for the "GST (x%)" label. */
export const effectiveGstPercentage = (totals: BillTotals): number =>
  totals.taxableAmount > 0 ? (totals.gstAmount / totals.taxableAmount) * 100 : 0;

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
