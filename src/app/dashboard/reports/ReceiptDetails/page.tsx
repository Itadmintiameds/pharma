"use client";

import ReportHeader from "../components/ReportHeader";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportSummaryTable from "../components/ReportSummaryTable";
import ReceiptsReportToolbar, {
  EMPTY_RECEIPTS_FILTERS,
  receiptsFiltersToParams,
} from "../components/ReceiptsReportToolbar";
import { useFinancialReport } from "../components/useFinancialReport";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatRupees,
} from "../components/reportUtils";
import { getReceiptDetails } from "@/services/FinancialReportService";

const TITLE = "Pharmacy Receipts Report - Receipt Details";

export default function ReceiptDetailsPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_RECEIPTS_FILTERS,
    toParams: receiptsFiltersToParams,
    fetchReport: getReceiptDetails,
    errorMessage: "Failed to fetch the receipt details report",
  });

  const data = report.report;
  const current = data?.kpi.currentBillReceipts ?? 0;
  const previous = data?.kpi.previousBillReceipts ?? 0;
  const total = data?.kpi.totalReceipts ?? 0;

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Payments received against current and previous bills during the selected reporting period."
        icon="/Reports/BanknotesHeader.svg"
        onPrint={() => window.print()}
      />

      <ReceiptsReportToolbar report={report} />

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
              value={formatRupees(total)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight="Current + Previous"
              caption="bill receipts"
            />
            <ReportKpiCard
              label="Current Bill Receipts"
              value={formatRupees(current)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight={formatPercent(current, total)}
              caption="of total receipts"
            />
            <ReportKpiCard
              label="Previous Bill Receipts"
              value={formatRupees(previous)}
              icon="/Reports/ClockBlue.svg"
              tone="info"
              highlight={formatPercent(previous, total)}
              caption="of total receipts"
            />
          </div>

          <ReportSummaryTable
            title={TITLE}
            subtitles={[
              `Period: ${describePeriod(report.filters.appliedPeriod, "to")}`,
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
