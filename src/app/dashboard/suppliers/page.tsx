"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { Info, Search } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import DataTable from "@/app/components/common/table/DataTable";
import { getAllSupplier } from "@/services/SupplierService";
import Supplier from "./components/Supplier";
import SupplierView from "./components/SupplierView";

const STATUS_OPTIONS = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

const STATE_OPTIONS = [
  { label: "Maharashtra", value: "Maharashtra" },
  { label: "Gujarat", value: "Gujarat" },
  { label: "Karnataka", value: "Karnataka" },
  { label: "Delhi", value: "Delhi" },
  { label: "Tamil Nadu", value: "Tamil Nadu" },
  { label: "West Bengal", value: "West Bengal" },
];

interface SupplierRow {
  id: number;
  name: string;
  gstin: string;
  contactPerson: string;
  mobileNumber: string;
  city: string;
  state: string;
  status: "Active" | "Inactive";
}

const PAGE_SIZE = 10;

const buildSupplierColumns = (
  rowOffset: number,
  onView: (id: number) => void,
  onEdit: (id: number) => void
): ColumnDef<SupplierRow>[] => [
  {
    header: "#",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {rowOffset + row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "SUPPLIER NAME",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-p3 font-semibold text-pneutral-900">
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "gstin",
    header: "GSTIN",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-p3 font-regular text-pneutral-900">
        {row.original.gstin}
      </span>
    ),
  },
  {
    accessorKey: "contactPerson",
    header: "CONTACT PERSON",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-p3 font-regular text-pneutral-900">
        {row.original.contactPerson}
      </span>
    ),
  },
  {
    accessorKey: "mobileNumber",
    header: "MOBILE NUMBER",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-p3 font-regular text-pneutral-900">
        {row.original.mobileNumber}
      </span>
    ),
  },
  {
    accessorKey: "city",
    header: "CITY",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-p3 font-regular text-pneutral-900">
        {row.original.city}
      </span>
    ),
  },
  {
    accessorKey: "state",
    header: "STATE",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-p3 font-regular text-pneutral-900">
        {row.original.state}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: "ACTIONS",
    cell: ({ row }) => (
      <div className="flex items-center gap-sm">
        <button
          type="button"
          aria-label={`View ${row.original.name}`}
          onClick={() => onView(row.original.id)}
        >
          <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
        </button>
        <button
          type="button"
          aria-label={`Edit ${row.original.name}`}
          onClick={() => onEdit(row.original.id)}
        >
          <Image src="/Supplier/EditIcon.svg" alt="" width={20} height={20} />
        </button>
      </div>
    ),
  },
];

const SuppliersContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refetch whenever we land back on the list (e.g. after ?view=add or
    // ?view=view closes) so a newly added supplier shows up without a full
    // page reload, and a single-supplier view doesn't need the whole list.
    if (searchParams.get("view")) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAllSupplier();
        if (active) {
          setSuppliers(
            data.map((s, index) => ({
              id: s.supplierId ?? index + 1,
              name: s.supplierName,
              gstin: s.gstinNo || "—",
              contactPerson: s.contactPersonName || "—",
              mobileNumber: s.mobileNumber ? String(s.mobileNumber) : "—",
              city: s.city || "—",
              state: s.state || "—",
              status: s.status === "INACTIVE" ? "Inactive" : "Active",
            }))
          );
        }
      } catch (error) {
        console.error("Unable to fetch suppliers", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [searchParams]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (status && s.status !== status) return false;
      if (state && s.state !== state) return false;
      if (query) {
        const haystack = `${s.name} ${s.gstin} ${s.contactPerson}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [suppliers, search, status, state]);

  const pageData = filteredSuppliers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, state]);

  if (searchParams.get("view") === "add") {
    return <Supplier />;
  }

  const activeSupplierId = searchParams.get("id");

  if (searchParams.get("view") === "edit" && activeSupplierId) {
    return <Supplier supplierId={activeSupplierId} />;
  }

  if (searchParams.get("view") === "view" && activeSupplierId) {
    return (
      <SupplierView
        supplierId={activeSupplierId}
        onEdit={() =>
          router.push(`/dashboard/suppliers?view=edit&id=${activeSupplierId}`)
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-h5 font-semibold text-pneutral-900">Suppliers</p>
          <p className="text-label-l4 font-regular text-pneutral-500">
            Manage your supplier master records for purchasing and billing.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => router.push("/dashboard/suppliers?view=add")}
          className="h-12! w-auto! min-w-27 shrink-0 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50!"
        >
          <Image
            src="/Supplier/AddSupplier.svg"
            alt=""
            width={20}
            height={20}
            className="shrink-0"
          />
          Add Supplier
        </Button>
      </div>

      {/* Filters row — Figma node 3436:42636 */}
      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-start">
        <Input
          placeholder="Search by Supplier Name, GSTIN, Contact Person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg! border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />

        <Dropdown
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          placeholder="All Status"
          className="w-full sm:w-40"
        />

        <Dropdown
          options={STATE_OPTIONS}
          value={state}
          onChange={setState}
          placeholder="All States"
          className="w-full sm:w-40"
        />
      </div>

      {/* Suppliers table — Figma node 3436:42640 ("SL Table Card") */}
      <div className="flex w-full flex-col gap-md rounded-lg border border-pneutral-200 bg-white p-md">
        <DataTable
          columns={buildSupplierColumns(
            (currentPage - 1) * PAGE_SIZE,
            (id) => router.push(`/dashboard/suppliers?view=view&id=${id}`),
            (id) => router.push(`/dashboard/suppliers?view=edit&id=${id}`)
          )}
          data={pageData}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              {loading ? "Loading suppliers…" : "No suppliers found."}
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: filteredSuppliers.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      {/* Note box — Figma node 3436:42792 */}
      <div className="flex w-full items-start gap-sm rounded-lg bg-secondary-50 p-md text-secondary-700">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-label-l5 font-semibold">Note</p>
          <p className="text-p3 font-regular">
            • Inactive suppliers cannot be selected for new purchase transactions.
          </p>
          <p className="text-p3 font-regular">
            • GSTIN and mobile number cannot be edited once a supplier is saved.
          </p>
          <p className="text-p3 font-regular">
            • Click the eye icon to view full supplier details, or the document
            icon to view linked purchase history.
          </p>
        </div>
      </div>
    </div>
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <SuppliersContent />
  </Suspense>
);

export default Page;
