"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  Download,
  Funnel,
  Printer,
  Scale,
  X,
} from "lucide-react";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import { getPharmacySalesReturnReport } from "@/services/AuditReports/PharmacySalesReturnService";
import { ProductMasterService } from "@/services/ProductMasterService";
import type { CustomerType } from "@/types/BillingData";
import type {
  PharmacySalesReturnReportFilter,
  PharmacySalesReturnReportResponse,
  PharmacySalesReturnReportRow,
  PharmacySalesReturnReportSortBy,
} from "@/types/AuditReports/PharmacySalesReturnData";
import { usePharmacyStore } from "@/store/pharmacyStore";

type Period = "Today" | "Specific Day" | "By Month" | "By Date Range";

const PERIODS: Period[] = ["Today", "Specific Day", "By Month", "By Date Range"];

const PATIENT_TYPES: CustomerType[] = ["WALK_IN", "OP_PATIENT", "IP_PATIENT", "DAYCARE"];

const PATIENT_TYPE_OPTIONS: DropdownOption[] = PATIENT_TYPES.map((value) => ({
  label: CUSTOMER_TYPE_LABEL[value],
  value,
}));

// Same reasons the Sales Return screen records (see CreateSalesReturn).
const RETURN_REASONS = [
  "Prescription Changed",
  "Excess Quantity",
  "Wrong Product Issued",
  "Damaged Product",
  "Quality Issue",
  "Billing Error",
  "Other",
];

const RETURN_REASON_OPTIONS: DropdownOption[] = RETURN_REASONS.map((reason) => ({ label: reason, value: reason }));

const GST_RATE_OPTIONS: DropdownOption[] = [0, 5, 12, 18, 28].map((rate) => ({
  label: `${rate}%`,
  value: String(rate),
}));

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
const hiddenPickerClass = "pointer-events-none absolute bottom-0 h-12 opacity-0";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const fieldLabelClass = "mb-xxsm px-xxsm text-label-l4 font-medium text-pneutral-900";
const fieldBoxClass =
  "flex min-h-12 max-h-13 w-full items-center gap-sm rounded-lg border border-pneutral-300 bg-white p-sm";
const textInputClass = `${fieldBoxClass} text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:border-secondary-700`;
const rangeInputClass =
  "w-full min-w-0 flex-1 bg-transparent text-p3 text-pneutral-900 outline-none placeholder:text-pneutral-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// The design's 6px rounded track (pneutral-200) and thumb (pneutral-500) below the table.
const scrollbarClass =
  "[scrollbar-color:var(--color-pneutral-500)_var(--color-pneutral-200)] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-pneutral-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-pneutral-500";

