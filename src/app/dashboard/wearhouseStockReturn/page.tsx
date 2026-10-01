"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Clipboard, Info, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import StockReturnType, { type StockReturnSource } from "./components/StockReturnType";
import CreateStockReturn from "./components/CreateStockReturn";
import StockReturnReview from "./components/StockReturnReview";
import type { StockReturnDraft } from "./stockReturnDraft";

const LIST_PATH = "/dashboard/wearhouseStockReturn";

/** One row of the stock-return list — Figma node 3658:42265 ("SRL Table Card"). */
interface StockReturnRow {
  id: string;
  returnNo: string;
  returnType: StockReturnType;
  to: string;
  products: number;
  /** Purchase units, as the column header in the design says. */
  returnQty: number;
  /** Already formatted for display (dd-mm-yyyy). */
  returnDate: string;
  /** `yyyy-mm-dd`, kept for the date-range filter. */
  returnDateIso: string;
  status: StockReturnStatus;
}

type StockReturnType = "Pharmacy Inventory" | "Damaged – Inter-Store Transfer";

type StockReturnStatus = "Draft" | "Pending Receipt" | "Completed";

const RETURN_TYPES: StockReturnType[] = [
  "Pharmacy Inventory",
  "Damaged – Inter-Store Transfer",
];

const RETURN_STATUSES: StockReturnStatus[] = ["Draft", "Pending Receipt", "Completed"];

const STATUS_STYLES: Record<StockReturnStatus, string> = {
  // The project's "danger" tokens are this Figma file's yellow scale — matched
  // by hex, not by name.
  Draft: "bg-danger-50 border-danger-600 text-danger-600",
  "Pending Receipt": "bg-success-50 border-success-600 text-success-800",
  Completed: "bg-success-50 border-success-600 text-success-800",
};

// TODO: replace with the stock-return list endpoint once the backend has one.
const SAMPLE_RETURNS: StockReturnRow[] = [
  {
    id: "8",
    returnNo: "STR-2026-00008",
    returnType: "Pharmacy Inventory",
    to: "Central Warehouse",
    products: 3,
    returnQty: 95,
    returnDate: "08-09-2026",
    returnDateIso: "2026-09-08",
    status: "Draft",
  },
  {
    id: "7",
    returnNo: "STR-2026-00007",
    returnType: "Damaged – Inter-Store Transfer",
    to: "Central Warehouse",
    products: 1,
    returnQty: 15,
    returnDate: "05-09-2026",
    returnDateIso: "2026-09-05",
    status: "Pending Receipt",
  },
  {
    id: "6",
    returnNo: "STR-2026-00006",
    returnType: "Pharmacy Inventory",
    to: "Central Warehouse",
    products: 2,
    returnQty: 40,
    returnDate: "28-08-2026",
    returnDateIso: "2026-08-28",
    status: "Completed",
  },
  {
    id: "5",
    returnNo: "STR-2026-00005",
    returnType: "Pharmacy Inventory",
    to: "Central Warehouse",
    products: 1,
    returnQty: 10,
    returnDate: "20-08-2026",
    returnDateIso: "2026-08-20",
    status: "Completed",
  },
];

