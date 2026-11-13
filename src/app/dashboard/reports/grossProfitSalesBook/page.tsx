"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { PaginationControl } from "@/app/components/common/table/Pagination";
import ReportHeader from "../components/ReportHeader";
import ReportKpiCard from "../components/ReportKpiCard";
import { useReportActions } from "../components/useReportActions";
import {
  downloadGrossProfitSalesBookExport,
  getGrossProfitSalesBook,
} from "@/services/AuditReports/GrossProfitSalesBookService";
import type {
  GrossProfitSalesBookFilter,
  GrossProfitSalesBookResponse,
  GrossProfitSalesBookRow,
} from "@/types/AuditReports/GrossProfitSalesBookData";
import { usePharmacyStore } from "@/store/pharmacyStore";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PAGE_SIZES = [10, 25, 50, 100];

const pad = (n: number) => String(n).padStart(2, "0");

// Local-time YYYY-MM-DD; toISOString() would shift to UTC and can land on the wrong day.
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const firstOfMonth = (d: Date) => toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));

// YYYY-MM-DD → 01-Sep-2026
const formatDisplayDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${MONTH_NAMES[Number(m) - 1]}-${y}`;
};

const openPicker = (input: HTMLInputElement | null) => {
  if (!input) return;
  try {
    input.showPicker();
  } catch {
    input.focus();
  }
};

// Kept mounted but invisible so showPicker() can anchor the native calendar to the field.
const hiddenPickerClass = "pointer-events-none absolute bottom-0 left-0 h-12 w-full opacity-0";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const fieldLabelClass = "px-xxsm text-label-l4 font-medium text-pneutral-900";
const fieldBoxClass =
  "flex min-h-12 max-h-13 w-full cursor-pointer items-center gap-sm rounded-lg border border-pneutral-300 bg-white p-sm text-left";

const scrollbarClass =
  "[scrollbar-color:var(--color-pneutral-500)_var(--color-pneutral-200)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-pneutral-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-pneutral-500";

// Indian grouping, whole rupees: 900684 → "9,00,684".
const amount = (n: number | null | undefined) => Math.round(n ?? 0).toLocaleString("en-IN");

const wholePercent = (n: number | null | undefined) => `${Math.round(n ?? 0)}%`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const FilterChip = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
  <span className="inline-flex items-center justify-center gap-xsm rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
    {label}
    {onRemove && (
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="cursor-pointer">
        <X className="size-4" />
      </button>
    )}
  </span>
);

interface Column {
  key: string;
  header: string;
  align: "left" | "right";
  // Pixel widths from the design; the table scrolls sideways once they no longer fit.
  width: string;
  render: (row: GrossProfitSalesBookRow) => React.ReactNode;
  total: React.ReactNode;
}

const GrossProfitSalesBookPage = () => {
  const [fromDate, setFromDate] = useState(() => firstOfMonth(new Date()));
  const [toDate, setToDate] = useState(() => toIsoDate(new Date()));
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  const { pharmacies, loading: pharmaciesLoading } = usePharmacyStore();
  const [pharmacyIds, setPharmacyIds] = useState<string[]>([]);

  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  // The filters last sent with Search; the first load reports this month so far.
  const [appliedFilter, setAppliedFilter] = useState<GrossProfitSalesBookFilter>(() => ({
    fromDate: firstOfMonth(new Date()),
    toDate: toIsoDate(new Date()),
  }));
  const [report, setReport] = useState<GrossProfitSalesBookResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  const pharmacyLabel = pharmacyIds.length
    ? pharmacyOptions
        .filter((o) => pharmacyIds.includes(String(o.value)))
        .map((o) => o.label)
        .join(", ")
    : "All Pharmacies";

  const handleFromDateChange = (value: string) => {
    if (!value) return;
    setFromDate(value);
    // A To date the From date overtakes moves with it.
    if (value > toDate) setToDate(value);
  };

  const handleToDateChange = (value: string) => {
    if (!value || value < fromDate) return;
    setToDate(value);
  };

  // A string so the effect re-runs on a real change of filter or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...appliedFilter, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getGrossProfitSalesBook(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the G.P. on consolidated sales book.");
      } finally {
        if (active) setReportLoading(false);
      }
    };
    fetchReport();
    return () => {
      active = false;
    };
  }, [requestKey]);

  // Print / PDF and the CSV / Excel download cover every row of the last search.
  const { printId, printReport, print, download, busy } = useReportActions<GrossProfitSalesBookResponse>({
    report,
    hasMoreRows: (r) => (r.salesBook?.totalRecords ?? 0) > (r.salesBook?.data.length ?? 0),
    fetchAll: () => getGrossProfitSalesBook({ ...appliedFilter, unpaged: true }),
    exportReport: (format) => downloadGrossProfitSalesBookExport(format, appliedFilter),
    fileStem: `gross-profit-sales-book_${
      appliedFilter.fromDate === appliedFilter.toDate
        ? appliedFilter.fromDate
        : `${appliedFilter.fromDate}_to_${appliedFilter.toDate}`
    }`,
  });

  // Every row is swapped in only while the print copy is taken.
  const shownReport = printReport ?? report;
  const shownPageIndex = printReport ? 0 : pageIndex;

  const rows = shownReport?.salesBook?.data ?? [];
  const summary = shownReport?.summary;
  const totalRecords = shownReport?.salesBook?.totalRecords ?? 0;
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);
  const daysWithSales = summary?.daysWithSales ?? 0;
  const periodNoun = shownReport?.groupBy === "MONTH" ? "month" : "day";

  // A single pharmacy gets its full header block; several are listed by name.
  const reportPharmacies = shownReport?.pharmacies ?? [];
  const singlePharmacy = reportPharmacies.length === 1 ? reportPharmacies[0] : null;

  const columns: Column[] = [
    {
      key: "date",
      header: "DATE",
      align: "left",
      width: "w-[239px]",
      render: (r) => r.periodLabel || r.date,
      total: `Total: ${plural(totalRecords, periodNoun.replace(/^./, (c) => c.toUpperCase()))}`,
    },
    {
      key: "billAmount",
      header: "BILL AMOUNT (₹)",
      align: "right",
      width: "w-[208px]",
      render: (r) => amount(r.billAmount),
      total: amount(summary?.totalBillAmount),
    },
    {
      key: "cost",
      header: "COST (₹)",
      align: "right",
      width: "w-[202px]",
      render: (r) => amount(r.cost),
      total: amount(summary?.totalCost),
    },
    {
      key: "grossProfit",
      header: "GROSS PROFIT (₹)",
      align: "right",
      width: "w-[202px]",
      render: (r) => amount(r.grossProfit),
      total: amount(summary?.totalGrossProfit),
    },
    {
      key: "grossProfitPercentage",
      header: "G.P. %",
      align: "right",
      width: "w-[257px]",
      render: (r) => wholePercent(r.grossProfitPercentage),
      total: `${(summary?.overallGrossProfitPercentage ?? 0).toFixed(2)}%`,
    },
  ];

  const handleSearch = () => {
    setAppliedFilter({
      fromDate,
      toDate,
      pharmacyIds: pharmacyIds.length ? pharmacyIds : undefined,
    });
    setPageIndex(0);
  };

  const resetFilters = () => {
    const now = new Date();
    setFromDate(firstOfMonth(now));
    setToDate(toIsoDate(now));
    setPharmacyIds([]);
    setAppliedFilter({ fromDate: firstOfMonth(now), toDate: toIsoDate(now) });
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Gross Profit (GP) on Consolidated Sales Book"
        description="A date-wise summary of sales, cost of medicines sold, gross profit and gross profit percentage for the selected reporting period."
        icon="/Reports/ChartBar.svg"
        onPrint={print}
        onDownload={download}
        busy={busy}
      />

      {/* Filter toolbar */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md print:hidden ${CARD_SHADOW}`}>
        <div className="flex flex-wrap items-center justify-end gap-sm">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-12 min-w-27 cursor-pointer items-center justify-center rounded-lg border-2 border-secondary-700 px-md text-label-l4 font-medium text-secondary-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={reportLoading}
            className="inline-flex h-12 min-w-27 cursor-pointer items-center justify-center rounded-lg bg-secondary-700 px-md text-label-l4 font-medium text-pneutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative flex min-w-0 flex-col">
            <span className={fieldLabelClass}>From Date</span>
            <button type="button" onClick={() => openPicker(fromDateRef.current)} className={fieldBoxClass}>
              <span className="flex-1 truncate text-p4 text-pneutral-900">{formatDisplayDate(fromDate)}</span>
              <Calendar className="size-5 shrink-0 text-pneutral-900" />
            </button>
            <input
              ref={fromDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className={hiddenPickerClass}
            />
          </div>

          <div className="relative flex min-w-0 flex-col">
            <span className={fieldLabelClass}>To Date</span>
            <button type="button" onClick={() => openPicker(toDateRef.current)} className={fieldBoxClass}>
              <span className="flex-1 truncate text-p4 text-pneutral-900">{formatDisplayDate(toDate)}</span>
              <Calendar className="size-5 shrink-0 text-pneutral-900" />
            </button>
            <input
              ref={toDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={toDate}
              min={fromDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              className={hiddenPickerClass}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <Dropdown
              label="Pharmacy"
              labelClassName="px-xxsm"
              multiple
              selectAll
              options={pharmacyOptions}
              value={pharmacyIds}
              onChange={(ids: string[]) => setPharmacyIds(ids)}
              placeholder="All Pharmacies"
              isLoading={pharmaciesLoading}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          <FilterChip
            label={`From Date: ${formatDisplayDate(fromDate)}`}
            onRemove={() => handleFromDateChange(firstOfMonth(new Date()))}
          />
          <FilterChip
            label={`To Date: ${formatDisplayDate(toDate)}`}
            onRemove={() => handleToDateChange(toIsoDate(new Date()))}
          />
          <FilterChip label={`Pharmacy: ${pharmacyLabel}`} onRemove={() => setPharmacyIds([])} />
        </div>
      </div>

      {/* KPI row: totals over every matching row, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard
          label="Total Bill Amount"
          value={`₹${amount(summary?.totalBillAmount)}`}
          icon="/Reports/Banknotes.svg"
          tone="primary"
          highlight={plural(daysWithSales, "day")}
          caption="with sales"
        />
        <ReportKpiCard
          label="Total Cost"
          value={`₹${amount(summary?.totalCost)}`}
          icon="/Reports/CubeBlue.svg"
          tone="info"
          highlight={wholePercent(summary?.costPercentageOfBillAmount)}
          caption="of bill amount"
        />
        <ReportKpiCard
          label="Total Gross Profit"
          value={`₹${amount(summary?.totalGrossProfit)}`}
          icon="/Reports/CheckCircleSolid.svg"
          tone="success"
          highlight={`₹${amount(summary?.averageGrossProfitPerDay)}`}
          caption="average per day"
        />
        <ReportKpiCard
          label="Overall G.P. %"
          value={`${(summary?.overallGrossProfitPercentage ?? 0).toFixed(2)}%`}
          icon="/Reports/ChartBarYellow.svg"
          tone="danger"
          highlight="Approx."
          caption="profit ÷ bill amount"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-xxsm text-p3 text-pneutral-500">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">G.P. on Consolidated Sales Book</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, periodNoun)}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search. */}
            {singlePharmacy ? (
              <>
                <p>Pharmacy Name: {singlePharmacy.pharmacyName || "---"}</p>
                <p className="wrap-anywhere">Address: {singlePharmacy.address || "---"}</p>
                <p>Phone Number: {singlePharmacy.phoneNumber || "---"}</p>
                <p className="wrap-anywhere">Email Address: {singlePharmacy.emailAddress || "---"}</p>
                <p>GSTIN: {singlePharmacy.gstin || "---"}</p>
              </>
            ) : (
              <p className="wrap-anywhere">
                Pharmacy Name:{" "}
                {reportPharmacies.length ? reportPharmacies.map((p) => p.pharmacyName).join(", ") : "All Pharmacies"}
              </p>
            )}
            <p>Report Name: {shownReport?.reportName ?? "G.P. ON CONSOLIDATED SALES BOOK"}</p>
            <p>Date Range: {shownReport ? `${shownReport.fromDate} to ${shownReport.toDate}` : "---"}</p>
          </div>
          {shownReport && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {shownReport.generatedOn}</p>
              <p>Generated by: {shownReport.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Rows stack as cards on phones. Paper always gets the table. */}
        <div className="flex flex-col gap-sm md:hidden print:hidden">
          {!showRows && (
            <p
              className={`rounded-lg border border-pneutral-200 px-sm py-md text-center text-p3 ${
                reportError ? "text-warning-600" : "text-pneutral-500"
              }`}
            >
              {emptyMessage}
            </p>
          )}
          {showRows &&
            rows.map((row) => (
              <div key={row.date} className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm">
                <div className="flex items-center justify-between gap-sm">
                  <p className="text-p3 font-semibold text-pneutral-900">{row.periodLabel || row.date}</p>
                  <p className="text-p3 font-semibold text-pneutral-900">{wholePercent(row.grossProfitPercentage)}</p>
                </div>
                <dl className="grid grid-cols-3 gap-x-md gap-y-xsm text-p3">
                  {columns.slice(1, 4).map((col) => (
                    <div key={col.key} className="flex min-w-0 flex-col">
                      <dt className="text-p2 text-pneutral-500">{col.header}</dt>
                      <dd className="text-pneutral-900 wrap-anywhere">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          {showRows && (
            <div className="flex flex-col gap-xxsm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-sm">
                  <span>{col.key === "date" ? "Total" : col.header}</span>
                  <span>{col.key === "date" ? plural(totalRecords, periodNoun) : col.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The columns fit the card at full width and scroll sideways once they no longer do. */}
        <div className={`hidden w-full overflow-x-auto md:block print:block! ${scrollbarClass}`}>
          <div className="min-w-[1108px] overflow-hidden rounded-lg border border-pneutral-200">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-secondary-600">
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      className={`h-14 border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word ${
                        col.width
                      } ${col.align === "right" ? "text-right" : "text-left"} ${
                        i < columns.length - 1 ? "border-r" : ""
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!showRows && (
                  <tr className="bg-white">
                    <td
                      colSpan={columns.length}
                      className={`h-13 border-b border-pneutral-200 px-sm py-xsm text-center text-p3 ${
                        reportError ? "text-warning-600" : "text-pneutral-500"
                      }`}
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
                {showRows &&
                  rows.map((row) => (
                    <tr key={row.date} className="bg-white">
                      {columns.map((col, i) => (
                        <td
                          key={col.key}
                          className={`h-13 border-b border-pneutral-200 px-sm py-xsm text-p3 text-pneutral-900 ${
                            col.align === "right" ? "text-right" : "text-left"
                          } ${i < columns.length - 1 ? "border-r" : ""}`}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                {showRows && (
                  <tr className="bg-primary-100">
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={`h-13 border-pneutral-200 px-sm py-xsm text-p3 font-semibold text-primary-900 ${
                          col.align === "right" ? "text-right" : "text-left"
                        } ${i < columns.length - 1 ? "border-r" : ""}`}
                      >
                        {col.total}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-center print:hidden">
          <p className="flex-1 text-p3 text-pneutral-500">
            Showing {firstRecord} to {lastRecord} of {totalRecords} records
          </p>
          <div className="flex flex-wrap items-center gap-xlg">
            <div className="flex items-center gap-sm">
              <span className="text-p3 whitespace-nowrap text-pneutral-500">Records per page</span>
              <span className="relative flex min-h-9 w-[84px] items-center rounded-sm border border-pneutral-300 bg-white">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageIndex(0);
                  }}
                  className="w-full cursor-pointer appearance-none bg-transparent py-xsm pr-hg pl-sm text-p2 text-pneutral-500 outline-none"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-sm size-4 text-pneutral-500" />
              </span>
            </div>
            {/* Same page-number control as the other reports (e.g. Bill Summary).
                PaginationControl is 1-based; pageIndex is 0-based. */}
            <PaginationControl
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={report?.salesBook?.totalRecords ?? 0}
              onPageChange={(page) => setPageIndex(page - 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrossProfitSalesBookPage;
