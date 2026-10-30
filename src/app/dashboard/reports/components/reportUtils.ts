import type { FinancialReportResponse } from "@/types/FinancialReportData";

/**
 * Formatting and period helpers shared by the report pages.
 *
 * Every report shows dates as "01-Oct-2026" and money as "₹1,234.00", in the
 * filter chips, the table and the "Period:" line alike, so the formatting lives
 * here rather than in each page.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "₹20,000.00". Pass `decimals: 0` for whole-rupee cells ("₹500"). */
export const formatRupees = (value: number, decimals = 2) =>
  `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

/** Whole rupees when there are no paise ("₹500"), two decimals when there are ("₹11.25"). */
export const formatRupeesCompact = (value: number) =>
  formatRupees(value, Number.isInteger(value) ? 0 : 2);

/** `part` as a share of `whole`, for KPI captions: "5%", "5.8%". */
export const formatPercent = (part: number, whole: number) => {
  if (whole <= 0) return "0%";
  const percent = Math.round((part / whole) * 1000) / 10;
  return `${percent}%`;
};

/** "yyyy-mm-dd" (a date input's value) or an ISO date-time → "01-Oct-2026". */
export const formatReportDate = (value?: string) => {
  const [year, month, day] = (value ?? "").split("T")[0].split("-");
  if (!year || !month || !day) return "—";
  return `${day}-${MONTHS[Number(month) - 1]}-${year}`;
};

/** "yyyy-mm" (a month input's value) → "Oct-2026". */
export const formatReportMonth = (value?: string) => {
  const [year, month] = (value ?? "").split("-");
  if (!year || !month) return "—";
  return `${MONTHS[Number(month) - 1]}-${year}`;
};

/** ISO date-time → "10:25 AM". */
export const formatReportTime = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();
};

/** Local date as "yyyy-mm-dd" — not toISOString, which is UTC and can be a day off. */
export const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export type ReportPeriodMode = "today" | "day" | "month" | "range";

export const PERIOD_TABS: { mode: ReportPeriodMode; label: string }[] = [
  { mode: "today", label: "Today" },
  { mode: "day", label: "Specific Day" },
  { mode: "month", label: "By Month" },
  { mode: "range", label: "By Date Range" },
];

/**
 * The reporting period. Every tab keeps its own value, so flicking between
 * tabs does not throw away a date the user already picked on another one.
 */
export interface ReportPeriod {
  mode: ReportPeriodMode;
  /** yyyy-mm-dd */
  day: string;
  /** yyyy-mm */
  month: string;
  /** yyyy-mm-dd */
  from: string;
  /** yyyy-mm-dd */
  to: string;
}

/**
 * Today — what a report opens on and Reset returns to. The other tabs start
 * from today too: Specific Day on today, By Month on this month, and By Date
 * Range from the 1st of this month to today.
 */
export const defaultReportPeriod = (): ReportPeriod => {
  const today = new Date();
  const todayValue = toDateInputValue(today);
  return {
    mode: "today",
    day: todayValue,
    month: todayValue.slice(0, 7),
    from: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: todayValue,
  };
};

/**
 * The period as the reports print it: "01-Oct-2026 – 08-Oct-2026" in the chip,
 * "01-Oct-2026 to 08-Oct-2026" (separator "to") under the table title.
 */
export const describePeriod = (period: ReportPeriod, separator = "–") => {
  switch (period.mode) {
    case "today":
      return formatReportDate(toDateInputValue(new Date()));
    case "day":
      return formatReportDate(period.day);
    case "month":
      return formatReportMonth(period.month);
    case "range":
      return `${formatReportDate(period.from)} ${separator} ${formatReportDate(period.to)}`;
  }
};

/**
 * The period as report query parameters. Today and Specific Day send a single
 * `date`; By Month sends its first to last day as a range, and By Date Range
 * its two ends — never both forms at once, since `date` overrides the range.
 */
export const periodToParams = (
  period: ReportPeriod,
): { date?: string; fromDate?: string; toDate?: string } => {
  switch (period.mode) {
    case "today":
      return { date: toDateInputValue(new Date()) };
    case "day":
      return { date: period.day || undefined };
    case "month": {
      const [year, month] = period.month.split("-").map(Number);
      if (!year || !month) return {};
      // Day 0 of the next month is the last day of this one.
      return {
        fromDate: toDateInputValue(new Date(year, month - 1, 1)),
        toDate: toDateInputValue(new Date(year, month, 0)),
      };
    }
    case "range":
      return { fromDate: period.from || undefined, toDate: period.to || undefined };
  }
};

/** The period's applied-filter chip: "Date Range: 01-Oct-2026 – 08-Oct-2026". */
export const periodChipLabel = (period: ReportPeriod) => {
  const name =
    period.mode === "range" ? "Date Range" : period.mode === "month" ? "Month" : "Date";
  return `${name}: ${describePeriod(period)}`;
};

/**
 * A stand-in for a report endpoint that is not wired yet: resolves to the
 * design's sample figures in the same response shape, so swapping in the real
 * service later changes nothing else on the page.
 */
export const sampleReport =
  <K, T>(kpi: K, rows: T[]) =>
  (): Promise<FinancialReportResponse<K, T>> =>
    Promise.resolve({
      generatedBy: "Admin User",
      generatedOn: new Date().toISOString(),
      kpi,
      billDetails: { content: rows, page: 0, size: rows.length, totalElements: rows.length, totalPages: 1 },
    });

/** "Generated on" stamp: "08-Oct-2026 05:30 PM", from a Date or the API's ISO local date-time. */
export const formatGeneratedOn = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatReportDate(toDateInputValue(date))} ${formatReportTime(date.toISOString())}`;
};