const plural = (n: number, word: string, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

// Indian grouping with paise: 3334.31 → "3,334.31".
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "" (or anything that isn't a number) leaves that end of the range open.
const toAmount = (value: string) => {
  const n = Number(value);
  return value.trim() && Number.isFinite(n) ? n : undefined;
};

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

interface RangeFieldProps {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

const RangeField = ({ label, min, max, onMinChange, onMaxChange }: RangeFieldProps) => (
  <div className="flex min-w-0 flex-col">
    <span className={fieldLabelClass}>{label}</span>
    <div className={`${fieldBoxClass} gap-xsm! focus-within:border-secondary-700`}>
      <span className="text-p3 text-pneutral-500">₹</span>
      <input
        type="number"
        min={0}
        inputMode="decimal"
        aria-label={`${label} from`}
        value={min}
        onChange={(e) => onMinChange(e.target.value)}
        placeholder="Min"
        className={rangeInputClass}
      />
      <span className="text-p3 text-pneutral-500">–</span>
      <input
        type="number"
        min={0}
        inputMode="decimal"
        aria-label={`${label} to`}
        value={max}
        onChange={(e) => onMaxChange(e.target.value)}
        placeholder="Max"
        className={rangeInputClass}
      />
    </div>
  </div>
);

interface Column {
  key: string;
  header: string;
  align: "left" | "right";
  // Pixel widths from the design; the table scrolls sideways once they no longer fit.
  width: string;
  sortKey?: PharmacySalesReturnReportSortBy;
  render: (row: PharmacySalesReturnReportRow) => React.ReactNode;
  total: React.ReactNode;
  bodyClass?: string;
}

const rowKey = (row: PharmacySalesReturnReportRow, index: number) =>
  `${row.salesReturnId}-${row.batchNumber}-${index}`;

const PharmacySalesReturnReportPage = () => {
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
  // Nothing picked = every pharmacy the user can access, as the design's "Pharmacy: All".
  const [pharmacyIds, setPharmacyIds] = useState<string[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [returnReason, setReturnReason] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [salesReturnNo, setSalesReturnNo] = useState("");
  const [billNo, setBillNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [opNumber, setOpNumber] = useState("");
  const [ipNumber, setIpNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<DropdownOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [batchNumber, setBatchNumber] = useState("");
  const [gstRates, setGstRates] = useState<string[]>([]);
  const [minRefund, setMinRefund] = useState("");
  const [maxRefund, setMaxRefund] = useState("");
  const [minOutstanding, setMinOutstanding] = useState("");
  const [maxOutstanding, setMaxOutstanding] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortBy, setSortBy] = useState<PharmacySalesReturnReportSortBy>("returnDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // The filters last sent with Search; null until then, so the first load uses the opening range.
  const [appliedFilter, setAppliedFilter] = useState<PharmacySalesReturnReportFilter | null>(null);
  const [report, setReport] = useState<PharmacySalesReturnReportResponse | null>(null);
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

  const pharmacyOptions: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

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

  // "All" when nothing narrows the pharmacies (the backend then uses every one the user can access).
  const pharmacyLabelFor = (ids: string[] = []) => {
    if (!ids.length) return "All";
    return pharmacies
      .filter((p) => ids.includes(p.pharmacyId))
      .map((p) => p.pharmacyName)
      .join(", ");
  };

  const customerTypeLabelFor = (types: string[] = []) =>
    types.length ? types.map(customerTypeName).join(", ") : "All";

  const buildFilter = (): PharmacySalesReturnReportFilter => ({
    fromDate: dateRangeApplied && dateRange.from ? dateRange.from : undefined,
    toDate: dateRangeApplied && dateRange.to ? dateRange.to : undefined,
    pharmacyIds: pharmacyIds.length ? pharmacyIds : undefined,
    customerTypes: customerTypes.length ? customerTypes : undefined,
    returnReasons: returnReason ? [returnReason] : undefined,
    salesReturnNo: salesReturnNo.trim() || undefined,
    billNo: billNo.trim() || undefined,
    customerName: customerName.trim() || undefined,
    mobileNumber: mobileNumber.trim() || undefined,
    patientNumber: patientNumber.trim() || undefined,
    opNumber: opNumber.trim() || undefined,
    ipNumber: ipNumber.trim() || undefined,
    productName: productName.trim() || undefined,
    productCategoryIds: categories.length ? categories.map(Number) : undefined,
    batchNumber: batchNumber.trim() || undefined,
    gstPercentages: gstRates.length ? gstRates.map(Number) : undefined,
    minRefundAmount: toAmount(minRefund),
    maxRefundAmount: toAmount(maxRefund),
    minOutstandingAdjustment: toAmount(minOutstanding),
    maxOutstandingAdjustment: toAmount(maxOutstanding),
  });

  // Before the first Search (and after Reset), the report shows today's returns.
  const activeFilter: PharmacySalesReturnReportFilter = appliedFilter ?? { fromDate: todayDate, toDate: todayDate };

  // A string so the effect re-runs on a real change of filter, sort or page,
  // not on every render's fresh object.
  const requestKey = JSON.stringify({ ...activeFilter, sortBy, sortDir, page: pageIndex, size: pageSize });

  useEffect(() => {
    let active = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError("");
      try {
        const data = await getPharmacySalesReturnReport(JSON.parse(requestKey));
        if (active) setReport(data);
      } catch (error) {
        if (!active) return;
        setReport(null);
        setReportError(
          error instanceof Error ? error.message : "Failed to fetch the pharmacy sales return report.",
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

  const rows = report?.salesReturnTransactions?.data ?? [];
  const settlements = report?.settlementSummary ?? [];
  const summary = report?.summary;
  const totalRecords = report?.salesReturnTransactions?.totalRecords ?? 0;
  const pageCount = Math.max(1, report?.salesReturnTransactions?.totalPages ?? 1);
  const firstRecord = totalRecords ? pageIndex * pageSize + 1 : 0;
  const lastRecord = Math.min(pageIndex * pageSize + rows.length, totalRecords);

  // The backend echoes the period it reported on, already as dd-MMM-yyyy.
  const reportPeriodLabel = report
    ? `${report.fromDate} to ${report.toDate}`
    : `${formatDisplayDate(activeFilter.fromDate ?? "") || "…"} to ${formatDisplayDate(activeFilter.toDate ?? "") || "…"}`;

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
      header: "SALES RETURN NO.",
      align: "left",
      width: "w-[133px]",
      render: (r) => r.salesReturnNo,
      total: "",
      bodyClass: "font-semibold text-primary-800!",
    },
    { key: "bill", header: "ORIGINAL BILL NO.", align: "left", width: "w-[137px]", render: (r) => r.billNo, total: "" },
    {
      key: "pharmacy",
      header: "PHARMACY",
      align: "left",
      width: "w-[116px]",
      render: (r) => r.pharmacyName,
      total: "",
    },
    {
      key: "customerType",
      header: "CUSTOMER TYPE",
      align: "left",
      width: "w-[105px]",
      render: (r) => customerTypeName(r.customerType),
      total: "",
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
    { key: "batch", header: "BATCH", align: "left", width: "w-[82px]", render: (r) => r.batchNumber, total: "" },
    {
      key: "expiry",
      header: "EXPIRY",
      align: "left",
      width: "w-[81px]",
      render: (r) => r.expiryDate || "---",
      total: "",
    },
    {
      key: "qty",
      header: "RETURN QTY",
      align: "right",
      width: "w-[85px]",
      render: (r) => r.returnQuantity ?? 0,
      total: summary?.totalReturnQuantity ?? 0,
    },
    {
      key: "reason",
      header: "RETURN REASON",
      align: "left",
      width: "w-[107px]",
      render: (r) => r.returnReason || "---",
      total: "",
    },
    {
      key: "selling",
      header: "SELLING AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.sellingAmount),
      total: money(summary?.totalHistoricalAmount),
    },
    {
      key: "discount",
      header: "DISCOUNT (₹)",
      align: "right",
      width: "w-[100px]",
      render: (r) => money(r.discountAmount),
      total: money(summary?.totalDiscountReversed),
    },
    {
      key: "taxable",
      header: "TAXABLE AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.taxableAmount),
      total: money(summary?.totalTaxableAmountReversed),
    },
    {
      key: "gst",
      header: "GST (₹)",
      align: "right",
      width: "w-[63px]",
      render: (r) => money(r.gstAmount),
      total: money(summary?.totalGstReversed),
    },
    {
      key: "lineAmount",
      header: "LINE RETURN AMOUNT (₹)",
      align: "right",
      width: "w-[89px]",
      render: (r) => money(r.lineReturnAmount),
      total: money(summary?.totalReturnAmount),
      bodyClass: "font-semibold",
    },
  ];

  const summaryRows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Total Sales Return Transactions", value: String(summary?.totalSalesReturnTransactions ?? 0) },
    { label: "Total Returned Product/Batch Lines", value: String(summary?.totalReturnLines ?? 0) },
    { label: "Total Return Qty", value: String(summary?.totalReturnQuantity ?? 0) },
    { label: "Total Historical Amount", value: `₹${money(summary?.totalHistoricalAmount)}` },
    { label: "Total Discount Reversed", value: `₹${money(summary?.totalDiscountReversed)}` },
    { label: "Total Taxable Amount Reversed", value: `₹${money(summary?.totalTaxableAmountReversed)}` },
    { label: "Total GST Reversed", value: `₹${money(summary?.totalGstReversed)}` },
    { label: "Total Return Amount", value: `₹${money(summary?.totalReturnAmount)}`, highlight: true },
    { label: "Total Outstanding Adjustment", value: `₹${money(summary?.totalOutstandingAdjustment)}` },
    { label: "Total Refund Amount", value: `₹${money(summary?.totalRefundAmount)}` },
  ];

  const sortIcon = (key: PharmacySalesReturnReportSortBy) => {
    if (key !== sortBy) return <ArrowUpDown className="size-4 shrink-0" />;
    return sortDir === "asc" ? <ArrowUp className="size-4 shrink-0" /> : <ArrowDown className="size-4 shrink-0" />;
  };

  const handleSort = (key: PharmacySalesReturnReportSortBy) => {
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
    setCustomerTypes([]);
    setReturnReason("");
    setSalesReturnNo("");
    setBillNo("");
    setCustomerName("");
    setMobileNumber("");
    setPatientNumber("");
    setOpNumber("");
    setIpNumber("");
    setProductName("");
    setCategories([]);
    setBatchNumber("");
    setGstRates([]);
    setMinRefund("");
    setMaxRefund("");
    setMinOutstanding("");
    setMaxOutstanding("");
    setAppliedFilter(null);
    setSortBy("returnDate");
    setSortDir("asc");
    setPageIndex(0);
  };

  const emptyMessage = reportLoading ? "Loading..." : reportError || "No records found for the selected filters.";
  const emptyClass = reportError ? "text-warning-600" : "text-pneutral-500";
  const showRows = !reportLoading && !reportError && rows.length > 0;
  const showSettlements = !reportLoading && !reportError && settlements.length > 0;

  const textFilters: { label: string; value: string; onChange: (value: string) => void; placeholder: string }[] = [
    { label: "Sales Return No.", value: salesReturnNo, onChange: setSalesReturnNo, placeholder: "e.g. SLR-2026-00001" },
    { label: "Original Bill No.", value: billNo, onChange: setBillNo, placeholder: "e.g. BILL-2026-00101" },
    { label: "Customer Name", value: customerName, onChange: setCustomerName, placeholder: "Search" },
    { label: "Mobile Number", value: mobileNumber, onChange: setMobileNumber, placeholder: "Search" },
    { label: "Patient Number", value: patientNumber, onChange: setPatientNumber, placeholder: "Search" },
    { label: "OP Number", value: opNumber, onChange: setOpNumber, placeholder: "Search" },
    { label: "IP Number", value: ipNumber, onChange: setIpNumber, placeholder: "Search" },
    { label: "Product Name", value: productName, onChange: setProductName, placeholder: "Search" },
    { label: "Batch No.", value: batchNumber, onChange: setBatchNumber, placeholder: "Search" },
  ];

  return (
    <div className="flex w-full flex-col gap-md">
      {/* Page header */}
      <div className="flex flex-col gap-md md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-md">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
            <Image src="/StockReturn/receipt-refund-outline.svg" alt="" width={28} height={28} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
            <h1 className="text-h5 font-semibold text-pneutral-900">Pharmacy Sales Return Report</h1>
            <p className="text-p3 text-pneutral-500">
              Completed Sales Returns processed against previously generated Pharmacy Bills, with return value,
              settlement and refund.
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
              More Filters (13)
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
            label="Customer/Patient Type"
            labelClassName="px-xxsm"
            multiple
            selectAll
            options={PATIENT_TYPE_OPTIONS}
            value={customerTypes}
            onChange={(values: CustomerType[]) => setCustomerTypes(values)}
            placeholder="All"
          />

          <Dropdown
            label="Return Reason"
            labelClassName="px-xxsm"
            options={RETURN_REASON_OPTIONS}
            value={returnReason}
            onChange={(value: string) => setReturnReason(value)}
            placeholder="All"
            clearable
          />

          {/* Same grid as the primary filters, so these flow on four to a row. */}
          {showMoreFilters && (
            <>
              {textFilters.map((f) => (
                <label key={f.label} className="flex min-w-0 flex-col">
                  <span className={fieldLabelClass}>{f.label}</span>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className={textInputClass}
                  />
                </label>
              ))}

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
                label="GST Rate"
                labelClassName="px-xxsm"
                multiple
                options={GST_RATE_OPTIONS}
                value={gstRates}
                onChange={(values: string[]) => setGstRates(values)}
                placeholder="Select"
              />

              <RangeField
                label="Refund Amount"
                min={minRefund}
                max={maxRefund}
                onMinChange={setMinRefund}
                onMaxChange={setMaxRefund}
              />

              <RangeField
                label="Outstanding Adjustment"
                min={minOutstanding}
                max={maxOutstanding}
                onMinChange={setMinOutstanding}
                onMaxChange={setMaxOutstanding}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {dateRangeApplied && dateDisplay && (
            <FilterChip label={`${dateFieldLabel}: ${dateDisplay}`} onRemove={() => setDateRangeApplied(false)} />
          )}
          <FilterChip label={`Pharmacy: ${pharmacyLabelFor(pharmacyIds)}`} onRemove={() => setPharmacyIds([])} />
          <FilterChip
            label={`Customer/Patient Type: ${customerTypeLabelFor(customerTypes)}`}
            onRemove={() => setCustomerTypes([])}
          />
          {returnReason && (
            <FilterChip label={`Return Reason: ${returnReason}`} onRemove={() => setReturnReason("")} />
          )}
          {/* The report only covers completed returns, so this one can't be taken off. */}
          <FilterChip label="Status: Completed" />
        </div>
      </div>

      {/* KPI row: totals over every matching line, not just this page. */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Return Amount"
          value={`₹${money(summary?.totalReturnAmount)}`}
          highlight={plural(summary?.totalSalesReturnTransactions ?? 0, "return")}
          caption="completed"
          icon={<Image src="/StockReturn/receipt-refund-outline-kpi.svg" alt="" width={24} height={24} />}
          bgClass="bg-primary-100"
          highlightClass="text-pneutral-900"
        />
        <KpiCard
          title="Outstanding Adjustment"
          value={`₹${money(summary?.totalOutstandingAdjustment)}`}
          highlight={`${Math.round(summary?.outstandingAdjustmentPercentage ?? 0)}%`}
          caption="of return amount"
          icon={<Scale className="size-6 text-info-500" strokeWidth={1.5} />}
          bgClass="bg-info-50"
          highlightClass="text-info-500"
        />
        <KpiCard
          title="Refund Amount"
          value={`₹${money(summary?.totalRefundAmount)}`}
          highlight={`${Math.round(summary?.refundPercentage ?? 0)}%`}
          caption="paid back"
          icon={<CircleCheck className="size-6 fill-success-800 text-white" />}
          bgClass="bg-success-50"
          highlightClass="text-success-800"
        />
        <KpiCard
          title="Total Return Qty"
          value={String(summary?.totalReturnQuantity ?? 0)}
          highlight={plural(summary?.totalReturnLines ?? 0, "line")}
          caption="product / batch"
          icon={<Box className="size-6 fill-warning-600 text-white" />}
          bgClass="bg-warning-50"
          highlightClass="text-warning-600"
        />
      </div>

      {/* Report grid card */}
      <div className={`flex w-full min-w-0 flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
        <div className="flex flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-xxsm">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-label-l5 font-semibold text-pneutral-900">Sales Return Transactions</h2>
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-xsm py-xxsm text-p2 font-medium text-primary-800">
                {plural(totalRecords, "record")}
              </span>
            </div>
            {/* Describes the report on screen, i.e. the last search, not unsent edits to the filters. */}
            <p className="text-p3 text-pneutral-500">Reporting Period: {reportPeriodLabel}</p>
            <p className="text-p3 text-pneutral-500">Pharmacy: {pharmacyLabelFor(activeFilter.pharmacyIds)}</p>
            <p className="text-p3 text-pneutral-500">
              Authorized Customer/Patient Type: {customerTypeLabelFor(activeFilter.customerTypes)}
            </p>
            {!!activeFilter.returnReasons?.length && (
              <p className="text-p3 text-pneutral-500">Return Reason: {activeFilter.returnReasons.join(", ")}</p>
            )}
            <p className="text-p3 text-pneutral-500">Status: {report?.status ?? "Completed"}</p>
          </div>
          {report && (
            <div className="flex flex-col gap-xxsm text-p3 text-pneutral-500 sm:items-end sm:text-right">
              <p>Generated on: {report.generatedOn}</p>
              <p>Generated by: {report.generatedBy}</p>
            </div>
          )}
        </div>

        {/* Fifteen columns are cramped on phones, so rows stack as cards below md. */}
        <div className="flex flex-col gap-sm md:hidden">
          {!showRows && (
            <p className={`rounded-lg border border-pneutral-200 px-sm py-md text-center text-p3 ${emptyClass}`}>
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
                  <span className="text-p3 font-semibold whitespace-nowrap text-primary-800">{row.salesReturnNo}</span>
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

        {/* The design's columns are wider than the card, so the table scrolls sideways
            with the styled track sitting 16px below it. */}
        <div className={`hidden w-full overflow-x-auto pb-md md:block ${scrollbarClass}`}>
          <div className="min-w-[1503px] overflow-hidden rounded-lg border border-pneutral-200">
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
                      className={`h-15 border-b border-pneutral-200 px-sm py-xsm text-center text-p3 ${emptyClass}`}
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

        {/* Sales Return Settlement Summary: every matching return, not paged. */}
        <h2 className="text-label-l5 font-semibold text-pneutral-900">Sales Return Settlement Summary</h2>
        <div className={`w-full overflow-x-auto ${scrollbarClass}`}>
          <div className="min-w-[640px] overflow-hidden rounded-lg border border-pneutral-200">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-secondary-600 text-label-l3 font-semibold text-pneutral-50">
                  <th className="h-14 w-[22%] border-r border-pneutral-200 px-sm py-xsm text-left">SALES RETURN NO.</th>
                  <th className="h-14 w-[20%] border-r border-pneutral-200 px-sm py-xsm text-left">CUSTOMER TYPE</th>
                  <th className="h-14 w-[18%] border-r border-pneutral-200 px-sm py-xsm text-right">RETURN AMOUNT</th>
                  <th className="h-14 w-[22%] border-r border-pneutral-200 px-sm py-xsm text-right">
                    OUTSTANDING ADJUSTMENT
                  </th>
                  <th className="h-14 w-[18%] px-sm py-xsm text-right">REFUND AMOUNT</th>
                </tr>
              </thead>
              <tbody className="text-p3">
                {!showSettlements && (
                  <tr className="bg-white">
                    <td colSpan={5} className={`h-15 px-sm py-xsm text-center ${emptyClass}`}>
                      {emptyMessage}
                    </td>
                  </tr>
                )}
                {showSettlements &&
                  settlements.map((s) => (
                    <tr key={s.salesReturnId} className="bg-white text-pneutral-900">
                      <td className="h-15 border-r border-b border-pneutral-200 px-sm py-xsm font-semibold text-primary-800 wrap-break-word">
                        {s.salesReturnNo}
                      </td>
                      <td className="h-15 border-r border-b border-pneutral-200 px-sm py-xsm">
                        {customerTypeName(s.customerType)}
                      </td>
                      <td className="h-15 border-r border-b border-pneutral-200 px-sm py-xsm text-right">
                        ₹{money(s.returnAmount)}
                      </td>
                      <td className="h-15 border-r border-b border-pneutral-200 px-sm py-xsm text-right">
                        ₹{money(s.outstandingAdjustment)}
                      </td>
                      <td className="h-15 border-b border-pneutral-200 px-sm py-xsm text-right font-semibold">
                        ₹{money(s.refundAmount)}
                      </td>
                    </tr>
                  ))}
                {showSettlements && (
                  <tr className="bg-primary-100 font-semibold text-primary-900">
                    <td className="h-15 border-r border-pneutral-200 px-sm py-xsm">Total</td>
                    <td className="h-15 border-r border-pneutral-200 px-sm py-xsm" />
                    <td className="h-15 border-r border-pneutral-200 px-sm py-xsm text-right">
                      ₹{money(summary?.totalReturnAmount)}
                    </td>
                    <td className="h-15 border-r border-pneutral-200 px-sm py-xsm text-right">
                      ₹{money(summary?.totalOutstandingAdjustment)}
                    </td>
                    <td className="h-15 px-sm py-xsm text-right">₹{money(summary?.totalRefundAmount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      <h2 className="text-label-l5 font-semibold text-pneutral-900">Report Summary</h2>
      <div className="w-full max-w-[722px] overflow-hidden rounded-lg border border-pneutral-200">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-secondary-600 text-label-l3 font-semibold text-pneutral-50">
              <th className="h-14 w-[64%] border-r border-pneutral-200 px-sm py-xsm text-left">PARTICULARS</th>
              <th className="h-14 px-sm py-xsm text-right">VALUE</th>
            </tr>
          </thead>
          <tbody className="text-p3">
            {summaryRows.map((row, i) => {
              const last = i === summaryRows.length - 1;
              return (
                <tr
                  key={row.label}
                  className={row.highlight ? "bg-primary-100 font-semibold text-primary-900" : "bg-white text-pneutral-900"}
                >
                  <td className={`h-13 border-r border-pneutral-200 px-sm py-xsm ${last ? "" : "border-b"}`}>
                    {row.label}
                  </td>
                  <td className={`h-13 border-pneutral-200 px-sm py-xsm text-right ${last ? "" : "border-b"}`}>
                    {reportLoading ? "…" : row.value}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PharmacySalesReturnReportPage;
