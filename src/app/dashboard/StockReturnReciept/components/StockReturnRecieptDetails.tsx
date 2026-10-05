"use client";

import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
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
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.purchaseUnitLabel}</span>,
  },
  {
    accessorKey: "dispatchedQty",
    header: "DISPATCHED QTY",
    cell: ({ row }) => <span className="font-semibold">{row.original.dispatchedQty}</span>,
  },
  {
    id: "receivedQty",
    header: "RECEIVED QTY",
    cell: ({ row }) => (
      <span className="font-semibold text-success-600">
        {row.original.receivedQty ?? row.original.dispatchedQty}
      </span>
    ),
  },
  {
    id: "notReceived",
    header: "NOT RECEIVED QTYyyyy",
    cell: ({ row }) => {
      const missing = notReceivedQty(row.original);
      return (
        <span className={`font-semibold ${missing > 0 ? "text-warning-600" : ""}`}>{missing}</span>
      );
    },
  },
];

interface StockReturnRecieptDetailsProps {
  stockReturn: IncomingStockReturn;
  onBack: () => void;
}

import { useState, useEffect } from "react";
import { ProductService } from "@/services/ProductService";

/** The read-only record of a completed stock return — Figma node 3832:46976. */
const StockReturnRecieptDetails = ({ stockReturn, onBack }: StockReturnRecieptDetailsProps) => {
  const [batchDetails, setBatchDetails] = useState<Record<string, { expiryDate: string; purchaseUnitLabel: string }>>({});

  useEffect(() => {
    let mounted = true;
    stockReturn.lines.forEach((line) => {
      if (line.batchId && !batchDetails[line.id]) {
        ProductService.getBatchById(line.batchId).then((data) => {
          if (mounted && data) {
            const innerData = data.data ?? data;
            const batch = Array.isArray(innerData) ? innerData[0] : innerData;
            
            if (batch) {
              setBatchDetails((prev) => ({
                ...prev,
                [line.id]: {
                  expiryDate: batch.expiryDate || line.expiryDate,
                  purchaseUnitLabel: batch.purchaseUnit || batch.purchaseUnitLabel || batch.unit || batch.packagingId || line.purchaseUnitLabel,
                }
              }));
            }
          }
        }).catch(console.error);
      }
    });
    return () => { mounted = false; };
  }, [stockReturn.lines]);

  const displayLines: ReceiptLine[] = stockReturn.lines.map((line) => ({
    ...line,
    expiryDate: batchDetails[line.id]?.expiryDate || line.expiryDate,
    purchaseUnitLabel: batchDetails[line.id]?.purchaseUnitLabel || line.purchaseUnitLabel,
  }));

  return (
  <div className="flex min-h-full flex-col gap-4">
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-sm">
        <p className="text-h5 font-semibold text-pneutral-900">Stock Return Details</p>
        <StatusBadge
          label={stockReturn.status}
          tone={stockReturn.status === "Completed" ? "green" : "yellow"}
          size="sm"
        />
      </div>
      <p className="text-label-l4 font-regular text-pneutral-500">
        Final record of this Stock Return, including dispatch and warehouse receipt reconciliation.
      </p>
    </div>

    <DetailsCard title="Stock Return Information">
      <DetailItem label="Stock Return No." value={stockReturn.returnNo} />
      <DetailItem
        label="Return Type"
        value={SOURCE_LABELS[stockReturn.source as keyof typeof SOURCE_LABELS] || stockReturn.source}
      />
      <DetailItem label="From Pharmacy" value={stockReturn.fromPharmacy} />
      <DetailItem label="To (Destination)" value="Central Warehouse" />
      <DetailItem label="Created Date & Time" value={formatDateTime(stockReturn.createdAt)} />
      <DetailItem label="Created By" value={stockReturn.createdBy} />
      <DetailItem label="Dispatch Date & Time" value={formatDateTime(stockReturn.dispatchedAt)} />
      <DetailItem label="Receipt Date & Time" value={formatDateTime(stockReturn.receivedAt)} />
      <DetailItem label="Received By" value={stockReturn.receivedBy || "—"} />
      {/* The design leaves this slot empty, starting Remarks in the third column. */}
      <div className="hidden md:block" />
      <div className="col-span-2">
        <DetailItem label="Remarks" value={stockReturn.remarks || "—"} />
      </div>
    </DetailsCard>

    <p className="text-label-l5 font-semibold text-pneutral-900">Products and Final Quantities</p>

    <div className="w-full overflow-x-auto">
      <DataTable columns={columns} data={displayLines} />
    </div>

    <TotalsCard
      totals={receiptTotals(displayLines)}
      dispatchedLabel="Total Return Qty / Dispatched Qty"
    />

    <div className="flex pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-42.5!"
      >
        <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
        Back to List
      </Button>
    </div>
  </div>
  );
};

export default StockReturnRecieptDetails;
