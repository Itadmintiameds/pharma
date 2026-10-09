"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowRightLeft,
  CalendarDays,
  Clipboard,
  IndianRupee,
  Search,
} from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { PaginationControl } from "@/app/components/common/table/Pagination";
import FindOriginalBill from "./components/FindOriginalBill";
import CreateSalesReturn from "./components/CreateSalesReturn";
import ReviewSalesReturn from "./components/ReviewSalesReturn";
import SalesReturnDetails from "./components/SalesReturnDetails";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import { getAllSalesReturn, getSalesReturnKpis } from "@/services/SalesReturnService";
import { formatAmount } from "@/utils/billingTotals";
import { SalesReturnData, SalesReturnKpiResponse } from "@/types/SalesReturnData";

// Figma card drop shadow (three stacked layers), no matching --shadow-* token
const KPI_CARD_SHADOW =
  "shadow-[0_9px_28px_8px_rgba(0,0,0,0.05),0_3px_6px_-4px_rgba(0,0,0,0.12),0_6px_16px_0_rgba(0,0,0,0.08)]";

const buildKpiCards = (kpis: SalesReturnKpiResponse | null) => [
  {
    key: "amount",
    label: "Total Return Amount",
    value: kpis ? `₹${formatAmount(kpis.totalReturnAmount)}` : "—",
    cardBg: "bg-primary-100",
    icon: (
      <span className="flex size-5 items-center justify-center rounded-full bg-primary-800">
        <IndianRupee size={12} strokeWidth={2.5} className="text-white" />
      </span>
    ),
  },
  {
    key: "count",
    label: "Total Sales Returns",
    value: kpis ? String(kpis.totalSalesReturns ?? 0) : "—",
    cardBg: "bg-info-50",
    icon: <ArrowRightLeft size={24} strokeWidth={1.5} className="text-info-500" />,
  },
];

const CUSTOMER_TYPE_OPTIONS = [
  { label: "All Customer Types", value: "" },
  ...Object.entries(CUSTOMER_TYPE_LABEL).map(([value, label]) => ({ label, value })),
];

interface SalesReturnFilters {
  search: string;
  fromDate: string;
  toDate: string;
  customerType: string;
}

const EMPTY_FILTERS: SalesReturnFilters = {
  search: "",
  fromDate: "",
  toDate: "",
  customerType: "",
};

/**
 * Date field that shows its placeholder ("From Date") until focused, since a
 * native date input can't render placeholder text.
 */
const DateFilterField = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <Input
      type={focused || value ? "date" : "text"}
      placeholder={placeholder}
      value={value}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      leftIcon={<CalendarDays size={20} className="text-pneutral-500" />}
      className="rounded-lg! [&_input]:pl-1.5"
      containerClassName="w-full sm:w-38.75 sm:shrink-0"
    />
  );
};

interface SalesReturnRow {
  id: number;
  returnNo: string;
  /** dd-mm-yyyy, as shown in the table. */
  returnDate: string;
  /** yyyy-mm-dd, compared against the date filter inputs. */
  returnDateIso: string;
  billNo: string;
  customerName: string;
  customerPhoneNo: string;
  customerType: string;
  products: number;
  returnAmount: number;
  status: string;
}

/** ISO date-time from the API → "dd-mm-yyyy". */
const formatReturnDate = (value?: string) => {
  const [year, month, day] = (value ?? "").split("T")[0].split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

const toSalesReturnRow = (salesReturn: SalesReturnData): SalesReturnRow => ({
  id: salesReturn.salesReturnId ?? 0,
  returnNo: salesReturn.salesReturnNo ?? "—",
  returnDate: formatReturnDate(salesReturn.salesReturnDate),
  returnDateIso: (salesReturn.salesReturnDate ?? "").split("T")[0],
  billNo: salesReturn.billNo ?? "—",
  // Null for an anonymous walk-in bill.
  customerName: salesReturn.customerName || "Walk-in Customer",
  customerPhoneNo: salesReturn.customerPhoneNo ?? "",
  customerType: salesReturn.customerType
    ? CUSTOMER_TYPE_LABEL[salesReturn.customerType]
    : "—",
  // itemCount is the line count the API already computed; the detail array is
  // the fallback when it is missing.
  products: salesReturn.itemCount ?? salesReturn.salesReturnDetails?.length ?? 0,
  returnAmount: Number(salesReturn.totalNetAmount) || 0,
  status: salesReturn.salesReturnStatus ?? "Completed",
});

const PAGE_SIZE = 10;

const buildSalesReturnColumns = (
  rowOffset: number,
  onView: (row: SalesReturnRow) => void
): ColumnDef<SalesReturnRow>[] => [
  {
    header: "SL. NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {rowOffset + row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: "returnNo",
    header: "SALES RETURN NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-primary-800">
        {row.original.returnNo}
      </span>
    ),
  },
  {
    accessorKey: "returnDate",
    header: "RETURN DATE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.returnDate}
      </span>
    ),
  },
  {
    accessorKey: "billNo",
    header: "BILL NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.billNo}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "CUSTOMER / PATIENT",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.customerName}
      </span>
    ),
  },
  {
    accessorKey: "customerType",
    header: "TYPE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-500">
        {row.original.customerType}
      </span>
    ),
  },
  {
    accessorKey: "products",
    header: "PRODUCTS",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.products}
      </span>
    ),
  },
  {
    accessorKey: "returnAmount",
    header: "RETURN AMOUNT",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        ₹{formatAmount(row.original.returnAmount)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <span className="inline-flex items-center justify-center gap-xxsm whitespace-nowrap rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium text-success-800">
        {row.original.status}
      </span>
    ),
  },
  {
    header: "ACTION",
    cell: ({ row }) => (
      <button
        type="button"
        aria-label={`View ${row.original.returnNo}`}
        onClick={() => onView(row.original)}
      >
        <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
      </button>
    ),
  },
];

