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
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronsDown,
  CircleCheck,
  Funnel,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import { downloadGrossProfitExport, getGrossProfitReport } from "@/services/AuditReports/GrossProfitService";
import { ProductService } from "@/services/ProductService";
import type {
  GrossProfitReportFilter,
  GrossProfitReportResponse,
  GrossProfitReportRow,
  GrossProfitReportSortBy,
} from "@/types/AuditReports/GrossProfitData";
import type { CustomerType } from "@/types/BillingData";
import { usePharmacyStore } from "@/store/pharmacyStore";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

const PATIENT_TYPES: CustomerType[] = ["WALK_IN", "OP_PATIENT", "IP_PATIENT", "DAYCARE"];

const PATIENT_TYPE_OPTIONS: DropdownOption[] = PATIENT_TYPES.map((value) => ({
  label: CUSTOMER_TYPE_LABEL[value],
  value,
}));

// The slice of a /product/batches/pharmacy/{id} row (BatchStockDto) the Product Name
// and Batch No. filters need.
interface ReportProduct {
  productId: string;
  productName: string;
}

interface PharmacyBatchRow extends ReportProduct {
  batchNumber: string;
}

const MONTH_NAMES =["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

// The design's 6px rounded track (pneutral-200) and thumb (pneutral-500) below the table.
const scrollbarClass =
  "[scrollbar-color:var(--color-pneutral-500)_var(--color-pneutral-200)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-pneutral-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-pneutral-500";

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

// Indian grouping with paise: 145000 → "1,45,000.00".
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Indian grouping, whole units: 1100 → "1,100".
const qty = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");

const percent = (n: number | null | undefined) => `${(n ?? 0).toFixed(2)}%`;

// A loss reads in the warning colour, a profit in the design's green.
const profitClass = (n: number | null | undefined) => ((n ?? 0) < 0 ? "text-warning-600!" : "text-success-800!");

const customerTypeName = (type: string) => CUSTOMER_TYPE_LABEL[type as CustomerType] ?? type;

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
  sortKey?: GrossProfitReportSortBy;
  render: (row: GrossProfitReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: (row: GrossProfitReportRow) => string;
  totalClass?: string;
}

const rowKey = (row: GrossProfitReportRow, index: number) => `${row.productId}-${row.batchNumber}-${index}`;

const GrossProfitReportPage = () => {
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
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<ReportProduct[]>([]);
  // Batch numbers held at the selected pharmacies, by productId.
  const [batchesByProduct, setBatchesByProduct] = useState<Map<string, string[]>>(new Map());
  const [productsLoading, setProductsLoading] = useState(true);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [billNo, setBillNo] = useState("");
  const [salesReturnNo, setSalesReturnNo] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<GrossProfitReportSortBy>("grossProfit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // The filters last sent with Search; the first load reports today.
  const [appliedFilter, setAppliedFilter] = useState<GrossProfitReportFilter>(() => ({
    fromDate: toIsoDate(new Date()),
    toDate: toIsoDate(new Date()),
  }));
  const [report, setReport] = useState<GrossProfitReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  // No pick means every pharmacy, so the product list spans all of them. Joined into
  // a string so the effect re-runs on a real change of selection, not on every
  // render's fresh array.
  const productPharmacyIdsKey = (pharmacyIds.length ? pharmacyIds : pharmacies.map((p) => p.pharmacyId)).join(",");

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      const ids = productPharmacyIdsKey ? productPharmacyIdsKey.split(",") : [];
      setProductsLoading(true);
      try {
        const responses = await Promise.all(ids.map((id) => ProductService.getBatchesForPharmacy(id)));
        if (!active) return;
        // Batches repeat a product once per batch (and per pharmacy); keep one row per product.
        const byId = new Map<string, ReportProduct>();
        const batchSets = new Map<string, Set<string>>();
        responses.forEach((res) =>
          (res?.data ?? []).forEach((b: PharmacyBatchRow) => {
            if (!b.productId) return;
            if (!byId.has(b.productId)) byId.set(b.productId, { productId: b.productId, productName: b.productName });
            if (b.batchNumber) {
              if (!batchSets.has(b.productId)) batchSets.set(b.productId, new Set());
              batchSets.get(b.productId)!.add(b.batchNumber);
            }
          }),
        );
        setProducts([...byId.values()].sort((a, b) => a.productName.localeCompare(b.productName)));
        setBatchesByProduct(
          new Map([...batchSets].map(([id, set]) => [id, [...set].sort((a, b) => a.localeCompare(b))])),
        );
      } catch (error) {
        console.error("Unable to fetch products for the selected pharmacies", error);
        if (active) {
          setProducts([]);
          setBatchesByProduct(new Map());
        }
      } finally {
        if (active) setProductsLoading(false);
      }
    };
    fetchProducts();
    return () => {
      active = false;
    };
  }, [productPharmacyIdsKey]);

  const productOptions: DropdownOption[] = useMemo(
    () => products.map((p) => ({ label: p.productName, value: p.productId })),
    [products],
  );

  // The picked product's batches; with no product picked, every batch at the selected pharmacies.
  const batchOptions: DropdownOption[] = useMemo(() => {
    const numbers = productId
      ? (batchesByProduct.get(productId) ?? [])
      : [...new Set([...batchesByProduct.values()].flat())].sort((a, b) => a.localeCompare(b));
    return numbers.map((n) => ({ label: n, value: n }));
  }, [productId, batchesByProduct]);

  const handleProductChange = (value: string) => {
    setProductId(value);
    // A batch of the previous product would match nothing.
    setBatchNumber("");
  };

  const productLabel = products.find((p) => p.productId === productId)?.productName ?? "";

  // The bill-date window each tab reports on.
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

  // "All" when nothing narrows the pharmacies (the backend then uses every one the user can access).
  const pharmacyLabelFor = (ids: string[] = []) => {
    if (!ids.length) return "All";
    return pharmacyOptions
      .filter((o) => ids.includes(String(o.value)))
      .map((o) => o.label)
      .join(", ");
  };

  const customerTypeLabelFor = (types: string[] = []) =>
    types.length ? types.map(customerTypeName).join(", ") : "All";

  const buildFilter = (): GrossProfitReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: pharmacyIds.length ? pharmacyIds : undefined,
    productIds: productId ? [productId] : undefined,
    customerTypes: customerTypes.length ? customerTypes : undefined,
    batchNumber: batchNumber || undefined,
    billNo: billNo.trim() || undefined,
    salesReturnNo: salesReturnNo.trim() || undefined,
  });

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...appliedFilter, sortBy, sortDir, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getGrossProfitReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the gross profit report.");
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
  const { printId, printReport, print, download, busy } = useReportActions<GrossProfitReportResponse>({
    report,
    hasMoreRows: (r) =>
      (r.productProfitability?.totalRecords ?? 0) > (r.productProfitability?.data.length ?? 0),
    fetchAll: () => getGrossProfitReport({ ...appliedFilter, sortBy, sortDir, unpaged: true }),
    exportReport: (format) => downloadGrossProfitExport(format, { ...appliedFilter, sortBy, sortDir }),
    // gross-profit_2026-10-08, gross-profit_2026-10-01_to_2026-10-08 —
    // matching the export's file names.
    fileStem: `gross-profit_${
      !appliedFilter.fromDate
        ? toIsoDate(new Date())
        : !appliedFilter.toDate || appliedFilter.toDate === appliedFilter.fromDate
          ? appliedFilter.fromDate
          : `${appliedFilter.fromDate}_to_${appliedFilter.toDate}`
    }`,
  });

  // Every row is swapped in only while the print copy is taken; it all sits
  // on one page then, so row numbers start at 1.
  const shownReport = printReport ?? report;
  const shownPageIndex = printReport ? 0 : pageIndex;

  const rows = shownReport?.productProfitability?.data ?? [];
  const summary = shownReport?.summary;
  const totalRecords = shownReport?.productProfitability?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.productProfitability?.totalPages ?? 1);
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  // The backend's own reading of the period (a missing date means today), already formatted.
  const reportPeriodLabel = report ? `${report.fromDate} to ${report.toDate}` : "---";

  const productCount = summary?.totalProducts ?? 0;
  const profitableCount = summary?.profitableProducts ?? 0;
  const profitCaption =
    productCount && profitableCount === productCount ? "all profitable" : `${profitableCount} profitable`;

  const columns: Column[] = [
    {
      key: "productName",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[153px]",
      sortKey: "productName",
      render: (r) => r.productName,
      total: "Total",
      bodyClass: () => "font-semibold",
    },
    {
      key: "batchNumber",
      header: "BATCH NO.",
      align: "left",
      width: "w-[118px]",
      render: (r) => r.batchNumber || "---",
      total: "",
    },
    {
      key: "soldQuantity",
      header: "SOLD QTY",
      align: "right",
      width: "w-[101px]",
      render: (r) => qty(r.soldQuantity),
      total: qty(summary?.totalSoldQuantity),
    },
    {
      key: "returnQuantity",
      header: "RETURN QTY",
      align: "right",
      width: "w-[121px]",
      render: (r) => qty(r.returnQuantity),
      total: qty(summary?.totalReturnQuantity),
    },
    {
      key: "netQuantity",
      header: "NET QTY",
      align: "right",
      width: "w-[99px]",
      render: (r) => qty(r.netQuantity),
      total: qty(summary?.totalNetQuantity),
    },
    {
      key: "netSalesAmount",
      header: "NET SALES AMOUNT (₹)",
      align: "right",
      width: "w-[127px]",
      render: (r) => money(r.netSalesAmount),
      total: money(summary?.netSalesAmount),
    },
    {
      key: "netCost",
      header: "NET COST (₹)",
      align: "right",
      width: "w-[127px]",
      render: (r) => money(r.netCost),
      total: money(summary?.netCostOfGoodsSold),
    },
    {
      key: "grossProfit",
      header: "GROSS PROFIT (₹)",
      align: "right",
      width: "w-[134px]",
      sortKey: "grossProfit",
      render: (r) => money(r.grossProfit),
      total: money(summary?.grossProfit),
      bodyClass: (r) => `font-semibold ${profitClass(r.grossProfit)}`,
      totalClass: profitClass(summary?.grossProfit),
    },
    {
      key: "marginPercentage",
      header: "MARGIN %",
      align: "right",
      width: "w-[128px]",
      render: (r) => percent(r.marginPercentage),
      total: percent(summary?.grossMargin),
      bodyClass: (r) => `font-semibold ${profitClass(r.marginPercentage)}`,
      totalClass: profitClass(summary?.grossMargin),
    },
  ];

  const sortIcon = (key: GrossProfitReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: GrossProfitReportSortBy) => {
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
    setPharmacyIds([]);
    setProductId("");
    setCustomerTypes([]);
    setBatchNumber("");
    setBillNo("");
    setSalesReturnNo("");
    setAppliedFilter({ fromDate: toIsoDate(now), toDate: toIsoDate(now) });
    setSortBy("grossProfit");
    setSortDir("desc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";

  // Report Summary table: same figures as the KPI cards; Gross Profit is the shaded row.
  const reportSummaryRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Net Sales Amount", value: `₹${money(summary?.netSalesAmount)}` },
    { label: "Net Cost of Goods Sold", value: `₹${money(summary?.netCostOfGoodsSold)}` },
    { label: "Gross Profit", value: `₹${money(summary?.grossProfit)}`, highlight: true },
    { label: "Gross Margin", value: percent(summary?.grossMargin) },
  ];
  const showRows = !reportLoading && !reportError && rows.length > 0;

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Gross Profit / Margin Analysis Report"
        description="Gross profit from pharmacy sales, comparing Net Sales Revenue with the purchase cost of the products sold."
        icon="/Reports/ChartBar.svg"
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
              More Filters (3)
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
                  className="min-w-0 cursor-pointer truncate text-left text-p4 text-pneutral-900"
                  title={formatDisplayDate(fromDate)}
                >
                  {formatDisplayDate(fromDate)}
                </button>
                <span className="text-p4 text-pneutral-900">–</span>
                <button
                  type="button"
                  aria-label="Pick to date"
                  onClick={() => openPicker(toDateRef.current)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                >
                  <span className="truncate text-p4 text-pneutral-900" title={formatDisplayDate(toDate)}>
                    {formatDisplayDate(toDate)}
                  </span>
                  <Calendar className="size-5 shrink-0 text-pneutral-900" />
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
            label="Product Name"
            labelClassName="px-xxsm"
            options={productOptions}
            value={productId}
            onChange={handleProductChange}
            placeholder="Search"
            searchable
            clearable
            isLoading={productsLoading}
          />

          <Dropdown
            label="Customer/Patient Type"
            labelClassName="px-xxsm"
            multiple
            selectAll
            options={PATIENT_TYPE_OPTIONS}
            value={customerTypes}
            onChange={(values: string[]) => setCustomerTypes(values as CustomerType[])}
            placeholder="All"
          />

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              <Dropdown
                label="Batch No."
                labelClassName="px-xxsm"
                options={batchOptions}
                value={batchNumber}
                onChange={(value: string) => setBatchNumber(value)}
                placeholder="Search"
                searchable
                clearable
                isLoading={productsLoading}
              />

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Bill No.</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. BILL-2026-00001"
                  className={textInputClass}
                />
              </label>

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Sales Return No.</span>
                <input
                  type="text"
                  value={salesReturnNo}
                  onChange={(e) => setSalesReturnNo(e.target.value)}
                  placeholder="e.g. SLR-2026-00001"
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
          <FilterChip label={`Pharmacy: ${pharmacyLabelFor(pharmacyIds)}`} onRemove={() => setPharmacyIds([])} />
          {/* The rest show a chip only once set. */}
          {productId && (
            <FilterChip label={`Product Name: ${productLabel || productId}`} onRemove={() => handleProductChange("")} />
          )}
          {customerTypes.length > 0 && (
            <FilterChip
              label={`Customer/Patient Type: ${customerTypeLabelFor(customerTypes)}`}
              onRemove={() => setCustomerTypes([])}
            />
          )}
          {batchNumber && <FilterChip label={`Batch No.: ${batchNumber}`} onRemove={() => setBatchNumber("")} />}
          {billNo.trim() && <FilterChip label={`Bill No.: ${billNo.trim()}`} onRemove={() => setBillNo("")} />}
          {salesReturnNo.trim() && (
            <FilterChip label={`Sales Return No.: ${salesReturnNo.trim()}`} onRemove={() => setSalesReturnNo("")} />
          )}
        </div>
      </div>

      {/* KPI row: totals over every matching product, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Net Sales Amount"
          value={`₹${money(summary?.netSalesAmount)}`}
          highlight={`${qty(summary?.totalNetQuantity)} ${summary?.totalNetQuantity === 1 ? "unit" : "units"}`}
          caption="net sold"
          icon={<Banknote className="size-6 text-primary-800" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Net Cost of Goods Sold"
          value={`₹${money(summary?.netCostOfGoodsSold)}`}
          highlight={`${Math.round(summary?.costPercentage ?? 0)}%`}
          caption="of net sales"
          icon={<Box className="size-6 fill-info-500 text-white" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Gross Profit"
          value={`₹${money(summary?.grossProfit)}`}
          highlight={plural(productCount, "product")}
          caption={profitCaption}
          icon={<CircleCheck className="size-6 fill-success-800 text-white" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Gross Margin"
          value={percent(summary?.grossMargin)}
          highlight="Consolidated"
          caption="profit ÷ net sales"
          icon={<ChartNoAxesColumnIncreasing className="size-6 text-danger-700" strokeWidth={1.5} />}
          bgClass="bg-danger-50"
          highlightClass="text-danger-700"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Product Profitability</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, "record")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Reporting Period: {reportPeriodLabel}</p>
            <p className="text-p3 text-pneutral-500">Pharmacy: {pharmacyLabelFor(appliedFilter.pharmacyIds)}</p>
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Nine columns are cramped on phones, so rows stack as cards below md.
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
                    <p className="text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.productName}</p>
                    <p className="text-p3 text-pneutral-500">{row.batchNumber || "---"}</p>
                  </div>
                  <p className={`shrink-0 text-p3 font-semibold ${profitClass(row.grossProfit)}`}>
                    ₹{money(row.grossProfit)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns
                    .filter((col) => !["productName", "batchNumber", "grossProfit"].includes(col.key))
                    .map((col) => (
                      <div key={col.key} className="flex min-w-0 flex-col">
                        <dt className="text-p4 text-pneutral-500">{col.header}</dt>
                        <dd className={`text-pneutral-900 wrap-anywhere ${col.bodyClass?.(row) ?? ""}`}>
                          {col.render(row)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          {showRows && (
            <div className="flex flex-col gap-xxsm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
              <div className="flex items-center justify-between gap-sm">
                <span>Total Net Sales</span>
                <span>₹{money(summary?.netSalesAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-sm">
                <span>Total Gross Profit</span>
                <span className={profitClass(summary?.grossProfit)}>
                  ₹{money(summary?.grossProfit)} ({percent(summary?.grossMargin)})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* The columns fit the card at full width and scroll sideways once they no
            longer do, with the styled track sitting 16px below. */}
        <div className={`hidden w-full overflow-x-auto pb-md md:block print:block! print:pb-0 ${scrollbarClass}`}>
          <div className="min-w-[1108px] overflow-hidden rounded-lg border border-pneutral-200">
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
                      className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word ${col.width} ${
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
                          } ${i < columns.length - 1 ? "border-r" : ""} ${col.bodyClass?.(row) ?? ""}`}
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
                        } ${i < columns.length - 1 ? "border-r" : ""} ${col.totalClass ?? ""}`}
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

        {/* Report Summary: the KPI totals, over every product matching the filters. */}
        <div className="flex w-full max-w-180.5 min-w-0 flex-col gap-md">
          <h3 className="text-label-l4 font-semibold text-pneutral-900">Report Summary</h3>
          <div className="w-full overflow-hidden rounded-lg border border-pneutral-200">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-secondary-600 text-label-l3 font-semibold text-pneutral-50">
                  <th className="h-14 border-r border-b border-pneutral-200 px-sm py-xsm text-left">PARTICULARS</th>
                  <th className="h-14 w-[36%] border-b border-pneutral-200 px-sm py-xsm text-right">VALUE</th>
                </tr>
              </thead>
              <tbody className="text-p3">
                {reportLoading || reportError || !shownReport ? (
                  <tr className="bg-white">
                    <td
                      colSpan={2}
                      className={`h-13 px-sm py-xsm text-center ${reportError ? "text-warning-600" : "text-pneutral-500"}`}
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  reportSummaryRows.map((row, i) => {
                    const last = i === reportSummaryRows.length - 1;
                    return (
                      <tr
                        key={row.label}
                        className={
                          row.highlight ? "bg-primary-100 font-semibold text-primary-900" : "bg-white text-pneutral-900"
                        }
                      >
                        <td className={`h-13 border-r border-pneutral-200 px-sm py-xsm wrap-break-word ${last ? "" : "border-b"}`}>
                          {row.label}
                        </td>
                        <td className={`h-13 border-pneutral-200 px-sm py-xsm text-right ${last ? "" : "border-b"}`}>
                          {row.value}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrossProfitReportPage;
