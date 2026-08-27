import React from "react";
import { LucideIcon } from "lucide-react";

export type StatCardColorScheme =
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info";

const COLOR_CLASSES: Record<StatCardColorScheme, { iconBg: string; valueColor: string }> = {
  secondary: { iconBg: "bg-secondary-50", valueColor: "text-secondary-700" },
  success: { iconBg: "bg-success-50", valueColor: "text-success-700" },
  danger: { iconBg: "bg-danger-50", valueColor: "text-danger-600" },
  warning: { iconBg: "bg-warning-50", valueColor: "text-warning-500" },
  info: { iconBg: "bg-info-50", valueColor: "text-info-600" },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption?: string;
  colorScheme?: StatCardColorScheme;
  /** "row" (default): wide tile, icon left / text right. "square": icon on top, centered. */
  variant?: "row" | "square";
}

/**
 * A single KPI tile. Generalizes the icon/label/value/caption stat cards that
 * were previously copy-pasted (with slightly different shapes) across
 * DashboardMain, the warehouse distribution page and the products page.
 */
const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  caption,
  colorScheme = "secondary",
  variant = "row",
}) => {
  const { iconBg, valueColor } = COLOR_CLASSES[colorScheme];

  if (variant === "square") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-pneutral-100 bg-white p-3 text-center">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={valueColor} size={22} strokeWidth={1.75} />
        </div>
        <p className={`text-h6 font-semibold ${valueColor}`}>{value}</p>
        <p className="text-label-l4 font-normal text-pneutral-700">{label}</p>
        {caption && <p className="text-p2 font-normal text-pneutral-500">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-31 w-full min-w-51 flex-1 items-center gap-2 rounded-2xl border border-pneutral-100 bg-white px-4 py-2">
      <div className={`flex size-10.5 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={valueColor} size={20} strokeWidth={1.75} />
      </div>

      <div className="flex min-w-0 flex-col items-start">
        <p className="text-label-l4 font-normal text-pneutral-700">{label}</p>
        <p className={`text-label-l4 font-semibold ${valueColor}`}>{value}</p>
        {caption && (
          <p className="whitespace-nowrap text-p2 font-normal text-pneutral-500">{caption}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
