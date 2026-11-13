"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Box,
  Calendar,
  ChevronDown,
  ChevronsDown,
  Clock,
  Funnel,
  Scale,
  TriangleAlert,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { PaginationControl } from "@/app/components/common/table/Pagination";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import { downloadStockExpiryExport, getStockExpiryReport } from "@/services/AuditReports/StockExpiryService";
import { ProductMasterService } from "@/services/ProductMasterService";
import { ProductService } from "@/services/ProductService";
import { getAllSupplier } from "@/services/SupplierService";
import type {
  StockExpiryReportFilter,
  StockExpiryReportResponse,
  StockExpiryReportRow,
  StockExpiryReportSortBy,
  StockExpiryStatus,
} from "@/types/AuditReports/StockExpiryData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

type Period = "Today" | "Specific Day" | "By Month" | "By Month Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Month Range"];

// "" is "All", which the Dropdown shows through its placeholder.
const EXPIRY_STATUS_OPTIONS: DropdownOption[] = [
  { label: "Expired", value: "EXPIRED" },
  { label: "Expiring This Month", value: "EXPIRING_THIS_MONTH" },
  { label: "Expiring Soon", value: "EXPIRING_SOON" },
  { label: "Valid", value: "VALID" },
];

// Sent as expiryWithinMonths; Custom sends an expiry month range instead.
const EXPIRY_WITHIN_OPTIONS: DropdownOption[] = [
  { label: "1 Month", value: "1" },
  { label: "3 Months", value: "3" },
  { label: "6 Months", value: "6" },
  { label: "12 Months", value: "12" },
  { label: "Custom", value: "CUSTOM" },
];

const STATUS_BADGE: Record<StockExpiryStatus, { label: string; className: string }> = {
  EXPIRED: {
    label: "Expired",
    className: "border-warning-600 bg-warning-50 text-warning-600",
  },
  EXPIRING_THIS_MONTH: {
    label: "Expiring This Month",
    className: "border-danger-600 bg-danger-50 text-danger-600",
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    className: "border-danger-600 bg-danger-50 text-danger-600",
  },
  VALID: {
    label: "Valid",
    className: "border-success-800 bg-success-50 text-success-800",
  },
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

// The backend sends "dd-MMM-yyyy"; the design shows MM/YYYY.
const toMonthYear = (displayDate: string) => {
  const [, mon, y] = displayDate.split("-");
  const month = MONTH_NAMES.indexOf(mon) + 1;
  return month ? `${pad(month)}/${y}` : displayDate;
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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "es"}`;

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

const StatusBadge = ({ status }: { status: StockExpiryStatus }) => {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.VALID;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap ${badge.className}`}
    >
      {badge.label}
    </span>
  );
};

const formatMonthRange = (from: string, to: string) =>
  from || to ? `${formatDisplayMonth(from) || "…"} – ${formatDisplayMonth(to) || "…"}` : "";

interface MonthRangeFieldProps {
  label: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  // Opens the From month calendar as soon as the field appears.
  openOnMount?: boolean;
}

