"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Calendar,
  ChevronDown,
  ChevronsDown,
  CircleCheck,
  Download,
  Funnel,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { getStockMovementReport } from "@/services/AuditReports/StockMovementService";
import { ProductService } from "@/services/ProductService";
import type {
  StockMovementReportFilter,
  StockMovementReportResponse,
  StockMovementReportRow,
  StockMovementType,
} from "@/types/AuditReports/StockMovementData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

// Same codes and labels as MOVEMENT_TYPES in StockMovementReportServiceImpl.
const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt",
  ALLOCATION_IN: "Allocation In",
  ALLOCATION_OUT: "Allocation Out",
  STOCK_TRANSFER_IN: "Stock Transfer In",
  STOCK_TRANSFER_OUT: "Stock Transfer Out",
  PHARMACY_SALE: "Pharmacy Sale",
  SALES_RETURN: "Sales Return",
  PURCHASE_RETURN: "Purchase Return",
  DAMAGE_CAPTURE: "Damage Capture",
  DAMAGE_RETURN: "Damage Return",
  EXPIRED_STOCK_RETURN: "Expired Stock Return",
  STOCK_ADJUSTMENT: "Stock Adjustment",
};

const MOVEMENT_TYPE_OPTIONS: DropdownOption[] = (Object.keys(MOVEMENT_TYPE_LABEL) as StockMovementType[]).map(
  (value) => ({ label: MOVEMENT_TYPE_LABEL[value], value }),
);

// The slice of a /product/batches/pharmacy/{id} row (BatchStockDto) the Product Name
// and Batch No. filters need.
interface ReportProduct {
  productId: string;
  productName: string;
}

interface PharmacyBatchRow extends ReportProduct {
  batchNumber: string;
}

const DEFAULT_FROM_DATE = "2026-10-01";
const DEFAULT_TO_DATE = "2026-10-08";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

// Local-time YYYY-MM-DD; toISOString() would shift to UTC and can land on the wrong day.
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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

const openPicker = (input: HTMLInputElement | null) => {
  if (!input) return;
  try {
    input.showPicker();
  } catch {
    input.focus();
  }
};

// Kept mounted but invisible so showPicker() can anchor the native calendar to the field.
const hiddenPickerClass = "pointer-events-none absolute bottom-0 h-0 w-0 opacity-0";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const formatSigned = (n: number) => (n > 0 ? `+${n}` : String(n));

const fieldLabelClass = "px-xxsm text-label-l4 font-medium text-pneutral-900";
const fieldBoxClass =
  "flex min-h-12 max-h-13 w-full items-center gap-sm rounded-lg border border-pneutral-300 bg-white p-sm";

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center justify-center gap-xsm rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
    {label}
    <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="cursor-pointer">
      <X className="size-4" />
    </button>
  </span>
);

interface KpiCardProps {
  title: string;
  value: string;
  highlight?: string;
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
      <p className="flex items-center gap-xsm text-p2 whitespace-nowrap">
        {highlight && <span className={`font-semibold ${highlightClass}`}>{highlight}</span>}
        <span className="text-pneutral-500">{caption}</span>
      </p>
    </div>
  </div>
);

