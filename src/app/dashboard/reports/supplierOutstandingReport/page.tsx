"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  Calendar,
  ChevronDown,
  ChevronsDown,
  CircleCheck,
  Clock,
  FileChartColumn,
  Funnel,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { useAccess } from "@/app/components/providers/AccessProvider";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import {
  downloadSupplierOutstandingExport,
  getSupplierOutstandingReport,
} from "@/services/AuditReports/SupplierOutstandingService";
import { getSuppliersForLocation } from "@/services/SupplierService";
import type {
  SupplierCreditFilter,
  SupplierOutstandingReportFilter,
  SupplierOutstandingReportResponse,
  SupplierOutstandingReportRow,
  SupplierOutstandingReportSortBy,
  SupplierOutstandingStatus,
  SupplierOutstandingStatusFilter,
} from "@/types/AuditReports/SupplierOutstandingData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

type StatusChoice = Exclude<SupplierOutstandingStatusFilter, "ALL">;

const STATUS_LABEL: Record<StatusChoice, string> = {
  OUTSTANDING_ONLY: "Outstanding Only",
  UNPAID: "Unpaid",
  PARTIALLY_SETTLED: "Partially Settled",
  FULLY_SETTLED: "Fully Settled",
};

const STATUS_OPTIONS: DropdownOption[] = Object.entries(STATUS_LABEL).map(([value, label]) => ({ label, value }));

const SUPPLIER_CREDIT_LABEL: Record<Exclude<SupplierCreditFilter, "ALL">, string> = {
  CREDIT: "With Credit",
  WITHOUT_CREDIT: "Without Credit",
};

const SUPPLIER_CREDIT_OPTIONS: DropdownOption[] = Object.entries(SUPPLIER_CREDIT_LABEL).map(([value, label]) => ({
  label,
  value,
}));

// Outstanding Only (Unpaid + Partially Settled) is what is still payable, so the report opens on it.
const DEFAULT_STATUS: StatusChoice = "OUTSTANDING_ONLY";

// Keyed by the label the backend puts on each row.
const STATUS_BADGE_CLASS: Record<SupplierOutstandingStatus, string> = {
  Unpaid: "border-warning-600 bg-warning-50 text-warning-600",
  "Partially Settled": "border-danger-600 bg-danger-50 text-danger-600",
  "Fully Settled": "border-success-800 bg-success-50 text-success-800",
};

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
const textInputClass = `${fieldBoxClass} text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:border-secondary-700`;

// "" or a non-number reads as no bound.
const toAmount = (value: string) => {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) ? n : undefined;
};

// The design's 6px rounded track (pneutral-200) and thumb (pneutral-500) below the table.
const scrollbarClass =
  "[scrollbar-color:var(--color-pneutral-500)_var(--color-pneutral-200)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-pneutral-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-pneutral-500";

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

