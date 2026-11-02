"use client";

import ReportHeader from "../components/ReportHeader";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportTable, { ReportColumn } from "../components/ReportTable";
import ReportEmptyState from "../components/ReportEmptyState";
import { formatCount } from "../components/ReportSummaryTable";
import DayCloseReportToolbar, {
  EMPTY_DAY_CLOSE_FILTERS,
  dayCloseFiltersToParams,
} from "../components/DayCloseReportToolbar";
import { useFinancialReport } from "../components/useFinancialReport";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatRupees,
  sampleReport,
} from "../components/reportUtils";

interface CurrentBillKpi {
  totalBills: number;
  totalAmount: number;
  amountReceived: number;
  /** totalAmount − amountReceived */
  pendingAmount: number;
}

/** A bill raised on the day, and how much of it was paid. */
interface CurrentBillRow {
  billingId: number;
  billNo: string;
  patientName: string | null;
  /** Display label, e.g. "Walk-In". */
  patientType: string;
  /** ISO local date-time. */
  billedDate: string;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
}

// Sample figures from the design, until the day close current bill details API is wired in.
const fetchCurrentBills = sampleReport<CurrentBillKpi, CurrentBillRow>(
  { totalBills: 3, totalAmount: 13500, amountReceived: 9500, pendingAmount: 4000 },
  [
    { billingId: 1001, billNo: "PB-1001", patientName: "Patient A", patientType: "IP", billedDate: "2026-10-08T10:15:00", totalAmount: 10000, amountReceived: 6000, pendingAmount: 4000 },
    { billingId: 1002, billNo: "PB-1002", patientName: "Patient B", patientType: "OP", billedDate: "2026-10-08T11:40:00", totalAmount: 2000, amountReceived: 2000, pendingAmount: 0 },
    { billingId: 1003, billNo: "PB-1003", patientName: "Walk-In", patientType: "Walk-In", billedDate: "2026-10-08T15:05:00", totalAmount: 1500, amountReceived: 1500, pendingAmount: 0 },
  ],
);

const COLUMNS: ReportColumn<CurrentBillRow>[] = [
  {
    key: "billNo",
    header: "Bill No.",
    className: "min-w-[118px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">{row.billNo}</span>
    ),
  },
  {
    key: "patient",
    header: "Patient / Customer",
    className: "min-w-[160px]",
    sortValue: (row) => row.patientName ?? "",
    cell: (row) => <span className="font-semibold">{row.patientName || "—"}</span>,
  },
  {
    key: "patientType",
    header: "Patient Type",
    className: "min-w-[121px]",
    cell: (row) => <span className="whitespace-nowrap">{row.patientType}</span>,
  },
  {
    key: "billedDate",
    header: "Billed Date",
    className: "min-w-[143px]",
    sortValue: (row) => row.billedDate,
    cell: (row) => <span className="whitespace-nowrap">{formatReportDate(row.billedDate)}</span>,
  },
  {
    key: "totalAmount",
    header: "Total Amount",
    align: "right",
    className: "min-w-[135px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.totalAmount)}</span>,
  },
  {
    key: "amountReceived",
    header: "Amount Received",
    align: "right",
    className: "min-w-[133px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.amountReceived)}</span>,
  },
  {
    key: "pendingAmount",
    header: "Pending Amount",
    align: "right",
    className: "min-w-[128px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap">{formatRupees(row.pendingAmount)}</span>
    ),
  },
];

const TITLE = "Pharmacy Day Closing Summary - Current Bill Details";

export default function DayCloseCurrentBillDetailsPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchCurrentBills,
    errorMessage: "Failed to fetch the current bill details",
  });

  const data = report.report;
  const kpi = data?.kpi;
  const bills = kpi?.totalBills ?? 0;
  const total = kpi?.totalAmount ?? 0;
  const received = kpi?.amountReceived ?? 0;
  const pending = kpi?.pendingAmount ?? 0;
  const day = describePeriod(report.filters.appliedPeriod);

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Bills generated on the business day with total, received and pending amounts."
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
              label="Bills"
              value={formatCount(bills)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight={`${bills} ${bills === 1 ? "bill" : "bills"}`}
              caption={`on ${day}`}
            />
            <ReportKpiCard
              label="Total Amount"
              value={formatRupees(total)}
              icon="/Reports/BanknotesBlue.svg"
              tone="info"
              highlight={formatRupees(bills ? total / bills : 0, 0)}
              caption="average per bill"
            />
            <ReportKpiCard
              label="Amount Received"
              value={formatRupees(received)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(received, total)}
              caption="of total amount"
            />
            <ReportKpiCard
              label="Pending Amount"
              value={formatRupees(pending)}
              icon="/Reports/Clock.svg"
              tone="warning"
              highlight={formatPercent(pending, total)}
              caption="of total amount"
            />
          </div>

          <ReportTable
            title={TITLE}
            subtitles={[
              `Date: ${day}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            columns={COLUMNS}
            rows={data.billDetails.content}
            getRowKey={(row) => String(row.billingId)}
            serverPagination={report.serverPagination(data.billDetails.totalElements)}
            totalRow={{
              billNo: "Total",
              totalAmount: formatRupees(total),
              amountReceived: formatRupees(received),
              pendingAmount: formatRupees(pending),
            }}
            emptyState={
              <ReportEmptyState title="No bills match your filters" onClearFilters={report.reset} />
            }
          />
        </>
      )}
    </div>
  );
}