const StatusBadge = ({ status }: { status: StockReturnStatus }) => (
  <span
    className={`inline-flex items-center justify-center rounded-lg border px-sm py-1 text-label-l4 font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
  >
    {status}
  </span>
);

const buildColumns = (
  rowOffset: number,
  onView: (id: string) => void
): ColumnDef<StockReturnRow>[] => [
  {
    id: "slNo",
    header: "SL. NO.",
    cell: ({ row }) => rowOffset + row.index + 1,
  },
  {
    accessorKey: "returnNo",
    header: "STOCK RETURN NO.",
    cell: ({ row }) => (
      <span className="font-semibold text-primary-800 whitespace-nowrap">
        {row.original.returnNo}
      </span>
    ),
  },
  {
    accessorKey: "returnType",
    header: "STOCK RETURN TYPE",
  },
  {
    accessorKey: "to",
    header: "TO",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.to}</span>,
  },
  {
    accessorKey: "products",
    header: "PRODUCTS",
    cell: ({ row }) => <span className="font-semibold">{row.original.products}</span>,
  },
  {
    accessorKey: "returnQty",
    header: "RETURN QTY (PURCHASE UNITS)",
    cell: ({ row }) => <span className="font-semibold">{row.original.returnQty}</span>,
  },
  {
    accessorKey: "returnDate",
    header: "DATE",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.returnDate}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "ACTION",
    cell: ({ row }) => (
      <button
        type="button"
        aria-label={`View ${row.original.returnNo}`}
        onClick={() => onView(row.original.id)}
        className="flex items-center"
      >
        <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
      </button>
    ),
  },
];

const PAGE_SIZE = 10;

const WarehouseStockReturnContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { canCreate } = useModulePermissions("WAREHOUSE_STOCK_RETURN");

  const [search, setSearchValue] = useState("");
  const [returnType, setReturnTypeValue] = useState<string | number>("");
  const [status, setStatusValue] = useState<string | number>("");
  const [dateFrom, setDateFromValue] = useState("");
  const [dateTo, setDateToValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Narrowing the list can leave the viewer on a page that no longer exists,
  // so every filter change goes back to the first one.
  const resettingPage =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setCurrentPage(1);
    };
  const setSearch = resettingPage(setSearchValue);
  const setReturnType = resettingPage(setReturnTypeValue);
  const setStatus = resettingPage(setStatusValue);
  const setDateFrom = resettingPage(setDateFromValue);
  const setDateTo = resettingPage(setDateToValue);

  const returns = SAMPLE_RETURNS;

  const typeOptions = useMemo(
    () => RETURN_TYPES.map((type) => ({ label: type, value: type })),
    []
  );

  const statusOptions = useMemo(
    () => RETURN_STATUSES.map((value) => ({ label: value, value })),
    []
  );

  const filteredReturns = useMemo(() => {
    const query = search.trim().toLowerCase();

    return returns.filter((row) => {
      if (query && !row.returnNo.toLowerCase().includes(query)) return false;
      if (returnType !== "" && row.returnType !== returnType) return false;
      if (status !== "" && row.status !== status) return false;
      if (dateFrom && row.returnDateIso < dateFrom) return false;
      if (dateTo && row.returnDateIso > dateTo) return false;
      return true;
    });
  }, [returns, search, returnType, status, dateFrom, dateTo]);

  const rowOffset = (currentPage - 1) * PAGE_SIZE;

  // The return being built. Null until a return type is picked; kept while
  // moving between Create and Review so going back loses nothing.
  const [draft, setDraft] = useState<StockReturnDraft | null>(null);
  const [step, setStep] = useState<"items" | "review">("items");

  // Every Create starts fresh, whatever a previous visit left behind.
  const handleCreate = () => {
    setDraft(null);
    router.push(`${LIST_PATH}?view=add`);
  };
  // TODO: wire to the view screen once it exists.
  const handleView = (id: string) => console.info("View stock return", id);

  const handleSelectSource = (source: StockReturnSource) => {
    // TODO: the Inter-Store Transfer source gets its own screen — to be built next.
    if (source !== "PHARMACY_INVENTORY") return;
    setDraft({ source, lines: [] });
    setStep("items");
  };

  // TODO: call the stock-return endpoints once the backend has them.
  const handleSaveDraft = () => {};
  const handleConfirm = () => {};

  if (view === "add") {
    if (!draft) {
      return (
        <StockReturnType
          onSelect={handleSelectSource}
          onBack={() => router.push(LIST_PATH)}
        />
      );
    }

    if (step === "review") {
      return (
        <StockReturnReview
          draft={draft}
          onBack={() => setStep("items")}
          onSaveDraft={handleSaveDraft}
          onConfirm={handleConfirm}
        />
      );
    }

    return (
      <CreateStockReturn
        draft={draft}
        onChange={(lines) => setDraft({ ...draft, lines })}
        onBack={() => setDraft(null)}
        onSaveDraft={handleSaveDraft}
        onReview={() => setStep("review")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-h5 font-semibold text-pneutral-900">Stock Return</p>
          <p className="text-label-l4 font-regular text-pneutral-500">
            View and manage stock returned from this Pharmacy/Store to the Central
            Warehouse.
          </p>
        </div>

        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onClick={handleCreate}
            className="h-12! w-full! min-w-27 shrink-0 gap-2 rounded-lg bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
          >
            <Clipboard size={20} className="shrink-0" />
            Create Stock Return
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-start">
        <Input
          placeholder="Search by Stock Return No..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />

        <Dropdown
          options={typeOptions}
          value={returnType}
          onChange={setReturnType}
          placeholder="All Types"
          clearable
          className="w-full sm:w-40"
        />

        <Dropdown
          options={statusOptions}
          value={status}
          onChange={setStatus}
          placeholder="All Status"
          clearable
          className="w-full sm:w-40"
        />

        <div className="flex h-12 w-full shrink-0 items-center gap-sm rounded-lg border border-pneutral-300 bg-base-white px-sm sm:w-auto">
          <CalendarDays size={16} className="shrink-0 text-pneutral-500" />
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none sm:w-auto"
          />
          <span className="shrink-0 text-label-l4 text-pneutral-500">–</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none sm:w-auto"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-md overflow-x-auto rounded-2xl border border-pneutral-200 bg-base-white p-md">
        <DataTable
          columns={buildColumns(rowOffset, handleView)}
          data={filteredReturns.slice(rowOffset, rowOffset + PAGE_SIZE)}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              No stock returns found.
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: filteredReturns.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      <div className="flex w-full items-start gap-sm rounded-2xl bg-secondary-100 p-md text-secondary-700">
        <Info size={18} className="mt-1 shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-label-l5 font-semibold">Note</p>
          <p className="text-p3 font-regular">
            • Stock is returned from this Pharmacy/Store to its Central Warehouse.
          </p>
          <p className="text-p3 font-regular">
            • A return stays Pending Receipt until the warehouse confirms it has
            received the stock.
          </p>
          <p className="text-p3 font-regular">
            • Click the eye icon to view the full details of a stock return.
          </p>
        </div>
      </div>
    </div>
  );
};

const WarehouseStockReturnPage = () => (
  <Suspense fallback={null}>
    <WarehouseStockReturnContent />
  </Suspense>
);

export default WarehouseStockReturnPage;
