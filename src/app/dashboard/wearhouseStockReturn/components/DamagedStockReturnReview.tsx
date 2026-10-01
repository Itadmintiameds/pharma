"use client";

import { useState } from "react";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import DataTable from "@/app/components/common/table/DataTable";
import { usePharmacyStore } from "@/store/pharmacyStore";
import {
  SOURCE_LABELS,
  StockReturnDraft,
  StockReturnLine,
  availablePurchaseQty,
  dispatchContent,
  formatDisplayDate,
  formatExpiry,
  purchaseUnitLabel,
  toPurchaseQty,
} from "../stockReturnDraft";
import { useCurrentUserName } from "../useCurrentUserName";
import ConfirmDispatchModal from "./ConfirmDispatchModal";

/** dd-mm-yyyy hh:mm AM/PM, as the design shows "Created Date & Time". */
const nowLabel = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dd}-${mm}-${now.getFullYear()} ${time}`;
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="truncate text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
);

const columns: ColumnDef<StockReturnLine>[] = [
  {
    id: "transferNo",
    header: "TRANSFER NO.",
    cell: ({ row }) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">
        {row.original.transfer?.transferNo}
      </span>
    ),
  },
  {
    id: "transferDate",
    header: "TRANSFER DATE",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatDisplayDate(row.original.transfer?.transferDate ?? "")}
      </span>
    ),
  },
  {
    accessorKey: "productName",
    header: "PRODUCT NAME",
    cell: ({ row }) => <span className="font-semibold">{row.original.productName}</span>,
  },
  {
    accessorKey: "batchNo",
    header: "BATCH NO.",
  },
  {
    accessorKey: "expiryDate",
    header: "EXPIRY DATE",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{formatExpiry(row.original.expiryDate)}</span>
    ),
  },
  {
    id: "purchaseUnit",
    header: "PURCHASE UNIT",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{purchaseUnitLabel(row.original)}</span>
    ),
  },
  {
    id: "damaged",
    header: "DAMAGED QTY",
    cell: ({ row }) => (
      <span className="font-semibold">
        {toPurchaseQty(row.original, row.original.transfer?.damagedBase ?? 0)}
      </span>
    ),
  },
  {
    id: "alreadyReturned",
    header: "ALREADY DISPATCHED/ RETURNED",
    cell: ({ row }) => toPurchaseQty(row.original, row.original.transfer?.alreadyReturnedBase ?? 0),
  },
  {
    id: "eligible",
    header: "ELIGIBLE QTY",
    cell: ({ row }) => (
      <span className="font-semibold text-success-600">{availablePurchaseQty(row.original)}</span>
    ),
  },
  {
    accessorKey: "returnQty",
    header: "RETURN QTY",
    cell: ({ row }) => (
      <span className="font-semibold text-primary-800">{Number(row.original.returnQty)}</span>
    ),
  },
];

interface DamagedStockReturnReviewProps {
  draft: StockReturnDraft;
  onBack: () => void;
  onSaveDraft: () => void;
  /** Runs once the dispatch dialog is accepted. */
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const DamagedStockReturnReview = ({
  draft,
  onBack,
  onSaveDraft,
  onConfirm,
  isSubmitting = false,
}: DamagedStockReturnReviewProps) => {
  const selectedPharmacy = usePharmacyStore((state) => state.selectedPharmacy);
  const createdBy = useCurrentUserName();
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  // Fixed when the review opens, so the time does not tick while it is read.
  const [createdAt] = useState(nowLabel);

  const totalReturnQty = draft.lines.reduce(
    (sum, line) => sum + (Number(line.returnQty) || 0),
    0
  );

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-h5 font-semibold text-pneutral-900">Review Damaged Stock Return</p>
        <p className="text-label-l4 font-regular text-pneutral-500">
          Review the damaged stock details before dispatching to the Central Warehouse.
        </p>
      </div>

      <div className="flex w-full flex-col gap-sm rounded-2xl bg-base-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">
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
          <DetailItem label="Created Date & Time" value={createdAt} />
          <DetailItem label="Created By" value={createdBy} />
        </div>
      </div>

      <p className="text-label-l5 font-semibold text-pneutral-900">Damaged Stock to Return</p>

      <div className="w-full overflow-x-auto">
        <DataTable columns={columns} data={draft.lines} />
      </div>

      <div className="flex w-full gap-md rounded-2xl bg-sneutral-50 p-md">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-500">Total Products</p>
          <p className="text-label-l4 font-semibold text-pneutral-900">{draft.lines.length}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-500">Total Return Qty</p>
          <p className="text-label-l4 font-semibold text-pneutral-900">{totalReturnQty}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-sm pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-sm sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
          >
            <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
            Back to Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            className="w-full! border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
          >
            Save as Draft
          </Button>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setIsDispatchOpen(true)}
          className="w-full! gap-2 bg-primary-800! px-4 font-medium! text-pneutral-50! sm:w-55!"
        >
          Confirm &amp; Dispatch
          <Image src="/StockReturn/ArrowRightIcon.svg" alt="" width={20} height={20} />
        </Button>
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

export default DamagedStockReturnReview;
