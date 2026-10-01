"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { SOURCE_LABELS } from "@/app/dashboard/wearhouseStockReturn/stockReturnDraft";
import type { StockReturnSource } from "@/app/dashboard/wearhouseStockReturn/components/StockReturnType";
import { useCurrentUserName } from "@/app/dashboard/wearhouseStockReturn/useCurrentUserName";
import {
  IncomingStockReturn,
  RECEIPT_STATUSES,
  ReceiptLine,
  SAMPLE_INCOMING_RETURNS,
  formatDateTime,
  receiptTotals,
} from "./stockReturnReceipt";
import { StatusBadge } from "./components/ReceiptParts";
import VerifyStockReturnReciept from "./components/VerifyStockReturnReciept";
import StockReturnRecieptDetails from "./components/StockReturnRecieptDetails";

const LIST_PATH = "/dashboard/StockReturnReciept";
const PAGE_SIZE = 10;

interface Filters {
  search: string;
  pharmacy: string | number;
  type: string | number;
  status: string | number;
  dateFrom: string;
  dateTo: string;
}

// The list opens on what still needs the warehouse's attention.
const DEFAULT_FILTERS: Filters = {
  search: "",
  pharmacy: "",
  type: "",
  status: "Pending Receipt",
  dateFrom: "",
  dateTo: "",
};

const matchesFilters = (row: IncomingStockReturn, filters: Filters): boolean => {
  const query = filters.search.trim().toLowerCase();
  const dispatchDate = row.dispatchedAt.split("T")[0];
  if (query && !row.returnNo.toLowerCase().includes(query)) return false;
  if (filters.pharmacy !== "" && row.fromPharmacy !== filters.pharmacy) return false;
  if (filters.type !== "" && row.source !== filters.type) return false;
  if (filters.status !== "" && row.status !== filters.status) return false;
  if (filters.dateFrom && dispatchDate < filters.dateFrom) return false;
  if (filters.dateTo && dispatchDate > filters.dateTo) return false;
  return true;
};

const TYPE_OPTIONS = (Object.keys(SOURCE_LABELS) as StockReturnSource[]).map((source) => ({
  label: SOURCE_LABELS[source],
  value: source,
}));

const STATUS_OPTIONS = RECEIPT_STATUSES.map((status) => ({ label: status, value: status }));

const remarksFor = (lines: ReceiptLine[]): string => {
  const { notReceived } = receiptTotals(lines);
  return notReceived > 0
    ? `${notReceived} ${notReceived === 1 ? "unit" : "units"} short-received; discrepancy recorded.`
    : "All units received.";
};

const StockReturnRecieptContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const selectedId = searchParams.get("id");
  const currentUserName = useCurrentUserName("Warehouse User");

  // TODO: load from the incoming stock-return endpoint once the backend has one.
  const [returns, setReturns] = useState<IncomingStockReturn[]>(SAMPLE_INCOMING_RETURNS);

  // The filter row only takes effect on Search, as the design's button implies.
  const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  const pharmacyOptions = useMemo(
    () =>
      Array.from(new Set(returns.map((row) => row.fromPharmacy))).map((name) => ({
        label: name,
        value: name,
      })),
    [returns]
  );

  const filteredReturns = useMemo(
    () => returns.filter((row) => matchesFilters(row, appliedFilters)),
    [returns, appliedFilters]
  );

  const applyFilters = (filters: Filters) => {
    setPendingFilters(filters);
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const updateReturn = (id: string, patch: Partial<IncomingStockReturn>) =>
    setReturns((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const openReturn = (row: IncomingStockReturn) =>
    router.push(
      `${LIST_PATH}?view=${row.status === "Completed" ? "details" : "verify"}&id=${row.id}`
    );

  const selected = returns.find((row) => row.id === selectedId);

  if (view === "verify" && selected) {
    return (
      <VerifyStockReturnReciept
        stockReturn={selected}
        onBack={() => router.push(LIST_PATH)}
        // TODO: persist through the receipt-draft endpoint once it exists.
        onSaveDraft={(lines) => {
          updateReturn(selected.id, { lines });
          router.push(LIST_PATH);
        }}
        // TODO: post the receipt to the backend once the endpoint exists.
        onConfirm={(lines) => {
          updateReturn(selected.id, {
            lines,
            status: "Completed",
            receivedAt: new Date().toISOString(),
            receivedBy: currentUserName,
            remarks: remarksFor(lines),
          });
          router.push(`${LIST_PATH}?view=details&id=${selected.id}`);
        }}
      />
    );
  }

  if (view === "details" && selected) {
    return (
      <StockReturnRecieptDetails stockReturn={selected} onBack={() => router.push(LIST_PATH)} />
    );
  }

  const rowOffset = (currentPage - 1) * PAGE_SIZE;

  const columns: ColumnDef<IncomingStockReturn>[] = [
    {
      id: "slNo",
      header: "SL. NO.",
      cell: ({ row }) => rowOffset + row.index + 1,
    },
    {
      accessorKey: "returnNo",
      header: "STOCK RETURN NO.",
      cell: ({ row }) => (
        <span className="font-semibold whitespace-nowrap text-primary-800">
          {row.original.returnNo}
        </span>
      ),
    },
    {
      id: "dispatchedAt",
      header: "DISPATCH DATE & TIME",
      cell: ({ row }) => {
        const [date, ...time] = formatDateTime(row.original.dispatchedAt).split(" ");
        return (
          <div className="flex flex-col whitespace-nowrap">
            <span>{date}</span>
            <span>{time.join(" ")}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "fromPharmacy",
      header: "FROM PHARMACY",
      cell: ({ row }) => (
        <span className="font-semibold whitespace-nowrap">{row.original.fromPharmacy}</span>
      ),
    },
    {
      id: "type",
      header: "RETURN TYPE",
      cell: ({ row }) => <span className="text-p2">{SOURCE_LABELS[row.original.source]}</span>,
    },
    {
      id: "products",
      header: "TOTAL PRODUCTS",
      cell: ({ row }) => <span className="font-semibold">{row.original.lines.length}</span>,
    },
    {
      id: "qty",
      header: "TOTAL RETURN QTY",
      cell: ({ row }) => (
        <span className="font-semibold">{receiptTotals(row.original.lines).dispatched}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={row.original.status === "Completed" ? "green" : "yellow"}
        />
      ),
    },
    {
      id: "action",
      header: "ACTION",
      cell: ({ row }) => (
        <button
          type="button"
          aria-label={`${row.original.status === "Completed" ? "View" : "Receive"} ${row.original.returnNo}`}
          onClick={() => openReturn(row.original)}
          className="flex items-center"
        >
          <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-h5 font-semibold text-pneutral-900">Incoming Stock Returns</p>
        <p className="text-label-l4 font-regular text-pneutral-500">
          View Stock Returns dispatched by Pharmacies/Stores and awaiting receipt at this Central
          Warehouse.
        </p>
      </div>

      <div className="flex w-full flex-col gap-sm lg:flex-row lg:items-start">
        <Input
          placeholder="Search by Stock Return No..."
          value={pendingFilters.search}
          onChange={(e) => setPendingFilters((prev) => ({ ...prev, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters(pendingFilters);
          }}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />
        <Dropdown
          options={pharmacyOptions}
          value={pendingFilters.pharmacy}
          onChange={(pharmacy) => setPendingFilters((prev) => ({ ...prev, pharmacy }))}
          placeholder="All Pharmacies"
          clearable
          className="w-full lg:w-42.5"
        />
        <Dropdown
          options={TYPE_OPTIONS}
          value={pendingFilters.type}
          onChange={(type) => setPendingFilters((prev) => ({ ...prev, type }))}
          placeholder="All Types"
          clearable
          className="w-full lg:w-37.5"
        />
        <Dropdown
          options={STATUS_OPTIONS}
          value={pendingFilters.status}
          onChange={(status) => setPendingFilters((prev) => ({ ...prev, status }))}
          placeholder="All Status"
          clearable
          className="w-full lg:w-42.5"
        />
      </div>

      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
        <div className="flex h-12 w-full shrink-0 items-center gap-sm rounded-lg border border-pneutral-300 bg-base-white px-sm sm:w-auto">
          <CalendarDays size={20} className="shrink-0 text-pneutral-500" />
          <input
            type="date"
            value={pendingFilters.dateFrom}
            max={pendingFilters.dateTo || undefined}
            onChange={(e) => setPendingFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            aria-label="Dispatch date from"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none sm:w-auto"
          />
          <span className="shrink-0 text-label-l4 text-pneutral-500">–</span>
          <input
            type="date"
            value={pendingFilters.dateTo}
            min={pendingFilters.dateFrom || undefined}
            onChange={(e) => setPendingFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            aria-label="Dispatch date to"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none sm:w-auto"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => applyFilters(pendingFilters)}
          className="w-full! px-4 font-medium! text-pneutral-50! sm:w-35.25!"
        >
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => applyFilters(DEFAULT_FILTERS)}
          className="w-full! border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
        >
          Reset
        </Button>
      </div>

      <div className="flex w-full flex-col gap-md overflow-x-auto rounded-2xl border border-pneutral-200 bg-base-white p-md">
        <DataTable
          columns={columns}
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
    </div>
  );
};

const StockReturnRecieptPage = () => (
  <Suspense fallback={null}>
    <StockReturnRecieptContent />
  </Suspense>
);

export default StockReturnRecieptPage;