/** "Create Sales Return" — shown in the header row and in the empty state. */
const CreateSalesReturnButton = ({
  className = "",
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) => (
  <Button
    type="button"
    variant="primary"
    onClick={onClick}
    className={`h-12! max-h-13 min-h-12 min-w-27 shrink-0 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! ${className}`}
  >
    <Clipboard size={20} className="shrink-0" fill="currentColor" />
    Create Sales Return
  </Button>
);

const applySalesReturnFilters = (
  rows: SalesReturnRow[],
  { search, fromDate, toDate, customerType }: SalesReturnFilters
) => {
  const query = search.trim().toLowerCase();
  const typeLabel = customerType
    ? CUSTOMER_TYPE_LABEL[customerType as keyof typeof CUSTOMER_TYPE_LABEL]
    : "";

  return rows.filter((row) => {
    const returnDate = row.returnDateIso;
    return (
      (!query ||
        [row.returnNo, row.billNo, row.customerName, row.customerPhoneNo].some((value) =>
          value.toLowerCase().includes(query)
        )) &&
      (!fromDate || returnDate >= fromDate) &&
      (!toDate || returnDate <= toDate) &&
      (!typeLabel || row.customerType === typeLabel)
    );
  });
};

/** Centered icon + message block that replaces the table — Figma "SLR Empty State". */
const SalesReturnEmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) => (
  <div className="flex w-full flex-col items-center justify-center gap-sm py-xlg">
    <div className="flex size-18 shrink-0 items-center justify-center rounded-full bg-primary-100">
      <Search size={32} strokeWidth={1.5} className="text-primary-800" />
    </div>
    <p className="text-center text-label-l4 font-semibold text-pneutral-900">
      {title}
    </p>
    <p className="w-full max-w-105 text-center text-p3 font-regular text-pneutral-500">
      {description}
    </p>
    {action}
  </div>
);

const SalesReturnContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  // Draft values in the filter row vs. the ones last applied with "Search".
  const [filters, setFilters] = useState<SalesReturnFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<SalesReturnFilters>(EMPTY_FILTERS);

  const [kpis, setKpis] = useState<SalesReturnKpiResponse | null>(null);
  const [salesReturns, setSalesReturns] = useState<SalesReturnRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const view = searchParams.get("view");

  // Keyed on the view param so returning to the list refetches: a return
  // raised on the create flow has to show up in the table and totals behind it.
  useEffect(() => {
    if (view) return;

    // isLoading starts true for the first load; on a refetch the previous
    // rows stay up until the new ones arrive.
    let active = true;

    getAllSalesReturn()
      .then((data) => {
        if (!active) return;
        setSalesReturns(data.map(toSalesReturnRow));
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch sales returns:", err);
        setLoadError(err?.message || "Failed to fetch sales returns.");
        setSalesReturns([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    getSalesReturnKpis()
      .then((data) => {
        if (active) setKpis(data);
      })
      .catch((err) => console.error("Failed to fetch sales return KPIs:", err));

    return () => {
      active = false;
    };
  }, [view]);

  const updateFilters = (patch: Partial<SalesReturnFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const applyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const filteredReturns = applySalesReturnFilters(salesReturns, appliedFilters);

  const openCreateSalesReturn = () =>
    router.push("/dashboard/salesReturn?view=find-bill");

  if (searchParams.get("view") === "find-bill") {
    return <FindOriginalBill />;
  }

  if (searchParams.get("view") === "create") {
    return <CreateSalesReturn />;
  }

  if (searchParams.get("view") === "review") {
    return <ReviewSalesReturn />;
  }

  if (searchParams.get("view") === "details") {
    return <SalesReturnDetails />;
  }

  return (
    <div className="flex flex-col gap-md">
      {/* SLR Header Row — Figma node 4023:53800 */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
          <p className="text-h5 font-semibold text-pneutral-900">
            Sales Return
          </p>
          <p className="text-p3 font-regular text-pneutral-500">
            View and manage Sales Return transactions for this Pharmacy/Store.
          </p>
        </div>

        <CreateSalesReturnButton
          className="w-full! sm:w-59.25!"
          onClick={openCreateSalesReturn}
        />
      </div>

      {/* SLR KPI Row — Figma node 4023:53805 */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-start">
        {buildKpiCards(kpis).map((card) => (
          <div
            key={card.key}
            className={`flex h-38 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-xl p-5 ${card.cardBg} ${KPI_CARD_SHADOW}`}
          >
            <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5">
              <div className="flex w-full items-center gap-0.5">
                <p className="min-w-0 flex-1 text-label-l4 font-medium text-pneutral-900">
                  {card.label}
                </p>
                <div className="flex size-13 shrink-0 items-center justify-center rounded-sm bg-white">
                  {card.icon}
                </div>
              </div>
              <p className="truncate text-h3 font-medium text-pneutral-900">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* SLR Filters Row — Figma node 4023:53808 */}
      <div className="flex w-full flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
        <Input
          placeholder="Search by return no., bill no., customer name or mobile number..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg! border-[1.5px]! border-sneutral-100! [&_input]:pl-2 [&_input]:text-label-l3 [&_input]:font-regular [&_input]:text-ellipsis [&_input]:placeholder:text-pneutral-300"
          containerClassName="w-full min-w-0 lg:flex-1"
        />

        <DateFilterField
          placeholder="From Date"
          value={filters.fromDate}
          onChange={(fromDate) => updateFilters({ fromDate })}
        />

        <DateFilterField
          placeholder="To Date"
          value={filters.toDate}
          onChange={(toDate) => updateFilters({ toDate })}
        />

        <Dropdown
          options={CUSTOMER_TYPE_OPTIONS}
          value={filters.customerType}
          onChange={(customerType) => updateFilters({ customerType: String(customerType) })}
          placeholder="All Customer Types"
          className="w-full sm:w-47.5 sm:shrink-0"
        />

        <div className="flex w-full gap-sm sm:w-auto sm:shrink-0">
          <Button
            type="button"
            variant="primary"
            onClick={applyFilters}
            className="min-w-27 flex-1 rounded-lg! bg-secondary-700! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-35.25 sm:flex-none"
          >
            Search
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            className="min-w-27 flex-1 rounded-lg! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:w-35.25 sm:flex-none"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* SLR Table Card — Figma node 4023:53819 */}
      <div className="flex w-full flex-col gap-md rounded-2xl border border-pneutral-200 bg-white p-md">
        {isLoading || loadError ? (
          <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
            {isLoading ? "Loading sales returns..." : loadError}
          </div>
        ) : salesReturns.length === 0 ? (
          /* SLR Empty State — Figma node 4023:54119 */
          <SalesReturnEmptyState
            title="No Sales Returns Found"
            description="Sales returns processed against customer bills will appear here."
            action={
              <CreateSalesReturnButton
                className="w-59.25!"
                onClick={openCreateSalesReturn}
              />
            }
          />
        ) : filteredReturns.length === 0 ? (
          /* SLR No-Match State — Figma node 4023:54320 */
          <SalesReturnEmptyState
            title="No Matching Sales Returns Found"
            description="There are no Sales Return records matching your current search or filters. Try adjusting your criteria."
            action={
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="h-12! max-h-13 min-h-12 w-35.25! min-w-27 rounded-lg! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700!"
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <>
            {/* Shared grid DataTable, with Figma's header/row sizing applied from
                outside so the common component stays untouched. Headers and cells
                wrap and padding tightens on narrower screens so every column fits
                without horizontal scrolling. */}
            <div className="w-full [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-15 [&_th]:border-pneutral-200 [&_th]:px-2 [&_th]:py-2.5 [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_th]:text-white [&_tbody_tr]:h-16 [&_td]:px-2 [&_td]:py-2.5 [&_td]:wrap-break-word xl:[&_th]:px-sm xl:[&_td]:px-sm">
              <DataTable
                columns={buildSalesReturnColumns(
                  (currentPage - 1) * PAGE_SIZE,
                  (row) =>
                    router.push(
                      `/dashboard/salesReturn?view=details&salesReturnId=${row.id}&returnNo=${encodeURIComponent(row.returnNo)}`
                    )
                )}
                data={filteredReturns.slice(
                  (currentPage - 1) * PAGE_SIZE,
                  currentPage * PAGE_SIZE
                )}
              />
            </div>

            {/* SLR Pagination Row — Figma node 4023:53911 */}
            <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">
                Showing{" "}
                {(currentPage - 1) * PAGE_SIZE + 1}{" "}
                to {Math.min(currentPage * PAGE_SIZE, filteredReturns.length)} of{" "}
                {filteredReturns.length} records
              </p>
              <div className="[&_button]:rounded-lg [&_button]:text-label-l3 [&_button[aria-label]]:bg-secondary-300">
                <PaginationControl
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  totalItems={filteredReturns.length}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// useSearchParams needs a Suspense boundary in an App Router page.
const SalesReturnPage = () => (
  <Suspense fallback={null}>
    <SalesReturnContent />
  </Suspense>
);

export default SalesReturnPage;
