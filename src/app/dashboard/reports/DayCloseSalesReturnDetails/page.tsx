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
  formatReportDate,
  formatReportTime,
  formatRupees,
  sampleReport,
} from "../components/reportUtils";

interface SalesReturnKpi {
  totalReturns: number;
  totalReturnAmount: number;
  /** Distinct customers who returned something that day. */
  customerNames: string[];
  /** Null on a day without returns. */
  largestReturn: { returnNo: string; patientName: string | null; amount: number } | null;
}

/** One sales return processed on the day, against the bill it reverses. */
interface SalesReturnRow {
  returnId: number;
  returnNo: string;
  billNo: string;
  patientName: string | null;
  /** ISO local date-time. */
  returnDate: string;
  returnAmount: number;
}

// Sample figures from the design, until the day close sales return details API is wired in.
const fetchSalesReturns = sampleReport<SalesReturnKpi, SalesReturnRow>(
  {
    totalReturns: 2,
    totalReturnAmount: 3000,
    customerNames: ["Patient C", "Patient D"],
    largestReturn: { returnNo: "SR-1001", patientName: "Patient C", amount: 2000 },
  },
  [
    { returnId: 1001, returnNo: "SR-1001", billNo: "PB-0980", patientName: "Patient C", returnDate: "2026-10-08T12:20:00", returnAmount: 2000 },
    { returnId: 1002, returnNo: "SR-1002", billNo: "PB-0995", patientName: "Patient D", returnDate: "2026-10-08T16:10:00", returnAmount: 1000 },
  ],
);

const COLUMNS: ReportColumn<SalesReturnRow>[] = [
  {
    key: "returnNo",
    header: "Sales Return No.",
    className: "min-w-[150px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">{row.returnNo}</span>
    ),
  },
  {
    key: "billNo",
    header: "Bill No.",
    className: "min-w-[110px]",
    cell: (row) => <span className="whitespace-nowrap">{row.billNo}</span>,
  },
  {
    key: "patient",
    header: "Patient / Customer Name",
    className: "min-w-[190px]",
    sortValue: (row) => row.patientName ?? "",
    cell: (row) => <span className="font-semibold">{row.patientName || "—"}</span>,
  },
  {
    key: "returnDate",
    header: "Return Date & Time",
    className: "min-w-[200px]",
    sortValue: (row) => row.returnDate,
    cell: (row) => (
      <span className="whitespace-nowrap">
        {formatReportDate(row.returnDate)} {formatReportTime(row.returnDate)}
      </span>
    ),
  },
  {
    key: "returnAmount",
    header: "Return Amount",
    align: "right",
    className: "min-w-[140px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap">{formatRupees(row.returnAmount)}</span>
    ),
  },
];

const TITLE = "Pharmacy Day Closing Summary - Sales Return Details";

export default function DayCloseSalesReturnDetailsPage() {
  const report = useFinancialReport({
    emptyFilters: EMPTY_DAY_CLOSE_FILTERS,
    toParams: dayCloseFiltersToParams,
    fetchReport: fetchSalesReturns,
    errorMessage: "Failed to fetch the sales return details",
  });

  const data = report.report;
  const kpi = data?.kpi;
  const returns = kpi?.totalReturns ?? 0;
  const amount = kpi?.totalReturnAmount ?? 0;
  const customers = kpi?.customerNames ?? [];
  const largest = kpi?.largestReturn ?? null;
  const day = describePeriod(report.filters.appliedPeriod);

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Sales returns processed on the business day."
        icon="/Reports/ReceiptRefund.svg"
        onPrint={() => window.print()}
      />

      <DayCloseReportToolbar report={report} />

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
              label="Total Return Amount"
              value={formatRupees(amount)}
              icon="/Reports/ReceiptRefundRed.svg"
              tone="warning"
              highlight={`${returns} ${returns === 1 ? "return" : "returns"}`}
              caption={`on ${day}`}
            />
            <ReportKpiCard
              label="Sales Returns"
              value={formatCount(returns)}
              icon="/Reports/DocumentChartBarSmall.svg"
              tone="primary"
              highlight={`${customers.length} ${customers.length === 1 ? "customer" : "customers"}`}
              caption={customers.join(", ")}
            />
            <ReportKpiCard
              label="Largest Return"
              value={formatRupees(largest?.amount ?? 0)}
              icon="/Reports/ScaleBlue.svg"
              tone="info"
              highlight={largest?.returnNo ?? "—"}
              caption={largest?.patientName ?? ""}
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
            getRowKey={(row) => String(row.returnId)}
            serverPagination={report.serverPagination(data.billDetails.totalElements)}
            totalRow={{
              returnNo: "Total",
              returnAmount: formatRupees(amount),
            }}
            emptyState={
              <ReportEmptyState title="No sales returns match your filters" onClearFilters={report.reset} />
            }
          />
        </>
      )}
    </div>
  );
}
