interface Props {
  status: "Active" | "Inactive" | "Locked";
}

export default function StatusBadge({ status }: Props) {
  const styles = {
    Active:
      "bg-success-50 text-success-800 border-success-600",

    Inactive:
      "bg-warning-50 text-warning-600 border-warning-600",

    Locked:
      "bg-warning-50 text-warning-600 border-warning-600",
  };

  return (
    <span
      className={`rounded-3xl border px-3 py-1 text-label-l3 font-medium h-7 ${styles[status]}`}
    >
      {status}
    </span>
  );
}