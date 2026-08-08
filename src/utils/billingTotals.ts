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

export type DiscountType = "PERCENTAGE" | "AMOUNT";

/**
 * The bill level discount in both units. Whichever one the cashier typed, the
 * other is derived against the cart's gross — that pair is what the summary
 * shows and what the billing API is sent.
 */
export const billDiscountBothWays = (
  grossAmount: number,
  billDiscountValue = 0,
  discountType: DiscountType = "PERCENTAGE"
): { amount: number; percentage: number } => {
  if (!billDiscountValue) return { amount: 0, percentage: 0 };

  if (discountType === "PERCENTAGE") {
    return {
      amount: (grossAmount * billDiscountValue) / 100,
      percentage: billDiscountValue,
    };
  }

  return {
    amount: billDiscountValue,
    percentage: grossAmount > 0 ? (billDiscountValue / grossAmount) * 100 : 0,
  };
};

/**
 * A single line costed out with the bill level discount folded in. The bill
 * discount reaches the line as a percentage that adds to whatever discount the
 * line already carries — an amount is converted against the cart's gross first,
 * so 15 rupees off a 170 cart is 8.82% off every line. GST is then charged on
 * what is left, so the totals are nothing more than the sum of the lines.
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
  const ownDiscount = (grossAmount * (line.discountPercentage || 0)) / 100;
  const billShare = (grossAmount * billDiscountPercentage) / 100;

  // A line can never discount past its own gross.
  const discountAmount = Math.min(grossAmount, ownDiscount + billShare);
  const taxableAmount = grossAmount - discountAmount;
  const gstAmount = (taxableAmount * (line.gstPercentage || 0)) / 100;

  return {
    grossAmount,
    discountPercentage: grossAmount > 0 ? (discountAmount / grossAmount) * 100 : 0,
    discountAmount,
    taxableAmount,
    gstAmount,
    // (rate x qty - discount) + GST
    netAmount: taxableAmount + gstAmount,
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
    // Paise are kept — rounding to whole rupees turned 24.05 into 24.00.
    roundOff: 0,
    netAmount: taxableAmount + gstAmount,
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
