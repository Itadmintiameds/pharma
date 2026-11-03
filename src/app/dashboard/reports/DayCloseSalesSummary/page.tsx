"use client";

import Image from "next/image";
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
  formatPercent,
  formatRupees,
} from "../components/reportUtils";
// The one-day cut of the Sales Summary report.
import { getSalesSummary } from "@/services/FinancialReportService";

const TITLE = "Pharmacy Day Closing Summary - Sales Summary";

export default function DayCloseSalesSummaryPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: getSalesSummary,
    exportKey: "sales-summary",
    errorMessage: "Failed to fetch the day close sales summary",
  });

  const data = report.report;
  const kpi = data?.kpi;
  // The day close shows only the sales lines; IP pending has a report of its own.
  const rows = (data?.billDetails.content ?? []).filter((r) => r.code !== "IP_PENDING_AMOUNT");
  const totalSales = kpi?.totalSales ?? 0;
  // The KPI has no discount figure; it is a table row.
  const discount = rows.find((r) => r.code === "TOTAL_DISCOUNT")?.amount ?? 0;
  const returns = kpi?.totalSalesReturn ?? 0;
  const netSales = kpi?.netSales ?? 0;

  return (
    <div id={report.printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Sales, discounts, sales returns and net sales for the business day."
        icon="/Reports/BanknotesHeader.svg"
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
              label="Total Sales"
              value={formatRupees(totalSales)}
              icon="/Reports/Banknotes.svg"
              tone="primary"
              highlight={formatRupees(discount, 0)}
              caption="discount applied"
            />
            <ReportKpiCard
              label="Total Discount"
              value={formatRupees(discount)}
              icon="/Reports/ScaleYellow.svg"
              tone="danger"
              highlight={formatPercent(discount, totalSales)}
              caption="of total sales"
            />
            <ReportKpiCard
              label="Total Sales Return"
              value={formatRupees(returns)}
              icon="/Reports/ReceiptRefundRed.svg"
              tone="warning"
              highlight={formatPercent(returns, totalSales)}
              caption="of total sales"
            />
            <ReportKpiCard
              label="Net Sales"
              value={formatRupees(netSales)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(netSales, totalSales)}
              caption="of total sales"
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
            lines={rows.map((row) => ({
              key: row.code,
              label: row.metric,
              amount: row.amount,
              highlight: row.code === "NET_SALES",
            }))}
            footer={
              <div className="flex w-full items-start gap-3 rounded-2xl bg-info-50 p-4">
                <Image src="/Reports/ExclamationCircle.svg" alt="" width={24} height={24} />
                <div className="flex flex-col gap-1">
                  <p className="text-label-l4 font-semibold text-info-500">Note</p>
                  <p className="text-p3 text-pneutral-900">
                    Total Sales is already after discount and GST-inclusive. Total Discount shall not be deducted again.
                  </p>
                </div>
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
