"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { ProductService } from "@/services/ProductService";
import {
  RETURN_REASONS,
  SOURCE_LABELS,
  StockReturnDraft,
  StockReturnLine,
  availablePurchaseQty,
  formatExpiry,
  isLineValid,
  returnQtyError,
} from "../stockReturnDraft";

// Shape of one row returned by GET /product/batches (ProductService.getAllBatches).
type BatchApiRow = {
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  productId?: string;
  productName?: string;
  purchaseUnit?: string;
  purchaseSmallestUnitName?: string;
  purchaseUnitContains?: number;
  packagingId?: string;
  totalStock?: number;
};

// The same batch can come back once per packaging, so the packaging is part of
// a line's identity.
const lineKey = (productId: string, batchId: string, packagingId: string) =>
  `${productId}-${batchId}-${packagingId}`;

const isExpired = (expiryDate: string): boolean => {
  const date = new Date(expiryDate);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/** A batch the pharmacy can return: in stock and not yet expired. */
const toCandidateLine = (row: BatchApiRow): StockReturnLine | null => {
  if (!row.productId || !row.batchId) return null;
  const availableBase = Number(row.totalStock) || 0;
  if (availableBase <= 0 || isExpired(row.expiryDate || "")) return null;

  return {
    id: lineKey(row.productId, row.batchId, row.packagingId || ""),
    productId: row.productId,
    productName: row.productName || "Unknown Product",
    batchId: row.batchId,
    batchNo: row.batchNumber || "N/A",
    packagingId: row.packagingId || "",
    expiryDate: row.expiryDate || "",
    purchaseUnit: row.purchaseUnit || "",
    smallestUnit: row.purchaseSmallestUnitName || "",
    unitContains: Number(row.purchaseUnitContains) > 0 ? Number(row.purchaseUnitContains) : 1,
    availableBase,
    returnQty: "",
    reason: "",
  };
};

const REASON_OPTIONS = RETURN_REASONS.map((reason) => ({ label: reason, value: reason }));

const PAGE_SIZE = 10;

interface CreateStockReturnProps {
  draft: StockReturnDraft;
  onChange: (lines: StockReturnLine[]) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onReview: () => void;
}

const CreateStockReturn = ({
  draft,
  onChange,
  onBack,
  onSaveDraft,
  onReview,
}: CreateStockReturnProps) => {
  const [search, setSearch] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [catalog, setCatalog] = useState<StockReturnLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const lines = draft.lines;

  useEffect(() => {
    let active = true;

    ProductService.getAllBatches()
      .then((res) => {
        if (!active) return;
        const seen = new Set<string>();
        const candidates = ((res?.data || []) as BatchApiRow[])
          .map(toCandidateLine)
          .filter((line): line is StockReturnLine => {
            if (!line || seen.has(line.id)) return false;
            seen.add(line.id);
            return true;
          });
        setCatalog(candidates);
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch pharmacy batches:", err);
        setLoadError("Could not load inventory.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Batches not already on the return, narrowed by the search box.
  const suggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const added = new Set(lines.map((line) => line.id));
    return catalog.filter(
      (candidate) =>
        !added.has(candidate.id) &&
        (!query ||
          candidate.productName.toLowerCase().includes(query) ||
          candidate.batchNo.toLowerCase().includes(query))
    );
  }, [catalog, lines, search]);

  const openPicker = () => {
    setIsPickerOpen(true);
    searchBoxRef.current?.querySelector("input")?.focus();
  };

  const handleAdd = (candidate: StockReturnLine) => {
    onChange([...lines, candidate]);
    setSearch("");
    setIsPickerOpen(false);
    // Show the page the new line landed on.
    setCurrentPage(Math.ceil((lines.length + 1) / PAGE_SIZE));
  };

  const updateLine = (id: string, patch: Partial<StockReturnLine>) =>
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));

  const removeLine = (id: string) => {
    const remaining = lines.filter((line) => line.id !== id);
    onChange(remaining);
    setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(remaining.length / PAGE_SIZE))));
  };

  const totalReturnQty = lines.reduce((sum, line) => sum + (Number(line.returnQty) || 0), 0);
  const canReview = lines.length > 0 && lines.every(isLineValid);

  const handleReview = () => {
    setShowValidation(true);
    if (canReview) onReview();
  };

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
      header: "AVAIL. STOCK",
      cell: ({ row }) => (
        <span className="font-semibold">{availablePurchaseQty(row.original)}</span>
      ),
    },
    {
      id: "returnQty",
      header: "RETURN QTY",
      cell: ({ row }) => (
        <Input
          type="number"
          min={0}
          value={row.original.returnQty}
          onChange={(e) => updateLine(row.original.id, { returnQty: e.target.value })}
          aria-label={`Return quantity for ${row.original.productName}`}
          error={showValidation ? returnQtyError(row.original) : undefined}
          containerClassName="min-w-32 py-sm"
        />
      ),
    },
    {
      id: "reason",
      header: "RETURN REASON",
      cell: ({ row }) => (
        <Dropdown
          options={REASON_OPTIONS}
          value={row.original.reason}
          onChange={(reason) => updateLine(row.original.id, { reason })}
          placeholder="Select reason"
          error={showValidation && !row.original.reason ? "Select a reason" : undefined}
          className="min-w-44 py-sm"
        />
      ),
    },
    {
      id: "action",
      header: "ACTION",
      cell: ({ row }) => (
        <button
          type="button"
          aria-label={`Remove ${row.original.productName}`}
          onClick={() => removeLine(row.original.id)}
          className="flex items-center"
        >
          <Image src="/StockReturn/RemoveIcon.svg" alt="" width={24} height={24} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-h5 font-semibold text-pneutral-900">Create Stock Return</p>
          <span className="rounded-lg bg-primary-100 px-sm py-2 text-p3 font-semibold text-primary-800">
            {SOURCE_LABELS[draft.source]}
          </span>
        </div>
        <p className="text-label-l4 font-regular text-pneutral-500">
          Select products, batches and quantities from your current inventory to return to the
          Central Warehouse.
        </p>
      </div>

      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
        <div ref={searchBoxRef} className="relative flex-1">
          <Input
            placeholder="Search by product name or batch number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsPickerOpen(true);
            }}
            onFocus={() => setIsPickerOpen(true)}
            leftIcon={<Search size={20} className="text-pneutral-500" />}
            className="rounded-lg border-[1.5px]! border-sneutral-100!"
          />

          {isPickerOpen && (
            <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-pneutral-200 bg-base-white shadow-lg">
              {isLoading ? (
                <p className="p-sm text-center text-p3 text-pneutral-500">Loading inventory...</p>
              ) : loadError ? (
                <p className="p-sm text-center text-p3 text-warning-600">{loadError}</p>
              ) : suggestions.length === 0 ? (
                <p className="p-sm text-center text-p3 text-pneutral-500">
                  {search.trim()
                    ? `No batches found for "${search.trim()}".`
                    : "No more batches available to return."}
                </p>
              ) : (
                suggestions.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handleAdd(candidate)}
                    className="flex w-full items-center justify-between gap-sm px-sm py-2.5 text-left transition-colors hover:bg-secondary-50"
                  >
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-label-l4 font-medium text-pneutral-900">
                        {candidate.productName}
                      </p>
                      <p className="truncate text-p3 text-pneutral-500">
                        Batch {candidate.batchNo} · Exp {formatExpiry(candidate.expiryDate)}
                      </p>
                    </div>
                    <p className="shrink-0 text-p3 text-pneutral-500">
                      Avail. {availablePurchaseQty(candidate)} {candidate.purchaseUnit}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={openPicker}
          className="w-full! shrink-0 gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-60!"
        >
          <Image src="/StockReturn/ClipboardIcon.svg" alt="" width={20} height={20} />
          Add Another Product
        </Button>
      </div>

      <div className="flex w-full flex-col gap-md overflow-x-auto rounded-2xl border border-pneutral-200 bg-base-white p-md">
        <DataTable
          columns={columns}
          data={lines.slice(rowOffset, rowOffset + PAGE_SIZE)}
          emptyState={
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-label-l4 text-pneutral-500">
              <p>No products added yet.</p>
              <p className="text-p3">Search above or click Add Another Product to pick a batch.</p>
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: lines.length,
            onPageChange: setCurrentPage,
          }}
        />
        {showValidation && lines.length === 0 && (
          <p className="text-p3 text-warning-600">Add at least one product to continue.</p>
        )}
      </div>

      <div className="flex w-full gap-md rounded-2xl bg-base-white p-md">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-500">Total Products</p>
          <p className="text-label-l4 font-semibold text-pneutral-900">{lines.length}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-p3 font-regular text-pneutral-500">Total Return Qty</p>
          <p className="text-label-l4 font-semibold text-pneutral-900">{totalReturnQty}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-sm pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-auto!"
        >
          <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
          Back to Select Return Type
        </Button>

        <div className="flex flex-col gap-sm sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={lines.length === 0}
            className="w-full! border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleReview}
            className="w-full! gap-2 bg-primary-800! px-4 font-medium! text-pneutral-50! sm:w-57.5!"
          >
            Review and Confirm
            <Image src="/StockReturn/CheckCircleIcon.svg" alt="" width={20} height={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateStockReturn;
