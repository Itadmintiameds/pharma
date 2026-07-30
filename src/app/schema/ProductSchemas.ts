import { z } from 'zod';

export const CommonProductSchema = z.object({
  productName: z.string()
    .min(3, "Product Name must be between 3 and 60 characters")
    .max(60, "Product Name must be between 3 and 60 characters")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  brandName: z.string()
    .min(1, "Brand Name is required")
    .max(60, "Cannot exceed 60 characters")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  gst: z.string().min(1, "GST is required"),
  hsnCode: z.string()
    .min(1, "HSN Code is required")
    .regex(/^(?:\d{4}|\d{6}|\d{8})$/, "HSN Code must be exactly 4, 6, or 8 digits")
});

export const MoleculeSchema = z.object({
  id: z.number(),
  name: z.string()
    .min(1, "Molecule is required")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  strength: z.string()
    .min(1, "Strength is required")
    .max(30, "Cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9\/\s]+$/, "Only alphabets, numbers, spaces, and / are allowed")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces")
});

export const DrugProductSchema = CommonProductSchema.extend({
  molecules: z.array(MoleculeSchema).min(1, "At least one molecule is required"),
});

export const SupplementProductSchema = CommonProductSchema.extend({
  strength: z.string()
    .min(1, "Strength / Composition is required")
    .max(30, "Cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9-\s]+$/, "Only alphanumeric, space, and - are allowed")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  netQuantity: z.coerce.number().positive("Must be a positive number"),
  gender: z.string().min(1, "Gender is required"),
  manufacturerName: z.string()
    .min(1, "Manufacturer Name is required")
    .max(60, "Cannot exceed 60 characters")
    .regex(/^[a-zA-Z0-9\s]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  fssaiLicense: z.string()
    .regex(/^[123]\d{13}$/, "Must be exactly 14 digits starting with 1, 2, or 3")
});

export const CosmeticProductSchema = CommonProductSchema.extend({
  variant: z.string()
    .max(60, "Cannot exceed 60 characters")
    .regex(/^[a-zA-Z0-9\s-]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces")
    .optional(),
  fragrance: z.string()
    .max(60, "Cannot exceed 60 characters")
    .regex(/^[a-zA-Z0-9\s-]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces")
    .optional(),
  netQuantity: z.coerce.number().positive("Must be a positive number"),
  manufacturerName: z.string()
    .min(1, "Manufacturer Name is required")
    .max(60, "Cannot exceed 60 characters")
    .regex(/^[a-zA-Z0-9\s]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
});

export const FoodInfantProductSchema = CommonProductSchema.extend({
  variantName: z.string()
    .max(60, "Cannot exceed 60 characters")
    .regex(/^[a-zA-Z0-9\s-]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces")
    .optional(),
  netQuantity: z.coerce.number().positive("Must be a positive number"),
  manufacturerName: z.string()
    .min(1, "Manufacturer Name is required")
    .max(60, "Cannot exceed 60 characters")
    .regex(/^[a-zA-Z0-9\s]*$/, "Must be alphanumeric")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
});

export const ConsumableProductSchema = CommonProductSchema.extend({
  // Consumable specific fields will be added here
});

export const NonConsumableProductSchema = CommonProductSchema.extend({
  // Non-consumable specific fields will be added here
});
