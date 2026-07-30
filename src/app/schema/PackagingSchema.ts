import { z } from 'zod';

export const PackagingSchema = z.object({
  eachStripContains: z.coerce.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
});
