"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  Box,
  Calendar,
  ChevronDown,
  ChevronsDown,
  Funnel,
  RefreshCw,
  Scale,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import {
  downloadUserWiseCollectionExport,
  getUserWiseCollectionReport,
} from "@/services/AuditReports/UserWiseCollectionService";
import { getAllUsers } from "@/services/UserManagementService";
import type {
  CollectionPaymentMode,
  UserWiseCollectionReportFilter,
  UserWiseCollectionReportResponse,
  UserWiseCollectionReportRow,
  UserWiseCollectionSortBy,
  UserWiseCollectionSummarySortBy,
  UserWiseCollectionUserRow,
} from "@/types/AuditReports/UserWiseCollectionData";
import type { CustomerType } from "@/types/BillingData";
import type { UserData } from "@/types/UserData";
import { usePharmacyStore } from "@/store/pharmacyStore";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

const PAYMENT_MODE_LABEL: Record<CollectionPaymentMode, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
};

const PAYMENT_MODE_OPTIONS: DropdownOption[] = Object.entries(PAYMENT_MODE_LABEL).map(([value, label]) => ({
  label,
  value,
}));

const PATIENT_TYPES: CustomerType[] = ["WALK_IN", "OP_PATIENT", "IP_PATIENT", "DAYCARE"];

const PATIENT_TYPE_OPTIONS: DropdownOption[] = PATIENT_TYPES.map((value) => ({
  label: CUSTOMER_TYPE_LABEL[value],
  value,
}));

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

// Local-time YYYY-MM-DD; toISOString() would shift to UTC and can land on the wrong day.
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const firstOfMonth = (d: Date) => toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));

const shiftIsoDate = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
};

const formatDisplayDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${MONTH_NAMES[Number(m) - 1]}-${y}`;
};

const formatDisplayMonth = (yearMonth: string) => {
  if (!yearMonth) return "";
  const [y, m] = yearMonth.split("-");
  return `${MONTH_NAMES[Number(m) - 1]}-${y}`;
};

// YYYY-MM → the first and last day of that month.
const monthBounds = (yearMonth: string) => {
  const [y, m] = yearMonth.split("-").map(Number);
  return { from: `${yearMonth}-01`, to: `${yearMonth}-${pad(new Date(y, m, 0).getDate())}` };
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
// It must overlay the field box with a real size: a 0x0 input gives the browser
// nothing to anchor to, and the calendar pops up at the window's top-left corner.
const hiddenPickerClass = "pointer-events-none absolute bottom-0 h-12 opacity-0";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const fieldLabelClass = "mb-xxsm px-xxsm text-label-l4 font-medium text-pneutral-900";
const fieldBoxClass =
  "flex min-h-12 max-h-13 w-full items-center gap-sm rounded-lg border border-pneutral-300 bg-white p-sm";

// The design's 6px rounded track (pneutral-200) and thumb (pneutral-500) below the table.
const scrollbarClass =
  "[scrollbar-color:var(--color-pneutral-500)_var(--color-pneutral-200)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-pneutral-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-pneutral-500";

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

// Indian grouping with paise: 145000 → "1,45,000.00".
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Whole percent, as the KPI cards show it: 33.33 → "33%".
const percent = (n: number | null | undefined) => `${Math.round(n ?? 0)}%`;

const patientTypeName = (type: string) => CUSTOMER_TYPE_LABEL[type as CustomerType] ?? type;

const paymentModeName = (mode: string) => PAYMENT_MODE_LABEL[mode as CollectionPaymentMode] ?? mode;

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

interface KpiCardProps {
  title: string;
  value: string;
  highlight: string;
  caption: string;
  icon: React.ReactNode;
  bgClass: string;
  highlightClass: string;
}

const KpiCard = ({ title, value, highlight, caption, icon, bgClass, highlightClass }: KpiCardProps) => (
  <div className={`flex min-h-38 flex-col justify-center gap-0.5 rounded-xl p-lg ${bgClass}`}>
    <div className="flex items-center gap-0.5">
      <p className="flex-1 text-label-l4 font-medium text-pneutral-900">{title}</p>
      <div className="flex size-13 shrink-0 items-center justify-center rounded-sm bg-white">{icon}</div>
    </div>
    <div className="flex flex-col justify-center gap-xxsm">
      <p className="text-h3 font-medium text-pneutral-900 whitespace-nowrap">{value}</p>
      <p className="flex flex-wrap items-center gap-x-xsm text-p2">
        <span className={`font-semibold ${highlightClass}`}>{highlight}</span>
        <span className="text-pneutral-500">{caption}</span>
      </p>
    </div>
  </div>
);

interface Column<Row, SortKey> {
  key: string;
  header: string;
  align: "left" | "right";
  // Pixel widths from the design; the table scrolls sideways once they no longer fit.
  width: string;
  sortKey?: SortKey;
  render: (row: Row) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

interface ReportTableProps<Row, SortKey extends string> {
  columns: Column<Row, SortKey>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  // Both tables are wider than a phone, so each scrolls past this width.
  minWidthClass: string;
  headerHeightClass: string;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  showRows: boolean;
  emptyMessage: string;
  isError: boolean;
}

// The bordered grid both tables of the design share: purple header, 60px rows
// with full cell borders, and a lavender total row.
const ReportTable = <Row, SortKey extends string>({
  columns,
  rows,
  rowKey,
  minWidthClass,
  headerHeightClass,
  sortBy,
  sortDir,
  onSort,
  showRows,
  emptyMessage,
  isError,
}: ReportTableProps<Row, SortKey>) => {
  const sortIcon = (key: SortKey) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  return (
    <div className={`w-full overflow-x-auto ${scrollbarClass}`}>
      <div className={`${minWidthClass} overflow-hidden rounded-lg border border-pneutral-200`}>
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-secondary-600">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  aria-sort={
                    col.sortKey && col.sortKey === sortBy ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={`${headerHeightClass} border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word ${col.width} ${
                    i < columns.length - 1 ? "border-r" : ""
                  }`}
                >
                  {col.sortKey ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.sortKey!)}
                      className={`flex w-full cursor-pointer items-center gap-xxsm ${
                        col.align === "right" ? "justify-end text-right" : "justify-between text-left"
                      }`}
                    >
                      <span>{col.header}</span>
                      {sortIcon(col.sortKey)}
                    </button>
                  ) : (
                    <div className={col.align === "right" ? "text-right" : "text-left"}>{col.header}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!showRows && (
              <tr className="bg-white">
                <td
                  colSpan={columns.length}
                  className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-center text-p3 ${
                    isError ? "text-warning-600" : "text-pneutral-500"
                  }`}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {showRows &&
              rows.map((row, index) => (
                <tr key={rowKey(row, index)} className="bg-white">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-p3 text-pneutral-900 wrap-break-word ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${i < columns.length - 1 ? "border-r" : ""} ${col.bodyClass ?? ""}`}
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
                    className={`h-15 border-pneutral-200 px-sm py-xsm text-p3 font-semibold text-primary-900 ${
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
  );
};

const transactionKey = (row: UserWiseCollectionReportRow, index: number) => `${row.paymentId}-${index}`;
const userKey = (row: UserWiseCollectionUserRow, index: number) => `${row.userId}-${index}`;

// Up to three page numbers, kept around the current page as in the design's "1 2 3".
const visiblePages = (pageIndex: number, pageCount: number) => {
  const start = Math.max(0, Math.min(pageIndex - 1, pageCount - 3));
  return Array.from({ length: Math.min(3, pageCount) }, (_, i) => start + i);
};

const UserWiseCollectionReportPage = () => {
  const [period, setPeriod] = useState<Period>("Today");
  const [todayDate, setTodayDate] = useState(() => toIsoDate(new Date()));
  const [specificDate, setSpecificDate] = useState("");
  const [month, setMonth] = useState("");
  const [fromDate, setFromDate] = useState(() => firstOfMonth(new Date()));
  const [toDate, setToDate] = useState(() => toIsoDate(new Date()));
  const specificDateRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);
  // Cleared by the date chip's X, so Search leaves the date out and the backend uses today.
  const [dateRangeApplied, setDateRangeApplied] = useState(true);

  const { pharmacies, loading: pharmaciesLoading } = usePharmacyStore();
  const [pharmacyIds, setPharmacyIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<DropdownOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [patientTypes, setPatientTypes] = useState<CustomerType[]>([]);

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<UserWiseCollectionSortBy>("collectionDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [summarySortBy, setSummarySortBy] = useState<UserWiseCollectionSummarySortBy>("totalCollection");
  const [summarySortDir, setSummarySortDir] = useState<"asc" | "desc">("desc");
  // The filters last sent with Search; null until then, so the first load uses today.
  const [appliedFilter, setAppliedFilter] = useState<UserWiseCollectionReportFilter | null>(null);
  const [report, setReport] = useState<UserWiseCollectionReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      setUsersLoading(true);
      const data: UserData[] | null = await getAllUsers();
      if (!active) return;
      setUserOptions(
        (data ?? [])
          .map((u) => ({ label: u.fullName, value: String(u.userId) }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      setUsersLoading(false);
    };
    fetchUsers();
    return () => {
      active = false;
    };
  }, []);

  // The collection-date window each tab reports on.
  const dateRange = (() => {
    if (period === "Today") return { from: todayDate, to: todayDate };
    if (period === "Specific Day") return { from: specificDate, to: specificDate };
    if (period === "By Month") return month ? monthBounds(month) : { from: "", to: "" };
    return { from: fromDate, to: toDate };
  })();

  const dateFieldLabel = period === "By Month" ? "Month" : period === "By Date Range" ? "Date Range" : "Date";

  const dateDisplay =
    period === "By Month"
      ? formatDisplayMonth(month)
      : period === "By Date Range"
        ? `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`
        : formatDisplayDate(dateRange.from);

  const handlePeriodChange = (next: Period) => {
    setPeriod(next);
    setDateRangeApplied(true);
    if (next === "Today") setTodayDate(toIsoDate(new Date()));
    // Called inside the click so the browser still counts it as a user gesture.
    if (next === "Specific Day") openPicker(specificDateRef.current);
    if (next === "By Month") openPicker(monthRef.current);
  };

  const handleFromDateChange = (value: string) => {
    if (!value) return;
    setFromDate(value);
    // Any From date can be picked; a To date it overtakes moves to the day after.
    if (value >= toDate) setToDate(shiftIsoDate(value, 1));
  };

  const handleToDateChange = (value: string) => {
    if (!value || value <= fromDate) return;
    setToDate(value);
  };

  const optionLabelFor = (options: DropdownOption[], ids: (string | number)[] = []) => {
    if (!ids.length) return "All";
    const picked = new Set(ids.map(String));
    return options
      .filter((o) => picked.has(String(o.value)))
      .map((o) => o.label)
      .join(", ");
  };

  const paymentModeLabelFor = (modes: string[] = []) =>
    modes.length ? modes.map(paymentModeName).join(", ") : "All";

  const patientTypeLabelFor = (types: string[] = []) =>
    types.length ? types.map(patientTypeName).join(", ") : "All";

  const buildFilter = (): UserWiseCollectionReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: pharmacyIds.length ? pharmacyIds : undefined,
    userIds: userIds.length ? userIds : undefined,
    paymentModes: paymentModes.length ? (paymentModes as CollectionPaymentMode[]) : undefined,
    customerTypes: patientTypes.length ? patientTypes : undefined,
  });

  const activeFilter: UserWiseCollectionReportFilter = appliedFilter ?? { fromDate: todayDate, toDate: todayDate };

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({
    ...activeFilter,
    sortBy,
    sortDir,
    summarySortBy,
    summarySortDir,
    page: pageIndex,
    size: pageSize,
  });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getUserWiseCollectionReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the user-wise collection report.");
      } finally {
        if (active) setReportLoading(false);
      }
    };
    fetchReport();
    return () => {
      active = false;
    };
  }, [requestKey]);

  // Both tables' sorts, as on screen.
  const sorts = { sortBy, sortDir, summarySortBy, summarySortDir };

  // Print / PDF and the CSV / Excel download, over every receipt matching the
  // report on screen (the last search, in the current sorts), not just this page.
  const { printId, printReport, print, download, busy } = useReportActions<UserWiseCollectionReportResponse>({
    report,
    hasMoreRows: (r) =>
      (r.collectionTransactions?.totalRecords ?? 0) > (r.collectionTransactions?.data.length ?? 0),
    fetchAll: () => getUserWiseCollectionReport({ ...activeFilter, ...sorts, unpaged: true }),
    exportReport: (format) => downloadUserWiseCollectionExport(format, { ...activeFilter, ...sorts }),
    // user-wise-collection_2026-10-08, user-wise-collection_2026-10-01_to_2026-10-08 —
    // matching the export's file names.
    fileStem: `user-wise-collection_${
      !activeFilter.fromDate
        ? toIsoDate(new Date())
        : !activeFilter.toDate || activeFilter.toDate === activeFilter.fromDate
          ? activeFilter.fromDate
          : `${activeFilter.fromDate}_to_${activeFilter.toDate}`
    }`,
  });

  // Every receipt is swapped in only while the print copy is taken; it all
  // sits on one page then, so row numbers start at 1.
  const shownReport = printReport ?? report;
  const shownPageIndex = printReport ? 0 : pageIndex;

  const rows = shownReport?.collectionTransactions?.data ?? [];
  const userRows = shownReport?.userWiseSummary ?? [];
  const summary = shownReport?.summary;
  const totalRecords = shownReport?.collectionTransactions?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.collectionTransactions?.totalPages ?? 1);
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  // The backend's own reading of the period (a missing date means today), already formatted.
  const reportingDateLabel = !report
    ? "---"
    : report.fromDate === report.toDate
      ? report.fromDate
      : `${report.fromDate} to ${report.toDate}`;

  const summaryColumns: Column<UserWiseCollectionUserRow, UserWiseCollectionSummarySortBy>[] = [
    {
      key: "userName",
      header: "USER NAME",
      align: "left",
      width: "w-[171px]",
      sortKey: "userName",
      render: (r) => r.userName,
      total: "Total",
      bodyClass: "font-semibold",
    },
    {
      key: "noOfCollections",
      header: "NO. OF COLLECTIONS",
      align: "right",
      width: "w-[206px]",
      render: (r) => r.noOfCollections,
      total: summary?.totalCollections ?? 0,
    },
    {
      key: "cash",
      header: "CASH (₹)",
      align: "right",
      width: "w-[173px]",
      render: (r) => money(r.cash),
      total: money(summary?.totalCashCollection),
    },
    {
      key: "upi",
      header: "UPI (₹)",
      align: "right",
      width: "w-[173px]",
      render: (r) => money(r.upi),
      total: money(summary?.totalUpiCollection),
    },
    {
      key: "card",
      header: "CARD (₹)",
      align: "right",
      width: "w-[165px]",
      render: (r) => money(r.card),
      total: money(summary?.totalCardCollection),
    },
    {
      key: "totalCollection",
      header: "TOTAL COLLECTION (₹)",
      align: "right",
      width: "w-[218px]",
      sortKey: "totalCollection",
      render: (r) => money(r.totalCollection),
      total: money(summary?.totalCollection),
      bodyClass: "font-semibold",
    },
  ];

  const transactionColumns: Column<UserWiseCollectionReportRow, UserWiseCollectionSortBy>[] = [
    {
      key: "collectionDate",
      header: "COLLECTION DATE",
      align: "left",
      width: "w-[258px]",
      sortKey: "collectionDate",
      render: (r) => r.collectionDate,
      total: "Displayed Transactions Total",
    },
    {
      key: "receiptNo",
      header: "RECEIPT NO.",
      align: "left",
      width: "w-[146px]",
      render: (r) => r.receiptNo || "---",
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    {
      key: "billNo",
      header: "BILL NO.",
      align: "left",
      width: "w-[138px]",
      render: (r) => r.billNo || "---",
      total: "",
    },
    {
      key: "userName",
      header: "USER NAME",
      align: "left",
      width: "w-[117px]",
      render: (r) => r.userName,
      total: "",
    },
    {
      key: "customerType",
      header: "PATIENT TYPE",
      align: "left",
      width: "w-[144px]",
      render: (r) => (r.customerType ? patientTypeName(r.customerType) : "---"),
      total: "",
    },
    {
      key: "paymentMode",
      header: "PAYMENT MODE",
      align: "left",
      width: "w-[140px]",
      render: (r) => (r.paymentMode ? paymentModeName(r.paymentMode) : "---"),
      total: "",
    },
    {
      key: "collectedAmount",
      header: "COLLECTED AMOUNT (₹)",
      align: "right",
      width: "w-[164px]",
      render: (r) => money(r.collectedAmount),
      total: money(shownReport?.collectionTransactions?.displayedTotal),
      bodyClass: "font-semibold",
    },
  ];

  const handleSort = (key: UserWiseCollectionSortBy) => {
    if (key === sortBy) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPageIndex(0);
  };

  // The summary isn't paged, so its order leaves the transactions page alone.
  const handleSummarySort = (key: UserWiseCollectionSummarySortBy) => {
    if (key === summarySortBy) setSummarySortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSummarySortBy(key);
      setSummarySortDir("asc");
    }
  };

  const handleSearch = () => {
    setAppliedFilter(buildFilter());
    setPageIndex(0);
  };

  const resetFilters = () => {
    const now = new Date();
    setPeriod("Today");
    setTodayDate(toIsoDate(now));
    setSpecificDate("");
    setMonth("");
    setFromDate(firstOfMonth(now));
    setToDate(toIsoDate(now));
    setDateRangeApplied(true);
    setPharmacyIds([]);
    setUserIds([]);
    setPaymentModes([]);
    setPatientTypes([]);
    setAppliedFilter(null);
    setSortBy("collectionDate");
    setSortDir("desc");
    setSummarySortBy("totalCollection");
    setSummarySortDir("desc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;
  const showUserRows = !reportLoading && !reportError && userRows.length > 0;

  const emptyCard = (
    <p
      className={`rounded-lg border border-pneutral-200 px-sm py-md text-center text-p3 ${
        reportError ? "text-warning-600" : "text-pneutral-500"
      }`}
    >
      {emptyMessage}
    </p>
  );

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="User-wise Collection Report"
        description="Payments collected and recorded by individual users through pharmacy billing and receipt transactions."
        icon="/Reports/Banknotes.svg"
        onPrint={print}
        onDownload={download}
        busy={busy}
      />

      {/* Filter toolbar */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md print:hidden ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md border-b border-pneutral-200 lg:flex-row lg:items-center">
          <div className="flex flex-1 overflow-x-auto" role="tablist">
            {PERIODS.map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handlePeriodChange(p)}
                  className={`flex shrink-0 cursor-pointer flex-col items-center whitespace-nowrap text-label-l3 font-semibold ${
                    active ? "gap-xsm pt-xsm pb-0.5 text-secondary-700" : "py-xsm text-pneutral-500"
                  }`}
                >
                  <span className="px-sm">{p}</span>
                  {active && <span className="h-1 w-full bg-secondary-700" />}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-sm pb-md lg:pb-0">
            <button
              type="button"
              aria-expanded={showMoreFilters}
              onClick={() => setShowMoreFilters((open) => !open)}
              className="inline-flex h-12 min-w-[108px] cursor-pointer items-center justify-center gap-xsm rounded-lg border-2 border-secondary-700 px-md text-label-l4 font-medium text-secondary-700 whitespace-nowrap"
            >
              <Funnel className="size-5" />
              More Filters (1)
              <ChevronsDown
                className={`size-5 transition-transform duration-200 ${showMoreFilters ? "rotate-180" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-12 min-w-[108px] cursor-pointer items-center justify-center rounded-lg border-2 border-secondary-700 px-md text-label-l4 font-medium text-secondary-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSearch}
              disabled={reportLoading}
              className="inline-flex h-12 min-w-[108px] cursor-pointer items-center justify-center rounded-lg bg-secondary-700 px-md text-label-l4 font-medium text-pneutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex min-w-0 flex-col">
            <span className={fieldLabelClass}>{dateFieldLabel}</span>
            {period === "By Date Range" ? (
              <div className={`${fieldBoxClass} gap-xsm!`}>
                <button
                  type="button"
                  aria-label="Pick from date"
                  onClick={() => openPicker(fromDateRef.current)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                >
                  <span className="truncate text-p3 text-pneutral-900" title={formatDisplayDate(fromDate)}>
                    {formatDisplayDate(fromDate)}
                  </span>
                  <Calendar className="size-4 shrink-0 text-pneutral-900" />
                </button>
                <span className="text-p3 text-pneutral-500">–</span>
                <button
                  type="button"
                  aria-label="Pick to date"
                  onClick={() => openPicker(toDateRef.current)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                >
                  <span className="truncate text-p3 text-pneutral-900" title={formatDisplayDate(toDate)}>
                    {formatDisplayDate(toDate)}
                  </span>
                  <Calendar className="size-4 shrink-0 text-pneutral-900" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={period === "Today"}
                onClick={() => openPicker(period === "By Month" ? monthRef.current : specificDateRef.current)}
                className={`${fieldBoxClass} cursor-pointer text-left disabled:cursor-default`}
              >
                <span className={`flex-1 truncate text-p4 ${dateDisplay ? "text-pneutral-900" : "text-pneutral-500"}`}>
                  {dateDisplay || (period === "By Month" ? "Select month" : "Select date")}
                </span>
                <Calendar className="size-5 shrink-0 text-pneutral-900" />
              </button>
            )}

            <input
              ref={specificDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className={`${hiddenPickerClass} left-0 w-full`}
            />
            <input
              ref={monthRef}
              type="month"
              tabIndex={-1}
              aria-hidden
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`${hiddenPickerClass} left-0 w-full`}
            />
            <input
              ref={fromDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className={`${hiddenPickerClass} left-0 w-1/2`}
            />
            <input
              ref={toDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={toDate}
              min={shiftIsoDate(fromDate, 1)}
              onChange={(e) => handleToDateChange(e.target.value)}
              className={`${hiddenPickerClass} right-0 w-1/2`}
            />
          </div>

          <Dropdown
            label="Pharmacy"
            labelClassName="px-xxsm"
            multiple
            selectAll
            options={pharmacyOptions}
            value={pharmacyIds}
            onChange={(ids: string[]) => setPharmacyIds(ids)}
            placeholder="All"
            isLoading={pharmaciesLoading}
          />

          <Dropdown
            label="User"
            labelClassName="px-xxsm"
            multiple
            options={userOptions}
            value={userIds}
            onChange={(values: string[]) => setUserIds(values)}
            placeholder="All"
            searchable
            isLoading={usersLoading}
          />

          <Dropdown
            label="Payment Mode"
            labelClassName="px-xxsm"
            multiple
            selectAll
            options={PAYMENT_MODE_OPTIONS}
            value={paymentModes}
            onChange={(values: string[]) => setPaymentModes(values)}
            placeholder="All"
          />

          {/* Same grid as the primary filters, so it lines up under Date. */}
          {showMoreFilters && (
            <Dropdown
              label="Customer/Patient Type"
              labelClassName="px-xxsm"
              multiple
              selectAll
              options={PATIENT_TYPE_OPTIONS}
              value={patientTypes}
              onChange={(values: string[]) => setPatientTypes(values as CustomerType[])}
              placeholder="All"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {dateRangeApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
          )}
          <FilterChip
            label={`Pharmacy: ${optionLabelFor(pharmacyOptions, pharmacyIds)}`}
            onRemove={() => setPharmacyIds([])}
          />
          <FilterChip label={`User: ${optionLabelFor(userOptions, userIds)}`} onRemove={() => setUserIds([])} />
          {/* Payment Mode and Patient Type show a chip only once set, as in the design. */}
          {paymentModes.length > 0 && (
            <FilterChip
              label={`Payment Mode: ${paymentModeLabelFor(paymentModes)}`}
              onRemove={() => setPaymentModes([])}
            />
          )}
          {patientTypes.length > 0 && (
            <FilterChip
              label={`Customer/Patient Type: ${patientTypeLabelFor(patientTypes)}`}
              onRemove={() => setPatientTypes([])}
            />
          )}
        </div>
      </div>

      {/* KPI row: totals over every matching collection, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Collection"
          value={`₹${money(summary?.totalCollection)}`}
          highlight={plural(summary?.totalCollections ?? 0, "collection")}
          caption="recorded"
          icon={<Banknote className="size-6 text-success-800" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Total Cash Collection"
          value={`₹${money(summary?.totalCashCollection)}`}
          highlight={percent(summary?.cashPercentage)}
          caption="of total collection"
          icon={<Box className="size-6 fill-primary-800 text-white" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Total UPI Collection"
          value={`₹${money(summary?.totalUpiCollection)}`}
          highlight={percent(summary?.upiPercentage)}
          caption="of total collection"
          icon={<RefreshCw className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Total Card Collection"
          value={`₹${money(summary?.totalCardCollection)}`}
          highlight={percent(summary?.cardPercentage)}
          caption="of total collection"
          icon={<Scale className="size-6 text-danger-700" strokeWidth={1.5} />}
          bgClass="bg-danger-50"
          highlightClass="text-danger-700"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <h2 className="text-label-l5 font-semibold text-pneutral-900">Collection Details</h2>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Reporting Date: {reportingDateLabel}</p>
            <p className="text-p3 text-pneutral-500">Pharmacy: {optionLabelFor(pharmacyOptions, activeFilter.pharmacyIds)}</p>
            <p className="text-p3 text-pneutral-500">User: {optionLabelFor(userOptions, activeFilter.userIds)}</p>
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* User-wise Collection Summary: every matching user, not paged. */}
        <div className="flex flex-col gap-md">
          <h3 className="text-label-l4 font-semibold text-pneutral-900">User-wise Collection Summary</h3>

          {/* Rows stack as cards below md. */}
          <div className="flex flex-col gap-sm md:hidden print:hidden">
            {!showUserRows && emptyCard}
            {showUserRows &&
              userRows.map((row, index) => (
                <div key={userKey(row, index)} className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm">
                  <div className="flex items-start justify-between gap-sm">
                    <p className="min-w-0 text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.userName}</p>
                    <p className="shrink-0 text-p3 font-semibold text-pneutral-900">₹{money(row.totalCollection)}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                    {summaryColumns
                      .filter((col) => !["userName", "totalCollection"].includes(col.key))
                      .map((col) => (
                        <div key={col.key} className="flex min-w-0 flex-col">
                          <dt className="text-p4 text-pneutral-500">{col.header}</dt>
                          <dd className="text-pneutral-900 wrap-anywhere">{col.render(row)}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            {showUserRows && (
              <div className="flex items-center justify-between gap-sm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
                <span>Total ({summary?.totalCollections ?? 0})</span>
                <span>₹{money(summary?.totalCollection)}</span>
              </div>
            )}
          </div>

          <div className="hidden md:block print:block!">
            <ReportTable
              columns={summaryColumns}
              rows={userRows}
              rowKey={userKey}
              minWidthClass="min-w-[1106px]"
              headerHeightClass="h-14"
              sortBy={summarySortBy}
              sortDir={summarySortDir}
              onSort={handleSummarySort}
              showRows={showUserRows}
              emptyMessage={emptyMessage}
              isError={!!reportError}
            />
          </div>
        </div>

        {/* Collection Transaction Details: one page at a time. */}
        <div className="flex flex-col gap-md">
          <h3 className="text-label-l4 font-semibold text-pneutral-900">Collection Transaction Details</h3>

          <div className="flex flex-col gap-sm md:hidden print:hidden">
            {!showRows && emptyCard}
            {showRows &&
              rows.map((row, index) => (
                <div
                  key={transactionKey(row, index)}
                  className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm"
                >
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex min-w-0 flex-col">
                      <p className="text-p3 font-semibold text-primary-800">{row.receiptNo || "---"}</p>
                      <p className="text-p3 text-pneutral-900 wrap-anywhere">{row.userName}</p>
                    </div>
                    <p className="shrink-0 text-p3 font-semibold text-pneutral-900">₹{money(row.collectedAmount)}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                    {transactionColumns
                      .filter((col) => !["receiptNo", "userName", "collectedAmount"].includes(col.key))
                      .map((col) => (
                        <div key={col.key} className="flex min-w-0 flex-col">
                          <dt className="text-p4 text-pneutral-500">{col.header}</dt>
                          <dd className="text-pneutral-900 wrap-anywhere">{col.render(row)}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            {showRows && (
              <div className="flex items-center justify-between gap-sm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
                <span>Displayed Transactions Total</span>
                <span>₹{money(shownReport?.collectionTransactions?.displayedTotal)}</span>
              </div>
            )}
          </div>

          <div className="hidden md:block print:block!">
            <ReportTable
              columns={transactionColumns}
              rows={rows}
              rowKey={transactionKey}
              minWidthClass="min-w-[1107px]"
              headerHeightClass="h-15"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              showRows={showRows}
              emptyMessage={emptyMessage}
              isError={!!reportError}
            />
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-center print:hidden">
          <p className="flex-1 text-p3 text-pneutral-500">
            Showing {firstRecord} to {lastRecord} of {totalRecords} records
          </p>
          <div className="flex flex-wrap items-center gap-xlg">
            <div className="flex items-center gap-sm">
              <span className="text-p3 text-pneutral-500 whitespace-nowrap">Records per page</span>
              <span className="relative flex min-h-9 w-[84px] items-center rounded-sm border border-pneutral-300 bg-white">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageIndex(0);
                  }}
                  className="w-full cursor-pointer appearance-none bg-transparent py-xsm pr-hg pl-sm text-p2 text-pneutral-500 outline-none"
                >
                  {[5, 10, 15, 20, 25].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-sm size-4 text-pneutral-500" />
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <button
                type="button"
                aria-label="Previous page"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                className="flex size-[45px] cursor-pointer items-center justify-center rounded-lg border border-pneutral-200 bg-secondary-300 text-pneutral-900 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="size-6" />
              </button>
              {visiblePages(pageIndex, pageCount).map((p) =>
                p === pageIndex ? (
                  <span
                    key={p}
                    aria-current="page"
                    className="flex size-[45px] items-center justify-center rounded-lg border border-secondary-700 bg-secondary-500 text-label-l5 font-semibold text-primary-900"
                  >
                    {p + 1}
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPageIndex(p)}
                    className="flex size-[45px] cursor-pointer items-center justify-center rounded-lg border border-pneutral-200 bg-white text-label-l5 font-medium text-pneutral-900"
                  >
                    {p + 1}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="Next page"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                className="flex size-[45px] cursor-pointer items-center justify-center rounded-lg border border-pneutral-200 bg-secondary-300 text-pneutral-900 disabled:cursor-not-allowed"
              >
                <ArrowRight className="size-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserWiseCollectionReportPage;
