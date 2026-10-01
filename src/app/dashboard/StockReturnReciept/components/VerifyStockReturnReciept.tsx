"use client";

import { useState } from "react";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import DataTable from "@/app/components/common/table/DataTable";
import {
  SOURCE_LABELS,
  formatExpiry,
} from "@/app/dashboard/wearhouseStockReturn/stockReturnDraft";
import {
  IncomingStockReturn,
  ReceiptLine,
  formatDateTime,
  notReceivedQty,
  receiptTotals,
} from "../stockReturnReceipt";
import { DetailItem, DetailsCard, StatusBadge, TotalsCard } from "./ReceiptParts";
import StockRecieptConfirmModal from "./StockRecieptConfirmModal";

const receivedQtyError = (line: ReceiptLine, raw: string): string | undefined => {
  if (raw === "") return "Enter a quantity";
  const qty = Number(raw);
  if (!Number.isFinite(qty) || qty < 0) return "Cannot be negative";
  if (qty > line.dispatchedQty) return `Cannot exceed ${line.dispatchedQty}`;
  return undefined;
};

interface VerifyStockReturnRecieptProps {
  stockReturn: IncomingStockReturn;
  onBack: () => void;
  /** Keeps the verified quantities without completing the receipt. */
  onSaveDraft: (lines: ReceiptLine[]) => void;
  /** Runs once the confirm dialog is accepted. */
  onConfirm: (lines: ReceiptLine[]) => void;
  isSubmitting?: boolean;
}

const VerifyStockReturnReciept = ({
  stockReturn,
  onBack,
  onSaveDraft,
  onConfirm,
  isSubmitting = false,
}: VerifyStockReturnRecieptProps) => {
  // Each line starts at what was dispatched — a full receipt needs no typing.
  const [receivedById, setReceivedById] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      stockReturn.lines.map((line) => [line.id, String(line.receivedQty ?? line.dispatchedQty)])
    )
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const verifiedLines: ReceiptLine[] = stockReturn.lines.map((line) => ({
    ...line,
    receivedQty: Number(receivedById[line.id]) || 0,
  }));
  const hasErrors = stockReturn.lines.some((line) =>
    receivedQtyError(line, receivedById[line.id] ?? "")
  );
  const totals = receiptTotals(verifiedLines);

  const columns: ColumnDef<ReceiptLine>[] = [
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
      accessorKey: "purchaseUnitLabel",
      header: "PURCHASE UNIT",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.purchaseUnitLabel}</span>
      ),
    },
    {
      accessorKey: "dispatchedQty",
      header: "DISPATCHED QTY",
      cell: ({ row }) => <span className="font-semibold">{row.original.dispatchedQty}</span>,
    },
    {
      id: "receivedQty",
      header: "RECEIVED QTY",
      cell: ({ row }) => {
        const line = row.original;
        const raw = receivedById[line.id] ?? "";
        return (
          <Input
            type="number"
            min={0}
            max={line.dispatchedQty}
            sizeVariant="sm"
            value={raw}
            onChange={(e) =>
              setReceivedById((prev) => ({ ...prev, [line.id]: e.target.value }))
            }
            aria-label={`Received quantity for ${line.productName}`}
            error={receivedQtyError(line, raw)}
            containerClassName="min-w-24 py-sm"
          />
        );
      },
    },
    {
      id: "notReceived",
      header: "NOT RECEIVED QTY",
      cell: ({ row }) => {
        const verified = verifiedLines.find((line) => line.id === row.original.id);
        const missing = verified ? notReceivedQty(verified) : 0;
        return (
          <span className={`font-semibold ${missing > 0 ? "text-warning-600" : ""}`}>
            {missing}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-h5 font-semibold text-pneutral-900">Receive &amp; Verify Stock Return</p>
          <StatusBadge label="Pending Receipt" tone="red" size="sm" />
        </div>
        <p className="text-label-l4 font-regular text-pneutral-500">
          Physically verify the received quantity for each product before confirming receipt.
        </p>
      </div>

      <DetailsCard title="Stock Return Details (Read Only)">
        <DetailItem label="Stock Return No." value={stockReturn.returnNo} />
        <DetailItem label="Stock Return Type" value={SOURCE_LABELS[stockReturn.source]} />
        <DetailItem label="From Pharmacy" value={stockReturn.fromPharmacy} />
        <DetailItem label="To (Destination)" value="Central Warehouse" />
        <DetailItem label="Dispatch Date & Time" value={formatDateTime(stockReturn.dispatchedAt)} />
        {/* The design leaves this slot empty, keeping Created By under From Pharmacy. */}
        <div />
        <DetailItem label="Created By" value={stockReturn.createdBy} />
      </DetailsCard>

      <p className="text-label-l5 font-semibold text-pneutral-900">Products to Receive</p>

      <div className="w-full overflow-x-auto">
        <DataTable columns={columns} data={stockReturn.lines} />
      </div>

      <TotalsCard totals={totals} dispatchedLabel="Total Return Qty (Dispatched)" />

      <div className="mt-auto flex flex-col gap-sm pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
        >
          <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
          Back to List
        </Button>

        <div className="flex flex-col gap-sm sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSaveDraft(verifiedLines)}
            disabled={hasErrors}
            className="w-full! border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-45!"
          >
            Save Receipt Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsConfirmOpen(true)}
            disabled={hasErrors}
            className="w-full! gap-2 bg-primary-800! px-4 font-medium! text-pneutral-50! sm:w-47.5!"
          >
            Confirm Receipt
            <Image src="/StockReturn/CheckCircleSolidIcon.svg" alt="" width={20} height={20} />
          </Button>
        </div>
      </div>

      <StockRecieptConfirmModal
        isOpen={isConfirmOpen}
        source={stockReturn.source}
        totals={totals}
        isSubmitting={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => onConfirm(verifiedLines)}
      />
    </div>
  );
};

export default VerifyStockReturnReciept;
