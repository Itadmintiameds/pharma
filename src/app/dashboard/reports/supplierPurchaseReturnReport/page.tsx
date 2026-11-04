"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  Scale,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import ReportHeader from "../components/ReportHeader";
import { useReportActions } from "../components/useReportActions";
import {
  downloadSupplierPurchaseReturnExport,
  getSupplierPurchaseReturnReport,
} from "@/services/AuditReports/SupplierPurchaseReturnService";
import { ProductMasterService } from "@/services/ProductMasterService";
import { ProductService } from "@/services/ProductService";
import { getSuppliersForLocation } from "@/services/SupplierService";
import type {
  PurchaseReturnStatus,
  SupplierPurchaseReturnReportFilter,
  SupplierPurchaseReturnReportResponse,
  SupplierPurchaseReturnReportRow,
  SupplierPurchaseReturnReportSortBy,
} from "@/types/AuditReports/SupplierPurchaseReturnData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

const STATUS_LABEL: Record<PurchaseReturnStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const STATUS_OPTIONS: DropdownOption[] = Object.entries(STATUS_LABEL).map(([value, label]) => ({ label, value }));

// Only confirmed returns have moved stock back to the supplier, so the report opens on them.
const DEFAULT_STATUS: PurchaseReturnStatus = "CONFIRMED";

const GST_RATE_OPTIONS: DropdownOption[] = [0, 5, 12, 18, 28].map((rate) => ({
  label: `${rate}%`,
  value: String(rate),
}));

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
const textInputClass = `${fieldBoxClass} text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:border-secondary-700`;

// The design's 6px rounded track (pneutral-200) and thumb (pneutral-500) below the table.
const scrollbarClass =
  "[scrollbar-color:var(--color-pneutral-500)_var(--color-pneutral-200)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-pneutral-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-pneutral-500";

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

