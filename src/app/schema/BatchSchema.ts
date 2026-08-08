import { z } from 'zod';

/** Stock must have at least this much shelf life left to be worth receiving. */
export const MIN_EXPIRY_MONTHS = 3;

/** Manufacturing/expiry are captured as "YYYY-MM" — month precision only. */
const parseMonthYear = (value: string): { year: number; month: number } | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year: Number(match[1]), month };
};

/** Absolute month count, so two "YYYY-MM" values compare with a subtraction. */
const toMonthIndex = ({ year, month }: { year: number; month: number }): number =>
  year * 12 + month;

const currentMonthIndex = (): number => {
  const now = new Date();
  return toMonthIndex({ year: now.getFullYear(), month: now.getMonth() });
};

export const BatchSchema = z.object({
  batchNumber: z.string()
    .min(3, "Must be at least 3 characters")
    .max(20, "Cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9/-]+$/, "Only letters, numbers, - and / are allowed")
    .refine(val => /[a-zA-Z0-9]/.test(val), "Must contain at least one letter or number")
    .refine(val => !/[-/]{2,}/.test(val), "Cannot have consecutive special characters"),
  
  // Optional, but must be a sane past month once entered.
  manufacturingDate: z.string()
    .refine(value => value === '' || parseMonthYear(value) !== null, "Enter a valid month and year")
    .refine(value => {
      const parsed = parseMonthYear(value);
      return parsed ? toMonthIndex(parsed) <= currentMonthIndex() : true;
    }, "Cannot be a future month"),

  expiryDate: z.string().min(1, "Expiry Date is required")
    .refine(value => parseMonthYear(value) !== null, "Enter a valid month and year")
    .refine(value => {
      const parsed = parseMonthYear(value);
      return parsed ? toMonthIndex(parsed) >= currentMonthIndex() : true;
    }, "Cannot be a past month")
    .refine(value => {
      const parsed = parseMonthYear(value);
      return parsed ? toMonthIndex(parsed) >= currentMonthIndex() + MIN_EXPIRY_MONTHS : true;
    }, `Must be at least ${MIN_EXPIRY_MONTHS} months from the current month`),
  
  purchaseUnit: z.string().min(1, "Purchase Unit is required"),
  purchaseQuantity: z.coerce.number().min(0, "Must be positive number"),
  // Free goods are optional; a blank quantity coerces to 0.
  freeUnit: z.string(),
  freeQuantity: z.coerce.number().min(0, "Cannot be negative"),
  
  purchasePricePerBox: z.coerce.number().min(0, "Must be positive number"),
  mrpPerBox: z.coerce.number().min(0, "Must be positive number"),
  sellingPricePerBox: z.coerce.number().positive("Must be greater than 0"),
  
  purchasePricePerSmallestUnit: z.coerce.number().min(0, "Must be positive number"),
  mrpPerSmallestUnit: z.coerce.number().min(0, "Must be positive number"),
  sellingPricePerSmallestUnit: z.coerce.number().min(0, "Must be positive number"),
  
  rackLocation: z.string()
    .max(20, "Cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9\s-]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces")
    .optional()
}).refine(data => {
    if (!data.manufacturingDate || !data.expiryDate) return true;
    const manufactured = parseMonthYear(data.manufacturingDate);
    const expiry = parseMonthYear(data.expiryDate);
    if (!manufactured || !expiry) return true;
    return toMonthIndex(expiry) > toMonthIndex(manufactured);
}, {
    message: "Expiry date must be after manufacturing date",
    path: ["expiryDate"]
}).refine(data => {
    return data.mrpPerBox >= data.sellingPricePerBox;
}, {
    message: "Selling Price cannot exceed MRP",
    path: ["sellingPricePerBox"]
}).refine(data => {
    return data.mrpPerSmallestUnit >= data.sellingPricePerSmallestUnit;
}, {
    message: "Selling Price cannot exceed MRP",
    path: ["sellingPricePerSmallestUnit"]
});
