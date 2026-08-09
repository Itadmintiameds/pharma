import { z } from "zod";

/**
 * Validation for the POS screens. `sanitize*` runs on every keystroke so bad
 * characters never land in state; the zod schemas produce the message shown
 * under the field.
 */

export const NAME_MAX = 25;
export const PHONE_LENGTH = 10;
export const ADDRESS_MAX = 150;
export const CODE_MAX = 15;
export const TRANSACTION_ID_MAX = 30;
export const TRANSACTION_ID_MIN = 4;

/* ------------------------------------------------------------------ *
 * Input masks
 * ------------------------------------------------------------------ */

/** Letters and single spaces — no digits, no double spaces. */
export const sanitizeName = (value: string) =>
    value
        .replace(/[^A-Za-z ]/g, "")
        .replace(/ {2,}/g, " ")
        .replace(/^ /, "")
        .slice(0, NAME_MAX);

export const sanitizePhone = (value: string) =>
    value.replace(/\D/g, "").slice(0, PHONE_LENGTH);

/** Anything printable, capped in length. */
export const sanitizeAddress = (value: string) => value.slice(0, ADDRESS_MAX);

/** Reference codes — letters, digits and the separators - and / only. */
export const sanitizeCode = (value: string, max = CODE_MAX) =>
    value.replace(/[^A-Za-z0-9/-]/g, "").slice(0, max);

export const sanitizeTransactionId = (value: string) =>
    value.replace(/[^A-Za-z0-9/-]/g, "").slice(0, TRANSACTION_ID_MAX);

/** Digits and at most one decimal point; never a minus sign. */
export const sanitizeNumber = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const [whole, ...rest] = cleaned.split(".");
    return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
};

/** Same, but never above 100 — for the discount fields. */
export const sanitizePercentage = (value: string) => {
    const cleaned = sanitizeNumber(value);
    if (cleaned === "") return "";
    return Number(cleaned) > 100 ? "100" : cleaned;
};

/* ------------------------------------------------------------------ *
 * Schemas
 * ------------------------------------------------------------------ */

export const nameSchema = (label = "Name") =>
    z
        .string()
        .trim()
        .min(1, `${label} is required`)
        .max(NAME_MAX, `${label} cannot exceed ${NAME_MAX} characters`)
        .regex(
            /^[A-Za-z]+( [A-Za-z]+)*$/,
            `${label} can only contain letters and single spaces`
        );

export const phoneSchema = z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(/^\d+$/, "Mobile number can contain only digits")
    .length(PHONE_LENGTH, `Mobile number must be exactly ${PHONE_LENGTH} digits`);

export const addressSchema = (required = false) =>
    z
        .string()
        .max(ADDRESS_MAX, `Address cannot exceed ${ADDRESS_MAX} characters`)
        .refine((value) => (required ? value.trim().length > 0 : true), {
            message: "Address is required",
        })
        // Punctuation is fine inside an address, but it cannot be the whole of it.
        .refine((value) => !value.trim() || /[A-Za-z0-9]/.test(value), {
            message: "Address must contain letters or numbers",
        });

export const codeSchema = (label: string, max = CODE_MAX) =>
    z
        .string()
        .trim()
        .min(1, `${label} is required`)
        .max(max, `${label} cannot exceed ${max} characters`)
        .regex(
            /^[A-Za-z0-9/-]+$/,
            `${label} can only contain letters, numbers, - and /`
        )
        .regex(/[A-Za-z0-9]/, `${label} must contain letters or numbers`);

export const transactionIdSchema = (required: boolean) =>
    z
        .string()
        .trim()
        .max(
            TRANSACTION_ID_MAX,
            `Transaction ID cannot exceed ${TRANSACTION_ID_MAX} characters`
        )
        .refine((value) => (required ? value.length > 0 : true), {
            message: "Transaction ID is required for this payment mode",
        })
        .refine((value) => !value || value.length >= TRANSACTION_ID_MIN, {
            message: `Transaction ID must be at least ${TRANSACTION_ID_MIN} characters`,
        });

/**
 * The amount handed over. Compared in paise so a value typed as 91.6100 is not
 * treated as short of 91.61 by floating point drift.
 */
export const toPaise = (value: number) => Math.round((value || 0) * 100);

/**
 * @param amountDue what the bill still owes — never overpaid, whoever pays.
 * @param canPayPartially an in-patient may hand over part of it, or nothing at
 *        all, and carry the rest as pending. Everyone else clears it in full.
 */
export const receivedAmountSchema = (
    amountDue: number,
    canPayPartially: boolean
) =>
    z
        .string()
        .trim()
        .min(1, "Received amount is required")
        .refine(
            (value) => (canPayPartially ? Number(value) >= 0 : Number(value) > 0),
            {
                message: canPayPartially
                    ? "Received amount cannot be negative"
                    : "Received amount must be above 0",
            }
        )
        .refine((value) => toPaise(Number(value)) <= toPaise(amountDue), {
            message: `Received amount cannot exceed the amount due of ₹ ${amountDue.toFixed(2)}`,
        })
        .refine(
            (value) =>
                canPayPartially || toPaise(Number(value)) >= toPaise(amountDue),
            { message: `Full payment of ₹ ${amountDue.toFixed(2)} is required` }
        );

/** First message from a schema, or "" when the value is fine. */
export const firstError = (schema: z.ZodTypeAny, value: unknown): string => {
    const result = schema.safeParse(value);
    return result.success ? "" : result.error.issues[0]?.message ?? "";
};

/* Thin wrappers so call sites read as plain field checks. */
export const validateName = (value: string, label = "Name") =>
    firstError(nameSchema(label), value);

export const validatePhone = (value: string) => firstError(phoneSchema, value);

export const validateAddress = (value: string, required = false) =>
    firstError(addressSchema(required), value);

export const validateCode = (value: string, label: string, max = CODE_MAX) =>
    firstError(codeSchema(label, max), value);
