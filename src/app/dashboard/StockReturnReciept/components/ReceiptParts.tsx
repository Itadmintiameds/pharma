import type { ReceiptTotals } from "../stockReturnReceipt";

type BadgeTone = "yellow" | "red" | "green";

const BADGE_TONES: Record<BadgeTone, string> = {
  // The project's "danger" tokens are this Figma file's yellow scale and its
  // "warning" tokens the red scale — matched by hex, not by name.
  yellow: "bg-danger-50 border-danger-600 text-danger-600",
  red: "bg-warning-50 border-warning-600 text-warning-600",
  green: "bg-success-50 border-success-600 text-success-800",
};

/** `md` sits in table rows, `sm` beside a page title. */
export const StatusBadge = ({
  label,
  tone,
  size = "md",
}: {
  label: string;
  tone: BadgeTone;
  size?: "sm" | "md";
}) => (
  <span
    className={`inline-flex items-center justify-center rounded-lg border px-sm font-medium whitespace-nowrap ${
      size === "sm" ? "py-0.5 text-label-l3" : "py-1 text-label-l4"
    } ${BADGE_TONES[tone]}`}
  >
    {label}
  </span>
);

export const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
);

export const DetailsCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex w-full flex-col gap-sm rounded-2xl bg-base-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
    <p className="text-label-l5 font-semibold text-pneutral-900">{title}</p>
    <div className="grid grid-cols-2 gap-x-md gap-y-sm md:grid-cols-4">{children}</div>
  </div>
);

export const TotalsCard = ({
  totals,
  dispatchedLabel,
}: {
  totals: ReceiptTotals;
  dispatchedLabel: string;
}) => {
  const stats = [
    { label: "Total Products", value: totals.products },
    { label: dispatchedLabel, value: totals.dispatched },
    { label: "Total Received Qty", value: totals.received },
    { label: "Total Not Received Qty", value: totals.notReceived, isAlert: true },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-md rounded-2xl border border-sneutral-200 bg-sneutral-50 p-md md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-600">{stat.label}</p>
          <p
            className={`text-label-l4 font-semibold ${
              stat.isAlert && stat.value > 0 ? "text-warning-600" : "text-pneutral-900"
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};