interface Column {
  key: string;
  header: string;
  align: "left" | "right";
  width: string;
  render: (row: StockMovementReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const StockMovementReportPage = () => {
  const [period, setPeriod] = useState<Period>("By Date Range");
  const [todayDate, setTodayDate] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [month, setMonth] = useState("");
  const [fromDate, setFromDate] = useState(DEFAULT_FROM_DATE);
  const [toDate, setToDate] = useState(DEFAULT_TO_DATE);
  const specificDateRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);
  const { pharmacies, selectedPharmacy, loading: pharmaciesLoading } = usePharmacyStore();
  // null = untouched, so the report starts on the pharmacy picked in the navbar
  // once the store has loaded; [] = the user cleared every pharmacy.
  const [pharmacyIds, setPharmacyIds] = useState<string[] | null>(null);
  const { warehouses, loading: warehousesLoading } = useWarehouseStore();
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<ReportProduct[]>([]);
  // Batch numbers held at the selected pharmacies, by productId.
  const [batchesByProduct, setBatchesByProduct] = useState<Map<string, string[]>>(new Map());
  const [productsLoading, setProductsLoading] = useState(true);
  const [movementType, setMovementType] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [batchNo, setBatchNo] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [sourceLocationIds, setSourceLocationIds] = useState<string[]>([]);
  const [destinationLocationIds, setDestinationLocationIds] = useState<string[]>([]);

  const [dateRangeApplied, setDateRangeApplied] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  // Sorted on the backend by transaction date; asc = oldest first, as the running balance reads.
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // The filters last sent with Search; null until then, so the first load uses
  // the default period and the navbar's pharmacy.
  const [appliedFilter, setAppliedFilter] = useState<StockMovementReportFilter | null>(null);
  const [report, setReport] = useState<StockMovementReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  const warehouseOptions: DropdownOption[] = useMemo(
    () => warehouses.map((w) => ({ label: warehouseLabel(w), value: w.warehouseId })),
    [warehouses],
  );

  // Source / Destination can be either kind of location.
  const locationOptions: DropdownOption[] = useMemo(
    () => [...pharmacyOptions, ...warehouseOptions],
    [pharmacyOptions, warehouseOptions],
  );

  const selectedPharmacyIds = pharmacyIds ?? (selectedPharmacy ? [selectedPharmacy.pharmacyId] : []);

  // Joined into a string so the effect re-runs on a real change of selection,
  // not on every render's fresh array.
  const pharmacyIdsKey = selectedPharmacyIds.join(",");

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      const ids = pharmacyIdsKey ? pharmacyIdsKey.split(",") : [];
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
            if (!byId.has(b.productId)) {
              byId.set(b.productId, { productId: b.productId, productName: b.productName });
            }
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
  }, [pharmacyIdsKey]);

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
    setBatchNo("");
  };

  const productOptions: DropdownOption[] = useMemo(
    () => products.map((p) => ({ label: p.productName, value: p.productId })),
    [products],
  );

  const allPharmaciesSelected =
    pharmacies.length > 1 && pharmacies.every((p) => selectedPharmacyIds.includes(p.pharmacyId));

  const pharmacyLabel = allPharmaciesSelected
    ? "All"
    : pharmacies
        .filter((p) => selectedPharmacyIds.includes(p.pharmacyId))
        .map((p) => p.pharmacyName)
        .join(", ");

  const selectedRange = useMemo(() => {
    switch (period) {
      case "Today":
        return { from: todayDate, to: todayDate };
      case "Specific Day":
        return { from: specificDate, to: specificDate };
      case "By Month": {
        if (!month) return { from: "", to: "" };
        const [y, m] = month.split("-").map(Number);
        return { from: `${month}-01`, to: toIsoDate(new Date(y, m, 0)) };
      }
      default:
        return { from: fromDate, to: toDate };
    }
  }, [period, todayDate, specificDate, month, fromDate, toDate]);

  const dateFieldLabel = period === "By Date Range" ? "Date Range" : period === "By Month" ? "Month" : "Date";

  const dateDisplay =
    period === "By Month"
      ? formatDisplayMonth(month)
      : period === "By Date Range"
        ? `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`
        : formatDisplayDate(selectedRange.from);

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

  const buildFilter = (): StockMovementReportFilter => ({
    fromDate: dateRangeApplied && selectedRange.from ? selectedRange.from : undefined,
    toDate: dateRangeApplied && selectedRange.to ? selectedRange.to : undefined,
    pharmacyIds: selectedPharmacyIds,
    warehouseIds: warehouseIds.length ? warehouseIds : undefined,
    productIds: productId ? [productId] : undefined,
    movementTypes: movementType ? [movementType as StockMovementType] : undefined,
    batchNo: batchNo.trim() || undefined,
    referenceNo: referenceNo.trim() || undefined,
    sourceLocationIds: sourceLocationIds.length ? sourceLocationIds : undefined,
    destinationLocationIds: destinationLocationIds.length ? destinationLocationIds : undefined,
  });

  const activeFilter: StockMovementReportFilter = appliedFilter ?? {
    fromDate: DEFAULT_FROM_DATE,
    toDate: DEFAULT_TO_DATE,
    pharmacyIds: selectedPharmacy ? [selectedPharmacy.pharmacyId] : [],
  };

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({
    ...activeFilter,
    sortBy: "transactionDate",
    sortDir,
    page: pageIndex,
    size: pageSize,
  });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getStockMovementReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the stock movement report.");
      } finally {
        if (active) setReportLoading(false);
      }
    };
    fetchReport();
    return () => {
      active = false;
    };
  }, [requestKey]);

  const handleSearch = () => {
    setAppliedFilter(buildFilter());
    setPageIndex(0);
  };

  const handleDateSort = () => {
    setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    setPageIndex(0);
  };

  const rows = report?.movementDetails.data ?? [];
  const summary = report?.summary;
  const totalRecords = report?.movementDetails.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.movementDetails.totalPages ?? 1);
  const firstRecord = totalRecords ? pageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(pageIndex * pageSize + rows.length, totalRecords);

  const openingStock = summary?.openingStock ?? 0;
  const totalStockIn = summary?.totalStockIn ?? 0;
  const totalStockOut = summary?.totalStockOut ?? 0;
  const closingStock = summary?.closingStock ?? 0;

  const reportPharmacyLabel = pharmacies
    .filter((p) => activeFilter.pharmacyIds?.includes(p.pharmacyId))
    .map((p) => p.pharmacyName)
    .join(", ");

  const columns: Column[] = [
    {
      key: "date",
      header: "TRANSACTION DATE",
      align: "left",
      width: "w-[16%]",
      // Already "dd-MMM-yyyy hh:mm a" from the backend.
      render: (r) => r.transactionDate,
      total: "Total Movement",
    },
    {
      key: "type",
      header: "MOVEMENT TYPE",
      align: "left",
      width: "w-[13%]",
      render: (r) => r.movementTypeLabel || MOVEMENT_TYPE_LABEL[r.movementType] || r.movementType,
      total: "",
      bodyClass: "font-semibold",
    },
    {
      key: "ref",
      header: "REFERENCE NUMBER",
      align: "left",
      width: "w-[13%]",
      render: (r) => r.referenceNo,
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    { key: "source", header: "SOURCE", align: "left", width: "w-[12%]", render: (r) => r.source || "---", total: "" },
    {
      key: "destination",
      header: "DESTINATION",
      align: "left",
      width: "w-[14%]",
      render: (r) => r.destination || "---",
      total: "",
    },
    { key: "in", header: "STOCK IN", align: "right", width: "w-[10%]", render: (r) => r.stockIn, total: totalStockIn },
    { key: "out", header: "STOCK OUT", align: "right", width: "w-[10%]", render: (r) => r.stockOut, total: totalStockOut },
    {
      key: "balance",
      header: "BALANCE QUANTITY",
      align: "right",
      width: "w-[12%]",
      render: (r) => r.balanceQuantity,
      total: closingStock,
      bodyClass: "font-semibold",
    },
  ];

  const resetFilters = () => {
    setPeriod("By Date Range");
    setTodayDate("");
    setSpecificDate("");
    setMonth("");
    setFromDate(DEFAULT_FROM_DATE);
    setToDate(DEFAULT_TO_DATE);
    setPharmacyIds(null);
    setProductId("");
    setMovementType("");
    setWarehouseIds([]);
    setBatchNo("");
    setReferenceNo("");
    setSourceLocationIds([]);
    setDestinationLocationIds([]);
    setDateRangeApplied(true);
    setAppliedFilter(null);
    setSortDir("asc");
    setPageIndex(0);
  };

  const showRows = !reportLoading && !reportError && rows.length > 0;

  return (
    <div className="flex w-full flex-col gap-md">
      {/* Page header */}
      <div className="flex flex-col gap-md md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-md">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
            <RefreshCw className="size-7 text-secondary-700" strokeWidth={1.5} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
            <h1 className="text-h5 font-semibold text-pneutral-900">Stock Movement Report</h1>
            <p className="text-p3 text-pneutral-500">
              A transaction-wise view of stock received, issued, transferred, sold, returned or adjusted at pharmacies
              and warehouses during a selected reporting period.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-sm">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-12 min-w-[108px] flex-1 cursor-pointer items-center justify-center gap-xsm rounded-lg border-2 border-pneutral-900 px-md text-label-l4 font-medium text-pneutral-900 md:w-[118px] md:flex-none"
          >
            <Printer className="size-5" />
            Print
          </button>
          <button
            type="button"
            className="inline-flex h-12 min-w-[108px] flex-1 cursor-pointer items-center justify-center gap-xsm rounded-lg bg-pneutral-900 px-md text-label-l4 font-medium text-pneutral-50 md:w-[187px] md:flex-none"
          >
            <Download className="size-5" />
            Download
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
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
                  <span className="truncate text-p3 text-pneutral-900" title={formatDisplayDate(fromDate)}>{formatDisplayDate(fromDate)}</span>
                  <Calendar className="size-4 shrink-0 text-pneutral-900" />
                </button>
                <span className="text-p3 text-pneutral-500">–</span>
                <button
                  type="button"
                  aria-label="Pick to date"
                  onClick={() => openPicker(toDateRef.current)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                >
                  <span className="truncate text-p3 text-pneutral-900" title={formatDisplayDate(toDate)}>{formatDisplayDate(toDate)}</span>
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
              className={`${hiddenPickerClass} left-0`}
            />
            <input
              ref={monthRef}
              type="month"
              tabIndex={-1}
              aria-hidden
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`${hiddenPickerClass} left-0`}
            />
            <input
              ref={fromDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className={`${hiddenPickerClass} left-0`}
            />
            <input
              ref={toDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={toDate}
              min={shiftIsoDate(fromDate, 1)}
              onChange={(e) => handleToDateChange(e.target.value)}
              className={`${hiddenPickerClass} right-0`}
            />
          </div>

          <Dropdown
            label="Pharmacy"
            labelClassName="px-xxsm"
            multiple
            selectAll
            options={pharmacyOptions}
            value={selectedPharmacyIds}
            onChange={(ids: string[]) => setPharmacyIds(ids)}
            placeholder="Select"
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
            label="Batch No."
            labelClassName="px-xxsm"
            options={batchOptions}
            value={batchNo}
            onChange={(value: string) => setBatchNo(value)}
            placeholder="Search"
            searchable
            clearable
            isLoading={productsLoading}
          />

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              <Dropdown
                label="Warehouse"
                labelClassName="px-xxsm"
                multiple
                selectAll
                options={warehouseOptions}
                value={warehouseIds}
                onChange={(ids: string[]) => setWarehouseIds(ids)}
                placeholder="Select"
                isLoading={warehousesLoading}
              />

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Reference No.</span>
                <span className={fieldBoxClass}>
                  <Search className="size-5 shrink-0 text-pneutral-500" />
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Search"
                    className="min-w-0 flex-1 bg-transparent text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500"
                  />
                </span>
              </label>

              <Dropdown
                label="Source Location"
                labelClassName="px-xxsm"
                multiple
                options={locationOptions}
                value={sourceLocationIds}
                onChange={(ids: string[]) => setSourceLocationIds(ids)}
                placeholder="Select"
                searchable
                isLoading={pharmaciesLoading || warehousesLoading}
              />

              <Dropdown
                label="Destination Location"
                labelClassName="px-xxsm"
                multiple
                options={locationOptions}
                value={destinationLocationIds}
                onChange={(ids: string[]) => setDestinationLocationIds(ids)}
                placeholder="Select"
                searchable
                isLoading={pharmaciesLoading || warehousesLoading}
              />

              <Dropdown
                label="Movement Type"
                labelClassName="px-xxsm"
                options={MOVEMENT_TYPE_OPTIONS}
                value={movementType}
                onChange={(value: string) => setMovementType(value)}
                placeholder="Select"
                clearable
              />
            </>
          )}
        </div>

        {((dateRangeApplied && dateDisplay) || pharmacyLabel) && (
          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-p3 text-pneutral-500">Applied filters</p>
            {dateRangeApplied && dateDisplay && (
              <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
            )}
            {pharmacyLabel && <FilterChip label={`Pharmacy: ${pharmacyLabel}`} onRemove={() => setPharmacyIds([])} />}
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Opening Stock"
          value={`${openingStock} units`}
          highlight={activeFilter.fromDate ? formatDisplayDate(activeFilter.fromDate) : undefined}
          caption="start of period"
          icon={<Box className="size-6 fill-secondary-700 text-white" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Total Stock In"
          value={String(totalStockIn)}
          caption="received / returned"
          icon={<RefreshCw className="size-6 text-success-800" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Total Stock Out"
          value={String(totalStockOut)}
          caption="sold / issued"
          icon={<ReceiptText className="size-6 text-warning-600" strokeWidth={1.5} />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
        <KpiCard
          title="Closing Stock"
          value={`${closingStock} units`}
          highlight={formatSigned(closingStock - openingStock)}
          caption="net change"
          icon={<CircleCheck className="size-6 fill-info-500 text-white" />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Stock Movement Details</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {totalRecords} records
              </span>
            </div>
            {/* The period the backend actually reported on (it defaults to today when none is sent). */}
            {report?.fromDate && (
              <p className="text-p3 text-pneutral-500">
                Period: {report.fromDate} to {report.toDate}
              </p>
            )}
            {reportPharmacyLabel && <p className="text-p3 text-pneutral-500">Location: {reportPharmacyLabel}</p>}
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {report && <p className="text-label-l4 font-semibold text-pneutral-900">Opening Stock: {openingStock} units</p>}

        {/* Eight columns don't fit a phone, so the grid scrolls sideways there. */}
        <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
          <table className="w-full min-w-[960px] table-fixed border-collapse">
            <thead>
              <tr className="bg-secondary-600">
                {columns.map((col, i) => (
                  <th
                    key={col.key}
                    aria-sort={col.key === "date" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                    className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 ${col.width} ${
                      i < columns.length - 1 ? "border-r" : ""
                    }`}
                  >
                    {col.key === "date" ? (
                      <button
                        type="button"
                        onClick={handleDateSort}
                        className="flex w-full cursor-pointer items-center justify-between gap-xxsm text-left"
                      >
                        <span>{col.header}</span>
                        {/* Points the way time runs down the table. */}
                        {sortDir === "asc" ? (
                          <ArrowDown className="size-4 shrink-0" />
                        ) : (
                          <ArrowUp className="size-4 shrink-0" />
                        )}
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
                    {reportLoading ? "Loading..." : reportError || "No movements found for the selected filters."}
                  </td>
                </tr>
              )}
              {showRows &&
                rows.map((row, index) => (
                  <tr key={`${row.referenceNo}-${index}`} className="bg-white">
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-p3 text-pneutral-900 [overflow-wrap:anywhere] ${
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

        {report && <p className="text-label-l4 font-semibold text-pneutral-900">Closing Stock: {closingStock} units</p>}

        {/* Pagination */}
        <div className="flex flex-col gap-md sm:flex-row sm:items-center">
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

export default StockMovementReportPage;
