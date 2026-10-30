"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Banknote,
  Box,
  Calendar,
  ChevronDown,
  ChevronsDown,
  CircleCheck,
  Download,
  Funnel,
  Printer,
  ReceiptText,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import { getInventorySalesReport } from "@/services/AuditReports/InventorySalesService";
import { getAllDoctors } from "@/services/DoctorService";
import { ProductMasterService } from "@/services/ProductMasterService";
import { ProductService } from "@/services/ProductService";
import type {
  InventorySalesReportFilter,
  InventorySalesReportResponse,
  InventorySalesReportRow,
} from "@/types/AuditReports/InventorySalesData";
import type { CustomerType } from "@/types/BillingData";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { parseGstPercentage } from "@/utils/gst";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

const PATIENT_TYPES: CustomerType[] = ["IP_PATIENT", "OP_PATIENT", "DAYCARE", "WALK_IN"];

const PATIENT_TYPE_OPTIONS: DropdownOption[] = PATIENT_TYPES.map((value) => ({
  label: CUSTOMER_TYPE_LABEL[value],
  value,
}));

// The schedules a molecule can carry (see DrugProductDetails).
const SCHEDULE_OPTIONS: DropdownOption[] = [
  { label: "H", value: "H" },
  { label: "H1", value: "H1" },
  { label: "OTC", value: "OTC" },
];

// The slice of a /product/batches/pharmacy/{id} row the Product Name and HSN filters need.
interface ReportProduct {
  productId: string;
  productName: string;
  hsnNo: string;
}

