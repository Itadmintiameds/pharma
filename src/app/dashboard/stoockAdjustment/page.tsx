"use client";

import { useState } from "react";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { IndianRupee, Plus, Scale, Search } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { PaginationControl } from "@/app/components/common/table/Pagination";
import CreateStockAdjustment from "./components/CreateStockAdjustment";
import ReviewAndConfirm from "./components/ReviewAndConfirm";
import ConfirmSuccessModal from "./components/ConfirmSuccessModal";
import StockAdjustmentView from "./components/StockAdjustmentView";
import {
  REASONS,
  StockAdjustmentDraft,
  StockAdjustmentRecord,
  adjustmentQty,
  formatSigned,
  formatSignedRupees,
  signedTextClass,
} from "./components/stockAdjustmentDraft";

const REASON_OPTIONS = [
  { label: "Reason: All", value: "" },
  ...REASONS.map((reason) => ({ label: reason, value: reason })),
];

interface StockAdjustmentFilters {
  search: string;
  reason: string;
}

const EMPTY_FILTERS: StockAdjustmentFilters = { search: "", reason: "" };

interface StockAdjustmentRow {
  id: number;
  adjustmentNo: string;
  /** dd-mm-yyyy */
  adjustmentDate: string;
  /** hh:mm AM/PM */
  adjustmentTime: string;
  productName: string;
  batchNo: string;
  /** Signed: negative removes stock, positive adds it. */
  adjustmentQty: number;
  reason: string;
  /** Signed rupee value of the adjustment. */
  valueImpact: number;
}

const PAGE_SIZE = 10;

const buildKpiCards = (rows: StockAdjustmentRow[]) => [
  {
    key: "count",
    label: "Total Stock Adjustments",
    value: String(rows.length),
    cardBg: "bg-info-50",
    icon: <Scale size={24} strokeWidth={1.5} className="text-info-500" />,
  },
  {
    key: "impact",
    label: "Total Stock Value Impact",
    value: formatSignedRupees(rows.reduce((sum, row) => sum + row.valueImpact, 0)),
    cardBg: "bg-primary-100",
    icon: (
      <span className="flex size-5 items-center justify-center rounded-full border-[1.5px] border-primary-800">
        <IndianRupee size={11} strokeWidth={2.5} className="text-primary-800" />
      </span>
    ),
  },
];

const buildStockAdjustmentColumns = (
  rowOffset: number,
  onView: (row: StockAdjustmentRow) => void
): ColumnDef<StockAdjustmentRow>[] => [
  {
    header: "SL. NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {rowOffset + row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: "adjustmentNo",
    header: "STOCK ADJUSTMENT ID",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-primary-800">
        {row.original.adjustmentNo}
      </span>
    ),
  },
  {
    accessorKey: "adjustmentDate",
    header: "ADJUSTMENT DATE & TIME",
    cell: ({ row }) => (
      <div className="flex flex-col gap-xxsm">
        <span className="text-p3 font-regular text-pneutral-900">
          {row.original.adjustmentDate}
        </span>
        <span className="text-p3 font-regular text-pneutral-600">
          {row.original.adjustmentTime}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "productName",
    header: "PRODUCT NAME",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.productName}
      </span>
    ),
  },
  {
    accessorKey: "batchNo",
    header: "BATCH NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.batchNo}
      </span>
    ),
  },
  {
    accessorKey: "adjustmentQty",
    header: "ADJUSTMENT QTY",
    cell: ({ row }) => (
      <span
        className={`text-p3 font-semibold ${signedTextClass(row.original.adjustmentQty)}`}
      >
        {formatSigned(row.original.adjustmentQty, String)}
      </span>
    ),
  },
  {
    accessorKey: "reason",
    header: "REASON",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.reason}
      </span>
    ),
  },
  {
    accessorKey: "valueImpact",
    header: "STOCK VALUE IMPACT (IN RUPEES)",
    cell: ({ row }) => (
      <span
        className={`text-p3 font-semibold ${signedTextClass(row.original.valueImpact)}`}
      >
        {formatSignedRupees(row.original.valueImpact)}
      </span>
    ),
  },
  {
    header: "VIEW",
    cell: ({ row }) => (
      <button
        type="button"
        aria-label={`View ${row.original.adjustmentNo}`}
        onClick={() => onView(row.original)}
      >
        <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
      </button>
    ),
  },
];

