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
import { getSalesSummary } from "@/services/FinancialReportService";

const TITLE = "Pharmacy Receipts Report - Sales Summary";

export default function SalesSummaryPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_RECEIPTS_FILTERS,
    toParams: receiptsFiltersToParams,
    fetchReport: getSalesSummary,
    errorMessage: "Failed to fetch the sales summary report",
  });

  const data = report.report;
  const kpi = data?.kpi;
  const rows = data?.billDetails.content ?? [];
  const totalSales = kpi?.totalSales ?? 0;
  const discount = rows.find((r) => r.code === "TOTAL_DISCOUNT")?.amount ?? 0;

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Total sales, discounts, sales returns, net sales and IP pending amount for the selected reporting period."
        icon="/Reports/BanknotesHeader.svg"
        onPrint={() => window.print()}
      />

      <ReceiptsReportToolbar report={report} />

      {report.isLoading ? (
        <ReportLoadingState kpiCount={4} />
      ) : !data ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {report.loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
            <ReportKpiCard
              label="Total Sales"
              value={formatRupees(totalSales)}
              icon="/Reports/Banknotes.svg"
              tone="primary"
              highlight={formatRupees(discount, 0)}
              caption="discount given"
            />
            <ReportKpiCard
              label="Net Sales"
              value={formatRupees(kpi?.netSales ?? 0)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(kpi?.netSales ?? 0, totalSales)}
              caption="of total sales"
            />
            <ReportKpiCard
              label="Total Sales Return"
              value={formatRupees(kpi?.totalSalesReturn ?? 0)}
              icon="/Reports/ReceiptRefundRed.svg"
              tone="warning"
              highlight={formatPercent(kpi?.totalSalesReturn ?? 0, totalSales)}
              caption="of total sales"
            />
            <ReportKpiCard
              label="IP Pending Amount"
              value={formatRupees(kpi?.ipPendingAmount ?? 0)}
              icon="/Reports/ClockBlue.svg"
              tone="info"
              highlight={formatPercent(kpi?.ipPendingAmount ?? 0, kpi?.netSales ?? 0)}
              caption="of net sales"
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
            lines={rows.map((row) => ({
              key: row.code,
              label: row.metric,
              amount: row.amount,
              highlight: row.code === "NET_SALES",
            }))}
          />
        </>
      )}
    </div>
  );
}
