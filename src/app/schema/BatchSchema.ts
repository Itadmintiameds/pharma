import { z } from 'zod';

export const BatchSchema = z.object({
  batchNumber: z.string()
    .min(3, "Must be at least 3 characters")
    .max(20, "Cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Must be alphanumeric only"),
  
  manufacturingDate: z.string().min(1, "Manufacturing Date is required")
    .refine(dateStr => {
      const date = new Date(dateStr);
      const now = new Date();
      // Compare year and month (cannot be in a strictly future month)
      const isFuture = date.getFullYear() > now.getFullYear() || 
                       (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth());
      return !isFuture;
    }, "Cannot be a future month"),
    
  expiryDate: z.string().min(1, "Expiry Date is required"),
  
  purchaseUnit: z.string().min(1, "Purchase Unit is required"),
  purchaseQuantity: z.coerce.number().min(0, "Must be positive number"),
  freeUnit: z.string().min(1, "Free Unit is required"),
  freeQuantity: z.coerce.number().min(0, "Must be positive number"),
  
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
