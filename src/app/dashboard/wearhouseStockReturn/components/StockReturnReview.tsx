"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import DataTable from "@/app/components/common/table/DataTable";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { getById } from "@/services/UserManagementService";
import {
  SOURCE_LABELS,
  StockReturnDraft,
  StockReturnLine,
  availablePurchaseQty,
  dispatchContent,
  formatExpiry,
} from "../stockReturnDraft";
import ConfirmDispatchModal from "./ConfirmDispatchModal";

const PAGE_SIZE = 10;

const todayLabel = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${today.getFullYear()}`;
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
    <p className="text-p2 font-regular text-pneutral-500">{label}</p>
    <p className="truncate text-label-l3 font-semibold text-pneutral-900">{value}</p>
  </div>
);

interface StockReturnReviewProps {
  draft: StockReturnDraft;
  onBack: () => void;
  onSaveDraft: () => void;
  /** Runs once the dispatch dialog is accepted. */
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const StockReturnReview = ({
  draft,
  onBack,
  onSaveDraft,
  onConfirm,
  isSubmitting = false,
}: StockReturnReviewProps) => {
  const selectedPharmacy = usePharmacyStore((state) => state.selectedPharmacy);
  const [createdBy, setCreatedBy] = useState("—");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/user-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => (info?.userId ? getById(info.userId) : null))
      .then((user) => {
        if (active && user?.fullName) setCreatedBy(user.fullName);
      })
      .catch((err) => console.error("Failed to fetch the current user:", err));

    return () => {
      active = false;
    };
  }, []);

  const rowOffset = (currentPage - 1) * PAGE_SIZE;

  const columns: ColumnDef<StockReturnLine>[] = [
    {
      id: "slNo",
      header: "SL. NO.",
      cell: ({ row }) => rowOffset + row.index + 1,
    },
    {
      accessorKey: "productName",
      header: "PRODUCT NAME",
      cell: ({ row }) => <span className="font-semibold">{row.original.productName}</span>,
    },
    {
      accessorKey: "batchNo",
      header: "BATCH NO.",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.batchNo}</span>,
    },
    {
      accessorKey: "expiryDate",
      header: "EXPIRY DATE",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatExpiry(row.original.expiryDate)}</span>
      ),
    },
    {
      id: "available",
      header: "AVAIL. STOCK (PURCHASE UNITS)",
      cell: ({ row }) => (
        <span className="font-semibold">{availablePurchaseQty(row.original)}</span>
      ),
    },
    {
      accessorKey: "returnQty",
      header: "RETURN QTY (PURCHASE UNITS)",
      cell: ({ row }) => (
        <span className="font-semibold text-primary-800">{Number(row.original.returnQty)}</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "RETURN REASON",
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-h5 font-semibold text-pneutral-900">Review Stock Return</p>
        <p className="text-label-l3 font-regular text-pneutral-500">
          Review the products, quantities and reasons before dispatching stock to the Central
          Warehouse.
        </p>
      </div>

      <div className="flex w-full flex-col gap-sm rounded-2xl bg-base-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l4 font-semibold text-pneutral-900">
          Stock Return Details (Read Only)
        </p>
        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          {/* The number is issued by the backend when the return is saved. */}
          <DetailItem label="Stock Return No." value="Generated on save" />
          <DetailItem label="Stock Return Status" value="Draft" />
          <DetailItem label="Return Type" value={SOURCE_LABELS[draft.source]} />
          <DetailItem label="From (Source)" value={selectedPharmacy?.pharmacyName || "—"} />
        </div>
        <div className="grid grid-cols-2 gap-md md:grid-cols-3">
          <DetailItem label="To (Destination)" value="Central Warehouse" />
          <DetailItem label="Created Date" value={todayLabel()} />
          <DetailItem label="Created By" value={createdBy} />
        </div>
      </div>

      <p className="text-label-l5 font-semibold text-pneutral-900">Products to Return</p>

      <div className="flex w-full flex-col gap-md overflow-x-auto rounded-2xl border border-pneutral-200 bg-base-white p-md">
        <DataTable
          columns={columns}
          data={draft.lines.slice(rowOffset, rowOffset + PAGE_SIZE)}
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: draft.lines.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      <div className="mt-auto flex flex-col gap-sm pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-auto!"
        >
          <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
          Back to Edit Products
        </Button>

        <div className="flex flex-col gap-sm sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            className="w-full! border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsDispatchOpen(true)}
            className="w-full! gap-2 bg-primary-800! px-4 font-medium! text-pneutral-50! sm:w-57.5!"
          >
            Confirm Stock Return
            <Image src="/StockReturn/CheckCircleIcon.svg" alt="" width={20} height={20} />
          </Button>
        </div>
      </div>

      <ConfirmDispatchModal
        isOpen={isDispatchOpen}
        {...dispatchContent(draft)}
        isSubmitting={isSubmitting}
        onCancel={() => setIsDispatchOpen(false)}
        onConfirm={onConfirm}
      />
    </div>
  );
};

export default StockReturnReview;
