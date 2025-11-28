import { z } from "zod";

/* -----------------------------
   Variant Type Schema
------------------------------ */
export const variantSchema = z
  .object({
    variantName: z
      .string()
      .min(2, { message: "Variant Name must be at least 2 characters" })
      .max(50, { message: "Variant Name cannot exceed 50 characters" })
      .refine((val) => /^[A-Za-z0-9\s\-]+$/.test(val), {
        message: "Variant Name can contain alphabets, numbers, spaces, and hyphens only",
      }),

    // For checking duplicates from DB or state list
    existingVariantNames: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.existingVariantNames &&
      data.existingVariantNames.includes(data.variantName.trim().toLowerCase())
    ) {
      ctx.addIssue({
        path: ["variantName"],
        message: "Variant Name already exists",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type VariantSchemaType = z.infer<typeof variantSchema>;

/* -----------------------------
   Unit Type Schema
------------------------------ */
export const unitSchema = z
  .object({
    unitName: z
      .string()
      .min(2, { message: "Unit Name must be at least 2 characters" })
      .max(50, { message: "Unit Name cannot exceed 50 characters" })
      .refine((val) => /^[A-Za-z0-9\s\-]+$/.test(val), {
        message: "Unit Name can contain alphabets, numbers, spaces, and hyphens only",
      }),

    existingUnitNames: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.existingUnitNames &&
      data.existingUnitNames.includes(data.unitName.trim().toLowerCase())
    ) {
      ctx.addIssue({
        path: ["unitName"],
        message: "Unit Name already exists",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type UnitSchemaType = z.infer<typeof unitSchema>;


export const variantUnitSchema = z.object({
  variant: variantSchema.optional(),
  unit: unitSchema.optional(),
});

export type VariantUnitSchemaType = z.infer<typeof variantUnitSchema>;
