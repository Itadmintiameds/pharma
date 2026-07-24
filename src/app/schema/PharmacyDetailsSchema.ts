import { z } from "zod";

const validStateCodes = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "27", "29", "30", "31",
    "32", "33", "34", "35", "36", "37", "38", "97", "99",
];

export const pharmacyDetailsSchema = z.object({
    pharmacyType: z
        .string()
        .trim()
        .min(1, "Business Type is required"),
        
    pharmacyName: z
        .string()
        .trim()
        .min(1, "Pharmacy Name is required")
        .max(50, "Pharmacy Name cannot exceed 50 characters")
        .regex(
            /^[A-Za-z0-9 .&'/-]+$/,
            "Pharmacy Name contains invalid characters"
        ),

    pharmacyPhone: z
        .string()
        .trim()
        .min(1, "Mobile Number is required")
        .regex(/^\d+$/, "Mobile Number can contain only numbers")
        .length(10, "Mobile Number must be exactly 10 digits"),

    documentNo: z
        .string()
        .trim()
        .min(1, "Document Number is required")
        .max(20, "Document Number cannot exceed 20 characters"),

    issueDate: z
        .string()
        .trim()
        .min(1, "Issue Date is required")
        .refine((val) => {
            const date = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Ignore time part
            return date <= today;
        }, { message: "Issue date cannot be in the future" })
        .refine((val) => {
            const year = val.split('-')[0];
            return year && year.length === 4;
        }, { message: "Invalid year format" }),

    issueAuthority: z
        .string()
        .trim()
        .min(1, "Issue Authority is required")
        .max(20, "Issue Authority cannot exceed 20 characters")
        .regex(
            /^[A-Za-z ]+$/,
            "Issue Authority can only contain letters and spaces"
        ),

    expiryDate: z
        .string()
        .trim()
        .min(1, "Expiry Date is required")
        .refine((val) => {
            const date = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Ignore time part
            return date >= today;
        }, { message: "Expiry date cannot be in the past" })
        .refine((val) => {
            const year = val.split('-')[0];
            return year && year.length === 4;
        }, { message: "Invalid year format" }),

    pharmacyPan: z
        .string()
        .trim()
        .regex(
            /^[A-Z]{5}[0-9]{4}[A-Z]$/,
            "Enter a valid PAN Number"
        )
        .optional()
        .or(z.literal("")),

    pharmacyGst: z
        .string()
        .trim()
        .length(15, "GST Number must be 15 characters")
        .regex(
            /^[A-Z0-9]+$/,
            "GST Number can only contain letters and numbers"
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
                message: "Enter a valid GST Number",
            }
        )
        .optional()
        .or(z.literal("")),

    pharmacyPincode: z
        .string()
        .trim()
        .min(1, "Pin Code is required")
        .regex(/^\d{6}$/, "Pin Code must be exactly 6 digits"),


    pharmacyBuildingNo: z
        .string()
        .trim()
        .min(1, "Building Number is required")
        .max(20, "Building Number cannot exceed 20 characters")
        .regex(/[a-zA-Z0-9]/, "Building number must contain letters or numbers"),


    pharmacyStreet: z
        .string()
        .trim()
        .min(1, "Street/Road/Lane is required")
        .max(25, "Street/Road/Lane cannot exceed 25 characters"),

    pharmacyLandmark: z
        .string()
        .trim()
        .max(50, "Landmark cannot exceed 50 characters")
        .optional()
        .or(z.literal("")),

    pharmacyGstCertificate: z.any().optional(),
    
    manualFile: z.any().refine((val) => val !== null && val !== undefined, {
        message: "Document upload is required",
    }),
});

export const setupBusinessSchema = z.object({
    businessName: z
        .string()
        .trim()
        .min(1, "Business Name is required")
        .max(50, "Business Name cannot exceed 50 characters")
        .regex(
            /^[a-zA-Z0-9\s\-&*#.!@"]+$/,
            "Business Name contains invalid characters"
        ),

    ownershipType: z
        .string()
        .trim()
        .min(1, "Ownership Type is required")
        .max(50, "Ownership Type cannot exceed 50 characters")
        .regex(
            /^[a-zA-Z0-9\s\-&*#.!@"]+$/,
            "Ownership Type contains invalid characters"
        ),

    panNumber: pharmacyDetailsSchema.shape.pharmacyPan,
    gstNumber: pharmacyDetailsSchema.shape.pharmacyGst,
});