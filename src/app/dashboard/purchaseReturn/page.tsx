"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clipboard, Download, Info, Printer, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { getAllSupplier } from "@/services/SupplierService";
import type { SupplierData } from "@/types/SupplierData";
import AddPurchaseReturn from "./components/AddPurchaseReturn";

/** One row of the purchase-return list — Figma node 3543:32380 ("PR Table Card"). */
interface PurchaseReturnRow {
  id: string;
  returnNo: string;
  returnDate: string;
  supplier: string;
  invoiceNo: string;
  invoiceDate: string;
  items: number;
  amount: number;
  status: "Approved" | "Pending" | "Rejected";
}

// No purchase-return API exists yet, so the table is seeded with the same
// sample rows shown in the Figma mock until a real service lands.
const SAMPLE_RETURNS: PurchaseReturnRow[] = [
  {
    id: "1",
    returnNo: "PR-2024-0089",
    returnDate: "March 20, 2024",
    supplier: "MedPlus Distributors",
    invoiceNo: "INV-2024-1123",
    invoiceDate: "March 10, 2024",
    items: 3,
    amount: 4850,
    status: "Approved",
  },
  {
    id: "2",
    returnNo: "PR-2024-0088",
    returnDate: "March 18, 2024",
    supplier: "HealthCare Supplies Co.",
    invoiceNo: "INV-2024-1098",
    invoiceDate: "March 5, 2024",
    items: 2,
    amount: 1200,
    status: "Pending",
  },
  {
    id: "3",
    returnNo: "PR-2024-0087",
    returnDate: "March 15, 2024",
    supplier: "Wellness Pharma",
    invoiceNo: "INV-2024-1076",
    invoiceDate: "March 1, 2024",
    items: 5,
    amount: 8320,
    status: "Approved",
  },
  {
    id: "4",
    returnNo: "PR-2024-0086",
    returnDate: "March 10, 2024",
    supplier: "Grace Pharma Distributors",
    invoiceNo: "INV-2024-1042",
    invoiceDate: "Feb 25, 2024",
    items: 1,
    amount: 450,
    status: "Rejected",
  },
];

const RETURN_STATUS_STYLES: Record<PurchaseReturnRow["status"], string> = {
  Approved: "bg-success-50 border-success-600 text-success-800",
  // The project's "danger" tokens are this Figma file's yellow scale, and its
  // "warning" tokens are the red scale — matched by hex, not by name (see
  // figma-design-to-code-project memory).
  Pending: "bg-danger-50 border-danger-600 text-danger-600",
  Rejected: "bg-warning-50 border-warning-600 text-warning-600",
};

const ReturnStatusBadge = ({ status }: { status: PurchaseReturnRow["status"] }) => (
  <span
    className={`inline-flex items-center justify-center gap-1 rounded-sm border px-sm py-0.5 text-label-l3 font-medium ${RETURN_STATUS_STYLES[status]}`}
  >
    {status}
  </span>
);

const returnColumns: ColumnDef<PurchaseReturnRow, any>[] = [
  {
    accessorKey: "returnNo",
    header: "RETURN NO.",
    cell: ({ row }) => (
      <span className="font-semibold text-primary-800">{row.original.returnNo}</span>
    ),
  },
  {
    accessorKey: "returnDate",
    header: "RETURN DATE",
  },
  {
    accessorKey: "supplier",
    header: "SUPPLIER",
    cell: ({ row }) => <span className="font-semibold">{row.original.supplier}</span>,
  },
  {
    accessorKey: "invoiceNo",
    header: "INVOICE DATE",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span>{row.original.invoiceNo}</span>
        <span className="text-p2 text-pneutral-500">{row.original.invoiceDate}</span>
      </div>
    ),
  },
  {
    accessorKey: "items",
    header: "ITEMS",
    cell: ({ row }) => <span className="font-semibold">{row.original.items}</span>,
  },
  {
    accessorKey: "amount",
    header: "RETURN AMOUNT",
    cell: ({ row }) => (
      <span className="font-semibold">
        ₹{row.original.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => <ReturnStatusBadge status={row.original.status} />,
  },
  {
    header: "ACTIONS",
    cell: () => (
      <div className="flex items-center gap-sm">
        <button type="button" aria-label="Download" title="Download" className="text-pneutral-600 hover:text-pneutral-900">
          <Download size={20} />
        </button>
        <button type="button" aria-label="Print" title="Print" className="text-pneutral-600 hover:text-pneutral-900">
          <Printer size={20} />
        </button>
      </div>
    ),
  },
];

const PAGE_SIZE = 10;

const PurchaseReturnContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAdd = searchParams.get("view") === "add";
  const { canCreate } = useModulePermissions("PURCHASE_RETURN");

  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState<string | number>("");
  const [state, setState] = useState<string | number>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    getAllSupplier()
      .then(setSuppliers)
      .catch((err) => console.error("Failed to fetch suppliers for the filter row:", err));
  }, []);

  const supplierOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        label: supplier.supplierName,
        value: supplier.supplierId ?? supplier.supplierName,
      })),
    [suppliers]
  );

  const stateOptions = useMemo(
    () =>
      Array.from(new Set(suppliers.map((supplier) => supplier.state).filter(Boolean))).map(
        (name) => ({ label: name as string, value: name as string })
      ),
    [suppliers]
  );

  if (showAdd) {
    return (
      <AddPurchaseReturn
        onClose={() => router.push("/dashboard/purchaseReturn")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-h5 font-semibold text-pneutral-900">
            Purchase Return
          </p>
          <p className="text-label-l4 font-regular text-pneutral-500">
            View and manage product returns to suppliers.
          </p>
        </div>

        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push("/dashboard/purchaseReturn?view=add")}
            className="h-12! w-full! min-w-27 shrink-0 gap-2 rounded-lg bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
          >
            <Clipboard size={20} className="shrink-0" />
            Create Purchase Return
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-start">
        <Input
          placeholder="Search by Supplier Name, GSTIN, Contact Person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />

        <Dropdown
          options={supplierOptions}
          value={supplierId}
          onChange={setSupplierId}
          placeholder="All Suppliers"
          clearable
          className="w-full sm:w-40"
        />

        <Dropdown
          options={stateOptions}
          value={state}
          onChange={setState}
          placeholder="All States"
          clearable
          className="w-full sm:w-40"
        />

        <div className="flex h-12 w-full shrink-0 items-center gap-sm rounded-lg border border-pneutral-300 bg-base-white px-sm sm:w-auto">
          <CalendarDays size={20} className="shrink-0 text-pneutral-500" />
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

      <div className="flex w-full flex-col gap-md rounded-lg border border-pneutral-200 bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <DataTable
          columns={returnColumns}
          data={SAMPLE_RETURNS.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE
          )}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              No purchase returns found.
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: SAMPLE_RETURNS.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      <div className="flex w-full items-start gap-sm rounded-lg bg-secondary-100 p-md text-secondary-700">
        <Info size={24} className="shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-label-l5 font-semibold">Note</p>
          <p className="text-p3 font-regular">
            • Purchase returns must reference a valid original purchase invoice.
          </p>
          <p className="text-p3 font-regular">
            • Returns require approval before the stock adjustment is applied.
          </p>
          <p className="text-p3 font-regular">
            • Financial credit notes are generated automatically upon approval.
          </p>
        </div>
      </div>
    </div>
  );
};

const PurchaseReturnPage = () => (
  <Suspense fallback={null}>
    <PurchaseReturnContent />
  </Suspense>
);

export default PurchaseReturnPage;