interface ProductCategory {
  productCategoryId: number;
  productCategoryName: string;
  isActive?: boolean;
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
  const [y, m, d] = iso.split("-");
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

const formatAmount = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  sortIcon?: React.ReactNode;
  render: (row: InventorySalesReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const InventorySalesReportPage = () => {
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
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState<ReportProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [hsnCode, setHsnCode] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [patientType, setPatientType] = useState("");
  const [schedules, setSchedules] = useState<string[]>([]);
  const [gstOptions, setGstOptions] = useState<DropdownOption[]>([]);
  const [gstLoading, setGstLoading] = useState(true);
  const [doctorOptions, setDoctorOptions] = useState<DropdownOption[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchGstRates = async () => {
      try {
        const res = await ProductMasterService.getGstRates();
        if (!active) return;
        setGstOptions(
          (res.data ?? []).map((item: { gstPercentage: number }) => ({
            label: String(item.gstPercentage),
            value: String(item.gstPercentage),
          })),
        );
      } catch (error) {
        console.error("Unable to fetch GST rates", error);
      } finally {
        if (active) setGstLoading(false);
      }
    };
    const fetchDoctors = async () => {
      try {
        const doctors = await getAllDoctors();
        if (!active) return;
        setDoctorOptions(doctors.map((d) => ({ label: d.doctorName, value: String(d.doctorId) })));
      } catch (error) {
        console.error("Unable to fetch doctors", error);
      } finally {
        if (active) setDoctorsLoading(false);
      }
    };
    fetchGstRates();
    fetchDoctors();
    return () => {
      active = false;
    };
  }, []);

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
  const [dateRangeApplied, setDateRangeApplied] = useState(true);
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  // The filters last sent with Search; null until then, so the first load uses
  // the default period and the navbar's pharmacy.
  const [appliedFilter, setAppliedFilter] = useState<InventorySalesReportFilter | null>(null);
  const [report, setReport] = useState<InventorySalesReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
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
        responses.forEach((res) =>
          (res?.data ?? []).forEach((b: ReportProduct) => {
            if (b.productId && !byId.has(b.productId)) {
              byId.set(b.productId, { productId: b.productId, productName: b.productName, hsnNo: b.hsnNo ?? "" });
            }
          }),
        );
        setProducts([...byId.values()].sort((a, b) => a.productName.localeCompare(b.productName)));
      } catch (error) {
        console.error("Unable to fetch products for the selected pharmacies", error);
        if (active) setProducts([]);
      } finally {
        if (active) setProductsLoading(false);
      }
    };
    fetchProducts();
    return () => {
      active = false;
    };
  }, [pharmacyIdsKey]);

  // Picking an HSN narrows the product list to the products filed under it.
  const productOptions: DropdownOption[] = useMemo(
    () =>
      products
        .filter((p) => !hsnCode || p.hsnNo === hsnCode)
        .map((p) => ({ label: p.productName, value: p.productId })),
    [products, hsnCode],
  );

  const hsnOptions: DropdownOption[] = useMemo(
    () =>
      [...new Set(products.map((p) => p.hsnNo).filter(Boolean))]
        .sort()
        .map((hsn) => ({ label: hsn, value: hsn })),
    [products],
  );

  const handleProductChange = (value: string) => {
    setProductId(value);
    // Clearing the product clears the HSN it filled in, and vice versa below.
    setHsnCode(value ? (products.find((p) => p.productId === value)?.hsnNo ?? "") : "");
  };

  const handleHsnChange = (value: string) => {
    setHsnCode(value);
    if (!value) {
      setProductId("");
      return;
    }
    const matches = products.filter((p) => p.hsnNo === value);
    // One product under that HSN fills itself in; with several, keep the
    // current pick only if it is one of them and let the user choose.
    if (matches.length === 1) setProductId(matches[0].productId);
    else if (!matches.some((p) => p.productId === productId)) setProductId("");
  };

  const pharmacyLabel = pharmacies
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

  const buildFilter = (): InventorySalesReportFilter => {
    const gst = gstRate ? parseGstPercentage(gstRate) : undefined;
    return {
      fromDate: dateRangeApplied && selectedRange.from ? selectedRange.from : undefined,
      toDate: dateRangeApplied && selectedRange.to ? selectedRange.to : undefined,
      pharmacyIds: selectedPharmacyIds,
      productIds: productId ? [productId] : undefined,
      productCategoryIds: category ? [Number(category)] : undefined,
      hsnCodes: hsnCode ? [hsnCode] : undefined,
      gstPercentages: gst !== undefined ? [gst] : undefined,
      doctorIds: referredBy ? [Number(referredBy)] : undefined,
      patientTypes: patientType ? [patientType] : undefined,
      drugSchedules: schedules.length ? schedules : undefined,
    };
  };

  const activeFilter: InventorySalesReportFilter = appliedFilter ?? {
    fromDate: DEFAULT_FROM_DATE,
    toDate: DEFAULT_TO_DATE,
    pharmacyIds: selectedPharmacy ? [selectedPharmacy.pharmacyId] : [],
  };

  // A string so the effect re-runs on a real change of filter or page, not on
  // every render's fresh object.
  const requestKey = JSON.stringify({ ...activeFilter, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getInventorySalesReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(error instanceof Error ? error.message : "Failed to fetch the inventory sales report.");
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

  const rows = report?.productSalesDetails.data ?? [];
  const summary = report?.summary;
  const totalRecords = report?.productSalesDetails.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.productSalesDetails.totalPages ?? 1);
  const firstRecord = totalRecords ? pageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(pageIndex * pageSize + rows.length, totalRecords);

  // The API totals amounts and net quantity over every matching row, but not
  // sale/return quantity; those are only known when every row is on this page.
  const allRowsOnPage = totalRecords > 0 && rows.length >= totalRecords;
  const totalSaleQty = allRowsOnPage ? rows.reduce((sum, r) => sum + r.saleQuantity, 0) : undefined;
  const totalReturnQty = allRowsOnPage ? rows.reduce((sum, r) => sum + r.returnQuantity, 0) : undefined;

  const totalSaleAmount = summary?.totalSaleAmount ?? 0;
  const totalReturnAmount = summary?.totalReturnAmount ?? 0;
  const returnPct = totalSaleAmount ? Math.round((totalReturnAmount / totalSaleAmount) * 100) : 0;

  const reportPharmacyLabel = pharmacies
    .filter((p) => activeFilter.pharmacyIds?.includes(p.pharmacyId))
    .map((p) => p.pharmacyName)
    .join(", ");

  // Rows are per pharmacy + product, so the pharmacy leads each row.
  const columns: Column[] = [
    {
      key: "pharmacy",
      header: "PHARMACY",
      align: "left",
      width: "w-[14%]",
      render: (r) => r.pharmacyName,
      total: "Total",
    },
    {
      key: "product",
      header: "PRODUCT NAME",
      align: "left",
      width: "w-[14%]",
      sortIcon: <ArrowUpDown className="size-4 shrink-0" />,
      render: (r) => r.productName,
      total: "",
      bodyClass: "font-semibold",
    },
    { key: "saleQty", header: "SALE QUANTITY", align: "right", width: "w-[12%]", render: (r) => r.saleQuantity, total: totalSaleQty ?? "—" },
    { key: "returnQty", header: "RETURN QUANTITY", align: "right", width: "w-[12%]", render: (r) => r.returnQuantity, total: totalReturnQty ?? "—" },
    { key: "netQty", header: "NET SALE QUANTITY", align: "right", width: "w-[12%]", render: (r) => r.netSaleQuantity, total: summary?.totalNetSaleQuantity ?? 0 },
    { key: "saleAmount", header: "SALE AMOUNT", align: "right", width: "w-[12%]", render: (r) => formatAmount(r.saleAmount), total: formatAmount(totalSaleAmount) },
    { key: "returnAmount", header: "RETURN AMOUNT", align: "right", width: "w-[12%]", render: (r) => formatAmount(r.returnAmount), total: formatAmount(totalReturnAmount) },
    {
      key: "netSales",
      header: "NET SALES",
      align: "right",
      width: "w-[12%]",
      sortIcon: <ArrowDown className="size-4 shrink-0" />,
      render: (r) => formatAmount(r.netSales),
      total: formatAmount(summary?.totalNetSales ?? 0),
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
    setHsnCode("");
    setGstRate("");
    setReferredBy("");
    setPatientType("");
    setSchedules([]);
    setProductId("");
    setCategory("");
    setDateRangeApplied(true);
    setAppliedFilter(null);
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
            <h1 className="text-h5 font-semibold text-pneutral-900">Inventory Sales Report</h1>
            <p className="text-p3 text-pneutral-500">
              A product-wise summary of pharmacy sales and sales returns during the selected reporting period.
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
            placeholder={hsnCode && productOptions.length > 1 ? `Select from ${productOptions.length} products` : "Search"}
            searchable
            clearable
            isLoading={productsLoading}
          />

          <Dropdown
            label="Product Category"
            labelClassName="px-xxsm"
            options={categoryOptions}
            value={category}
            onChange={(value: string) => setCategory(value)}
            placeholder="Select"
            clearable
            isLoading={categoriesLoading}
          />

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              <Dropdown
                label="HSN Code"
                labelClassName="px-xxsm"
                options={hsnOptions}
                value={hsnCode}
                onChange={handleHsnChange}
                placeholder="Search"
                searchable
                clearable
                isLoading={productsLoading}
              />

              <Dropdown
                label="GST %"
                labelClassName="px-xxsm"
                options={gstOptions}
                value={gstRate}
                onChange={(value: string) => setGstRate(value)}
                placeholder="Select"
                clearable
                isLoading={gstLoading}
              />

              <Dropdown
                label="Referred By"
                labelClassName="px-xxsm"
                options={doctorOptions}
                value={referredBy}
                onChange={(value: string) => setReferredBy(value)}
                placeholder="Select"
                searchable
                clearable
                isLoading={doctorsLoading}
              />

              <Dropdown
                label="Patient Type"
                labelClassName="px-xxsm"
                options={PATIENT_TYPE_OPTIONS}
                value={patientType}
                onChange={(value: string) => setPatientType(value)}
                placeholder="Select"
                clearable
              />

              <Dropdown
                label="Schedule Molecules"
                labelClassName="px-xxsm"
                multiple
                options={SCHEDULE_OPTIONS}
                value={schedules}
                onChange={(values: string[]) => setSchedules(values)}
                placeholder="Select"
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
            {pharmacyLabel && (
              <FilterChip label={`Pharmacy: ${pharmacyLabel}`} onRemove={() => setPharmacyIds([])} />
            )}
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Sale Amount"
          value={formatAmount(totalSaleAmount)}
          highlight={totalSaleQty !== undefined ? `${totalSaleQty} units` : undefined}
          caption="sold"
          icon={<Banknote className="size-6 text-secondary-700" strokeWidth={1.5} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Return Amount"
          value={formatAmount(totalReturnAmount)}
          highlight={`${returnPct}%`}
          caption="of sale amount"
          icon={<ReceiptText className="size-6 text-warning-600" strokeWidth={1.5} />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
        <KpiCard
          title="Net Sales"
          value={formatAmount(summary?.totalNetSales ?? 0)}
          highlight={totalSaleAmount ? `${100 - returnPct}%` : undefined}
          caption="retained after returns"
          icon={<CircleCheck className="size-6 fill-success-800 text-white" />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Net Sale Quantity"
          value={String(summary?.totalNetSaleQuantity ?? 0)}
          highlight={totalReturnQty !== undefined ? `${totalReturnQty} units` : undefined}
          caption="returned"
          icon={<Box className="size-6 fill-info-500 text-white" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Product Sales Details</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {totalRecords} records
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            {activeFilter.fromDate && (
              <p className="text-p3 text-pneutral-500">
                Period: {formatDisplayDate(activeFilter.fromDate)} to {formatDisplayDate(activeFilter.toDate ?? "")}
              </p>
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

        <div className="w-full overflow-hidden rounded-lg border border-pneutral-200">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-secondary-600">
                {columns.map((col, i) => (
                  <th
                    key={col.key}
                    className={`h-15 border-b border-pneutral-200 px-xsm py-xsm text-label-l3 [overflow-wrap:anywhere] sm:px-sm font-semibold text-pneutral-50 ${col.width} ${
                      i < columns.length - 1 ? "border-r" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center gap-xxsm ${
                        col.align === "right" ? "justify-end text-right" : "justify-between text-left"
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortIcon}
                    </div>
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
                <tr key={`${row.pharmacyName}-${row.productName}-${index}`} className="bg-white">
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`h-15 border-b border-pneutral-200 px-xsm py-xsm text-p3 text-pneutral-900 [overflow-wrap:anywhere] sm:px-sm ${
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
                    className={`h-15 border-pneutral-200 px-xsm py-xsm text-p3 font-semibold text-primary-900 [overflow-wrap:anywhere] sm:px-sm ${
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

export default InventorySalesReportPage;
