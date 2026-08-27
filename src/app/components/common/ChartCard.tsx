import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Shared white-card chrome for a dashboard chart section. The chart itself
 * (a recharts <ResponsiveContainer>...) is passed in as children, so every
 * role dashboard's charts share one frame instead of each re-styling its own.
 */
const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children }) => (
  <div className="flex w-full flex-col gap-4 rounded-2xl border border-pneutral-100 bg-white p-4">
    <div className="flex flex-col gap-1">
      <h3 className="text-label-l3 font-medium text-pneutral-900">{title}</h3>
      {subtitle && <p className="text-p2 font-normal text-pneutral-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export default ChartCard;
