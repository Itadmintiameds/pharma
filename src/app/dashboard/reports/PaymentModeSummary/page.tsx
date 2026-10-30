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

interface PaymentModeKpi {
  totalReceived: number;
}

/** What was received through one payment mode. */
interface PaymentModeRow {
  /** CASH, CARD, UPI, … */
  paymentMode: string;
  label: string;
  amountReceived: number;
}

// Sample figures from the design, until the payment mode summary API is wired in.
const fetchPaymentModeSummary = sampleReport<PaymentModeKpi, PaymentModeRow>(
  { totalReceived: 45000 },
  [
    { paymentMode: "CASH", label: "Cash", amountReceived: 18000 },
    { paymentMode: "CARD", label: "Card", amountReceived: 12000 },
    { paymentMode: "UPI", label: "UPI", amountReceived: 10000 },
    { paymentMode: "NEFT", label: "NEFT", amountReceived: 5000 },
  ],
);

/** The modes with a KPI card of their own, in the design's order. */
const MODE_CARDS = [
  { mode: "CASH", label: "Cash", icon: "/Reports/Cube.svg", tone: "primary" },
  { mode: "CARD", label: "Card", icon: "/Reports/ScaleBlue.svg", tone: "info" },
  { mode: "UPI", label: "UPI", icon: "/Reports/ArrowPath.svg", tone: "danger" },
] as const;

const TITLE = "Pharmacy Receipts Report - Payment Mode Summary";

export default function PaymentModeSummaryPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_RECEIPTS_FILTERS,
    toParams: receiptsFiltersToParams,
    fetchReport: fetchPaymentModeSummary,
    errorMessage: "Failed to fetch the payment mode summary report",
  });

  const data = report.report;
  const rows = data?.billDetails.content ?? [];
  const totalReceived = data?.kpi.totalReceived ?? 0;
  const modesUsed = rows.filter((r) => r.amountReceived > 0).length;
  const amountFor = (mode: string) =>
    rows.find((r) => r.paymentMode === mode)?.amountReceived ?? 0;

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Payments received during the selected reporting period, grouped by payment mode."
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
              label="Total Received"
              value={formatRupees(totalReceived)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={`${modesUsed} ${modesUsed === 1 ? "mode" : "modes"}`}
              caption="used in this period"
            />
            {MODE_CARDS.map(({ mode, label, icon, tone }) => (
              <ReportKpiCard
                key={mode}
                label={label}
                value={formatRupees(amountFor(mode))}
                icon={icon}
                tone={tone}
                highlight={formatPercent(amountFor(mode), totalReceived)}
                caption="of total received"
              />
            ))}
          </div>

          <ReportSummaryTable
            title={TITLE}
            subtitles={[
              `Period: ${describePeriod(report.filters.appliedPeriod, "to")}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            labelHeader="Payment Mode"
            amountHeader="Amount Received"
            lines={[
              ...rows.map((row) => ({
                key: row.paymentMode,
                label: row.label,
                amount: row.amountReceived,
              })),
              { key: "TOTAL", label: "Total", amount: totalReceived, highlight: true },
            ]}
          />
        </>
      )}
    </div>
  );
}
