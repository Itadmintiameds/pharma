"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import DataTable from "@/app/components/common/table/DataTable";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { getWarehouseReturnById } from "@/services/WarehouseStockReturnService";
import { ProductService } from "@/services/ProductService";
import { formatExpiry } from "../stockReturnDraft";

const PAGE_SIZE = 10;

/** One saved return line, with quantities already in purchase units. */
interface ViewLine {
  id: string;
  productName: string;
  batchNo: string;
  expiryDate: string;
  purchaseUnit: string;
  returnQty: number;
  dispatchQty: number;
  receivedQty: number;
  notReceivedQty: number;
  reason: string;
}

interface ViewHeader {
  returnNo: string;
  status: string;
  returnType: string;
  from: string;
  to: string;
  returnDate: string;
  createdBy: string;
}

const statusLabel = (status: string): string => {
  const s = (status || "").toUpperCase().replace(/\s+/g, "_");
  if (s === "PENDING_RECEIPT") return "Pending Receipt";
  if (s === "COMPLETE" || s === "COMPLETED") return "Completed";
  if (s === "DRAFT") return "Draft";
  return status || "—";
};

const returnTypeLabel = (type: string): string =>
  type && type.toLowerCase().includes("damaged")
    ? "Damaged – Inter-Store Transfer"
    : type || "Pharmacy Inventory";

