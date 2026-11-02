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

interface ReceiptByUserKpi {
  totalReceipts: number;
  amountReceived: number;
  /** Users who took at least one payment that day. */
  userCount: number;
}

interface ReceiptByUserRow {
  /** The user's id, or TOTAL for the closing total line. */
  code: string;
  userName: string;
  receiptCount: number;
  amountReceived: number;
}

// Sample figures from the design, until the day close receipt by user API is wired in.
const fetchReceiptByUser = sampleReport<ReceiptByUserKpi, ReceiptByUserRow>(
  { totalReceipts: 30, amountReceived: 45000, userCount: 2 },
  [
    { code: "USR-2026-00001", userName: "Pharmacist A", receiptCount: 18, amountReceived: 28000 },
    { code: "USR-2026-00002", userName: "Pharmacist B", receiptCount: 12, amountReceived: 17000 },
    { code: "TOTAL", userName: "Total", receiptCount: 30, amountReceived: 45000 },
  ],
);

/** The design gives the two top-collecting users a card each, in these colours. */
const USER_CARDS = [
  { icon: "/Reports/CheckCircleBlue.svg", tone: "info" },
  { icon: "/Reports/CheckCircleYellow.svg", tone: "danger" },
] as const;

const TITLE = "Pharmacy Day Closing Summary - Receipt by User";

export default function DayCloseReceiptByUserPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchReceiptByUser,
    errorMessage: "Failed to fetch the receipt by user report",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  const totalReceipts = data?.kpi.totalReceipts ?? 0;
  const amountReceived = data?.kpi.amountReceived ?? 0;
  const userCount = data?.kpi.userCount ?? 0;
  const topUsers = rows
    .filter((r) => r.code !== "TOTAL")
    .sort((a, b) => b.amountReceived - a.amountReceived)
    .slice(0, USER_CARDS.length);
  const isToday = report.filters.appliedPeriod.mode === "today";

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Receipt count and amount received for the business day, grouped by user."
        icon="/Reports/BanknotesHeader.svg"
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
              label="Total Receipts"
              value={formatCount(totalReceipts)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight={`${userCount} ${userCount === 1 ? "user" : "users"}`}
              caption={isToday ? "collected today" : "collected that day"}
            />
            <ReportKpiCard
              label="Amount Received"
              value={formatRupees(amountReceived)}
              icon="/Reports/BanknotesGreen.svg"
              tone="success"
              highlight={formatRupees(totalReceipts ? amountReceived / totalReceipts : 0, 0)}
              caption="average per receipt"
            />
            {topUsers.map((user, i) => (
              <ReportKpiCard
                key={user.code}
                label={user.userName}
                value={formatRupees(user.amountReceived)}
                icon={USER_CARDS[i].icon}
                tone={USER_CARDS[i].tone}
                highlight={`${user.receiptCount} ${user.receiptCount === 1 ? "receipt" : "receipts"}`}
                caption={`${formatPercent(user.amountReceived, amountReceived)} of amount`}
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
            countHeader="Receipt Count"
            amountHeader="Amount Received"
            lines={rows.map((row) => ({
              key: row.code,
              label: row.userName,
              count: row.receiptCount,
              amount: row.amountReceived,
              highlight: row.code === "TOTAL",
            }))}
          />
        </>
      )}
    </div>
  );
}