const applyStockAdjustmentFilters = (
  rows: StockAdjustmentRow[],
  { search, reason }: StockAdjustmentFilters
) => {
  const query = search.trim().toLowerCase();

  return rows.filter(
    (row) =>
      (!query ||
        [row.adjustmentNo, row.productName, row.batchNo].some((value) =>
          value.toLowerCase().includes(query)
        )) &&
      (!reason || row.reason === reason)
  );
};

/** Centered icon + message block that replaces the table — Figma "SA Empty State". */
const StockAdjustmentEmptyState = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) => (
  <div className="flex w-full flex-col items-center justify-center gap-sm py-xlg">
    <div className="flex size-18 shrink-0 items-center justify-center rounded-full bg-primary-100">
      {icon}
    </div>
    <p className="text-center text-label-l5 font-semibold text-pneutral-900">
      {title}
    </p>
    {description && (
      <p className="w-full max-w-105 text-center text-p3 font-regular text-pneutral-500">
        {description}
      </p>
    )}
  </div>
);

const StockAdjustment = () => {
  const [currentPage, setCurrentPage] = useState(1);
  // Draft values in the filter row vs. the ones last applied with "Search".
  const [filters, setFilters] = useState<StockAdjustmentFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<StockAdjustmentFilters>(EMPTY_FILTERS);

  // No stock adjustment API exists yet, so the list starts empty and only holds
  // the adjustments confirmed in this session.
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentRow[]>([]);

  // Full details of each confirmed adjustment, keyed by adjustment no., for View
  const [records, setRecords] = useState<Record<string, StockAdjustmentRecord>>({});

  // The create flow runs in place of the list: create → review → success modal;
  // View replaces the list the same way.
  const [view, setView] = useState<"list" | "create" | "review" | "view">("list");
  const [draft, setDraft] = useState<StockAdjustmentDraft | null>(null);
  const [confirmed, setConfirmed] = useState<StockAdjustmentRecord | null>(null);
  const [viewing, setViewing] = useState<StockAdjustmentRecord | null>(null);

  const openCreate = () => {
    setDraft(null);
    setView("create");
  };

  const backToList = () => {
    setConfirmed(null);
    setDraft(null);
    setViewing(null);
    setView("list");
  };

  const openView = (record: StockAdjustmentRecord | undefined) => {
    if (!record) return;
    setConfirmed(null);
    setDraft(null);
    setViewing(record);
    setView("view");
  };

  const confirmAdjustment = () => {
    if (!draft) return;
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    // Placeholder numbering until the backend issues adjustment numbers
    const adjustmentNo = `SA-${now.getFullYear()}-${String(stockAdjustments.length + 1).padStart(5, "0")}`;
    const qty = adjustmentQty(draft);

    setStockAdjustments((prev) => [
      {
        id: prev.length + 1,
        adjustmentNo,
        adjustmentDate: `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`,
        adjustmentTime: time,
        productName: draft.batch.productName,
        batchNo: draft.batch.batchNo,
        adjustmentQty: qty,
        reason: draft.reason,
        valueImpact: qty * draft.batch.purchasePrice,
      },
      ...prev,
    ]);
    const record: StockAdjustmentRecord = {
      ...draft,
      adjustmentNo,
      adjustedAt: `${pad(now.getDate())}-${now.toLocaleDateString("en-US", { month: "short" })}-${now.getFullYear()}, ${time}`,
      status: "Completed",
    };
    setRecords((prev) => ({ ...prev, [adjustmentNo]: record }));
    setConfirmed(record);
  };

  if (view === "view" && viewing) {
    return <StockAdjustmentView record={viewing} onBack={backToList} />;
  }

  if (view === "create") {
    return (
      <CreateStockAdjustment
        initialDraft={draft}
        onCancel={backToList}
        onReview={(next) => {
          setDraft(next);
          setView("review");
        }}
      />
    );
  }

  if (view === "review" && draft) {
    return (
      <>
        <ReviewAndConfirm
          draft={draft}
          onBack={() => setView("create")}
          onConfirm={confirmAdjustment}
        />
        <ConfirmSuccessModal
          isOpen={confirmed !== null}
          onClose={backToList}
          onBackToList={backToList}
          onViewStockAdjustment={() => openView(confirmed ?? undefined)}
          adjustmentNo={confirmed?.adjustmentNo ?? ""}
          adjustedAt={confirmed?.adjustedAt ?? ""}
          status="Completed"
        />
      </>
    );
  }

  const updateFilters = (patch: Partial<StockAdjustmentFilters>) =>
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

  const filtersApplied = Boolean(
    appliedFilters.search.trim() || appliedFilters.reason
  );
  const filteredAdjustments = applyStockAdjustmentFilters(
    stockAdjustments,
    appliedFilters
  );

  return (
    <div className="flex flex-col gap-md">
      {/* SA Header Row */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-h5 font-semibold text-pneutral-900">
          Stock Adjustment
        </p>

        <Button
          type="button"
          variant="primary"
          onClick={openCreate}
          className="h-12! max-h-13 min-h-12 w-full! min-w-27 shrink-0 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-69.25!"
        >
          <Plus size={20} className="shrink-0" />
          Create Stock Adjustment
        </Button>
      </div>

      {/* SA KPI Row */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-start">
        {buildKpiCards(stockAdjustments).map((card) => (
          <div
            key={card.key}
            className={`flex h-38 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-xl p-5 ${card.cardBg}`}
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

      {/* SA Filters Row */}
      <div className="flex w-full flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
        <Input
          placeholder="Search by adjustment no., product or batch no."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg! border-[1.5px]! border-sneutral-100! [&_input]:pl-2 [&_input]:text-label-l3 [&_input]:font-regular [&_input]:text-ellipsis [&_input]:placeholder:text-pneutral-300"
          containerClassName="w-full min-w-0 lg:flex-1"
        />

        <Dropdown
          options={REASON_OPTIONS}
          value={filters.reason}
          onChange={(reason) => updateFilters({ reason: String(reason) })}
          placeholder="Reason: All"
          className="w-full sm:w-55 sm:shrink-0"
        />

        <div className="flex w-full gap-sm sm:w-auto sm:shrink-0">
          <Button
            type="button"
            variant="primary"
            onClick={applyFilters}
            className="min-w-27 flex-1 rounded-lg! bg-pneutral-900! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-35.25 sm:flex-none"
          >
            Search
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            className="min-w-27 flex-1 rounded-lg! border-2! border-pneutral-900! px-md text-label-l4! font-medium! text-pneutral-900! sm:w-35.25 sm:flex-none"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* SA Table Card */}
      <div className="flex w-full flex-col gap-md rounded-2xl border border-pneutral-200 bg-white p-md">
        {filteredAdjustments.length === 0 ? (
          filtersApplied ? (
            /* SA No-Match State — Figma node 4191:43163 */
            <StockAdjustmentEmptyState
              icon={<Search size={32} strokeWidth={1.5} className="text-primary-800" />}
              title="No Matching Stock Adjustments Found."
            />
          ) : (
            /* SA Empty State — Figma node 4191:43075 */
            <StockAdjustmentEmptyState
              icon={<Scale size={32} strokeWidth={1.5} className="text-primary-800" />}
              title="No Stock Adjustments Found."
              description="Completed stock adjustments will appear here."
            />
          )
        ) : (
          <>
            {/* Shared grid DataTable, with Figma's header/row sizing applied from
                outside so the common component stays untouched. */}
            <div className="w-full [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-16 [&_th]:border-pneutral-200 [&_th]:px-2 [&_th]:py-2 [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_th]:text-white [&_tbody_tr]:h-17 [&_td]:px-2 [&_td]:py-2 [&_td]:wrap-break-word xl:[&_th]:px-sm xl:[&_td]:px-sm">
              <DataTable
                columns={buildStockAdjustmentColumns(
                  (currentPage - 1) * PAGE_SIZE,
                  (row) => openView(records[row.adjustmentNo])
                )}
                data={filteredAdjustments.slice(
                  (currentPage - 1) * PAGE_SIZE,
                  currentPage * PAGE_SIZE
                )}
              />
            </div>

            {/* SA Pagination Row */}
            <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filteredAdjustments.length)} of{" "}
                {filteredAdjustments.length} records
              </p>
              <div className="[&_button]:rounded-lg [&_button]:text-label-l3 [&_button[aria-label]]:bg-secondary-300">
                <PaginationControl
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  totalItems={filteredAdjustments.length}
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

export default StockAdjustment;
