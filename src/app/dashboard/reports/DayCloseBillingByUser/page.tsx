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
} from "../components/reportUtils";
import { getBillingByUser } from "@/services/FinancialReportService";
import { BillingByUserRow } from "@/types/FinancialReportData";

/**
 * Rows come per user and pharmacy, so a user who billed in two pharmacies
 * appears twice. Folds those into one entry per user, for the KPI cards.
 */
function totalsPerUser(rows: BillingByUserRow[]) {
  const byUser = new Map<string, { userId: string; userName: string; billCount: number; totalSales: number }>();
  for (const row of rows) {
    if (row.code === "TOTAL" || !row.userId) continue;
    const entry = byUser.get(row.userId) ?? { userId: row.userId, userName: row.userName, billCount: 0, totalSales: 0 };
    entry.billCount += row.billCount;
    entry.totalSales += row.totalSales;
    byUser.set(row.userId, entry);
  }
  return [...byUser.values()];
}

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
    fetchReport: getBillingByUser,
    exportKey: "billing-by-user",
    errorMessage: "Failed to fetch the billing by user report",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  const totalBills = data?.kpi.totalBills ?? 0;
  const totalSales = data?.kpi.totalSales ?? 0;
  const users = totalsPerUser(rows);
  const userCount = users.length;
  const topUsers = users
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, USER_CARDS.length);
  // Name the pharmacy on each line only when the rows span more than one.
  const multiPharmacy = new Set(rows.map((r) => r.pharmacyId).filter(Boolean)).size > 1;
  const isToday = report.filters.appliedPeriod.mode === "today";

  return (
    <div id={report.printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Bill count and total sales for the business day, grouped by user."
        icon="/Reports/ChartBar.svg"
        onPrint={report.print}
        onDownload={report.download}
        busy={report.busy}
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
                key={user.userId}
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
              key: `${row.code}-${row.pharmacyId}-${row.userId}`,
              label: multiPharmacy && row.pharmacyName ? `${row.userName} (${row.pharmacyName})` : row.userName,
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