// Indian grouping with paise: 145000 → "1,45,000.00".
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const StatusBadge = ({ status }: { status: SupplierOutstandingStatus }) => (
  <span
    className={`inline-flex items-center justify-center gap-xxsm rounded-lg border px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap ${
      STATUS_BADGE_CLASS[status] ?? "border-pneutral-300 bg-pneutral-50 text-pneutral-700"
    }`}
  >
    {status}
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

interface Column {
  key: string;
  header: string;
  align: "left" | "right";
  // Pixel widths from the design; the table scrolls sideways once they no longer fit.
  width: string;
  sortKey?: SupplierOutstandingReportSortBy;
  render: (row: SupplierOutstandingReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string | ((row: SupplierOutstandingReportRow) => string);
}

const rowKey = (row: SupplierOutstandingReportRow, index: number) => `${row.purchaseId}-${index}`;

const SupplierOutstandingReportPage = () => {
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

  // A multi-pharmacy organization with centralized inventory purchases into its
  // warehouses, everyone else per pharmacy. The backend reports on that kind only
  // and rejects ids of the other, so the location filter follows it.
  const { organization } = useAccess();
  const usesWarehouses = organization.centralizedInventory === true;
  const { pharmacies, loading: pharmaciesLoading } = usePharmacyStore();
  const { warehouses, loading: warehousesLoading } = useWarehouseStore();
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<DropdownOption[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  // Payment Due Date range as YYYY-MM-DD; either end may be left open.
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const dueFromRef = useRef<HTMLInputElement>(null);
  const dueToRef = useRef<HTMLInputElement>(null);
  // Current Outstanding range in ₹, kept as typed; either end may be left open.
  const [minOutstanding, setMinOutstanding] = useState("");
  const [maxOutstanding, setMaxOutstanding] = useState("");
  const [supplierCredit, setSupplierCredit] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SupplierOutstandingReportSortBy>("currentOutstanding");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // The filters last sent with Search; null until then, so the first load uses today.
  const [appliedFilter, setAppliedFilter] = useState<SupplierOutstandingReportFilter | null>(null);
  const [report, setReport] = useState<SupplierOutstandingReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const locationLabel = usesWarehouses ? "Warehouse" : "Pharmacy";

  const locationOptions: DropdownOption[] = useMemo(
    () =>
      usesWarehouses
        ? warehouses.map((w) => ({ label: warehouseLabel(w), value: w.warehouseId }))
        : pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [usesWarehouses, warehouses, pharmacies],
  );

  // Only picks of the reported kind count; the other kind would be rejected,
  // e.g. pharmacies picked before the organization's flag landed.
  const pickedLocationIds = locationIds.filter((id) => locationOptions.some((o) => o.value === id));

  // Suppliers belong to one pharmacy or warehouse, and /supplier/allSupplier only
  // lists the navbar location's. The report spans every location of the reported
  // kind, so the Supplier filter gathers them from each one. Joined into a string
  // so the effect re-runs on a real change of locations only.
  const supplierLocationsKey = (
    usesWarehouses
      ? warehouses.map((w) => `W:${w.warehouseId}:${warehouseLabel(w)}`)
      : pharmacies.map((p) => `P:${p.pharmacyId}:${p.pharmacyName}`)
  ).join("|");

  useEffect(() => {
    let active = true;
    const fetchSuppliers = async () => {
      const locations = supplierLocationsKey
        ? supplierLocationsKey.split("|").map((entry) => {
            const [kind, id, ...name] = entry.split(":");
            return { kind, id, name: name.join(":") };
          })
        : [];
      setSuppliersLoading(true);
      try {
        // One failing location (e.g. no access) shouldn't empty the whole list.
        const results = await Promise.allSettled(
          locations.map((l) =>
            getSuppliersForLocation(l.kind === "W" ? { warehouseId: l.id } : { pharmacyId: l.id }),
          ),
        );
        if (!active) return;
        const byId = new Map<string, { name: string; location: string }>();
        results.forEach((result, i) => {
          if (result.status === "rejected") {
            console.error(`Unable to fetch suppliers for ${locations[i].name}`, result.reason);
            return;
          }
          (result.value ?? []).forEach((s) => {
            if (s.supplierId == null || byId.has(String(s.supplierId))) return;
            byId.set(String(s.supplierId), { name: s.supplierName, location: locations[i].name });
          });
        });
        // Same-named suppliers of different locations are different suppliers;
        // the location tells them apart.
        const nameCounts = new Map<string, number>();
        byId.forEach(({ name }) => nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1));
        setSupplierOptions(
          [...byId]
            .map(([id, { name, location }]) => ({
              label: (nameCounts.get(name) ?? 0) > 1 ? `${name} (${location})` : name,
              value: id,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      } finally {
        if (active) setSuppliersLoading(false);
      }
    };
    fetchSuppliers();
    return () => {
      active = false;
    };
  }, [supplierLocationsKey]);

  // The invoice-date window each tab reports on.
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

  const supplierLabelFor = (ids: (string | number)[] = []) => {
    if (!ids.length) return "All";
    const picked = new Set(ids.map(String));
    return supplierOptions
      .filter((o) => picked.has(String(o.value)))
      .map((o) => o.label)
      .join(", ");
  };

  // "All" when nothing narrows the locations (the backend then uses every location
  // of the reported kind the user can access).
  const locationLabelFor = (ids: string[] = []) => {
    if (!ids.length) return "All";
    return locationOptions
      .filter((o) => ids.includes(String(o.value)))
      .map((o) => o.label)
      .join(", ");
  };

  const statusLabel = (value?: string) => STATUS_LABEL[value as StatusChoice] ?? "All";

  const buildFilter = (): SupplierOutstandingReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: !usesWarehouses && pickedLocationIds.length ? pickedLocationIds : undefined,
    warehouseIds: usesWarehouses && pickedLocationIds.length ? pickedLocationIds : undefined,
    supplierIds: supplierIds.length ? supplierIds.map(Number) : undefined,
    outstandingStatus: (status || "ALL") as SupplierOutstandingStatusFilter,
    invoiceNumber: invoiceNumber.trim() || undefined,
    grnNumber: grnNumber.trim() || undefined,
    dueFromDate: dueFrom || undefined,
    dueToDate: dueTo || undefined,
    minOutstanding: toAmount(minOutstanding),
    maxOutstanding: toAmount(maxOutstanding),
    supplierCredit: (supplierCredit || undefined) as SupplierCreditFilter | undefined,
  });

  const activeFilter: SupplierOutstandingReportFilter = appliedFilter ?? {
    fromDate: todayDate,
    toDate: todayDate,
    outstandingStatus: DEFAULT_STATUS,
  };

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...activeFilter, sortBy, sortDir, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getSupplierOutstandingReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the supplier outstanding report.");
      } finally {
        if (active) setReportLoading(false);
      }
    };
    fetchReport();
    return () => {
      active = false;
    };
  }, [requestKey]);

  // Print / PDF and the CSV / Excel download, over every row matching the
  // report on screen (the last search, in the current sort), not just this page.
  const { printId, printReport, print, download, busy } = useReportActions<SupplierOutstandingReportResponse>({
    report,
    hasMoreRows: (r) => (r.outstandingInvoices?.totalRecords ?? 0) > (r.outstandingInvoices?.data.length ?? 0),
    fetchAll: () => getSupplierOutstandingReport({ ...activeFilter, sortBy, sortDir, unpaged: true }),
    exportReport: (format) => downloadSupplierOutstandingExport(format, { ...activeFilter, sortBy, sortDir }),
    // supplier-outstanding_2026-10-08, supplier-outstanding_2026-10-01_to_2026-10-08 —
    // matching the export's file names.
    fileStem: `supplier-outstanding_${
      !activeFilter.fromDate
        ? toIsoDate(new Date())
        : !activeFilter.toDate || activeFilter.toDate === activeFilter.fromDate
          ? activeFilter.fromDate
          : `${activeFilter.fromDate}_to_${activeFilter.toDate}`
    }`,
  });

  // Every row is swapped in only while the print copy is taken; it all sits
  // on one page then, so row numbers start at 1.
  const shownReport = printReport ?? report;
  const shownPageIndex = printReport ? 0 : pageIndex;

  const rows = shownReport?.outstandingInvoices?.data ?? [];
  const summary = shownReport?.summary;
  const totalRecords = shownReport?.outstandingInvoices?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.outstandingInvoices?.totalPages ?? 1);
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  // The backend's own reading of the period (a missing date means today), already formatted.
  const reportPeriodLabel = report ? `${report.fromDate} to ${report.toDate}` : "---";

  const columns: Column[] = [
    {
      key: "supplier",
      header: "SUPPLIER NAME",
      align: "left",
      width: "w-[116px]",
      sortKey: "supplierName",
      render: (r) => r.supplierName,
      total: "Total",
      bodyClass: "font-semibold",
    },
    {
      key: "invoice",
      header: "PURCHASE INVOICE NO.",
      align: "left",
      width: "w-[103px]",
      render: (r) => r.invoiceNumber || "---",
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    {
      key: "grn",
      header: "GRN NO.",
      align: "left",
      width: "w-[94px]",
      render: (r) => r.grnNumber || "---",
      total: "",
    },
    {
      key: "invoiceDate",
      header: "INVOICE DATE",
      align: "left",
      width: "w-[107px]",
      sortKey: "invoiceDate",
      render: (r) => r.invoiceDate,
      total: "",
    },
    {
      key: "dueDate",
      header: "DUE DATE",
      align: "left",
      width: "w-[107px]",
      sortKey: "dueDate",
      render: (r) => r.dueDate || "---",
      total: "",
      bodyClass: (r) => (r.overdueDays ? "text-warning-600!" : ""),
    },
    {
      key: "amount",
      header: "INVOICE AMOUNT (₹)",
      align: "right",
      width: "w-[103px]",
      render: (r) => money(r.invoiceAmount),
      total: money(summary?.totalCreditInvoiceAmount),
    },
    {
      key: "paid",
      header: "TOTAL PAID (₹)",
      align: "right",
      width: "w-[91px]",
      render: (r) => money(r.totalPaid),
      total: money(summary?.totalPaid),
    },
    {
      key: "returned",
      header: "PURCHASE RETURN ADJUSTED (₹)",
      align: "right",
      width: "w-[103px]",
      render: (r) => money(r.purchaseReturnAdjusted),
      total: money(summary?.totalPurchaseReturnAdjusted),
    },
    {
      key: "outstanding",
      header: "CURRENT OUTSTANDING (₹)",
      align: "right",
      width: "w-[147px]",
      sortKey: "currentOutstanding",
      render: (r) => money(r.currentOutstanding),
      total: money(summary?.totalSupplierPayable),
      bodyClass: "font-semibold",
    },
    {
      key: "overdue",
      header: "OVERDUE DAYS",
      align: "right",
      width: "w-[94px]",
      render: (r) => r.overdueDays ?? "—",
      total: "",
      bodyClass: (r) => `font-semibold ${r.overdueDays ? "text-warning-600!" : ""}`,
    },
    {
      key: "status",
      header: "OUTSTANDING STATUS",
      align: "left",
      width: "w-[161px]",
      render: (r) => <StatusBadge status={r.outstandingStatus} />,
      total: "",
    },
  ];

  const cellClass = (col: Column, row: SupplierOutstandingReportRow) =>
    typeof col.bodyClass === "function" ? col.bodyClass(row) : (col.bodyClass ?? "");

  const sortIcon = (key: SupplierOutstandingReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: SupplierOutstandingReportSortBy) => {
    if (key === sortBy) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPageIndex(0);
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
    setLocationIds([]);
    setSupplierIds([]);
    setStatus(DEFAULT_STATUS);
    setInvoiceNumber("");
    setGrnNumber("");
    setDueFrom("");
    setDueTo("");
    setMinOutstanding("");
    setMaxOutstanding("");
    setSupplierCredit("");
    setAppliedFilter(null);
    setSortBy("currentOutstanding");
    setSortDir("desc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Supplier Outstanding Report"
        description="Supplier-wise and Purchase Invoice-wise outstanding amounts payable after confirmed Supplier Payments and Purchase Returns."
        icon="/Reports/ScalePurple.svg"
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
              More Filters (6)
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
            label={locationLabel}
            labelClassName="px-xxsm"
            multiple
            selectAll
            options={locationOptions}
            value={pickedLocationIds}
            onChange={(ids: string[]) => setLocationIds(ids)}
            placeholder="All"
            isLoading={usesWarehouses ? warehousesLoading : pharmaciesLoading}
          />

          <Dropdown
            label="Supplier"
            labelClassName="px-xxsm"
            multiple
            options={supplierOptions}
            value={supplierIds}
            onChange={(values: string[]) => setSupplierIds(values)}
            placeholder="Search"
            searchable
            isLoading={suppliersLoading}
          />

          <Dropdown
            label="Outstanding Status"
            labelClassName="px-xxsm"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value: string) => setStatus(value)}
            placeholder="All"
            clearable
          />

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Purchase Invoice No.</span>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. PI-1001"
                  className={textInputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>GRN No.</span>
                <input
                  type="text"
                  value={grnNumber}
                  onChange={(e) => setGrnNumber(e.target.value)}
                  placeholder="e.g. GRN-1001"
                  className={textInputClass}
                />
              </label>

              <div className="relative flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Payment Due Date</span>
                <div className={`${fieldBoxClass} gap-xsm!`}>
                  <button
                    type="button"
                    aria-label="Pick due from date"
                    onClick={() => openPicker(dueFromRef.current)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                  >
                    <span className={`truncate text-p3 ${dueFrom ? "text-pneutral-900" : "text-pneutral-500"}`}>
                      {formatDisplayDate(dueFrom) || "From"}
                    </span>
                    <Calendar className="size-4 shrink-0 text-pneutral-900" />
                  </button>
                  <span className="text-p3 text-pneutral-500">–</span>
                  <button
                    type="button"
                    aria-label="Pick due to date"
                    onClick={() => openPicker(dueToRef.current)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                  >
                    <span className={`truncate text-p3 ${dueTo ? "text-pneutral-900" : "text-pneutral-500"}`}>
                      {formatDisplayDate(dueTo) || "To"}
                    </span>
                    <Calendar className="size-4 shrink-0 text-pneutral-900" />
                  </button>
                  {(dueFrom || dueTo) && (
                    <button
                      type="button"
                      aria-label="Clear payment due date range"
                      onClick={() => {
                        setDueFrom("");
                        setDueTo("");
                      }}
                      className="cursor-pointer text-pneutral-500"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={dueFromRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden
                  value={dueFrom}
                  max={dueTo || undefined}
                  onChange={(e) => setDueFrom(e.target.value)}
                  className={`${hiddenPickerClass} left-0 w-1/2`}
                />
                <input
                  ref={dueToRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden
                  value={dueTo}
                  min={dueFrom || undefined}
                  onChange={(e) => setDueTo(e.target.value)}
                  className={`${hiddenPickerClass} right-0 w-1/2`}
                />
              </div>

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Min Outstanding (₹)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={minOutstanding}
                  onChange={(e) => setMinOutstanding(e.target.value)}
                  placeholder="0.00"
                  className={textInputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Max Outstanding (₹)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={toAmount(minOutstanding) ?? 0}
                  value={maxOutstanding}
                  onChange={(e) => setMaxOutstanding(e.target.value)}
                  placeholder="Any"
                  className={textInputClass}
                />
              </label>

              <Dropdown
                label="Supplier Credit"
                labelClassName="px-xxsm"
                options={SUPPLIER_CREDIT_OPTIONS}
                value={supplierCredit}
                onChange={(value: string) => setSupplierCredit(value)}
                placeholder="All"
                clearable
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {dateRangeApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
          )}
          <FilterChip
            label={`${locationLabel}: ${locationLabelFor(pickedLocationIds)}`}
            onRemove={() => setLocationIds([])}
          />
          <FilterChip label={`Supplier: ${supplierLabelFor(supplierIds)}`} onRemove={() => setSupplierIds([])} />
          <FilterChip label={`Outstanding Status: ${statusLabel(status)}`} onRemove={() => setStatus("")} />
          {/* More Filters show a chip only once set. */}
          {invoiceNumber.trim() && (
            <FilterChip label={`Purchase Invoice No.: ${invoiceNumber.trim()}`} onRemove={() => setInvoiceNumber("")} />
          )}
          {grnNumber.trim() && (
            <FilterChip label={`GRN No.: ${grnNumber.trim()}`} onRemove={() => setGrnNumber("")} />
          )}
          {(dueFrom || dueTo) && (
            <FilterChip
              label={`Payment Due Date: ${formatDisplayDate(dueFrom) || "…"} – ${formatDisplayDate(dueTo) || "…"}`}
              onRemove={() => {
                setDueFrom("");
                setDueTo("");
              }}
            />
          )}
          {(toAmount(minOutstanding) !== undefined || toAmount(maxOutstanding) !== undefined) && (
            <FilterChip
              label={`Outstanding: ₹${money(toAmount(minOutstanding))} – ${
                toAmount(maxOutstanding) !== undefined ? `₹${money(toAmount(maxOutstanding))}` : "Any"
              }`}
              onRemove={() => {
                setMinOutstanding("");
                setMaxOutstanding("");
              }}
            />
          )}
          {supplierCredit && (
            <FilterChip
              label={`Supplier Credit: ${SUPPLIER_CREDIT_LABEL[supplierCredit as Exclude<SupplierCreditFilter, "ALL">]}`}
              onRemove={() => setSupplierCredit("")}
            />
          )}
        </div>
      </div>

      {/* KPI row: totals over every matching invoice, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Credit Invoice Amount"
          value={`₹${money(summary?.totalCreditInvoiceAmount)}`}
          highlight={plural(summary?.outstandingInvoiceCount ?? 0, "invoice")}
          caption="with outstanding balance"
          icon={<FileChartColumn className="size-6 text-primary-800" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Total Supplier Payable"
          value={`₹${money(summary?.totalSupplierPayable)}`}
          highlight={`${Math.round(summary?.payableSharePercentage ?? 0)}%`}
          caption="of invoice amount"
          icon={<Banknote className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Overdue Payable"
          value={`₹${money(summary?.overduePayable)}`}
          highlight={plural(summary?.overdueInvoiceCount ?? 0, "invoice")}
          caption="past due date"
          icon={<Clock className="size-6 text-warning-600" strokeWidth={1.5} />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
        <KpiCard
          title="Supplier Credit"
          value={`₹${money(summary?.supplierCredit)}`}
          highlight="Amount due"
          caption="from suppliers"
          icon={<CircleCheck className="size-6 fill-success-800 text-white" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Outstanding Invoices</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, "record")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Reporting Period: {reportPeriodLabel}</p>
            <p className="text-p3 text-pneutral-500">Outstanding As of: {report?.outstandingAsOf ?? "---"}</p>
            <p className="text-p3 text-pneutral-500">
              {locationLabel}:{" "}
              {locationLabelFor(usesWarehouses ? activeFilter.warehouseIds : activeFilter.pharmacyIds)}
            </p>
            <p className="text-p3 text-pneutral-500">
              Authorized Supplier: {supplierLabelFor(activeFilter.supplierIds)}
            </p>
            <p className="text-p3 text-pneutral-500">
              Outstanding Status: {statusLabel(activeFilter.outstandingStatus)}
            </p>
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Eleven columns are cramped on phones, so rows stack as cards below md.
            Paper always gets the table. */}
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
            rows.map((row, index) => (
              <div key={rowKey(row, index)} className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm">
                <div className="flex items-start justify-between gap-sm">
                  <div className="flex min-w-0 flex-col">
                    <p className="text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.supplierName}</p>
                    <p className="text-p3 font-semibold text-primary-800">{row.invoiceNumber || "---"}</p>
                  </div>
                  <StatusBadge status={row.outstandingStatus} />
                </div>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns
                    .filter((col) => !["supplier", "invoice", "status"].includes(col.key))
                    .map((col) => (
                      <div key={col.key} className="flex min-w-0 flex-col">
                        <dt className="text-p4 text-pneutral-500">{col.header}</dt>
                        <dd className={`text-pneutral-900 wrap-anywhere ${cellClass(col, row)}`}>{col.render(row)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          {showRows && (
            <div className="grid grid-cols-2 gap-x-md gap-y-xsm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
              <p className="col-span-2">Total</p>
              {columns
                .filter((col) => col.total !== "" && col.key !== "supplier")
                .map((col) => (
                  <div key={col.key} className="flex min-w-0 flex-col">
                    <span className="text-p4 font-medium">{col.header}</span>
                    <span>{col.total}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* The design's columns are wider than the card, so the table scrolls sideways
            with the styled track sitting 16px below it. */}
        <div className={`hidden w-full overflow-x-auto pb-md md:block print:block! print:pb-0 ${scrollbarClass}`}>
          <div className="min-w-[1228px] overflow-hidden rounded-lg border border-pneutral-200">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-secondary-600">
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      aria-sort={
                        col.sortKey && col.sortKey === sortBy
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      className={`h-25 border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word ${col.width} ${
                        i < columns.length - 1 ? "border-r" : ""
                      }`}
                    >
                      {col.sortKey ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.sortKey!)}
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
                        reportError ? "text-warning-600" : "text-pneutral-500"
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
                          } ${i < columns.length - 1 ? "border-r" : ""} ${cellClass(col, row)}`}
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
              <span className="flex size-[45px] items-center justify-center rounded-lg border border-secondary-700 bg-secondary-500 text-label-l5 font-semibold text-primary-900">
                {pageIndex + 1}
              </span>
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

export default SupplierOutstandingReportPage;
