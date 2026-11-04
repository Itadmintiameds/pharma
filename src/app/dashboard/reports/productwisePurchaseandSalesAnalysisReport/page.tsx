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
  CircleAlert,
  CircleCheck,
  Download,
  Funnel,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { getProductWiseReport } from "@/services/AuditReports/ProductWiseService";
import { ProductMasterService } from "@/services/ProductMasterService";
import { ProductService } from "@/services/ProductService";
import { getSuppliersForLocation } from "@/services/SupplierService";
import type {
  ProductWiseReportFilter,
  ProductWiseReportResponse,
  ProductWiseReportRow,
  ProductWiseReportSortBy,
} from "@/types/AuditReports/ProductWiseData";
import { usePharmacyStore } from "@/store/pharmacyStore";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

// The slice of a /product/batches/pharmacy/{id} row (BatchStockDto) the Product Name filter needs.
interface ReportProduct {
  productId: string;
  productName: string;
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

// Indian grouping with paise: 145000 → "1,45,000.00".
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Paise only when there are any: 4850 → "4,850", 4850.5 → "4,850.5".
const shortMoney = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Indian grouping for quantities: 2405 → "2,405".
const qty = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-IN");

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
  sortKey?: ProductWiseReportSortBy;
  render: (row: ProductWiseReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

interface ReportTableProps {
  columns: Column[];
  rows: ProductWiseReportRow[];
  sortBy: ProductWiseReportSortBy;
  sortDir: "asc" | "desc";
  onSort: (key: ProductWiseReportSortBy) => void;
  showRows: boolean;
  emptyMessage: string;
  isError: boolean;
}

const rowKey = (row: ProductWiseReportRow, index: number) => `${row.productId}-${row.batchNo}-${index}`;

// The bordered grid both tables of the design share: 60px purple header and
// rows with full cell borders, and a lavender Total row.
const ReportTable = ({ columns, rows, sortBy, sortDir, onSort, showRows, emptyMessage, isError }: ReportTableProps) => {
  const sortIcon = (key: ProductWiseReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  return (
    <div className={`w-full overflow-x-auto ${scrollbarClass}`}>
      <div className="min-w-[1106px] overflow-hidden rounded-lg border border-pneutral-200">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-secondary-600">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  aria-sort={
                    col.sortKey && col.sortKey === sortBy ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-label-l3 font-semibold text-pneutral-50 wrap-break-word ${col.width} ${
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

// Up to three page numbers, kept around the current page.
const visiblePages = (pageIndex: number, pageCount: number) => {
  const start = Math.max(0, Math.min(pageIndex - 1, pageCount - 3));
  return Array.from({ length: Math.min(3, pageCount) }, (_, i) => start + i);
};

const ProductWisePurchaseAndSalesAnalysisReportPage = () => {
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
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<DropdownOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<DropdownOption[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [batchNo, setBatchNo] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<ProductWiseReportSortBy>("productName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // The filters last sent with Search; null until then, so the first load uses today.
  const [appliedFilter, setAppliedFilter] = useState<ProductWiseReportFilter | null>(null);
  const [report, setReport] = useState<ProductWiseReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  // No pick means every pharmacy, so the product and supplier lists span all of
  // them. Joined into a string so the effects re-run on a real change of
  // selection, not on every render's fresh array.
  const scopePharmacyIdsKey = (pharmacyIds.length ? pharmacyIds : pharmacies.map((p) => p.pharmacyId)).join(",");

  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      const ids = scopePharmacyIdsKey ? scopePharmacyIdsKey.split(",") : [];
      setProductsLoading(true);
      try {
        const responses = await Promise.all(ids.map((id) => ProductService.getBatchesForPharmacy(id)));
        if (!active) return;
        // Batches repeat a product once per batch (and per pharmacy); keep one option per product.
        const byId = new Map<string, string>();
        responses.forEach((res) =>
          (res?.data ?? []).forEach((b: ReportProduct) => {
            if (b.productId && !byId.has(b.productId)) byId.set(b.productId, b.productName);
          }),
        );
        setProductOptions(
          [...byId]
            .map(([value, label]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      } catch (error) {
        console.error("Unable to fetch products for the selected pharmacies", error);
        if (active) setProductOptions([]);
      } finally {
        if (active) setProductsLoading(false);
      }
    };
    fetchProducts();
    return () => {
      active = false;
    };
  }, [scopePharmacyIdsKey]);

  // Suppliers belong to one pharmacy, and /supplier/allSupplier only lists the
  // given pharmacy's, so the Supplier filter gathers them from each one.
  useEffect(() => {
    let active = true;
    const fetchSuppliers = async () => {
      const ids = scopePharmacyIdsKey ? scopePharmacyIdsKey.split(",") : [];
      setSuppliersLoading(true);
      try {
        // One failing pharmacy (e.g. no access) shouldn't empty the whole list.
        const results = await Promise.allSettled(ids.map((id) => getSuppliersForLocation({ pharmacyId: id })));
        if (!active) return;
        const byId = new Map<string, string>();
        results.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Unable to fetch suppliers", result.reason);
            return;
          }
          (result.value ?? []).forEach((s) => {
            if (s.supplierId != null && !byId.has(String(s.supplierId))) byId.set(String(s.supplierId), s.supplierName);
          });
        });
        setSupplierOptions(
          [...byId]
            .map(([value, label]) => ({ label, value }))
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
  }, [scopePharmacyIdsKey]);

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

  // The reporting window each tab covers.
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
    const picked = new Set(ids.map(String));
    return options
      .filter((o) => picked.has(String(o.value)))
      .map((o) => o.label)
      .join(", ");
  };

  // No pharmacy picked means every location the user can access, i.e. the whole organization.
  const reportingScopeFor = (ids: string[] = []) => (ids.length ? optionLabelFor(pharmacyOptions, ids) : "Organization");

  const buildFilter = (): ProductWiseReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: pharmacyIds.length ? pharmacyIds : undefined,
    productIds: productIds.length ? productIds : undefined,
    supplierIds: supplierIds.length ? supplierIds.map(Number) : undefined,
    batchNo: batchNo.trim() || undefined,
    productCategoryIds: categoryIds.length ? categoryIds.map(Number) : undefined,
  });

  const activeFilter: ProductWiseReportFilter = appliedFilter ?? { fromDate: todayDate, toDate: todayDate };

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...activeFilter, sortBy, sortDir, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getProductWiseReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(
          error instanceof Error ? error.message : "Failed to fetch the product-wise purchase and sales analysis report.",
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

  const summary = report?.summary;
  const rows = report?.productDetails?.data ?? [];
  const totalRecords = report?.productDetails?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.productDetails?.totalPages ?? 1);
  const firstRecord = totalRecords ? pageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(pageIndex * pageSize + rows.length, totalRecords);

  // The response doesn't echo the period, so it is read off the last search the
  // way the backend does: a missing from date is today, a missing to date the from date.
  const reportFrom = activeFilter.fromDate ?? toIsoDate(new Date());
  const reportPeriodLabel = `${formatDisplayDate(reportFrom)} to ${formatDisplayDate(activeFilter.toDate ?? reportFrom)}`;

  const quantityColumns: Column[] = [
    {
      key: "productName",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[164px]",
      sortKey: "productName",
      render: (r) => r.productName,
      total: "Total",
      bodyClass: "font-semibold",
    },
    {
      key: "batchNo",
      header: "BATCH NO.",
      align: "left",
      width: "w-[129px]",
      render: (r) => r.batchNo || "---",
      total: "",
    },
    {
      key: "purchaseQuantity",
      header: "PURCHASE QTY",
      align: "right",
      width: "w-[149px]",
      render: (r) => qty(r.purchaseQuantity),
      total: qty(summary?.totalPurchaseQuantity),
    },
    {
      key: "supplierReturnQuantity",
      header: "SUPPLIER RETURN QTY",
      align: "right",
      width: "w-[142px]",
      render: (r) => qty(r.supplierReturnQuantity),
      total: qty(summary?.totalSupplierReturnQuantity),
    },
    {
      key: "netPurchaseQuantity",
      header: "NET PURCHASE QTY",
      align: "right",
      width: "w-[149px]",
      render: (r) => qty(r.netPurchaseQuantity),
      total: qty(summary?.totalNetPurchaseQuantity),
      bodyClass: "font-semibold",
    },
    {
      key: "saleQuantity",
      header: "SALES QTY",
      align: "right",
      width: "w-[119px]",
      render: (r) => qty(r.saleQuantity),
      total: qty(summary?.totalSaleQuantity),
    },
    {
      key: "salesReturnQuantity",
      header: "SALES RETURN QTY",
      align: "right",
      width: "w-[132px]",
      render: (r) => qty(r.salesReturnQuantity),
      total: qty(summary?.totalSalesReturnQuantity),
    },
    {
      key: "netSaleQuantity",
      header: "NET SALES QTY",
      align: "right",
      width: "w-[122px]",
      render: (r) => qty(r.netSaleQuantity),
      total: qty(summary?.totalNetSaleQuantity),
      bodyClass: "font-semibold",
    },
  ];

  const valueColumns: Column[] = [
    {
      key: "productName",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[175px]",
      sortKey: "productName",
      // Rows are per batch, so the batch tells a product's rows apart.
      render: (r) => (
        <>
          {r.productName}
          {r.batchNo && <span className="block text-p4 font-normal text-pneutral-500">{r.batchNo}</span>}
        </>
      ),
      total: "Total",
      bodyClass: "font-semibold",
    },
    {
      key: "purchaseAmount",
      header: "PURCHASE AMOUNT (₹)",
      align: "right",
      width: "w-[160px]",
      render: (r) => money(r.purchaseAmount),
      total: money(summary?.totalPurchaseAmount),
    },
    {
      key: "supplierReturnAmount",
      header: "SUPPLIER RETURN AMOUNT (₹)",
      align: "right",
      width: "w-[153px]",
      render: (r) => money(r.supplierReturnAmount),
      total: money(summary?.totalSupplierReturnAmount),
    },
    {
      key: "netPurchaseAmount",
      header: "NET PURCHASE AMOUNT (₹)",
      align: "right",
      width: "w-[160px]",
      render: (r) => money(r.netPurchaseAmount),
      total: money(summary?.totalNetPurchaseAmount),
      bodyClass: "font-semibold",
    },
    {
      key: "saleAmount",
      header: "SALES AMOUNT (₹)",
      align: "right",
      width: "w-[160px]",
      render: (r) => money(r.saleAmount),
      total: money(summary?.totalSaleAmount),
    },
    {
      key: "salesReturnAmount",
      header: "SALES RETURN AMOUNT (₹)",
      align: "right",
      width: "w-[146px]",
      render: (r) => money(r.salesReturnAmount),
      total: money(summary?.totalSalesReturnAmount),
    },
    {
      key: "netSaleAmount",
      header: "NET SALES AMOUNT (₹)",
      align: "right",
      width: "w-[152px]",
      render: (r) => money(r.netSaleAmount),
      total: money(summary?.totalNetSaleAmount),
      bodyClass: "font-semibold",
    },
  ];

  // Both tables show the same page of product batches, so they share one sort.
  const handleSort = (key: ProductWiseReportSortBy) => {
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
    setProductIds([]);
    setSupplierIds([]);
    setBatchNo("");
    setCategoryIds([]);
    setAppliedFilter(null);
    setSortBy("productName");
    setSortDir("asc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const showRows = !reportLoading && !reportError && rows.length > 0;

  const emptyCard = (
    <p
      className={`rounded-lg border border-pneutral-200 px-sm py-md text-center text-p3 ${
        reportError ? "text-warning-600" : "text-pneutral-500"
      }`}
    >
      {emptyMessage}
    </p>
  );

  // Phones get each batch as a card instead of a wide table.
  const mobileCards = (columns: Column[], total: { label: string; value: string }[]) => (
    <div className="flex flex-col gap-sm md:hidden">
      {!showRows && emptyCard}
      {showRows &&
        rows.map((row, index) => (
          <div key={rowKey(row, index)} className="flex flex-col gap-sm rounded-lg border border-pneutral-200 p-sm">
            <div className="flex min-w-0 flex-col">
              <p className="text-p3 font-semibold text-pneutral-900 wrap-anywhere">{row.productName}</p>
              <p className="text-p3 text-pneutral-500">{row.batchNo || "---"}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-md gap-y-xsm text-p3">
              {columns
                .filter((col) => !["productName", "batchNo"].includes(col.key))
                .map((col) => (
                  <div key={col.key} className="flex min-w-0 flex-col">
                    <dt className="text-p4 text-pneutral-500">{col.header}</dt>
                    <dd className={`text-pneutral-900 wrap-anywhere ${col.bodyClass ?? ""}`}>{col.render(row)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      {showRows && (
        <div className="flex flex-col gap-xsm rounded-lg bg-primary-100 p-sm text-p3 font-semibold text-primary-900">
          <span>Total</span>
          {total.map((t) => (
            <div key={t.label} className="flex items-center justify-between gap-sm">
              <span>{t.label}</span>
              <span>{t.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-md">
      {/* Page header */}
      <div className="flex flex-col gap-md md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-md">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
            <RefreshCw className="size-7 text-secondary-700" strokeWidth={1.5} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
            <h1 className="text-h5 font-semibold text-pneutral-900">Product-wise Purchase and Sales Analysis Report</h1>
            <p className="text-p3 text-pneutral-500">
              A consolidated view of products purchased from suppliers and sold through pharmacy billing during a
              selected reporting period.
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
              More Filters (2)
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
            label="Product Name"
            labelClassName="px-xxsm"
            multiple
            options={productOptions}
            value={productIds}
            onChange={(values: string[]) => setProductIds(values)}
            placeholder="Search"
            searchable
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

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              <label className="flex min-w-0 flex-col">
                <span className={fieldLabelClass}>Batch No.</span>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. PCM001"
                  className={textInputClass}
                />
              </label>

              <Dropdown
                label="Product Category"
                labelClassName="px-xxsm"
                multiple
                selectAll
                options={categoryOptions}
                value={categoryIds}
                onChange={(values: string[]) => setCategoryIds(values)}
                placeholder="All"
                isLoading={categoriesLoading}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {dateRangeApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
          )}
          <FilterChip label={`Reporting Scope: ${reportingScopeFor(pharmacyIds)}`} onRemove={() => setPharmacyIds([])} />
          {/* The other filters show a chip only once set, as in the design. */}
          {productIds.length > 0 && (
            <FilterChip
              label={`Product: ${optionLabelFor(productOptions, productIds)}`}
              onRemove={() => setProductIds([])}
            />
          )}
          {supplierIds.length > 0 && (
            <FilterChip
              label={`Supplier: ${optionLabelFor(supplierOptions, supplierIds)}`}
              onRemove={() => setSupplierIds([])}
            />
          )}
          {batchNo.trim() && <FilterChip label={`Batch No.: ${batchNo.trim()}`} onRemove={() => setBatchNo("")} />}
          {categoryIds.length > 0 && (
            <FilterChip
              label={`Product Category: ${optionLabelFor(categoryOptions, categoryIds)}`}
              onRemove={() => setCategoryIds([])}
            />
          )}
        </div>
      </div>

      {/* KPI row: totals over every matching product batch, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Net Purchase Qty"
          value={qty(summary?.totalNetPurchaseQuantity)}
          highlight={plural(summary?.totalSupplierReturnQuantity ?? 0, "unit")}
          caption="returned to suppliers"
          icon={<Box className="size-6 fill-primary-800 text-white" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Net Sales Qty"
          value={qty(summary?.totalNetSaleQuantity)}
          highlight={plural(summary?.totalSalesReturnQuantity ?? 0, "unit")}
          caption="returned by customers"
          icon={<CircleCheck className="size-6 fill-success-800 text-white" strokeWidth={1.5} />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Net Purchase Amount"
          value={`₹${money(summary?.totalNetPurchaseAmount)}`}
          highlight={`₹${shortMoney(summary?.totalSupplierReturnAmount)}`}
          caption="returned to suppliers"
          icon={<Banknote className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Net Sales Amount"
          value={`₹${money(summary?.totalNetSaleAmount)}`}
          highlight={`₹${shortMoney(summary?.totalSalesReturnAmount)}`}
          caption="returned by customers"
          icon={<Banknote className="size-6 text-danger-700" strokeWidth={1.5} />}
          bgClass="bg-danger-50"
          highlightClass="text-danger-700"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Product-wise Analysis</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(summary?.productCount ?? 0, "product")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Reporting Period: {reportPeriodLabel}</p>
            <p className="text-p3 text-pneutral-500">Reporting Scope: {reportingScopeFor(activeFilter.pharmacyIds)}</p>
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Product-wise Quantity Analysis */}
        <div className="flex flex-col gap-md">
          <h3 className="text-label-l4 font-semibold text-pneutral-900">Product-wise Quantity Analysis</h3>
          {mobileCards(quantityColumns, [
            { label: "Net Purchase Qty", value: qty(summary?.totalNetPurchaseQuantity) },
            { label: "Net Sales Qty", value: qty(summary?.totalNetSaleQuantity) },
          ])}
          <div className="hidden md:block">
            <ReportTable
              columns={quantityColumns}
              rows={rows}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              showRows={showRows}
              emptyMessage={emptyMessage}
              isError={!!reportError}
            />
          </div>
        </div>

        {/* Product-wise Purchase and Sales Value Analysis */}
        <div className="flex flex-col gap-md">
          <h3 className="text-label-l4 font-semibold text-pneutral-900">Product-wise Purchase and Sales Value Analysis</h3>
          {mobileCards(valueColumns, [
            { label: "Net Purchase Amount", value: `₹${money(summary?.totalNetPurchaseAmount)}` },
            { label: "Net Sales Amount", value: `₹${money(summary?.totalNetSaleAmount)}` },
          ])}
          <div className="hidden md:block">
            <ReportTable
              columns={valueColumns}
              rows={rows}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              showRows={showRows}
              emptyMessage={emptyMessage}
              isError={!!reportError}
            />
          </div>
        </div>

        {/* Pagination: the backend pages product batches, and both tables show the same page. */}
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

        {/* Important note */}
        <div className="flex items-start gap-sm rounded-2xl bg-info-50 p-md">
          <CircleAlert className="size-6 shrink-0 text-info-500" strokeWidth={1.5} />
          <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
            <p className="text-label-l4 font-semibold text-info-500">Important</p>
            <p className="text-p3 text-pneutral-900">
              The difference between Net Purchase Amount and Net Sales Amount is not Gross Profit or Loss. Purchases and
              sales relate to different quantities and potentially different opening stock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductWisePurchaseAndSalesAnalysisReportPage;
