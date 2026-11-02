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
  sampleReport,
} from "../components/reportUtils";

interface DayCloseSalesKpi {
  totalSales: number;
  totalDiscount: number;
  totalSalesReturn: number;
  /** totalSales âˆ’ totalSalesReturn; the discount is already inside totalSales. */
  netSales: number;
}

interface DayCloseSalesRow {
  /** TOTAL_SALES, TOTAL_DISCOUNT, TOTAL_SALES_RETURN or NET_SALES. */
  code: string;
  particular: string;
  amount: number;
}

// Sample figures from the design, until the day close sales summary API is wired in.
const fetchDayCloseSales = sampleReport<DayCloseSalesKpi, DayCloseSalesRow>(
  { totalSales: 50000, totalDiscount: 2000, totalSalesReturn: 3000, netSales: 47000 },
  [
    { code: "TOTAL_SALES", particular: "Total Sales", amount: 50000 },
    { code: "TOTAL_DISCOUNT", particular: "Total Discount", amount: 2000 },
    { code: "TOTAL_SALES_RETURN", particular: "Total Sales Return", amount: 3000 },
    { code: "NET_SALES", particular: "Net Sales", amount: 47000 },
  ],
);

const TITLE = "Pharmacy Day Closing Summary - Sales Summary";

export default function DayCloseSalesSummaryPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchDayCloseSales,
    errorMessage: "Failed to fetch the day close sales summary",
  });

  const data = report.report;
  const kpi = data?.kpi;
  const totalSales = kpi?.totalSales ?? 0;
  const discount = kpi?.totalDiscount ?? 0;
  const returns = kpi?.totalSalesReturn ?? 0;
  const netSales = kpi?.netSales ?? 0;

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Sales, discounts, sales returns and net sales for the business day."
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
            lines={data.billDetails.content.map((row) => ({
              key: row.code,
              label: row.particular,
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
