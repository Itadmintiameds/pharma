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
  formatPercent,
  formatRupees,
} from "../components/reportUtils";
import { getBillingByPatientType } from "@/services/FinancialReportService";

/** A KPI card per patient type, in the design's order. */
const TYPE_CARDS = [
  { key: "ip", label: "IP", icon: "/Reports/DocumentChartBarSmall.svg", tone: "primary" },
  { key: "op", label: "OP", icon: "/Reports/DocumentChartBarBlue.svg", tone: "info" },
  { key: "walkIn", label: "Walk-In", icon: "/Reports/DocumentChartBarGreen.svg", tone: "success" },
  { key: "dayCare", label: "Day Care", icon: "/Reports/DocumentChartBarYellow.svg", tone: "danger" },
] as const;

const TITLE = "Pharmacy Day Closing Summary - Billing by Patient Type";

export default function DayCloseBillingByPatientTypePage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: getBillingByPatientType,
    exportKey: "billing-by-patient-type",
    errorMessage: "Failed to fetch the billing by patient type report",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  // The KPI has no grand total; the TOTAL row carries it.
  const totalAmount = rows.find((r) => r.code === "TOTAL")?.totalAmount ?? 0;

  return (
    <div id={report.printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Bill count and total amount for the business day, grouped by patient type."
        icon="/Reports/ChartBar.svg"
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
            {TYPE_CARDS.map(({ key, label, icon, tone }) => {
              const { totalAmount: amount, billCount: bills } = data.kpi[key];
              return (
                <ReportKpiCard
                  key={key}
                  label={label}
                  value={formatRupees(amount)}
                  icon={icon}
                  tone={tone}
                  highlight={`${bills} ${bills === 1 ? "bill" : "bills"}`}
                  caption={`${formatPercent(amount, totalAmount)} of sales`}
                />
              );
            })}
          </div>

          <ReportSummaryTable
            title={TITLE}
            subtitles={[
              `Date: ${describePeriod(report.filters.appliedPeriod)}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            labelHeader="Patient Type"
            countHeader="Bill Count"
            amountHeader="Total Amount"
            lines={rows.map((row) => ({
              key: row.code,
              label: row.patientType,
              count: row.billCount,
              amount: row.totalAmount,
              highlight: row.code === "TOTAL",
            }))}
          />
        </>
      )}
    </div>
  );
}
