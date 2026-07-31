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
  sizeDimensionGauge: z.string()
    .max(20, "Cannot exceed 20 characters")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces")
    .optional(),
  intendedUse: z.string()
    .min(10, "Minimum 10 characters required")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  manufacturerName: z.string()
    .min(1, "Manufacturer Name is required")
    .max(100, "Cannot exceed 100 characters")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
});

export const NonConsumableProductSchema = CommonProductSchema.extend({
  modelName: z.string()
    .min(1, "Model Name is required")
    .max(60, "Cannot exceed 60 characters")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  deviceClassification: z.string().min(1, "Device Classification is required"),
  intendedUse: z.string()
    .min(10, "Minimum 10 characters required")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  technicalDimensions: z.string()
    .min(1, "Technical Dimensions are required")
    .max(30, "Cannot exceed 30 characters")
    .refine(val => !/\s{2,}/.test(val), "Cannot contain consecutive spaces"),
  warrantyPeriod: z.string()
    .min(1, "Warranty Period is required")
    .max(3, "Cannot exceed 3 digits")
    .regex(/^\d*$/, "Must be numeric"),
  amcServiceAvailability: z.string().min(1, "AMC / Service Availability is required"),
});