// Indian grouping with paise: 3334.31 → "3,334.31".
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const percentOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

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
  sortKey?: SupplierPurchaseReturnReportSortBy;
  render: (row: SupplierPurchaseReturnReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const rowKey = (row: SupplierPurchaseReturnReportRow, index: number) =>
  `${row.purchaseReturnNo}-${row.batchNo}-${index}`;

const SupplierPurchaseReturnReportPage = () => {
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

  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<DropdownOption[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS);
  const [gstRates, setGstRates] = useState<string[]>([]);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { pharmacies, loading: pharmaciesLoading } = usePharmacyStore();
  const { warehouses, loading: warehousesLoading } = useWarehouseStore();
  // Returns go back from warehouses as well as pharmacies, so nothing picked (every
  // accessible location) is the starting point, as the design's "Location: All".
  const [pharmacyIds, setPharmacyIds] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [purchaseReturnNumber, setPurchaseReturnNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<ReportProduct[]>([]);
  // Batch numbers held at the source pharmacies, by productId.
  const [batchesByProduct, setBatchesByProduct] = useState<Map<string, string[]>>(new Map());
  const [productsLoading, setProductsLoading] = useState(true);
  const [batchNo, setBatchNo] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [brandNames, setBrandNames] = useState<string[]>([]);
  // Expiry Month/Year range as YYYY-MM; either end may be left open.
  const [expiryFrom, setExpiryFrom] = useState("");
  const [expiryTo, setExpiryTo] = useState("");
  const expiryFromRef = useRef<HTMLInputElement>(null);
  const expiryToRef = useRef<HTMLInputElement>(null);

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<SupplierPurchaseReturnReportSortBy>("returnDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // The filters last sent with Search; null until then, so the first load uses today.
  const [appliedFilter, setAppliedFilter] = useState<SupplierPurchaseReturnReportFilter | null>(null);
  const [report, setReport] = useState<SupplierPurchaseReturnReportResponse | null>(null);
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

  // Suppliers belong to one pharmacy or warehouse, and /supplier/allSupplier only
  // lists the navbar location's. The report spans every location, so the Supplier
  // filter gathers them from each one; otherwise a warehouse's returns could only
  // be filtered by a same-named supplier of the pharmacy, which matches nothing.
  // Joined into a string so the effect re-runs on a real change of locations only.
  const supplierLocationsKey = [
    ...pharmacies.map((p) => `P:${p.pharmacyId}:${p.pharmacyName}`),
    ...warehouses.map((w) => `W:${w.warehouseId}:${warehouseLabel(w)}`),
  ].join("|");

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

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  const warehouseOptions: DropdownOption[] = useMemo(
    () => warehouses.map((w) => ({ label: warehouseLabel(w), value: w.warehouseId })),
    [warehouses],
  );

  // Product and brand options come from the picked pharmacies, or every pharmacy when
  // none is picked. Joined into a string so the effect re-runs on a real change only.
  const productSourceKey = (pharmacyIds.length ? pharmacyIds : pharmacies.map((p) => p.pharmacyId)).join(",");

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      const ids = productSourceKey ? productSourceKey.split(",") : [];
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
        console.error("Unable to fetch products", error);
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
  }, [productSourceKey]);

  const productOptions: DropdownOption[] = useMemo(
    () => products.map((p) => ({ label: p.productName, value: p.productId })),
    [products],
  );

  const brandOptions: DropdownOption[] = useMemo(
    () =>
      [...new Set(products.map((p) => p.brandName).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((brand) => ({ label: brand, value: brand })),
    [products],
  );

  // The picked product's batches; with no product picked, every batch at the source pharmacies.
  const batchOptions: DropdownOption[] = useMemo(() => {
    const numbers = productId
      ? (batchesByProduct.get(productId) ?? [])
      : [...new Set([...batchesByProduct.values()].flat())].sort((a, b) => a.localeCompare(b));
    return numbers.map((n) => ({ label: n, value: n }));
  }, [productId, batchesByProduct]);

  const selectedProductName = products.find((p) => p.productId === productId)?.productName ?? "";

  const handleProductChange = (value: string) => {
    setProductId(value);
    // A batch of the previous product would match nothing.
    setBatchNo("");
  };

  // The return-date window each tab reports on.
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

  // "All" when nothing narrows the locations (the backend then uses every location the
  // user can access).
  const locationLabelFor = (pIds: string[] = [], wIds: string[] = []) => {
    if (!pIds.length && !wIds.length) return "All";
    return [
      ...pharmacies.filter((p) => pIds.includes(p.pharmacyId)).map((p) => p.pharmacyName),
      ...warehouses.filter((w) => wIds.includes(w.warehouseId)).map((w) => warehouseLabel(w)),
    ].join(", ");
  };

  const statusLabel = (value?: string) => STATUS_LABEL[value as PurchaseReturnStatus] ?? "All";

  // The backend reads a missing status as CONFIRMED, so "All" has to be asked for.
  const statusesFor = (value: string): SupplierPurchaseReturnReportFilter["statuses"] =>
    value ? [value as PurchaseReturnStatus] : ["ALL"];

  const buildFilter = (): SupplierPurchaseReturnReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: pharmacyIds.length ? pharmacyIds : undefined,
    warehouseIds: warehouseIds.length ? warehouseIds : undefined,
    supplierIds: supplierIds.length ? supplierIds.map(Number) : undefined,
    statuses: statusesFor(status),
    purchaseReturnNo: purchaseReturnNumber.trim() || undefined,
    purchaseInvoiceNo: invoiceNumber.trim() || undefined,
    productNames: selectedProductName ? [selectedProductName] : undefined,
    productCategoryIds: categories.length ? categories.map(Number) : undefined,
    brandNames: brandNames.length ? brandNames : undefined,
    batchNo: batchNo.trim() || undefined,
    expiryFrom: expiryFrom || undefined,
    expiryTo: expiryTo || undefined,
    gstPercentages: gstRates.length ? gstRates.map(Number) : undefined,
  });

  const activeFilter: SupplierPurchaseReturnReportFilter = appliedFilter ?? {
    fromDate: todayDate,
    toDate: todayDate,
    statuses: [DEFAULT_STATUS],
  };

  // The status the report on screen was run for; "ALL" reads as "All".
  const activeStatus = activeFilter.statuses?.[0];

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...activeFilter, sortBy, sortDir, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getSupplierPurchaseReturnReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(
          error instanceof Error ? error.message : "Failed to fetch the supplier purchase return report.",
        );
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
  const { printId, printReport, print, download, busy } = useReportActions<SupplierPurchaseReturnReportResponse>({
    report,
    hasMoreRows: (r) =>
      (r.purchaseReturnDetails?.totalRecords ?? 0) > (r.purchaseReturnDetails?.data.length ?? 0),
    fetchAll: () => getSupplierPurchaseReturnReport({ ...activeFilter, sortBy, sortDir, unpaged: true }),
    exportReport: (format) => downloadSupplierPurchaseReturnExport(format, { ...activeFilter, sortBy, sortDir }),
    // supplier-purchase-return_2026-10-08, supplier-purchase-return_2026-10-01_to_2026-10-08 —
    // matching the export's file names.
    fileStem: `supplier-purchase-return_${
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

  const rows = shownReport?.purchaseReturnDetails?.data ?? [];
  const summary = shownReport?.summary;
  const totalReturnAmount = summary?.totalReturnAmount ?? 0;
  const gstAmount = summary?.gstReversalAmount ?? 0;
  const physicalReturnQuantity = summary?.totalPhysicalReturnQuantity ?? 0;
  const returnFreeQuantity = summary?.freeReturnQuantity ?? 0;
  // The physical quantity counts free units too; the Return Purchase Qty total does not.
  const returnPurchaseQuantity = physicalReturnQuantity - returnFreeQuantity;
  const totalRecords = shownReport?.purchaseReturnDetails?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.purchaseReturnDetails?.totalPages ?? 1);
  const firstRecord = totalRecords ? shownPageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(shownPageIndex * pageSize + rows.length, totalRecords);

  const reportPeriodLabel =
    activeFilter.fromDate || activeFilter.toDate
      ? `${formatDisplayDate(activeFilter.fromDate ?? "") || "…"} to ${formatDisplayDate(activeFilter.toDate ?? "") || "…"}`
      : formatDisplayDate(todayDate);

  const columns: Column[] = [
    {
      key: "date",
      header: "RETURN DATE",
      align: "left",
      width: "w-[107px]",
      sortKey: "returnDate",
      render: (r) => r.returnDate,
      total: "Total",
    },
    {
      key: "returnNo",
      header: "PURCHASE RETURN NO.",
      align: "left",
      width: "w-[126px]",
      render: (r) => r.purchaseReturnNo,
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    {
      key: "invoice",
      header: "PURCHASE INVOICE NO.",
      align: "left",
      width: "w-[103px]",
      render: (r) => r.purchaseInvoiceNo || "---",
      total: "",
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
    { key: "location", header: "LOCATION", align: "left", width: "w-[102px]", render: (r) => r.locationName, total: "" },
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
      render: (r) => r.expiryDate || "---",
      total: "",
    },
    {
      key: "reason",
      header: "RETURN REASON",
      align: "left",
      width: "w-[92px]",
      render: (r) => r.returnReason || "---",
      total: "",
    },
    {
      key: "purchaseQty",
      header: "RETURN PURCHASE QTY",
      align: "right",
      width: "w-[103px]",
      render: (r) => r.returnQuantity ?? 0,
      total: returnPurchaseQuantity,
    },
    {
      key: "freeQty",
      header: "RETURN FREE QTY",
      align: "right",
      width: "w-[85px]",
      render: (r) => r.freeReturnQuantity ?? 0,
      total: returnFreeQuantity,
    },
    {
      key: "rate",
      header: "RETURN RATE (₹)",
      align: "right",
      width: "w-[85px]",
      render: (r) => money(r.returnRate),
      total: "---",
    },
    {
      key: "gross",
      header: "GROSS AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.grossAmount),
      // The summary carries no gross / discount totals, and a page's sum would
      // understate them once there is more than one page.
      total: "---",
    },
    {
      key: "discount",
      header: "DISCOUNT (₹)",
      align: "right",
      width: "w-[100px]",
      render: (r) => money(r.discount),
      total: "---",
    },
    {
      key: "taxable",
      header: "TAXABLE AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.taxableAmount),
      total: money(summary?.taxableAmount),
    },
    {
      key: "gstRate",
      header: "GST %",
      align: "right",
      width: "w-[55px]",
      // Already "5%" / "Exempted" from the backend.
      render: (r) => r.gstPercentage || "---",
      total: "---",
    },
    {
      key: "gstAmount",
      header: "GST AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.gstAmount),
      total: money(gstAmount),
    },
    {
      key: "totalAmount",
      header: "TOTAL AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.totalAmount),
      total: money(totalReturnAmount),
      bodyClass: "font-semibold",
    },
  ];

  const sortIcon = (key: SupplierPurchaseReturnReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: SupplierPurchaseReturnReportSortBy) => {
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
    setSupplierIds([]);
    setStatus(DEFAULT_STATUS);
    setGstRates([]);
    setPharmacyIds([]);
    setWarehouseIds([]);
    setPurchaseReturnNumber("");
    setInvoiceNumber("");
    setProductId("");
    setBatchNo("");
    setCategories([]);
    setBrandNames([]);
    setExpiryFrom("");
    setExpiryTo("");
    setAppliedFilter(null);
    setSortBy("returnDate");
    setSortDir("asc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;

  return (
    <div id={printId} className="flex w-full flex-col gap-md">
      <ReportHeader
        title="Supplier Purchase Return Report"
        description="A transaction-wise view of products returned to suppliers through the Purchase Return workflow during a selected reporting period."
        icon="/StockReturn/receipt-refund-outline.svg"
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
              More Filters (9)
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
            label="Purchase Return Status"
            labelClassName="px-xxsm"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value: string) => setStatus(value)}
            placeholder="All"
            clearable
          />

          <Dropdown
            label="GST Rate"
            labelClassName="px-xxsm"
            multiple
            options={GST_RATE_OPTIONS}
            value={gstRates}
            onChange={(values: string[]) => setGstRates(values)}
            placeholder="Select"
          />

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
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
                label="Warehouse"
                labelClassName="px-xxsm"
                multiple
                selectAll
                options={warehouseOptions}
                value={warehouseIds}
                onChange={(ids: string[]) => setWarehouseIds(ids)}
                placeholder="All"
                isLoading={warehousesLoading}
              />

              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Purchase Return No.</span>
                <input
                  type="text"
                  value={purchaseReturnNumber}
                  onChange={(e) => setPurchaseReturnNumber(e.target.value)}
                  placeholder="e.g. PR-2026-00001"
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
                <span className={fieldLabelClass}>Expiry (MM/YYYY)</span>
                <div className={`${fieldBoxClass} gap-xsm!`}>
                  <button
                    type="button"
                    aria-label="Pick expiry from month"
                    onClick={() => openPicker(expiryFromRef.current)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                  >
                    <span className={`truncate text-p3 ${expiryFrom ? "text-pneutral-900" : "text-pneutral-500"}`}>
                      {formatDisplayMonth(expiryFrom) || "From"}
                    </span>
                    <Calendar className="size-4 shrink-0 text-pneutral-900" />
                  </button>
                  <span className="text-p3 text-pneutral-500">–</span>
                  <button
                    type="button"
                    aria-label="Pick expiry to month"
                    onClick={() => openPicker(expiryToRef.current)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-xxsm"
                  >
                    <span className={`truncate text-p3 ${expiryTo ? "text-pneutral-900" : "text-pneutral-500"}`}>
                      {formatDisplayMonth(expiryTo) || "To"}
                    </span>
                    <Calendar className="size-4 shrink-0 text-pneutral-900" />
                  </button>
                  {(expiryFrom || expiryTo) && (
                    <button
                      type="button"
                      aria-label="Clear expiry range"
                      onClick={() => {
                        setExpiryFrom("");
                        setExpiryTo("");
                      }}
                      className="cursor-pointer text-pneutral-500"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={expiryFromRef}
                  type="month"
                  tabIndex={-1}
                  aria-hidden
                  value={expiryFrom}
                  max={expiryTo || undefined}
                  onChange={(e) => setExpiryFrom(e.target.value)}
                  className={`${hiddenPickerClass} left-0 w-1/2`}
                />
                <input
                  ref={expiryToRef}
                  type="month"
                  tabIndex={-1}
                  aria-hidden
                  value={expiryTo}
                  min={expiryFrom || undefined}
                  onChange={(e) => setExpiryTo(e.target.value)}
                  className={`${hiddenPickerClass} right-0 w-1/2`}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {dateRangeApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
          )}
          <FilterChip label={`Supplier: ${supplierLabelFor(supplierIds)}`} onRemove={() => setSupplierIds([])} />
          <FilterChip label={`Purchase Return Status: ${statusLabel(status)}`} onRemove={() => setStatus("")} />
        </div>
      </div>

      {/* KPI row: totals over every matching row, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          // "Confirmed Purchase Returns" in the design; follows the status on screen.
          title={
            activeStatus && activeStatus !== "ALL" ? `${statusLabel(activeStatus)} Purchase Returns` : "Purchase Returns"
          }
          value={String(summary?.purchaseReturnCount ?? 0)}
          highlight={plural(summary?.purchaseInvoiceCount ?? 0, "invoice")}
          caption="returned against"
          icon={<Image src="/StockReturn/receipt-refund-outline-kpi.svg" alt="" width={24} height={24} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Total Return Amount"
          value={`₹${money(totalReturnAmount)}`}
          highlight={`₹${money(summary?.taxableAmount)}`}
          caption="taxable amount"
          icon={<Banknote className="size-6 text-success-800" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="GST Reversal Amount"
          value={`₹${money(gstAmount)}`}
          highlight={`${Math.round(summary?.gstSharePercentage ?? percentOf(gstAmount, totalReturnAmount))}%`}
          caption="of return amount"
          icon={<Scale className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Total Physical Return Qty"
          value={String(physicalReturnQuantity)}
          highlight={`${returnFreeQuantity} free`}
          caption="units included"
          icon={<Box className="size-6 text-danger-700" strokeWidth={1.5} />}
          bgClass="bg-danger-50"
          highlightClass="text-danger-700"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Purchase Return Details</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, "record")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Report Period: {reportPeriodLabel}</p>
            <p className="text-p3 text-pneutral-500">Supplier: {supplierLabelFor(activeFilter.supplierIds)}</p>
            <p className="text-p3 text-pneutral-500">
              Location: {locationLabelFor(activeFilter.pharmacyIds, activeFilter.warehouseIds)}
            </p>
            <p className="text-p3 text-pneutral-500">Purchase Return Status: {statusLabel(activeStatus)}</p>
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Eighteen columns are cramped on phones, so rows stack as cards below md.
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
                    <p className="text-p4 text-pneutral-500">{row.returnDate}</p>
                  </div>
                  <span className="text-p3 font-semibold whitespace-nowrap text-primary-800">
                    {row.purchaseReturnNo}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
                  {columns
                    .filter((col) => !["date", "product", "returnNo"].includes(col.key))
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
                .filter((col) => col.total !== "" && col.total !== "---" && col.key !== "date")
                .map((col) => (
                  <div key={col.key} className="flex min-w-0 flex-col">
                    <span className="text-p4 font-medium">{col.header}</span>
                    <span>{col.total}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* The design's columns are wider than the card, so the table always scrolls sideways
            with the styled track sitting 16px below it. */}
        <div className={`hidden w-full overflow-x-auto pb-md md:block print:block! print:pb-0 ${scrollbarClass}`}>
          <div className="min-w-[1733px] overflow-hidden rounded-lg border border-pneutral-200">
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

export default SupplierPurchaseReturnReportPage;
