import { z } from 'zod';

const isEmpty = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || String(value).trim() === '';
};

/**
 * Builds the full error map for a form on submit / tab change.
 *
 * The Zod schemas only cover the free-text fields, and `z.coerce.number()`
 * happily turns "" into 0 — so dropdown ids, radio groups and numeric inputs
 * that must actually be filled are listed separately in `requiredFields`.
 */
export const collectErrors = (
  schema: z.ZodType,
  data: Record<string, any>,
  requiredFields: Record<string, string> = {}
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const result = schema.safeParse(data);
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? '');
      // Keep the first message per field so the input shows one error at a time.
      if (key && !errors[key]) {
        errors[key] = issue.message;
      }
    });
  }

  Object.entries(requiredFields).forEach(([field, message]) => {
    if (isEmpty(data[field])) {
      errors[field] = message;
    }
  });

  return errors;
};

// Errors are stored as "" for valid fields, so filter before deciding.
export const hasErrors = (errors: Record<string, string>): boolean =>
  Object.values(errors).some(Boolean);
