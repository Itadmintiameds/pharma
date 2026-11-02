"use client";

import ReportHeader from "../components/ReportHeader";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportSummaryTable from "../components/ReportSummaryTable";
import DayCloseReportToolbar, {
  EMPTY_DAY_CLOSE_FILTERS,
  dayCloseFiltersToParams,
} from "../components/DayCloseReportToolbar";
import { useFinancialReport } from "../components/useFinancialReport";
import {
  describePeriod,
  formatGeneratedOn,
  formatRupees,
  sampleReport,
} from "../components/reportUtils";
import type { ReceiptDetailsKpi, ReceiptDetailsRow } from "@/types/FinancialReportData";

// Sample figures from the design, until the day close receipt details API is
// wired in. Shaped like /financial-report/receipt-details, its one-day cut.
const fetchDayCloseReceipts = sampleReport<ReceiptDetailsKpi, ReceiptDetailsRow>(
  { currentBillReceipts: 35000, previousBillReceipts: 7000, totalReceipts: 45000 },
  [
    { code: "CURRENT_BILL_RECEIPTS", particular: "Current Bill Receipts", source: "", calculation: "", amount: 35000 },
    { code: "PREVIOUS_BILL_RECEIPTS", particular: "Previous Bill Receipts", source: "", calculation: "", amount: 7000 },
    { code: "TOTAL_RECEIPTS", particular: "Total Receipts", source: "", calculation: "", amount: 45000 },
  ],
);

const TITLE = "Pharmacy Day Closing Summary - Receipt Details";

export default function DayCloseReceiptDetailsPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchDayCloseReceipts,
    errorMessage: "Failed to fetch the day close receipt details",
  });

  const data = report.report;
  const isToday = report.filters.appliedPeriod.mode === "today";

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Payments received against current and previous bills during the business day."
        icon="/Reports/BanknotesHeader.svg"
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
              label="Total Receipts"
              value={formatRupees(data.kpi.totalReceipts)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight="Current + Previous"
              caption="bill receipts"
            />
            <ReportKpiCard
              label="Current Bill Receipts"
              value={formatRupees(data.kpi.currentBillReceipts)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight={isToday ? "Today's bills" : "That day's bills"}
              caption="payments received"
            />
            <ReportKpiCard
              label="Previous Bill Receipts"
              value={formatRupees(data.kpi.previousBillReceipts)}
              icon="/Reports/ClockBlue.svg"
              tone="info"
              highlight="Earlier bills"
              caption={isToday ? "paid today" : "paid that day"}
            />
          </div>

          <ReportSummaryTable
            title={TITLE}
            subtitles={[
              `Date: ${describePeriod(report.filters.appliedPeriod)}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            labelHeader="Particular"
            amountHeader="Amount"
            lines={data.billDetails.content.map((row) => ({
              key: row.code,
              label: row.particular,
              amount: row.amount,
              highlight: row.code === "TOTAL_RECEIPTS",
            }))}
          />
        </>
      )}
    </div>
  );
}