/** dd-mm-yyyy hh:mm AM/PM. */
const formatDateTime = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dd}-${mm}-${date.getFullYear()} ${time}`;
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="truncate text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
);

interface StockReturnViewProps {
  id: string;
  onClose: () => void;
}

/** Read-only view of a dispatched (Pending Receipt) or Completed stock return. */
const StockReturnView = ({ id, onClose }: StockReturnViewProps) => {
  const selectedPharmacy = usePharmacyStore((state) => state.selectedPharmacy);
  const [header, setHeader] = useState<ViewHeader | null>(null);
  const [lines, setLines] = useState<ViewLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const res: any = await getWarehouseReturnById(id);
        // Some endpoints wrap the body in { data }.
        const data: any = res?.warehouseReturnId !== undefined ? res : (res?.data ?? res);

        let allBatches: any[] = [];
        try {
          const batchesResponse = await ProductService.getAllBatches();
          allBatches = batchesResponse?.data || batchesResponse || [];
        } catch (err) {
          console.error("Failed to fetch batches for stock return view", err);
        }

        const viewLines: ViewLine[] = (data?.warehouseReturnDetails || []).map((d: any) => {
          const batch = allBatches.find((b: any) => String(b.batchId) === String(d.batchId));
          const contains =
            Number(batch?.purchaseUnitContains) > 0 ? Number(batch.purchaseUnitContains) : 1;
          // Quantities are stored in smallest units; the screen shows purchase units.
          const toPurchase = (qty: unknown) => Number(((Number(qty) || 0) / contains).toFixed(2));
          const unit = batch?.purchaseUnit || "";

          return {
            id: String(d.warehouseReturnDetailId ?? `${d.batchId}-${d.productId}`),
            productName: d.productName || batch?.productName || "—",
            batchNo: d.batchNumber || batch?.batchNumber || "—",
            expiryDate: d.expiryDate || batch?.expiryDate || "",
            purchaseUnit: unit ? (contains > 1 ? `${unit} (${contains})` : unit) : "—",
            returnQty: toPurchase(d.returnQuantity),
            dispatchQty: toPurchase(d.dispatchQuantity),
            receivedQty: toPurchase(d.receivedQuantity),
            notReceivedQty: toPurchase(d.notReceivedQuantity),
            reason: d.returnReason || "—",
          };
        });

        if (!active) return;
        setHeader({
          returnNo: data?.stockReturnNo || "—",
          status: statusLabel(data?.stockReturnStatus),
          returnType: returnTypeLabel(data?.stockReturnType),
          from: data?.fromPharmacyName || selectedPharmacy?.pharmacyName || "—",
          to: data?.toWarehouseName || "Central Warehouse",
          returnDate: formatDateTime(data?.stockReturnDate || data?.createdAt || ""),
          createdBy: data?.createdByName || data?.createdBy || "—",
        });
        setLines(viewLines);
        setLoadError("");
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch warehouse return", err);
        setLoadError("Could not load this stock return.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, selectedPharmacy?.pharmacyName]);

  const isCompleted = header?.status === "Completed";
  const sum = (key: "returnQty" | "dispatchQty" | "receivedQty" | "notReceivedQty") =>
    Number(lines.reduce((total, line) => total + line[key], 0).toFixed(2));

  const rowOffset = (currentPage - 1) * PAGE_SIZE;

  const columns: ColumnDef<ViewLine>[] = [
    { id: "slNo", header: "SL. NO.", cell: ({ row }) => rowOffset + row.index + 1 },
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
      accessorKey: "purchaseUnit",
      header: "PURCHASE UNIT",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.purchaseUnit}</span>,
    },
    {
      accessorKey: "returnQty",
      header: "RETURN QTY",
      cell: ({ row }) => (
        <span className="font-semibold text-primary-800">{row.original.returnQty}</span>
      ),
    },
    {
      accessorKey: "dispatchQty",
      header: "DISPATCHED QTY",
      cell: ({ row }) => <span className="font-semibold">{row.original.dispatchQty}</span>,
    },
    ...(isCompleted
      ? ([
          {
            accessorKey: "receivedQty",
            header: "RECEIVED QTY",
            cell: ({ row }) => (
              <span className="font-semibold text-success-600">{row.original.receivedQty}</span>
            ),
          },
          {
            accessorKey: "notReceivedQty",
            header: "NOT RECEIVED QTY",
            cell: ({ row }) => <span className="font-semibold">{row.original.notReceivedQty}</span>,
          },
        ] as ColumnDef<ViewLine>[])
      : []),
    { accessorKey: "reason", header: "RETURN REASON" },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-h5 font-semibold text-pneutral-900">Stock Return Details</p>
        <p className="text-label-l4 font-regular text-pneutral-500">
          View the products and quantities on this stock return.
        </p>
      </div>

      <div className="flex w-full flex-col gap-sm rounded-2xl bg-base-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Stock Return Details (Read Only)
        </p>
        <div className="grid grid-cols-2 gap-md md:grid-cols-4">
          <DetailItem label="Stock Return No." value={header?.returnNo ?? "—"} />
          <DetailItem label="Stock Return Status" value={header?.status ?? "—"} />
          <DetailItem label="Return Type" value={header?.returnType ?? "—"} />
          <DetailItem label="From (Source)" value={header?.from ?? "—"} />
        </div>
        <div className="grid grid-cols-2 gap-md md:grid-cols-3">
          <DetailItem label="To (Destination)" value={header?.to ?? "—"} />
          <DetailItem label="Return Date & Time" value={header?.returnDate ?? "—"} />
          <DetailItem label="Created By" value={header?.createdBy ?? "—"} />
        </div>
      </div>

      <p className="text-label-l5 font-semibold text-pneutral-900">Returned Products</p>

      <div className="flex w-full flex-col gap-md overflow-x-auto rounded-2xl border border-pneutral-200 bg-base-white p-md">
        <DataTable
          columns={columns}
          data={lines.slice(rowOffset, rowOffset + PAGE_SIZE)}
          emptyState={
            <div className="flex h-32 items-center justify-center text-label-l4 text-pneutral-500">
              {isLoading ? "Loading stock return..." : loadError || "No products on this return."}
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: lines.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      <div className="flex w-full gap-md rounded-2xl bg-sneutral-50 p-md">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-500">Total Products</p>
          <p className="text-label-l4 font-semibold text-pneutral-900">{lines.length}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-500">Total Return Qty</p>
          <p className="text-label-l4 font-semibold text-pneutral-900">{sum("returnQty")}</p>
        </div>
        {isCompleted && (
          <>
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-p3 font-regular text-pneutral-500">Total Received Qty</p>
              <p className="text-label-l4 font-semibold text-pneutral-900">{sum("receivedQty")}</p>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-p3 font-regular text-pneutral-500">Total Not Received Qty</p>
              <p className="text-label-l4 font-semibold text-pneutral-900">
                {sum("notReceivedQty")}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto flex pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-auto!"
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default StockReturnView;
