import { z } from "zod";

export const fullNameSchema = z
    .string()
    .trim()
    .min(1, "Full Name is required.")
    .max(50, "Full Name cannot exceed 50 characters.")
    .regex(/^[A-Za-z ]+$/, "Full Name can only contain alphabets.");
