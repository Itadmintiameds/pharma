"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Box,
  Calendar,
  ChevronDown,
  ChevronsDown,
  CircleCheck,
  Clock,
  Download,
  Funnel,
  Printer,
  TriangleAlert,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { getCurrentStockSummaryReport } from "@/services/AuditReports/CurrentStockSummaryService";
import { ProductMasterService } from "@/services/ProductMasterService";
import { ProductService } from "@/services/ProductService";
import type {
  CurrentStockStatus,
  CurrentStockSummaryFilter,
  CurrentStockSummaryResponse,
  CurrentStockSummaryRow,
  CurrentStockSummarySortBy,
} from "@/types/AuditReports/CurrentStockSummaryData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

// Stock is a snapshot as of one day, so there is no month or range period.
type Period = "Today" | "Specific Day";

const PERIODS: Period[] = ["Today", "Specific Day"];

// "" is "All", which the Dropdown shows through its placeholder.
const STOCK_STATUS_OPTIONS: DropdownOption[] = [
  { label: "In Stock", value: "IN_STOCK" },
  { label: "Out of Stock", value: "OUT_OF_STOCK" },
  { label: "Damaged Stock Held", value: "DAMAGED_STOCK_HELD" },
  { label: "Expired Stock Held", value: "EXPIRED_STOCK_HELD" },
];

// The slice of a /product/batches/pharmacy/{id} row (BatchStockDto) the Product Name,
// Brand Name and Batch No. filters need.
interface ReportProduct {
  productId: string;
  productName: string;
  brandName: string;
}

interface PharmacyBatchRow extends ReportProduct {
  batchNumber: string;
}

interface ProductCategory {
  productCategoryId: number;
  productCategoryName: string;
  isActive?: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

// Local-time YYYY-MM-DD; toISOString() would shift to UTC and can land on the wrong day.
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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
const hiddenPickerClass = "pointer-events-none absolute bottom-0 h-0 w-0 opacity-0";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const percentOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

const fieldLabelClass = "px-xxsm text-label-l4 font-medium text-pneutral-900";
const fieldBoxClass =
  "flex min-h-12 max-h-13 w-full items-center gap-sm rounded-lg border border-pneutral-300 bg-white p-sm";

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
      {highlight && (
        <p className="flex items-center gap-xsm text-p2 whitespace-nowrap">
          <span className={`font-semibold ${highlightClass}`}>{highlight}</span>
          <span className="text-pneutral-500">{caption}</span>
        </p>
      )}
    </div>
  </div>
);

