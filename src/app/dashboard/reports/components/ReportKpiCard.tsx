import Image from "next/image";
import clsx from "clsx";

export type ReportKpiTone = "primary" | "warning" | "success" | "info" | "danger";

/** Card background and the colour of the highlighted part of the caption. */
const TONES: Record<ReportKpiTone, { card: string; highlight: string }> = {
  primary: { card: "bg-primary-100", highlight: "text-pneutral-900" },
  warning: { card: "bg-warning-50", highlight: "text-warning-600" },
  success: { card: "bg-success-50", highlight: "text-success-800" },
  info: { card: "bg-info-50", highlight: "text-info-500" },
  danger: { card: "bg-danger-50", highlight: "text-danger-700" },
};

interface ReportKpiCardProps {
  label: string;
  value: string;
  /** Path under /public. */
  icon: string;
  tone: ReportKpiTone;
  /** Bold lead-in of the caption: "5 bills", "95%". */
  highlight: string;
  /** Rest of the caption: "in this period". */
  caption: string;
}

/**
 * A report's headline figure. Not the shared StatCard: the reports' design
 * puts the label above a large value on a tinted card, with the icon on a
 * white tile to the right, which is a different layout rather than a variant.
 */
export default function ReportKpiCard({
  label,
  value,
  icon,
  tone,
  highlight,
  caption,
}: ReportKpiCardProps) {
  const { card, highlight: highlightColor } = TONES[tone];

  return (
    <div className={clsx("flex h-38 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-xl p-5", card)}>
      <div className="flex items-center gap-0.5">
        <p className="min-w-0 flex-1 text-label-l4 font-medium text-pneutral-900">{label}</p>
        <div className="flex size-13 shrink-0 items-center justify-center rounded-sm bg-white">
          <Image src={icon} alt="" width={24} height={24} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-h3 font-medium whitespace-nowrap text-pneutral-900">{value}</p>
        <p className="flex gap-2 text-p2 whitespace-nowrap">
          <span className={clsx("font-semibold", highlightColor)}>{highlight}</span>
          <span className="font-normal text-pneutral-500">{caption}</span>
        </p>
      </div>
    </div>
  );
}
