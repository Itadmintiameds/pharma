export interface DailySeriesPoint {
  /** yyyy-mm-dd, local time. */
  date: string;
  /** Short label for a chart's x-axis, e.g. "12 Aug". */
  label: string;
  value: number;
}

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const toLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** The last `days` date keys, oldest first, ending today. */
export const lastNDays = (days: number): DailySeriesPoint[] => {
  const points: DailySeriesPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    points.push({ date: toDateKey(d), label: toLabel(d), value: 0 });
  }
  return points;
};