const MonthRangeField = ({ label, from, to, onFromChange, onToChange, openOnMount }: MonthRangeFieldProps) => {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openOnMount) return;
    // Wait two frames so the field has been laid out and painted; opened any earlier, the
    // calendar has no position to anchor to and lands in the top-left corner of the window.
    // This is still within the click's user activation, so the browser allows showPicker().
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => openPicker(fromRef.current));
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFromChange = (value: string) => {
    onFromChange(value);
    if (value && to && value > to) onToChange(value);
  };

  return (
    <div className="relative flex min-w-0 flex-col">
      <span className={fieldLabelClass}>{label}</span>
      <div className={`${fieldBoxClass} gap-xsm!`}>
        <button
          type="button"
          aria-label="Pick from month"
          onClick={() => openPicker(fromRef.current)}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
        >
          <span className={`truncate text-p3 ${from ? "text-pneutral-900" : "text-pneutral-500"}`}>
            {formatDisplayMonth(from) || "From"}
          </span>
          <Calendar className="size-4 shrink-0 text-pneutral-900" />
        </button>
        <span className="text-p3 text-pneutral-500">–</span>
        <button
          type="button"
          aria-label="Pick to month"
          onClick={() => openPicker(toRef.current)}
          className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
        >
          <span className={`truncate text-p3 ${to ? "text-pneutral-900" : "text-pneutral-500"}`}>
            {formatDisplayMonth(to) || "To"}
          </span>
          <Calendar className="size-4 shrink-0 text-pneutral-900" />
        </button>
      </div>
      <input
        ref={fromRef}
        type="month"
        tabIndex={-1}
        aria-hidden
        value={from}
        onChange={(e) => handleFromChange(e.target.value)}
        className={`${hiddenPickerClass} left-0 w-1/2`}
      />
      <input
        ref={toRef}
        type="month"
        tabIndex={-1}
        aria-hidden
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className={`${hiddenPickerClass} right-0 w-1/2`}
      />
    </div>
  );
};

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
      <p className="flex items-center gap-xsm text-p2 whitespace-nowrap">
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
  width: string;
  sortKey?: StockExpiryReportSortBy;
  render: (row: StockExpiryReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const rowKey = (row: StockExpiryReportRow, index: number) =>
  `${row.locationType}-${row.locationName}-${row.productName}-${row.batchNo}-${index}`;

const StockExpiryReportPage = () => {
  const [period, setPeriod] = useState<Period>("Today");
  const [todayDate, setTodayDate] = useState(() => toIsoDate(new Date()));
  const [specificDate, setSpecificDate] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const specificDateRef = useRef<HTMLInputElement>(null);
  const [asOfApplied, setAsOfApplied] = useState(true);

  const { pharmacies, selectedPharmacy, loading: pharmaciesLoading } = usePharmacyStore();
  // null = untouched, so the report starts on the pharmacy picked in the navbar
  // once the store has loaded; [] = the user cleared every pharmacy.
  const [pharmacyIds, setPharmacyIds] = useState<string[] | null>(null);
  const [expiryStatus, setExpiryStatus] = useState("");
  const [expiryWithin, setExpiryWithin] = useState("3");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // Set when Custom is picked from the dropdown, so only that choice pops the calendar open.
  const [customJustPicked, setCustomJustPicked] = useState(false);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { warehouses, loading: warehousesLoading } = useWarehouseStore();
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [productId, setProductId] = useState("");
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

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<StockExpiryReportSortBy>("expiryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // The filters last sent with Search; null until then, so the first load uses
  // today and the navbar's pharmacy.
  const [appliedFilter, setAppliedFilter] = useState<StockExpiryReportFilter | null>(null);
  const [report, setReport] = useState<StockExpiryReportResponse | null>(null);
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

  // Expiry status and days to expiry are worked out relative to this day.
  const asOfDate = period === "Specific Day" ? specificDate : todayDate;

  const dateFieldLabel = period === "By Month Range" ? "Month Range" : "As-of Date";

  const dateDisplay = period === "By Month Range" ? formatMonthRange(fromMonth, toMonth) : formatDisplayDate(asOfDate);

  const handlePeriodChange = (next: Period) => {
    setPeriod(next);
    setAsOfApplied(true);
    setCustomJustPicked(false);
    if (next !== "Specific Day") setTodayDate(toIsoDate(new Date()));
    // Called inside the click so the browser still counts it as a user gesture.
    if (next === "Specific Day") openPicker(specificDateRef.current);
  };

  const allPharmaciesSelected =
    pharmacies.length > 1 && pharmacies.every((p) => selectedPharmacyIds.includes(p.pharmacyId));

  const pharmacyLabel = allPharmaciesSelected
    ? "All"
    : pharmacies
        .filter((p) => selectedPharmacyIds.includes(p.pharmacyId))
        .map((p) => p.pharmacyName)
        .join(", ");

  const expiryStatusLabel = EXPIRY_STATUS_OPTIONS.find((o) => o.value === expiryStatus)?.label ?? "All";
  const expiryWithinMonthsLabel = (months: number) =>
    EXPIRY_WITHIN_OPTIONS.find((o) => o.value === String(months))?.label ?? `${months} Months`;

  // Only By Month reports against an expiry window; the other tabs report every batch, however far off its expiry.
  const showExpiryWithin = period === "By Month";
  const customWindow = showExpiryWithin && expiryWithin === "CUSTOM";

  const buildFilter = (): StockExpiryReportFilter => {
    // By Month Range, and By Month's Custom window, both narrow by expiry month.
    const monthRange =
      period === "By Month Range"
        ? { from: fromMonth, to: toMonth }
        : customWindow
          ? { from: customFrom, to: customTo }
          : null;
    return {
      asOfDate: asOfApplied && asOfDate ? asOfDate : undefined,
      pharmacyIds: selectedPharmacyIds,
      warehouseIds: warehouseIds.length ? warehouseIds : undefined,
      productIds: productId ? [productId] : undefined,
      productCategoryIds: categories.length ? categories.map(Number) : undefined,
      brandNames: brandNames.length ? brandNames : undefined,
      batchNo: batchNo.trim() || undefined,
      supplierIds: supplierIds.length ? supplierIds.map(Number) : undefined,
      expiryStatus: expiryStatus ? (expiryStatus as StockExpiryStatus) : undefined,
      expiryWithinMonths: showExpiryWithin && !customWindow && expiryWithin ? Number(expiryWithin) : undefined,
      expiryFromMonth: monthRange?.from || undefined,
      expiryToMonth: monthRange?.to || undefined,
    };
  };

  const activeFilter: StockExpiryReportFilter = appliedFilter ?? {
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
        const data = await getStockExpiryReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the stock expiry report.");
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
  const { printId, printReport, print, download, busy } = useReportActions<StockExpiryReportResponse>({
    report,
    hasMoreRows: (r) => r.expiryDetails.totalRecords > r.expiryDetails.data.length,
    fetchAll: () => getStockExpiryReport({ ...activeFilter, sortBy, sortDir, unpaged: true }),
    exportReport: (format) => downloadStockExpiryExport(format, { ...activeFilter, sortBy, sortDir }),
    // stock-expiry_2026-10-08, matching the export's file names.
    fileStem: `stock-expiry_${activeFilter.asOfDate || toIsoDate(new Date())}`,
  });

  // Every row is swapped in only while the print copy is taken; it all sits
  // on one page then, so row numbers start at 1.
  const shownReport = printReport ?? report;
  const shownPageIndex = printReport ? 0 : pageIndex;

  const rows = shownReport?.expiryDetails.data ?? [];
  const summary = shownReport?.summary;
  const totalRecords = shownReport?.expiryDetails.totalRecords ?? 0;
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  // Describes the report on screen, i.e. the last search, not unsent edits to the filters.
  const reportLocationLabel = [
    ...pharmacies.filter((p) => activeFilter.pharmacyIds?.includes(p.pharmacyId)).map((p) => p.pharmacyName),
    ...warehouses.filter((w) => activeFilter.warehouseIds?.includes(w.warehouseId)).map((w) => warehouseLabel(w)),
  ].join(", ");

  const reportWindowLabel = activeFilter.expiryWithinMonths
    ? `Expiry Within: ${expiryWithinMonthsLabel(activeFilter.expiryWithinMonths)}`
    : activeFilter.expiryFromMonth || activeFilter.expiryToMonth
      ? `Expiry Month: ${formatMonthRange(activeFilter.expiryFromMonth ?? "", activeFilter.expiryToMonth ?? "")}`
      : "";

  const columns: Column[] = [
    {
      key: "product",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[16%]",
      sortKey: "productName",
      render: (r) => r.productName,
      total: "Total",
      bodyClass: "font-semibold",
    },
    { key: "batch", header: "BATCH NO.", align: "left", width: "w-[10%]", render: (r) => r.batchNo, total: "" },
    {
      key: "supplier",
      header: "SUPPLIER NAME",
      align: "left",
      width: "w-[12%]",
      render: (r) => r.supplierName || "---",
      total: "",
    },
    {
      key: "expiry",
      header: "EXPIRY (MM/YYYY)",
      align: "left",
      width: "w-[12%]",
      sortKey: "expiryDate",
      render: (r) => toMonthYear(r.expiryDate),
      total: "",
    },
    {
      key: "days",
      header: "DAYS TO EXPIRY",
      align: "right",
      width: "w-[10%]",
      // The backend names it monthsToExpiry, but it holds days (negative once expired).
      render: (r) => r.monthsToExpiry,
      total: "",
    },
    {
      key: "stock",
      header: "STOCK QUANTITY",
      align: "right",
      width: "w-[11%]",
      render: (r) => r.quantity,
      total: summary?.totalStock ?? 0,
    },
    {
      key: "damaged",
      header: "DAMAGED QUANTITY",
      align: "right",
      width: "w-[11%]",
      render: (r) => r.damagedQuantity,
      // The summary has no damaged total, and a sum of this page alone would mislead.
      total: "",
    },
    {
      key: "status",
      header: "EXPIRY STATUS",
      align: "left",
      width: "w-[18%]",
      render: (r) => <StatusBadge status={r.expiryStatus} />,
      total: "",
    },
  ];

  const sortIcon = (key: StockExpiryReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: StockExpiryReportSortBy) => {
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
    setPeriod("Today");
    setTodayDate(toIsoDate(new Date()));
    setSpecificDate("");
    setFromMonth("");
    setToMonth("");
    setAsOfApplied(true);
    setPharmacyIds(null);
    setWarehouseIds([]);
    setExpiryStatus("");
    setExpiryWithin("3");
    setCustomFrom("");
    setCustomTo("");
    setProductId("");
    setBatchNo("");
    setSupplierIds([]);
    setCategories([]);
    setBrandNames([]);
    setAppliedFilter(null);
    setSortBy("expiryDate");
    setSortDir("asc");
    setPageIndex(0);
  };

  // Warehouse fills the fourth slot of the top row, unless a custom expiry range needs it.
  const warehouseInTopRow = !customWindow;

  const warehouseFilter = (
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
  );

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Stock Expiry Report"
        description="A product-wise, batch-wise and location-wise view of expired and near-expiry medicines as of a selected date."
        icon="/Reports/ClockPurple.svg"
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
              More Filters ({warehouseInTopRow ? 5 : 6})
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
          {period === "By Month Range" ? (
            <MonthRangeField
              label={dateFieldLabel}
              from={fromMonth}
              to={toMonth}
              onFromChange={setFromMonth}
              onToChange={setToMonth}
            />
          ) : period === "By Month" ? (
            <>
              <Dropdown
                label="Expiry Within"
                labelClassName="px-xxsm"
                options={EXPIRY_WITHIN_OPTIONS}
                value={expiryWithin}
                onChange={(value: string) => {
                  setExpiryWithin(value);
                  setCustomJustPicked(value === "CUSTOM");
                }}
                placeholder="Select"
              />
              {expiryWithin === "CUSTOM" && (
                <MonthRangeField
                  label="Month Range"
                  from={customFrom}
                  to={customTo}
                  onFromChange={setCustomFrom}
                  onToChange={setCustomTo}
                  openOnMount={customJustPicked}
                />
              )}
            </>
          ) : (
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
                onChange={(e) => setSpecificDate(e.target.value)}
                className={`${hiddenPickerClass} left-0 w-full`}
              />
            </div>
          )}

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
            label="Expiry Status"
            labelClassName="px-xxsm"
            options={EXPIRY_STATUS_OPTIONS}
            value={expiryStatus}
            onChange={(value: string) => setExpiryStatus(value)}
            placeholder="All"
            clearable
          />

          {warehouseInTopRow && warehouseFilter}

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              {!warehouseInTopRow && warehouseFilter}

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
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {asOfApplied && dateDisplay && (
            <FilterChip
              label={`${dateFieldLabel}: ${dateDisplay}`}
              onRemove={() => {
                if (period !== "By Month Range") return setAsOfApplied(false);
                setFromMonth("");
                setToMonth("");
              }}
            />
          )}
          {pharmacyLabel && <FilterChip label={`Pharmacy: ${pharmacyLabel}`} onRemove={() => setPharmacyIds([])} />}
          {expiryStatus && (
            <FilterChip label={`Expiry Status: ${expiryStatusLabel}`} onRemove={() => setExpiryStatus("")} />
          )}
          {showExpiryWithin && expiryWithin && (
            <FilterChip
              label={`Expiry Within: ${
                customWindow
                  ? formatMonthRange(customFrom, customTo) || "Custom"
                  : expiryWithinMonthsLabel(Number(expiryWithin))
              }`}
              onRemove={expiryWithin !== "3" ? () => setExpiryWithin("3") : undefined}
            />
          )}
        </div>
      </div>

      {/* KPI row: totals over every matching row, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Expired Stock"
          value={String(summary?.expiredStock ?? 0)}
          highlight={plural(summary?.expiredBatches ?? 0, "batch")}
          caption="already past expiry"
          icon={<TriangleAlert className="size-6 text-warning-600" strokeWidth={1.5} />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
        <KpiCard
          title="Expiring This Month"
          value={String(summary?.expiringThisMonthQuantity ?? 0)}
          highlight={plural(summary?.expiringThisMonthBatches ?? 0, "batch")}
          caption="expire this month"
          icon={<Clock className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Expiring Soon"
          value={String(summary?.expiringSoonQuantity ?? 0)}
          highlight={plural(summary?.expiringSoonBatches ?? 0, "batch")}
          caption="within 3 months"
          icon={<Box className="size-6 fill-secondary-700 text-white" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Total Stock in Window"
          value={String(summary?.totalStock ?? 0)}
          highlight={plural(summary?.totalStockBatches ?? 0, "batch")}
          caption="to act on"
          icon={<Scale className="size-6 text-danger-700" strokeWidth={1.5} />}
          bgClass="bg-danger-50"
          highlightClass="text-danger-700"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Expiry Details</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {totalRecords} records
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">
              As-of Date: {formatDisplayDate(activeFilter.asOfDate ?? todayDate)}
            </p>
            {reportLocationLabel && <p className="text-p3 text-pneutral-500">Location: {reportLocationLabel}</p>}
            {reportWindowLabel && <p className="text-p3 text-pneutral-500">{reportWindowLabel}</p>}
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Eight columns don't fit below lg, so rows stack as cards there instead of scrolling sideways.
            Paper always gets the table. */}
        <div className="flex flex-col gap-sm lg:hidden print:hidden">
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
              <div key={rowKey(row, index)} className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm">
                <div className="flex items-start justify-between gap-sm">
                  <div className="flex min-w-0 flex-col">
                    <p className="text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.productName}</p>
                    <p className="text-p4 text-pneutral-500 wrap-anywhere">{row.locationName}</p>
                  </div>
                  <StatusBadge status={row.expiryStatus} />
                </div>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns.slice(1, -1).map((col) => (
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
        <div className="hidden w-full overflow-hidden rounded-lg border border-pneutral-200 lg:block print:block!">
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
                    className={`h-15 border-b border-pneutral-200 px-xsm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word xl:px-sm ${col.width} ${
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
              {!reportLoading &&
                !reportError &&
                rows.map((row, index) => (
                  <tr key={rowKey(row, index)} className="bg-white">
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={`h-15 border-b border-pneutral-200 px-xsm py-xsm text-p3 text-pneutral-900 wrap-anywhere xl:px-sm ${
                          col.align === "right" ? "text-right" : "text-left"
                        } ${i < columns.length - 1 ? "border-r" : ""} ${col.bodyClass ?? ""}`}
                      >
                        {col.key === "product" ? (
                          <>
                            {col.render(row)}
                            <span className="block text-p4 font-normal text-pneutral-500">{row.locationName}</span>
                          </>
                        ) : (
                          col.render(row)
                        )}
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
            {/* Same page-number control as the other reports (e.g. Bill Summary).
                PaginationControl is 1-based; pageIndex is 0-based. */}
            <PaginationControl
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={report?.expiryDetails.totalRecords ?? 0}
              onPageChange={(page) => setPageIndex(page - 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockExpiryReportPage;
