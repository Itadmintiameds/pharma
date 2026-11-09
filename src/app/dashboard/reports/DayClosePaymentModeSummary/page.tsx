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
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatRupees,
} from "../components/reportUtils";
// The one-day cut of the Payment Mode Summary report.
import { getPaymentModeSummary } from "@/services/FinancialReportService";

/** The modes with a KPI card of their own, in the design's order. */
const MODE_CARDS = [
  { mode: "cash", label: "Cash", icon: "/Reports/Cube.svg", tone: "primary" },
  { mode: "card", label: "Card", icon: "/Reports/ScaleBlue.svg", tone: "info" },
  { mode: "upi", label: "UPI", icon: "/Reports/ArrowPath.svg", tone: "danger" },
] as const;

const TITLE = "Pharmacy Day Closing Summary - Payment Mode Summary";

export default function DayClosePaymentModeSummaryPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayClosingViewParams,
    fetchReport: getPaymentModeSummary,
    exportKey: "payment-mode-summary",
    errorMessage: "Failed to fetch the day close payment mode summary",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  const totalReceived = data?.kpi.totalReceived ?? 0;
  const modesUsed = rows.filter((r) => r.code !== "TOTAL" && r.amountReceived > 0).length;
  const isToday = report.filters.appliedPeriod.mode === "today";

  return (
    <div id={report.printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Payments collected during the business day, grouped by payment mode."
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
              label="Total Received"
              value={formatRupees(totalReceived)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={`${modesUsed} ${modesUsed === 1 ? "mode" : "modes"}`}
              caption={isToday ? "used today" : "used that day"}
            />
            {MODE_CARDS.map(({ mode, label, icon, tone }) => (
              <ReportKpiCard
                key={mode}
                label={label}
                value={formatRupees(data.kpi[mode])}
                icon={icon}
                tone={tone}
                highlight={formatPercent(data.kpi[mode], totalReceived)}
                caption="of total received"
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
            labelHeader="Payment Mode"
            amountHeader="Amount Received"
            lines={rows.map((row) => ({
              key: row.code,
              label: row.paymentMode,
              amount: row.amountReceived,
              highlight: row.code === "TOTAL",
            }))}
          />
        </>
      )}
    </div>
  );
}
