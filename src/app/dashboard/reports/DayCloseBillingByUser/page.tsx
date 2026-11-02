"use client";

import ReportHeader from "../components/ReportHeader";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportSummaryTable, { formatCount } from "../components/ReportSummaryTable";
import DayCloseReportToolbar, {
  EMPTY_DAY_CLOSE_FILTERS,
  dayCloseFiltersToParams,
} from "../components/DayCloseReportToolbar";
import { useFinancialReport } from "../components/useFinancialReport";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatRupees,
  sampleReport,
} from "../components/reportUtils";

interface BillingByUserKpi {
  totalBills: number;
  totalSales: number;
  /** Users who raised at least one bill that day. */
  userCount: number;
}

interface BillingByUserRow {
  /** The user's id, or TOTAL for the closing total line. */
  code: string;
  userName: string;
  billCount: number;
  totalSales: number;
}

// Sample figures from the design, until the day close billing by user API is wired in.
const fetchBillingByUser = sampleReport<BillingByUserKpi, BillingByUserRow>(
  { totalBills: 25, totalSales: 50000, userCount: 2 },
  [
    { code: "USR-2026-00001", userName: "Pharmacist A", billCount: 15, totalSales: 30000 },
    { code: "USR-2026-00002", userName: "Pharmacist B", billCount: 10, totalSales: 20000 },
    { code: "TOTAL", userName: "Total", billCount: 25, totalSales: 50000 },
  ],
);

/** The design gives the two top-selling users a card each, in these colours. */
const USER_CARDS = [
  { icon: "/Reports/CheckCircleBlue.svg", tone: "info" },
  { icon: "/Reports/CheckCircleYellow.svg", tone: "danger" },
] as const;

const TITLE = "Pharmacy Day Closing Summary - Billing by User";

export default function DayCloseBillingByUserPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchBillingByUser,
    errorMessage: "Failed to fetch the billing by user report",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  const totalBills = data?.kpi.totalBills ?? 0;
  const totalSales = data?.kpi.totalSales ?? 0;
  const userCount = data?.kpi.userCount ?? 0;
  const topUsers = rows
    .filter((r) => r.code !== "TOTAL")
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, USER_CARDS.length);
  const isToday = report.filters.appliedPeriod.mode === "today";

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Bill count and total sales for the business day, grouped by user."
        icon="/Reports/ChartBar.svg"
        onPrint={() => window.print()}
      />

      <DayCloseReportToolbar report={report} />

      {report.isLoading ? (
        <ReportLoadingState kpiCount={4} />
      ) : !data ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {report.loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
            <ReportKpiCard
              label="Total Bills"
              value={formatCount(totalBills)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight={`${userCount} ${userCount === 1 ? "user" : "users"}`}
              caption={isToday ? "billed today" : "billed that day"}
            />
            <ReportKpiCard
              label="Total Sales"
              value={formatRupees(totalSales)}
              icon="/Reports/BanknotesGreen.svg"
              tone="success"
              highlight={formatRupees(totalBills ? totalSales / totalBills : 0, 0)}
              caption="average per bill"
            />
            {topUsers.map((user, i) => (
              <ReportKpiCard
                key={user.code}
                label={user.userName}
                value={formatRupees(user.totalSales)}
                icon={USER_CARDS[i].icon}
                tone={USER_CARDS[i].tone}
                highlight={`${user.billCount} ${user.billCount === 1 ? "bill" : "bills"}`}
                caption={`${formatPercent(user.totalSales, totalSales)} of sales`}
              />
            ))}
          </div>

          <ReportSummaryTable
            title={TITLE}
            subtitles={[
              `Date: ${describePeriod(report.filters.appliedPeriod)}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            labelHeader="User Name"
            countHeader="Bill Count"
            amountHeader="Total Sales"
            lines={rows.map((row) => ({
              key: row.code,
              label: row.userName,
              count: row.billCount,
              amount: row.totalSales,
              highlight: row.code === "TOTAL",
            }))}
          />
        </>
      )}
    </div>
  );
}
