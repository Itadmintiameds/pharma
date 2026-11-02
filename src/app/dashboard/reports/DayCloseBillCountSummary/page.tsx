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
  sampleReport,
} from "../components/reportUtils";

interface BillCountKpi {
  totalBills: number;
  fullyPaidBills: number;
  /** IP bills with a balance still owed — partially paid or not paid at all. */
  pendingIpBills: number;
}

interface BillCountRow {
  /** TOTAL_BILLS, FULLY_PAID_BILLS or PENDING_IP_BILLS. */
  code: string;
  particular: string;
  count: number;
}

// Sample figures from the design, until the day close bill count API is wired in.
const fetchBillCountSummary = sampleReport<BillCountKpi, BillCountRow>(
  { totalBills: 25, fullyPaidBills: 22, pendingIpBills: 3 },
  [
    { code: "TOTAL_BILLS", particular: "Total Bills", count: 25 },
    { code: "FULLY_PAID_BILLS", particular: "Fully Paid Bills", count: 22 },
    { code: "PENDING_IP_BILLS", particular: "Partially Paid / Pending IP Bills", count: 3 },
  ],
);

const TITLE = "Pharmacy Day Closing Summary - Bill Count Summary";

export default function DayCloseBillCountSummaryPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchBillCountSummary,
    errorMessage: "Failed to fetch the bill count summary",
  });

  const data = report.report;
  const total = data?.kpi.totalBills ?? 0;
  const fullyPaid = data?.kpi.fullyPaidBills ?? 0;
  const pending = data?.kpi.pendingIpBills ?? 0;
  const day = describePeriod(report.filters.appliedPeriod);

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Count of finalized pharmacy bills for the business day, including fully paid and partially paid or pending IP bills."
        onPrint={() => window.print()}
      />

      <DayCloseReportToolbar report={report} />

      {report.isLoading ? (
        <ReportLoadingState kpiCount={3} />
      ) : !data ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {report.loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
            <ReportKpiCard
              label="Total Bills"
              value={formatCount(total)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight="1 day"
              caption={day}
            />
            <ReportKpiCard
              label="Fully Paid Bills"
              value={formatCount(fullyPaid)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(fullyPaid, total)}
              caption="of total bills"
            />
            <ReportKpiCard
              label="Partially Paid / Pending IP Bills"
              value={formatCount(pending)}
              icon="/Reports/ClockYellow.svg"
              tone="danger"
              highlight={formatPercent(pending, total)}
              caption="of total bills"
            />
          </div>

          <ReportSummaryTable
            title={TITLE}
            subtitles={[
              `Date: ${day}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            labelHeader="Particular"
            amountHeader="Count"
            formatAmount={formatCount}
            lines={data.billDetails.content.map((row) => ({
              key: row.code,
              label: row.particular,
              amount: row.count,
            }))}
          />
        </>
      )}
    </div>
  );
}
