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
  FileChartColumn,
  Funnel,
  Scale,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { useAccess } from "@/app/components/providers/AccessProvider";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import {
  downloadSupplierPaymentExport,
  getSupplierPaymentReport,
} from "@/services/AuditReports/SupplierPaymentService";
import { getSuppliersForLocation } from "@/services/SupplierService";
import type {
  SupplierPaymentMode,
  SupplierPaymentReportFilter,
  SupplierPaymentReportResponse,
  SupplierPaymentReportRow,
  SupplierPaymentReportSortBy,
} from "@/types/AuditReports/SupplierPaymentData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

const PAYMENT_MODE_LABEL: Record<SupplierPaymentMode, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

const PAYMENT_MODE_OPTIONS: DropdownOption[] = Object.entries(PAYMENT_MODE_LABEL).map(([value, label]) => ({
  label,
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

// Paise only when there are any: 15000 → "15,000", 15000.5 → "15,000.5".
const shortMoney = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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

interface Column {
  key: string;
  header: string;
  align: "left" | "right";
  // Pixel widths from the design; the table scrolls sideways once they no longer fit.
  width: string;
  sortKey?: SupplierPaymentReportSortBy;
  render: (row: SupplierPaymentReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const rowKey = (row: SupplierPaymentReportRow, index: number) => `${row.supplierPaymentId}-${index}`;

const SupplierPaymentReportPage = () => {
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
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  // Payment Amount range in ₹, kept as typed; either end may be left open.
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SupplierPaymentReportSortBy>("paymentDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // The filters last sent with Search; null until then, so the first load uses today.
  const [appliedFilter, setAppliedFilter] = useState<SupplierPaymentReportFilter | null>(null);
  const [report, setReport] = useState<SupplierPaymentReportResponse | null>(null);
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

  // The payment-date window each tab reports on.
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

  const paymentModeLabelFor = (modes: string[] = []) =>
    modes.length ? modes.map((m) => PAYMENT_MODE_LABEL[m as SupplierPaymentMode] ?? m).join(", ") : "All";

  const buildFilter = (): SupplierPaymentReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: !usesWarehouses && pickedLocationIds.length ? pickedLocationIds : undefined,
    warehouseIds: usesWarehouses && pickedLocationIds.length ? pickedLocationIds : undefined,
    supplierIds: supplierIds.length ? supplierIds.map(Number) : undefined,
    paymentModes: paymentModes.length ? (paymentModes as SupplierPaymentMode[]) : undefined,
    paymentNumber: paymentNumber.trim() || undefined,
    invoiceNumber: invoiceNumber.trim() || undefined,
    grnNumber: grnNumber.trim() || undefined,
    referenceNumber: referenceNumber.trim() || undefined,
    minPaymentAmount: toAmount(minAmount),
    maxPaymentAmount: toAmount(maxAmount),
  });

  const activeFilter: SupplierPaymentReportFilter = appliedFilter ?? { fromDate: todayDate, toDate: todayDate };

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...activeFilter, sortBy, sortDir, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getSupplierPaymentReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the supplier payment report.");
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
  const { printId, printReport, print, download, busy } = useReportActions<SupplierPaymentReportResponse>({
    report,
    hasMoreRows: (r) => (r.paymentTransactions?.totalRecords ?? 0) > (r.paymentTransactions?.data.length ?? 0),
    fetchAll: () => getSupplierPaymentReport({ ...activeFilter, sortBy, sortDir, unpaged: true }),
    exportReport: (format) => downloadSupplierPaymentExport(format, { ...activeFilter, sortBy, sortDir }),
    // supplier-payment_2026-10-08, supplier-payment_2026-10-01_to_2026-10-08 —
    // matching the export's file names.
    fileStem: `supplier-payment_${
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

  const rows = shownReport?.paymentTransactions?.data ?? [];
  const summary = shownReport?.summary;
  const modeSummary = shownReport?.paymentModeSummary ?? [];
  const totalRecords = shownReport?.paymentTransactions?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.paymentTransactions?.totalPages ?? 1);
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  // The backend's own reading of the period (a missing date means today), already formatted.
  const reportPeriodLabel = report ? `${report.fromDate} to ${report.toDate}` : "---";

  const columns: Column[] = [
    {
      key: "paymentDate",
      header: "PAYMENT DATE",
      align: "left",
      width: "w-[113px]",
      sortKey: "paymentDate",
      render: (r) => r.paymentDate,
      total: "Total",
    },
    {
      key: "paymentNumber",
      header: "SUPPLIER PAYMENT NO.",
      align: "left",
      width: "w-[125px]",
      render: (r) => r.paymentNumber || "---",
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    {
      key: "supplier",
      header: "SUPPLIER NAME",
      align: "left",
      width: "w-[116px]",
      sortKey: "supplierName",
      render: (r) => r.supplierName,
      total: "",
    },
    {
      key: "invoice",
      header: "PURCHASE INVOICE NO.",
      align: "left",
      width: "w-[103px]",
      render: (r) => r.invoiceNumber || "---",
      total: "",
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
      key: "invoiceAmount",
      header: "INVOICE AMOUNT (₹)",
      align: "right",
      width: "w-[91px]",
      render: (r) => money(r.invoiceAmount),
      total: "",
    },
    {
      key: "paymentAmount",
      header: "PAYMENT AMOUNT (₹)",
      align: "right",
      width: "w-[93px]",
      render: (r) => money(r.paymentAmount),
      total: money(summary?.totalPaymentAmount),
      bodyClass: "font-semibold",
    },
    {
      key: "paymentMode",
      header: "PAYMENT MODE",
      align: "left",
      width: "w-[93px]",
      render: (r) => r.paymentMode || "---",
      total: "",
    },
    {
      key: "reference",
      header: "REFERENCE / TRANSACTION NO.",
      align: "left",
      width: "w-[127px]",
      render: (r) => r.transactionNumber || "---",
      total: "",
    },
    {
      key: "outstandingBefore",
      header: "OUTSTANDING BEFORE (₹)",
      align: "right",
      width: "w-[127px]",
      render: (r) => money(r.outstandingBefore),
      total: "",
    },
    {
      key: "outstandingAfter",
      header: "OUTSTANDING AFTER (₹)",
      align: "right",
      width: "w-[127px]",
      render: (r) => money(r.outstandingAfter),
      total: "",
    },
  ];

  const sortIcon = (key: SupplierPaymentReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: SupplierPaymentReportSortBy) => {
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
    setPaymentModes([]);
    setPaymentNumber("");
    setInvoiceNumber("");
    setGrnNumber("");
    setReferenceNumber("");
    setMinAmount("");
    setMaxAmount("");
    setAppliedFilter(null);
    setSortBy("paymentDate");
    setSortDir("desc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;

  const topInvoice = summary?.topInvoiceNumber;

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Supplier Payment Report"
        description="Transaction-wise, supplier-wise and Purchase Invoice-wise payments made to suppliers against Credit Purchase Invoices."
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
              More Filters (5)
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
            label="Supplier Name"
            labelClassName="px-xxsm"
            multiple
            options={supplierOptions}
            value={supplierIds}
            onChange={(values: string[]) => setSupplierIds(values)}
            placeholder="All"
            searchable
            isLoading={suppliersLoading}
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

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Supplier Payment No.</span>
                <input
                  type="text"
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value)}
                  placeholder="e.g. SP-2026-00001"
                  className={textInputClass}
                />
              </label>

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

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Reference / Transaction No.</span>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR10001"
                  className={textInputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Min Payment Amount (₹)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0.00"
                  className={textInputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Max Payment Amount (₹)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={toAmount(minAmount) ?? 0}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="Any"
                  className={textInputClass}
                />
              </label>
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
          <FilterChip
            label={`Payment Mode: ${paymentModeLabelFor(paymentModes)}`}
            onRemove={() => setPaymentModes([])}
          />
          {/* More Filters show a chip only once set. */}
          {paymentNumber.trim() && (
            <FilterChip label={`Supplier Payment No.: ${paymentNumber.trim()}`} onRemove={() => setPaymentNumber("")} />
          )}
          {invoiceNumber.trim() && (
            <FilterChip label={`Purchase Invoice No.: ${invoiceNumber.trim()}`} onRemove={() => setInvoiceNumber("")} />
          )}
          {grnNumber.trim() && (
            <FilterChip label={`GRN No.: ${grnNumber.trim()}`} onRemove={() => setGrnNumber("")} />
          )}
          {referenceNumber.trim() && (
            <FilterChip
              label={`Reference No.: ${referenceNumber.trim()}`}
              onRemove={() => setReferenceNumber("")}
            />
          )}
          {(toAmount(minAmount) !== undefined || toAmount(maxAmount) !== undefined) && (
            <FilterChip
              label={`Payment Amount: ₹${money(toAmount(minAmount))} – ${
                toAmount(maxAmount) !== undefined ? `₹${money(toAmount(maxAmount))}` : "Any"
              }`}
              onRemove={() => {
                setMinAmount("");
                setMaxAmount("");
              }}
            />
          )}
        </div>
      </div>

      {/* KPI row: totals over every matching payment, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Payment Amount"
          value={`₹${money(summary?.totalPaymentAmount)}`}
          highlight={plural(summary?.paymentCount ?? 0, "payment")}
          caption="in this period"
          icon={<Banknote className="size-6 text-success-800" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Payment Transactions"
          value={String(summary?.paymentCount ?? 0)}
          highlight={`₹${shortMoney(summary?.averagePaymentAmount)}`}
          caption="average payment"
          icon={<FileChartColumn className="size-6 text-primary-800" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Suppliers Paid"
          value={String(summary?.suppliersPaidCount ?? 0)}
          highlight={summary?.suppliersPaid?.length ? summary.suppliersPaid.join(", ") : "No suppliers"}
          caption="received payments"
          icon={<CircleCheck className="size-6 fill-info-500 text-white" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Invoices Paid Against"
          value={String(summary?.invoicesPaidAgainstCount ?? 0)}
          highlight={topInvoice || "---"}
          caption={
            topInvoice ? `paid in ${plural(summary?.topInvoiceInstalments ?? 0, "instalment")}` : "no payments"
          }
          icon={<Scale className="size-6 text-danger-700" strokeWidth={1.5} />}
          bgClass="bg-danger-50"
          highlightClass="text-danger-700"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Payment Transactions</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, "record")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Reporting Period: {reportPeriodLabel}</p>
            <p className="text-p3 text-pneutral-500">
              {locationLabel}:{" "}
              {locationLabelFor(usesWarehouses ? activeFilter.warehouseIds : activeFilter.pharmacyIds)}
            </p>
            <p className="text-p3 text-pneutral-500">Supplier: {supplierLabelFor(activeFilter.supplierIds)}</p>
            <p className="text-p3 text-pneutral-500">
              Payment Mode: {paymentModeLabelFor(activeFilter.paymentModes)}
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
                    <p className="text-p3 font-semibold text-primary-800">{row.paymentNumber || "---"}</p>
                    <p className="text-p3 text-pneutral-900 wrap-anywhere">{row.supplierName}</p>
                  </div>
                  <p className="shrink-0 text-p3 font-semibold text-pneutral-900">₹{money(row.paymentAmount)}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns
                    .filter((col) => !["paymentNumber", "supplier", "paymentAmount"].includes(col.key))
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
              <span>Total</span>
              <span>₹{money(summary?.totalPaymentAmount)}</span>
            </div>
          )}
        </div>

        {/* The design's columns are wider than the card, so the table scrolls sideways
            with the styled track sitting 16px below it. */}
        <div className={`hidden w-full overflow-x-auto pb-md md:block print:block! print:pb-0 ${scrollbarClass}`}>
          <div className="min-w-[1209px] overflow-hidden rounded-lg border border-pneutral-200">
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
                      className={`h-20 border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word ${col.width} ${
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

        {/* Payment Mode-wise Summary: every mode, over the whole period, not just this page. */}
        <div className="flex flex-col gap-sm">
          <h3 className="text-label-l4 font-semibold text-pneutral-900">Payment Mode-wise Summary</h3>
          <div className={`w-full overflow-x-auto ${scrollbarClass}`}>
            <div className="w-full min-w-[320px] overflow-hidden rounded-lg border border-pneutral-200 sm:w-[481px]">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="bg-secondary-600 text-label-l3 font-semibold text-pneutral-50">
                    <th className="h-12 w-[42%] border-r border-b border-pneutral-200 px-sm py-xsm text-left">
                      PAYMENT MODE
                    </th>
                    <th className="h-12 w-[27%] border-r border-b border-pneutral-200 px-sm py-xsm text-left wrap-break-word">
                      TRANSACTIONS
                    </th>
                    <th className="h-12 border-b border-pneutral-200 px-sm py-xsm text-left">TOTAL AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {modeSummary.length === 0 && (
                    <tr className="bg-white">
                      <td
                        colSpan={3}
                        className={`h-12 border-b border-pneutral-200 px-sm py-xsm text-center text-p3 ${
                          reportError ? "text-warning-600" : "text-pneutral-500"
                        }`}
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  )}
                  {modeSummary.map((m) => (
                    <tr key={m.paymentMode} className="bg-white text-p3 text-pneutral-900">
                      <td className="h-12 border-r border-b border-pneutral-200 px-sm py-xsm">{m.paymentMode}</td>
                      <td className="h-12 border-r border-b border-pneutral-200 px-sm py-xsm">{m.transactionCount}</td>
                      <td className="h-12 border-b border-pneutral-200 px-sm py-xsm">₹{money(m.totalAmount)}</td>
                    </tr>
                  ))}
                  {modeSummary.length > 0 && (
                    <tr className="bg-primary-100 text-p3 font-semibold text-primary-900">
                      <td className="h-12 border-r border-pneutral-200 px-sm py-xsm">Total</td>
                      <td className="h-12 border-r border-pneutral-200 px-sm py-xsm">
                        {report?.paymentModeTotalCount ?? 0}
                      </td>
                      <td className="h-12 px-sm py-xsm">₹{money(report?.paymentModeTotalAmount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierPaymentReportPage;
