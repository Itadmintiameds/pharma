import { z } from "zod";

const validStateCodes = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "29", "30", "31",
  "32", "33", "34", "35", "36", "37", "38", "97", "99",
];

const gstNumberFormat = z
  .string()
  .trim()
  .min(1, "GSTIN is required")
  .length(15, "GSTIN must be 15 characters")
  .regex(
    /^[A-Z0-9]+$/,
    "GSTIN can only contain letters and numbers"
  )
  .refine(
    (value) => validStateCodes.includes(value.substring(0, 2)),
    {
      message: "Invalid GST state code",
    }
  )
  .refine(
    (value) =>
      /^[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(value.substring(2)),
    {
      message: "Enter a valid GSTIN",
    }
  );

export const supplierSchema = z.object({
  supplierName: z
    .string()
    .trim()
    .min(1, "Supplier Name is required")
    .max(50, "Supplier Name cannot exceed 50 characters")
    .regex(
      /^[A-Za-z ]+$/,
      "Supplier Name can only contain alphabets"
    ),

  gstinNo: gstNumberFormat,

  dlno: z
    .string()
    .trim()
    .min(1, "DL No. is required")
    .max(30, "DL No. cannot exceed 30 characters"),

  panNo: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]$/,
      "Enter a valid PAN Number"
    )
    .optional()
    .or(z.literal("")),

  issuingAuthority: z
    .string()
    .trim()
    .max(50, "Issuing Authority cannot exceed 50 characters")
    .regex(
      /^[A-Za-z ]+$/,
      "Issuing Authority can only contain alphabets"
    )
    .optional()
    .or(z.literal("")),

  fssaiNo: z
    .string()
    .trim()
    .regex(/^\d+$/, "FSSAI No. can contain only numbers")
    .length(14, "FSSAI No. must be exactly 14 digits")
    .optional()
    .or(z.literal("")),

  contactPersonName: z
    .string()
    .trim()
    .min(1, "Contact Person Name is required")
    .max(50, "Contact Person Name cannot exceed 50 characters")
    .regex(
      /^[A-Za-z ]+$/,
      "Contact Person Name can only contain alphabets"
    ),

  mobileNumber: z
    .string()
    .trim()
    .min(1, "Mobile Number is required")
    .regex(/^\d+$/, "Mobile Number can contain only numbers")
    .length(10, "Mobile Number must be exactly 10 digits"),

  supplierEmail: z
    .string()
    .trim()
    .min(1, "Email ID is required")
    .pipe(z.email("Enter a valid Email ID")),

  address: z
    .string()
    .trim()
    .min(1, "Registered Office Address is required")
    .max(50, "Registered Office Address cannot exceed 50 characters")
    .regex(
      /^[A-Za-z0-9 ,\-#/]+$/,
      "Registered Office Address can only contain letters, numbers, ',', '-', '#' and '/'"
    ),

  buildingNo: z
    .string()
    .trim()
    .min(1, "Building / Street is required")
    .max(20, "Building / Street cannot exceed 20 characters")
    .regex(
      /^[A-Za-z0-9 ,\-#/]+$/,
      "Building / Street can only contain letters, numbers, ',', '-', '#' and '/'"
    ),

  pincode: z
    .string()
    .trim()
    .min(1, "Pincode is required")
    .regex(/^\d+$/, "Pincode can contain only numbers")
    .length(6, "Pincode must be exactly 6 digits"),

  bankName: z
    .string()
    .trim()
    .max(50, "Bank Name cannot exceed 50 characters")
    .regex(/^[A-Za-z ]+$/, "Bank Name can only contain alphabets")
    .optional()
    .or(z.literal("")),

  accountHolderName: z
    .string()
    .trim()
    .max(50, "Account Holder Name cannot exceed 50 characters")
    .regex(
      /^[A-Za-z. ]+$/,
      "Account Holder Name can only contain alphabets and '.'"
    )
    .optional()
    .or(z.literal("")),

  accountNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "Account Number can contain only numbers")
    .min(9, "Account Number must be at least 9 digits")
    .max(18, "Account Number cannot exceed 18 digits")
    .optional()
    .or(z.literal("")),

  ifscCode: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{4}0[A-Z0-9]{6}$/,
      "Enter a valid IFSC Code"
    )
    .optional()
    .or(z.literal("")),
});
