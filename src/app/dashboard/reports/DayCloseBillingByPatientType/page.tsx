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
  sampleReport,
} from "../components/reportUtils";

interface PatientTypeKpi {
  totalBills: number;
  totalAmount: number;
}

interface PatientTypeRow {
  /** IP, OP, WALK_IN, DAY_CARE, or TOTAL for the closing total line. */
  code: string;
  patientType: string;
  billCount: number;
  totalAmount: number;
}

// Sample figures from the design, until the day close billing by patient type API is wired in.
const fetchBillingByPatientType = sampleReport<PatientTypeKpi, PatientTypeRow>(
  { totalBills: 25, totalAmount: 50000 },
  [
    { code: "IP", patientType: "IP", billCount: 5, totalAmount: 15000 },
    { code: "OP", patientType: "OP", billCount: 8, totalAmount: 16000 },
    { code: "WALK_IN", patientType: "Walk-In", billCount: 9, totalAmount: 13000 },
    { code: "DAY_CARE", patientType: "Day Care", billCount: 3, totalAmount: 6000 },
    { code: "TOTAL", patientType: "Total", billCount: 25, totalAmount: 50000 },
  ],
);

/** A KPI card per patient type, in the design's order. */
const TYPE_CARDS = [
  { code: "IP", label: "IP", icon: "/Reports/DocumentChartBarSmall.svg", tone: "primary" },
  { code: "OP", label: "OP", icon: "/Reports/DocumentChartBarBlue.svg", tone: "info" },
  { code: "WALK_IN", label: "Walk-In", icon: "/Reports/DocumentChartBarGreen.svg", tone: "success" },
  { code: "DAY_CARE", label: "Day Care", icon: "/Reports/DocumentChartBarYellow.svg", tone: "danger" },
] as const;

const TITLE = "Pharmacy Day Closing Summary - Billing by Patient Type";

export default function DayCloseBillingByPatientTypePage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchBillingByPatientType,
    errorMessage: "Failed to fetch the billing by patient type report",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  const totalAmount = data?.kpi.totalAmount ?? 0;
  const rowFor = (code: string) => rows.find((r) => r.code === code);

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Bill count and total amount for the business day, grouped by patient type."
        icon="/Reports/ChartBar.svg"
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
            {TYPE_CARDS.map(({ code, label, icon, tone }) => {
              const amount = rowFor(code)?.totalAmount ?? 0;
              const bills = rowFor(code)?.billCount ?? 0;
              return (
                <ReportKpiCard
                  key={code}
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
