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
} from "../components/reportUtils";
import { getSalesReturnDetails } from "@/services/FinancialReportService";
import { SalesReturnDetailsRow } from "@/types/FinancialReportData";

const COLUMNS: ReportColumn<SalesReturnDetailsRow>[] = [
  {
    key: "returnNo",
    header: "Sales Return No.",
    className: "min-w-[150px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">{row.salesReturnNo}</span>
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
    sortValue: (row) => row.customerName ?? "",
    cell: (row) => <span className="font-semibold">{row.customerName || "—"}</span>,
  },
  {
    key: "returnDate",
    header: "Return Date & Time",
    className: "min-w-[200px]",
    sortValue: (row) => row.returnedAt,
    cell: (row) => (
      <span className="whitespace-nowrap">
        {formatReportDate(row.returnedAt)} {formatReportTime(row.returnedAt)}
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
    fetchReport: getSalesReturnDetails,
    exportKey: "sales-return-details",
    errorMessage: "Failed to fetch the sales return details",
  });

  const data = report.report;
  const kpi = data?.kpi;
  const rows = data?.billDetails.content ?? [];
  const returns = kpi?.totalReturns ?? 0;
  const amount = kpi?.totalReturnAmount ?? 0;
  // The API totals only count and amount, so customers and the largest return
  // are read off the rows loaded — exact while every return fits on one page.
  const customers = [...new Set(rows.map((r) => r.customerName).filter((n): n is string => !!n))];
  const largest = rows.reduce<SalesReturnDetailsRow | null>(
    (max, row) => (!max || row.returnAmount > max.returnAmount ? row : max),
    null,
  );
  const day = describePeriod(report.filters.appliedPeriod);

  return (
    <div id={report.printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="Sales returns processed on the business day."
        icon="/Reports/ReceiptRefund.svg"
        onPrint={report.print}
        onDownload={report.download}
        busy={report.busy}
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
              value={formatRupees(largest?.returnAmount ?? 0)}
              icon="/Reports/ScaleBlue.svg"
              tone="info"
              highlight={largest?.salesReturnNo ?? "—"}
              caption={largest?.customerName ?? ""}
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
            rows={rows}
            getRowKey={(row) => String(row.salesReturnId)}
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
