export type BadgeStatus =
  | "Active"
  | "Inactive"
  | "Locked"
  | "Healthy"
  | "Near Expiry"
  | "Near Expiry Batch"
  | "Expired"
  | "Expired batch";

interface Props {
  status: BadgeStatus;
}

const styles: Record<BadgeStatus, string> = {
  Active: "bg-success-50 text-success-800 border-success-600",
  Healthy: "bg-success-50 text-success-800 border-success-600",

  Inactive: "bg-warning-50 text-warning-600 border-warning-600",
  Locked: "bg-warning-50 text-warning-600 border-warning-600",

  "Near Expiry": "bg-danger-50 text-danger-600 border-danger-600",
  "Near Expiry Batch": "bg-danger-50 text-danger-600 border-danger-600",

  Expired: "bg-warning-50 text-warning-600 border-warning-600",
  "Expired batch": "bg-warning-50 text-warning-600 border-warning-600",
};

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex h-7 w-fit items-center justify-center whitespace-nowrap rounded-3xl border px-3 py-1 text-label-l3 font-medium ${styles[status] ?? styles.Inactive
        }`}
    >
      {status}
    </span>
  );
}
