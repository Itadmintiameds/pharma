"use client";

import ReportHeader from "../components/ReportHeader";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportSummaryTable from "../components/ReportSummaryTable";
import DayCloseReportToolbar, {
  EMPTY_DAY_CLOSE_FILTERS,
  dayClosingViewParams,
} from "../components/DayCloseReportToolbar";
import { useFinancialReport } from "../components/useFinancialReport";
import { describePeriod, formatGeneratedOn, formatRupees } from "../components/reportUtils";
// The one-day cut of the Receipt Details report; the toolbar always sends a date.
import { getReceiptDetails } from "@/services/FinancialReportService";

const TITLE = "Pharmacy Day Closing Summary - Receipt Details";

export default function DayCloseReceiptDetailsPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayClosingViewParams,
    fetchReport: getReceiptDetails,
    exportKey: "receipt-details",
    errorMessage: "Failed to fetch the day close receipt details",
  });

  const data = report.report;
  const isToday = report.filters.appliedPeriod.mode === "today";

  return (
    <div id={report.printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Payments received against current and previous bills during the business day."
        icon="/Reports/BanknotesHeader.svg"
        onPrint={report.print}
        onDownload={report.download}
        busy={report.busy}
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