interface Column {
  key: string;
  header: string;
  align: "left" | "right";
  width: string;
  sortKey?: CurrentStockSummarySortBy;
  render: (row: CurrentStockSummaryRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const CurrentStockSummaryReportPage = () => {
  const [period, setPeriod] = useState<Period>("Today");
  const [todayDate, setTodayDate] = useState(() => toIsoDate(new Date()));
  const [specificDate, setSpecificDate] = useState("");
  const specificDateRef = useRef<HTMLInputElement>(null);
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
  const [stockStatus, setStockStatus] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [batchNo, setBatchNo] = useState("");
  const [expiryFrom, setExpiryFrom] = useState("");
  const [expiryTo, setExpiryTo] = useState("");
  const expiryFromRef = useRef<HTMLInputElement>(null);
  const expiryToRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const res = await ProductMasterService.getProductCategories();
        if (!active) return;
        setCategoryOptions(
          (res.data ?? [])
            .filter((c: ProductCategory) => c.isActive !== false)
            .map((c: ProductCategory) => ({ label: c.productCategoryName, value: String(c.productCategoryId) })),
        );
      } catch (error) {
        console.error("Unable to fetch product categories", error);
      } finally {
        if (active) setCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  const [asOfApplied, setAsOfApplied] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<CurrentStockSummarySortBy>("availableStock");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // The filters last sent with Search; null until then, so the first load uses
  // the default as-of date and the navbar's pharmacy.
  const [appliedFilter, setAppliedFilter] = useState<CurrentStockSummaryFilter | null>(null);
  const [report, setReport] = useState<CurrentStockSummaryResponse | null>(null);
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
              byId.set(b.productId, { productId: b.productId, productName: b.productName, brandName: b.brandName ?? "" });
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
    setBatchNo("");
  };

  const brandOptions: DropdownOption[] = useMemo(
    () =>
      [...new Set(products.map((p) => p.brandName).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((brand) => ({ label: brand, value: brand })),
    [products],
  );

  const handleExpiryFromChange = (value: string) => {
    setExpiryFrom(value);
    // Unlike the report period, an expiry range may be a single day.
    if (value && expiryTo && value > expiryTo) setExpiryTo(value);
  };

  const expiryDisplay =
    expiryFrom || expiryTo ? `${formatDisplayDate(expiryFrom) || "…"} – ${formatDisplayDate(expiryTo) || "…"}` : "";

  const allPharmaciesSelected =
    pharmacies.length > 1 && pharmacies.every((p) => selectedPharmacyIds.includes(p.pharmacyId));

  const pharmacyLabel = allPharmaciesSelected
    ? "All"
    : pharmacies
        .filter((p) => selectedPharmacyIds.includes(p.pharmacyId))
        .map((p) => p.pharmacyName)
        .join(", ");

  const stockStatusLabel = STOCK_STATUS_OPTIONS.find((o) => o.value === stockStatus)?.label ?? "All";

  // Stock is reported as it stood at the end of this day.
  const asOfDate = period === "Today" ? todayDate : specificDate;

  const dateFieldLabel = "As-of Date";

  const dateDisplay = formatDisplayDate(asOfDate);

  const handlePeriodChange = (next: Period) => {
    setPeriod(next);
    setAsOfApplied(true);
    if (next === "Today") setTodayDate(toIsoDate(new Date()));
    // Called inside the click so the browser still counts it as a user gesture.
    if (next === "Specific Day") openPicker(specificDateRef.current);
  };

  const buildFilter = (): CurrentStockSummaryFilter => {
    return {
      asOfDate: asOfApplied && asOfDate ? asOfDate : undefined,
      pharmacyIds: selectedPharmacyIds,
      warehouseIds: warehouseIds.length ? warehouseIds : undefined,
      productIds: productId ? [productId] : undefined,
      productCategoryIds: categories.length ? categories.map(Number) : undefined,
      brandNames: brandNames.length ? brandNames : undefined,
      batchNo: batchNo.trim() || undefined,
      expiryFromDate: expiryFrom || undefined,
      expiryToDate: expiryTo || undefined,
      stockStatus: stockStatus ? (stockStatus as CurrentStockStatus) : undefined,
    };
  };

  const activeFilter: CurrentStockSummaryFilter = appliedFilter ?? {
    asOfDate: todayDate,
    pharmacyIds: selectedPharmacy ? [selectedPharmacy.pharmacyId] : [],
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
        const data = await getCurrentStockSummaryReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the current stock summary report.");
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

  const handleSort = (key: CurrentStockSummarySortBy) => {
    if (key === sortBy) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPageIndex(0);
  };

  const rows = report?.stockDetails.data ?? [];
  const summary = report?.summary;
  const totalRecords = report?.stockDetails.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.stockDetails.totalPages ?? 1);
  const firstRecord = totalRecords ? pageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(pageIndex * pageSize + rows.length, totalRecords);

  const totalClosing = summary?.totalClosingStock ?? 0;
  const totalDamaged = summary?.totalDamagedStock ?? 0;
  const totalExpired = summary?.totalExpiredStock ?? 0;
  const totalAvailable = summary?.totalAvailableStock ?? 0;

  const reportPharmacyLabel = pharmacies
    .filter((p) => activeFilter.pharmacyIds?.includes(p.pharmacyId))
    .map((p) => p.pharmacyName)
    .join(", ");

  const columns: Column[] = [
    {
      key: "product",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[15%]",
      sortKey: "productName",
      render: (r) => r.productName,
      total: "Total",
      bodyClass: "font-semibold",
    },
    {
      key: "location",
      header: "PHARMACY / WAREHOUSE",
      align: "left",
      width: "w-[15%]",
      sortKey: "locationName",
      render: (r) => r.locationName || "---",
      total: "",
    },
    {
      key: "batch",
      header: "BATCH NO.",
      align: "left",
      width: "w-[11%]",
      sortKey: "batchNo",
      render: (r) => r.batchNo,
      total: "",
    },
    {
      key: "expiry",
      header: "EXPIRY DATE",
      align: "left",
      width: "w-[12%]",
      sortKey: "expiryDate",
      // Already "dd-MMM-yyyy" from the backend.
      render: (r) => r.expiryDate,
      total: "",
    },
    { key: "closing", header: "CLOSING STOCK", align: "right", width: "w-[11%]", render: (r) => r.closingStock, total: totalClosing },
    { key: "damaged", header: "DAMAGED STOCK", align: "right", width: "w-[12%]", render: (r) => r.damagedStock, total: totalDamaged },
    { key: "expired", header: "EXPIRED STOCK", align: "right", width: "w-[12%]", render: (r) => r.expiredStock, total: totalExpired },
    {
      key: "available",
      header: "AVAILABLE STOCK",
      align: "right",
      width: "w-[12%]",
      sortKey: "availableStock",
      render: (r) => r.availableStock,
      total: totalAvailable,
      bodyClass: "font-semibold",
    },
  ];

  const sortIcon = (key: CurrentStockSummarySortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const resetFilters = () => {
    setPeriod("Today");
    setTodayDate(toIsoDate(new Date()));
    setSpecificDate("");
    setPharmacyIds(null);
    setWarehouseIds([]);
    setProductId("");
    setStockStatus("");
    setCategories([]);
    setBrandNames([]);
    setBatchNo("");
    setExpiryFrom("");
    setExpiryTo("");
    setAsOfApplied(true);
    setAppliedFilter(null);
    setSortBy("availableStock");
    setSortDir("desc");
    setPageIndex(0);
  };

  return (
    <div className="flex w-full flex-col gap-md">
      {/* Page header */}
      <div className="flex flex-col gap-md md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-md">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
            <Box className="size-7 fill-secondary-700 text-white" strokeWidth={1.5} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
            <h1 className="text-h5 font-semibold text-pneutral-900">Current Stock Summary Report</h1>
            <p className="text-p3 text-pneutral-500">
              A product-wise and batch-wise view of stock held at pharmacies and warehouses as of a selected date.
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
            <button
              type="button"
              disabled={period === "Today"}
              onClick={() => openPicker(specificDateRef.current)}
              className={`${fieldBoxClass} cursor-pointer text-left disabled:cursor-default`}
            >
              <span className={`flex-1 truncate text-p4 ${dateDisplay ? "text-pneutral-900" : "text-pneutral-500"}`}>
                {dateDisplay || "Select date"}
              </span>
              <Calendar className="size-5 shrink-0 text-pneutral-900" />
            </button>

            <input
              ref={specificDateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={specificDate}
              max={todayDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className={`${hiddenPickerClass} left-0`}
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

              <Dropdown
                label="Product Category"
                labelClassName="px-xxsm"
                multiple
                options={categoryOptions}
                value={categories}
                onChange={(values: string[]) => setCategories(values)}
                placeholder="Select"
                isLoading={categoriesLoading}
              />

              <Dropdown
                label="Brand Name"
                labelClassName="px-xxsm"
                multiple
                options={brandOptions}
                value={brandNames}
                onChange={(values: string[]) => setBrandNames(values)}
                placeholder="Search"
                searchable
                isLoading={productsLoading}
              />

              <div className="relative flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Expiry Date</span>
                <div className={`${fieldBoxClass} gap-xsm!`}>
                  <button
                    type="button"
                    aria-label="Pick expiry from date"
                    onClick={() => openPicker(expiryFromRef.current)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                  >
                    <span className={`truncate text-p3 ${expiryFrom ? "text-pneutral-900" : "text-pneutral-500"}`}>
                      {formatDisplayDate(expiryFrom) || "From"}
                    </span>
                    <Calendar className="size-4 shrink-0 text-pneutral-900" />
                  </button>
                  <span className="text-p3 text-pneutral-500">–</span>
                  <button
                    type="button"
                    aria-label="Pick expiry to date"
                    onClick={() => openPicker(expiryToRef.current)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                  >
                    <span className={`truncate text-p3 ${expiryTo ? "text-pneutral-900" : "text-pneutral-500"}`}>
                      {formatDisplayDate(expiryTo) || "To"}
                    </span>
                    <Calendar className="size-4 shrink-0 text-pneutral-900" />
                  </button>
                </div>
                <input
                  ref={expiryFromRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden
                  value={expiryFrom}
                  onChange={(e) => handleExpiryFromChange(e.target.value)}
                  className={`${hiddenPickerClass} left-0`}
                />
                <input
                  ref={expiryToRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden
                  value={expiryTo}
                  min={expiryFrom || undefined}
                  onChange={(e) => setExpiryTo(e.target.value)}
                  className={`${hiddenPickerClass} right-0`}
                />
              </div>

              <Dropdown
                label="Stock Status"
                labelClassName="px-xxsm"
                options={STOCK_STATUS_OPTIONS}
                value={stockStatus}
                onChange={(value: string) => setStockStatus(value)}
                placeholder="All"
                clearable
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {asOfApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setAsOfApplied(false)} />
          )}
          {pharmacyLabel && <FilterChip label={`Pharmacy: ${pharmacyLabel}`} onRemove={() => setPharmacyIds([])} />}
          {expiryDisplay && (
            <FilterChip
              label={`Expiry Date: ${expiryDisplay}`}
              onRemove={() => {
                setExpiryFrom("");
                setExpiryTo("");
              }}
            />
          )}
          <FilterChip
            label={`Stock Status: ${stockStatusLabel}`}
            onRemove={stockStatus ? () => setStockStatus("") : undefined}
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Closing Stock"
          value={String(totalClosing)}
          highlight={`${totalRecords} records`}
          caption="in stock list"
          icon={<Box className="size-6 fill-secondary-700 text-white" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Damaged Stock"
          value={String(totalDamaged)}
          highlight={`${percentOf(totalDamaged, totalClosing)}%`}
          caption="of closing stock"
          icon={<TriangleAlert className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Expired Stock"
          value={String(totalExpired)}
          highlight={`${percentOf(totalExpired, totalClosing)}%`}
          caption="of closing stock"
          icon={<Clock className="size-6 text-warning-600" strokeWidth={1.5} />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
        <KpiCard
          title="Available Stock"
          value={String(totalAvailable)}
          highlight={`${percentOf(totalAvailable, totalClosing)}%`}
          caption="of closing stock"
          icon={<CircleCheck className="size-6 fill-success-800 text-white" />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Stock Details</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {totalRecords} records
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            {activeFilter.asOfDate && (
              <p className="text-p3 text-pneutral-500">As-of Date: {formatDisplayDate(activeFilter.asOfDate)}</p>
            )}
            {reportPharmacyLabel && <p className="text-p3 text-pneutral-500">Pharmacy: {reportPharmacyLabel}</p>}
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Eight columns don't fit below lg, so rows stack as cards there instead of scrolling sideways. */}
        <div className="flex flex-col gap-sm lg:hidden">
          {(reportLoading || reportError || rows.length === 0) && (
            <p
              className={`rounded-lg border border-pneutral-200 px-sm py-md text-center text-p3 ${
                reportError ? "text-warning-600" : "text-pneutral-500"
              }`}
            >
              {reportLoading ? "Loading..." : reportError || "No records found for the selected filters."}
            </p>
          )}
          {!reportLoading &&
            !reportError &&
            rows.map((row, index) => (
              <div
                key={`${row.productName}-${row.batchNo}-${row.locationName}-${index}`}
                className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm"
              >
                <p className="text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.productName}</p>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns.slice(1).map((col) => (
                    <div key={col.key} className="flex min-w-0 flex-col">
                      <dt className="text-p4 text-pneutral-500">{col.header}</dt>
                      <dd className={`text-pneutral-900 wrap-anywhere ${col.bodyClass ?? ""}`}>{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          {!reportLoading && !reportError && rows.length > 0 && (
            <div className="grid grid-cols-2 gap-x-md gap-y-xsm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
              <p className="col-span-2">Total</p>
              {columns
                .filter((col) => col.total !== "" && col.key !== "product")
                .map((col) => (
                  <div key={col.key} className="flex min-w-0 flex-col">
                    <span className="text-p4 font-medium">{col.header}</span>
                    <span>{col.total}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* overflow-hidden clips the header and total row to the rounded corners. */}
        <div className="hidden w-full overflow-hidden rounded-lg border border-pneutral-200 lg:block">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-secondary-600">
                {columns.map((col, i) => (
                  <th
                    key={col.key}
                    aria-sort={
                      col.sortKey && col.sortKey === sortBy ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={`h-15 border-b border-pneutral-200 px-xsm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word xl:px-sm ${col.width} ${
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
              {(reportLoading || reportError || rows.length === 0) && (
                <tr className="bg-white">
                  <td
                    colSpan={columns.length}
                    className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-center text-p3 ${
                      reportError ? "text-warning-600" : "text-pneutral-500"
                    }`}
                  >
                    {reportLoading ? "Loading..." : reportError || "No records found for the selected filters."}
                  </td>
                </tr>
              )}
              {!reportLoading && !reportError && rows.map((row, index) => (
                <tr key={`${row.productName}-${row.batchNo}-${row.locationName}-${index}`} className="bg-white">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`h-15 border-b border-pneutral-200 px-xsm py-xsm text-p3 text-pneutral-900 wrap-anywhere xl:px-sm ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${i < columns.length - 1 ? "border-r" : ""} ${col.bodyClass ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {!reportLoading && !reportError && rows.length > 0 && (
                <tr className="bg-primary-100">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`h-15 border-pneutral-200 px-xsm py-xsm text-p3 font-semibold text-primary-900 xl:px-sm ${
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

export default CurrentStockSummaryReportPage;
