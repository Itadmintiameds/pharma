"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronsDown,
  Funnel,
  ReceiptText,
  Scale,
  TriangleAlert,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import { downloadStockDamageExport, getStockDamageReport } from "@/services/AuditReports/StockDamageService";
import { ProductMasterService } from "@/services/ProductMasterService";
import { ProductService } from "@/services/ProductService";
import { getAllSupplier } from "@/services/SupplierService";
import type {
  StockDamageReportFilter,
  StockDamageReportResponse,
  StockDamageReportRow,
  StockDamageReportSortBy,
  StockDamageTransactionType,
} from "@/types/AuditReports/StockDamageData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

// "" is "All", which the Dropdown shows through its placeholder.
const TRANSACTION_TYPE_OPTIONS: DropdownOption[] = [
  { label: "Stock Return", value: "STOCK_RETURN" },
  { label: "Stock Adjustment", value: "STOCK_ADJUSTMENT" },
];

const TRANSACTION_TYPE_LABEL: Record<StockDamageTransactionType, string> = {
  STOCK_RETURN: "Stock Return",
  STOCK_ADJUSTMENT: "Stock Adjustment",
};

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

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

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
  sortKey?: StockDamageReportSortBy;
  render: (row: StockDamageReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const rowKey = (row: StockDamageReportRow, index: number) => `${row.referenceNumber}-${row.batchNo}-${index}`;

const StockDamageReportPage = () => {
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

  const { pharmacies, selectedPharmacy, loading: pharmaciesLoading } = usePharmacyStore();
  // null = untouched, so the report starts on the pharmacy picked in the navbar
  // once the store has loaded; [] = the user cleared every pharmacy.
  const [pharmacyIds, setPharmacyIds] = useState<string[] | null>(null);
  const [productId, setProductId] = useState("");
  const [transactionType, setTransactionType] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { warehouses, loading: warehousesLoading } = useWarehouseStore();
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ReportProduct[]>([]);
  // Batch numbers held at the selected pharmacies, by productId.
  const [batchesByProduct, setBatchesByProduct] = useState<Map<string, string[]>>(new Map());
  const [productsLoading, setProductsLoading] = useState(true);
  const [batchNo, setBatchNo] = useState("");
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<DropdownOption[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [brandNames, setBrandNames] = useState<string[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [destinationWarehouseIds, setDestinationWarehouseIds] = useState<string[]>([]);

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<StockDamageReportSortBy>("transactionDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // The filters last sent with Search; null until then, so the first load uses
  // today and the navbar's pharmacy.
  const [appliedFilter, setAppliedFilter] = useState<StockDamageReportFilter | null>(null);
  const [report, setReport] = useState<StockDamageReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

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

  useEffect(() => {
    let active = true;
    const fetchSuppliers = async () => {
      try {
        const data = await getAllSupplier();
        if (!active) return;
        setSupplierOptions(
          (data ?? [])
            .filter((s) => s.supplierId != null)
            .map((s) => ({ label: s.supplierName, value: String(s.supplierId) }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      } catch (error) {
        console.error("Unable to fetch suppliers", error);
      } finally {
        if (active) setSuppliersLoading(false);
      }
    };
    fetchSuppliers();
    return () => {
      active = false;
    };
  }, []);

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
              byId.set(b.productId, {
                productId: b.productId,
                productName: b.productName,
                brandName: b.brandName ?? "",
              });
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

  const brandOptions: DropdownOption[] = useMemo(
    () =>
      [...new Set(products.map((p) => p.brandName).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((brand) => ({ label: brand, value: brand })),
    [products],
  );

  const handleProductChange = (value: string) => {
    setProductId(value);
    // A batch of the previous product would match nothing.
    setBatchNo("");
  };

  // The transaction-date window each tab reports on.
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

  const allPharmaciesSelected =
    pharmacies.length > 1 && pharmacies.every((p) => selectedPharmacyIds.includes(p.pharmacyId));

  const pharmacyLabel = allPharmaciesSelected
    ? "All"
    : pharmacies
        .filter((p) => selectedPharmacyIds.includes(p.pharmacyId))
        .map((p) => p.pharmacyName)
        .join(", ");

  const transactionTypeLabel = (type?: string) =>
    TRANSACTION_TYPE_LABEL[type as StockDamageTransactionType] ?? "All";

  const buildFilter = (): StockDamageReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: selectedPharmacyIds,
    warehouseIds: warehouseIds.length ? warehouseIds : undefined,
    productIds: productId ? [productId] : undefined,
    productCategoryIds: categories.length ? categories.map(Number) : undefined,
    brandNames: brandNames.length ? brandNames : undefined,
    batchNo: batchNo.trim() || undefined,
    supplierIds: supplierIds.length ? supplierIds.map(Number) : undefined,
    transactionTypes: transactionType ? [transactionType as StockDamageTransactionType] : undefined,
    referenceNumber: referenceNumber.trim() || undefined,
    destinationWarehouseIds: destinationWarehouseIds.length ? destinationWarehouseIds : undefined,
  });

  const activeFilter: StockDamageReportFilter = appliedFilter ?? {
    fromDate: todayDate,
    toDate: todayDate,
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
        const data = await getStockDamageReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the stock damage report.");
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
  const { printId, printReport, print, download, busy } = useReportActions<StockDamageReportResponse>({
    report,
    hasMoreRows: (r) => (r.damageTransactions?.totalRecords ?? 0) > (r.damageTransactions?.data.length ?? 0),
    fetchAll: () => getStockDamageReport({ ...activeFilter, sortBy, sortDir, unpaged: true }),
    exportReport: (format) => downloadStockDamageExport(format, { ...activeFilter, sortBy, sortDir }),
    // stock-damage_2026-10-08, stock-damage_2026-10-01_to_2026-10-08 —
    // matching the export's file names.
    fileStem: `stock-damage_${
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

  const rows = shownReport?.damageTransactions?.data ?? [];
  const summary = shownReport?.summary;
  const totalRecords = shownReport?.damageTransactions?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.damageTransactions?.totalPages ?? 1);
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  // Describes the report on screen, i.e. the last search, not unsent edits to the filters.
  const reportLocationLabel = [
    ...pharmacies.filter((p) => activeFilter.pharmacyIds?.includes(p.pharmacyId)).map((p) => p.pharmacyName),
    ...warehouses.filter((w) => activeFilter.warehouseIds?.includes(w.warehouseId)).map((w) => warehouseLabel(w)),
  ].join(", ");

  const reportPeriodLabel =
    activeFilter.fromDate || activeFilter.toDate
      ? `${formatDisplayDate(activeFilter.fromDate ?? "") || "…"} to ${formatDisplayDate(activeFilter.toDate ?? "") || "…"}`
      : formatDisplayDate(todayDate);

  const columns: Column[] = [
    {
      key: "date",
      header: "TRANSACTION DATE",
      align: "left",
      width: "w-[147px]",
      sortKey: "transactionDate",
      render: (r) => r.transactionDate,
      total: "Total",
    },
    {
      key: "product",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[118px]",
      sortKey: "productName",
      render: (r) => r.productName,
      total: "",
      bodyClass: "font-semibold",
    },
    { key: "batch", header: "BATCH NO.", align: "left", width: "w-[82px]", render: (r) => r.batchNo, total: "" },
    {
      key: "expiry",
      header: "EXPIRY (MM/YYYY)",
      align: "left",
      width: "w-[103px]",
      render: (r) => r.expiryDate,
      total: "",
    },
    {
      key: "type",
      header: "TRANSACTION TYPE",
      align: "left",
      width: "w-[127px]",
      render: (r) => r.transactionTypeLabel || TRANSACTION_TYPE_LABEL[r.transactionType] || r.transactionType,
      total: "",
    },
    {
      key: "ref",
      header: "REFERENCE NUMBER",
      align: "left",
      width: "w-[110px]",
      render: (r) => r.referenceNumber,
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    { key: "source", header: "SOURCE", align: "left", width: "w-[105px]", render: (r) => r.sourceName, total: "" },
    {
      key: "destination",
      header: "DESTINATION",
      align: "left",
      width: "w-[121px]",
      render: (r) => r.destinationName || "---",
      total: "",
    },
    {
      key: "returned",
      header: "RETURNED QUANTITY",
      align: "right",
      width: "w-[103px]",
      render: (r) => r.returnedQuantity ?? 0,
      total: summary?.returnedQuantity ?? 0,
    },
    {
      key: "adjusted",
      header: "ADJUSTED QUANTITY",
      align: "right",
      width: "w-[102px]",
      render: (r) => r.adjustedQuantity ?? 0,
      total: summary?.adjustedQuantity ?? 0,
    },
    {
      key: "totalDamaged",
      header: "TOTAL DAMAGED QUANTITY",
      align: "right",
      width: "w-[98px]",
      render: (r) => r.totalDamagedQuantity ?? 0,
      total: summary?.totalDamagedQuantity ?? 0,
    },
  ];

  const sortIcon = (key: StockDamageReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: StockDamageReportSortBy) => {
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
    setPharmacyIds(null);
    setProductId("");
    setTransactionType("");
    setWarehouseIds([]);
    setBatchNo("");
    setSupplierIds([]);
    setCategories([]);
    setBrandNames([]);
    setReferenceNumber("");
    setDestinationWarehouseIds([]);
    setAppliedFilter(null);
    setSortBy("transactionDate");
    setSortDir("asc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Stock Damage Report"
        description="A transaction-wise view of damaged medicines handled through Stock Return and Stock Adjustment during a selected reporting period."
        icon="/Reports/ExclamationTrianglePurple.svg"
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
              More Filters (7)
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
            label="Transaction Type"
            labelClassName="px-xxsm"
            options={TRANSACTION_TYPE_OPTIONS}
            value={transactionType}
            onChange={(value: string) => setTransactionType(value)}
            placeholder="All"
            clearable
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

              <Dropdown
                label="Supplier Name"
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

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Reference Number</span>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. RET-1001"
                  className={`${fieldBoxClass} text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:border-secondary-700`}
                />
              </label>

              <Dropdown
                label="Destination"
                labelClassName="px-xxsm"
                multiple
                selectAll
                options={warehouseOptions}
                value={destinationWarehouseIds}
                onChange={(ids: string[]) => setDestinationWarehouseIds(ids)}
                placeholder="Select"
                isLoading={warehousesLoading}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {dateRangeApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
          )}
          {pharmacyLabel && <FilterChip label={`Pharmacy: ${pharmacyLabel}`} onRemove={() => setPharmacyIds([])} />}
          <FilterChip
            label={`Transaction Type: ${transactionTypeLabel(transactionType)}`}
            onRemove={transactionType ? () => setTransactionType("") : undefined}
          />
        </div>
      </div>

      {/* KPI row: totals over every matching row, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Returned Quantity"
          value={String(summary?.returnedQuantity ?? 0)}
          highlight="Stock Return"
          caption="to warehouse"
          icon={<ReceiptText className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Adjusted Quantity"
          value={String(summary?.adjustedQuantity ?? 0)}
          highlight="Stock Adjustment"
          caption="written off"
          icon={<Scale className="size-6 text-primary-800" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Total Damaged Quantity"
          value={String(summary?.totalDamagedQuantity ?? 0)}
          highlight={plural(totalRecords, "record")}
          caption="in this period"
          icon={<TriangleAlert className="size-6 text-warning-600" strokeWidth={1.5} />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Damage Transactions</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, "record")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Period: {reportPeriodLabel}</p>
            {reportLocationLabel && <p className="text-p3 text-pneutral-500">Location: {reportLocationLabel}</p>}
            <p className="text-p3 text-pneutral-500">
              Transaction Type: {transactionTypeLabel(activeFilter.transactionTypes?.[0])}
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
                    <p className="text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.productName}</p>
                    <p className="text-p4 text-pneutral-500">{row.transactionDate}</p>
                  </div>
                  <span className="text-p3 font-semibold whitespace-nowrap text-primary-800">{row.referenceNumber}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns
                    .filter((col) => !["date", "product", "ref"].includes(col.key))
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
            <div className="grid grid-cols-2 gap-x-md gap-y-xsm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
              <p className="col-span-2">Total</p>
              {columns
                .filter((col) => col.total !== "" && col.key !== "date")
                .map((col) => (
                  <div key={col.key} className="flex min-w-0 flex-col">
                    <span className="text-p4 font-medium">{col.header}</span>
                    <span>{col.total}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Scrolls sideways once the design's column widths no longer fit. */}
        <div className="hidden w-full overflow-x-auto rounded-lg border border-pneutral-200 md:block print:block!">
          <table className="w-full min-w-[1216px] table-fixed border-collapse">
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
                        className="flex w-full cursor-pointer items-center justify-between gap-xxsm text-left"
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
                      className={`h-15 border-pneutral-200 px-sm py-xsm text-p3 font-semibold text-primary-800 ${
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

export default StockDamageReportPage;
