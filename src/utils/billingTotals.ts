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
 * Rolls the cart up into the numbers shown on the totals strip, the payment
 * screen and the invoice. `billDiscount` is the extra discount the cashier
 * applies on top of the per-line discounts.
 */
export const calculateBillTotals = (
  lines: BillLine[],
  billDiscountValue = 0,
  discountType: "PERCENTAGE" | "AMOUNT" = "PERCENTAGE"
): BillTotals => {
  const grossAmount = lines.reduce((sum, line) => sum + lineGross(line), 0);
  const itemDiscount = lines.reduce((sum, line) => sum + lineDiscount(line), 0);
  const totalGstFromItems = lines.reduce((sum, line) => sum + lineGst(line), 0);

  const afterItemDiscount = grossAmount - itemDiscount;
  const billDiscount =
    discountType === "PERCENTAGE"
      ? (afterItemDiscount * billDiscountValue) / 100
      : Math.min(afterItemDiscount, billDiscountValue);
  
  const taxableAmount = Math.max(0, afterItemDiscount - billDiscount);

  // If a bill discount is applied, scale GST proportionately with taxable amount
  const gstAmount = afterItemDiscount > 0
    ? totalGstFromItems * (taxableAmount / afterItemDiscount)
    : 0;

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
    billDiscount,
    taxableAmount,
    gstAmount,
    roundOff: netAmount - totalPayable,
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
