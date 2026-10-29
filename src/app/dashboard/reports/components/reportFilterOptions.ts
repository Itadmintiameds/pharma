import type { DropdownOption } from "@/app/components/common/Dropdown";

/**
 * Fixed option lists for the report filters. Values are what the
 * /financial-report endpoints accept.
 */

/** GST rates as stored on the product. */
export const GST_OPTIONS: DropdownOption[] = ["0", "5", "12", "18", "28"].map((rate) => ({
  label: `${rate}%`,
  value: rate,
}));

export const PATIENT_TYPE_OPTIONS: DropdownOption[] = [
  { label: "In-Patient", value: "IP" },
  { label: "Out-Patient", value: "OP" },
  { label: "Walk-In", value: "WALK_IN" },
  { label: "Day Care", value: "DAY_CARE" },
];

/** No selection means ALL on the backend. */
export const PENDING_STATUS_OPTIONS: DropdownOption[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Fully Paid", value: "FULLY_PAID" },
];

/** Label of an option by value, for chips. */
export const optionLabel = (options: DropdownOption[], value: string | number) =>
  options.find((o) => o.value === value)?.label ?? String(value);
