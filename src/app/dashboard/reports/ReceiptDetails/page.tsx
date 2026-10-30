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
  sampleReport,
} from "../components/reportUtils";

/**
 * Payments received in the period, split by whether the bill they settle was
 * raised in the period (current) or before it (previous).
 */
interface ReceiptDetailsKpi {
  currentBillReceipts: number;
  previousBillReceipts: number;
  totalReceipts: number;
}

// Sample figures from the design, until the receipt details API is wired in.
const fetchReceiptDetails = sampleReport<ReceiptDetailsKpi, never>(
  { currentBillReceipts: 38000, previousBillReceipts: 7000, totalReceipts: 45000 },
  [],
);

const TITLE = "Pharmacy Receipts Report - Receipt Details";

export default function ReceiptDetailsPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_RECEIPTS_FILTERS,
    toParams: receiptsFiltersToParams,
    fetchReport: fetchReceiptDetails,
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
            lines={[
              { key: "CURRENT", label: "Current Bill Receipts", amount: current },
              { key: "PREVIOUS", label: "Previous Bill Receipts", amount: previous },
              { key: "TOTAL", label: "Total Receipts", amount: total, highlight: true },
            ]}
          />
        </>
      )}
    </div>
  );
}
