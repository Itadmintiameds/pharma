import { z } from 'zod';

/** Stock must have at least this much shelf life left to be worth receiving. */
export const MIN_EXPIRY_MONTHS = 3;

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const today = (): Date => startOfDay(new Date());

/** Earliest expiry date accepted: today + MIN_EXPIRY_MONTHS. */
const earliestExpiry = (): Date => {
  const date = today();
  date.setMonth(date.getMonth() + MIN_EXPIRY_MONTHS);
  return date;
};

/** Parses an input date at day precision; null when unparseable. */
const asDate = (value: string): Date | null => {
  const date = startOfDay(new Date(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const BatchSchema = z.object({
  batchNumber: z.string()
    .min(3, "Must be at least 3 characters")
    .max(20, "Cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Must be alphanumeric only"),
  
  // Optional, but must be a sane past date once entered.
  manufacturingDate: z.string()
    .refine(value => value === '' || asDate(value) !== null, "Enter a valid date")
    .refine(value => {
      const date = asDate(value);
      return date ? date <= today() : true;
    }, "Cannot be a future date"),

  expiryDate: z.string().min(1, "Expiry Date is required")
    .refine(value => asDate(value) !== null, "Enter a valid date")
    .refine(value => {
      const date = asDate(value);
      return date ? date > today() : true;
    }, "Must be a future date")
    .refine(value => {
      const date = asDate(value);
      return date ? date >= earliestExpiry() : true;
    }, `Must be at least ${MIN_EXPIRY_MONTHS} months from today`),
  
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
    return new Date(data.expiryDate) > new Date(data.manufacturingDate);
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
