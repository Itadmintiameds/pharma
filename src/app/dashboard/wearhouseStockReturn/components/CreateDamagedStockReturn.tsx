"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CalendarDays, Check, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import {
  getDestinationDistributions,
  getWarehouseDistribution,
} from "@/services/WarehouseDistributionService";
import type {
  WarehouseDistributionData,
  WarehouseDistributionSummary,
} from "@/types/WarehouseDistributionData";
import {
  SOURCE_LABELS,
  StockReturnDraft,
  StockReturnLine,
  availablePurchaseQty,
  formatDisplayDate,
  formatExpiry,
  isLineValid,
  purchaseUnitLabel,
  returnQtyError,
  toPurchaseQty,
} from "../stockReturnDraft";

/**
 * Every damaged line on a received Inter-Store Transfer into this pharmacy.
 * Pharmacy-to-pharmacy transfers carry their quantities in smallest units, so
 * damagedQuantity is converted to purchase units only for display.
 */
const toDamagedLines = (
  summary: WarehouseDistributionSummary,
  detail: WarehouseDistributionData
): StockReturnLine[] =>
  (detail.lines ?? [])
    .filter((line) => (Number(line.damagedQuantity) || 0) > 0)
    .map((line) => {
      const damagedBase = Number(line.damagedQuantity) || 0;
      // TODO: the backend does not yet report how much of a damaged line earlier
      // stock returns already sent back, so all of it is treated as eligible.
      const alreadyReturnedBase = 0;
      const contains = Number(line.packaging?.purchaseUnitContains) || 0;

      return {
        id: `${summary.warehouseDistributionId}-${line.warehouseDistributionDetailsId ?? line.batchId}-${line.packagingId ?? ""}`,
        productId: line.productId,
        productName: line.product?.productName || "Unknown Product",
        batchId: line.batchId || "",
        batchNo: line.batch?.batchNumber || "N/A",
        packagingId: line.packagingId || "",
        expiryDate: line.batch?.expiryDate || "",
        purchaseUnit: line.packaging?.purchaseUnit || "",
        smallestUnit: line.packaging?.purchaseSmallestUnit || "",
        unitContains: contains > 0 ? contains : 1,
        availableBase: Math.max(0, damagedBase - alreadyReturnedBase),
        returnQty: "",
        reason: "Damaged",
        transfer: {
          distributionId: summary.warehouseDistributionId,
          distributionDetailsId: line.warehouseDistributionDetailsId,
          transferNo: summary.allocationNo,
          transferDate: (summary.allocationDate ?? detail.allocationDate ?? "").split("T")[0],
          fromStore: summary.fromStore,
          damagedBase,
          alreadyReturnedBase,
        },
      };
    });

interface Filters {
  search: string;
  store: string | number;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: Filters = { search: "", store: "", dateFrom: "", dateTo: "" };

const matchesFilters = (line: StockReturnLine, filters: Filters): boolean => {
  const transfer = line.transfer;
  if (!transfer) return false;
  const query = filters.search.trim().toLowerCase();
  if (query && !transfer.transferNo.toLowerCase().includes(query)) return false;
  if (filters.store !== "" && transfer.fromStore !== filters.store) return false;
  if (filters.dateFrom && transfer.transferDate < filters.dateFrom) return false;
  if (filters.dateTo && transfer.transferDate > filters.dateTo) return false;
  return true;
};

const Checkbox = ({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => (
  <label className="relative flex size-6 shrink-0 items-center justify-center">
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="peer size-6 cursor-pointer appearance-none rounded-sm border-[1.5px] border-pneutral-200 bg-base-white checked:border-primary-900 checked:bg-primary-900 checked:shadow-[0px_0px_0px_2px_#e0e7ffcc] disabled:cursor-not-allowed"
    />
    <Check
      size={16}
      strokeWidth={3}
      className="pointer-events-none absolute hidden text-base-white peer-checked:block"
    />
  </label>
);

interface CreateDamagedStockReturnProps {
  draft: StockReturnDraft;
  onChange: (lines: StockReturnLine[]) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onReview: () => void;
  /** When provided (edit mode), show Cancel instead of Back to Return Type. */
  onCancel?: () => void;
}

const CreateDamagedStockReturn = ({
  draft,
  onChange,
  onBack,
  onSaveDraft,
  onReview,
  onCancel,
}: CreateDamagedStockReturnProps) => {
  const [candidates, setCandidates] = useState<StockReturnLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // The filter row only takes effect on Search, as the design's button implies.
  const [pendingFilters, setPendingFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  const [showAddErrors, setShowAddErrors] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const lines = draft.lines;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const received = (await getDestinationDistributions()).filter(
          (summary) => summary.fromType === "PHARMACY" && summary.currentStatus === "STOCK_RECEIVED"
        );
        const details = await Promise.all(
          received.map((summary) => getWarehouseDistribution(summary.warehouseDistributionId))
        );
        if (!active) return;
        setCandidates(received.flatMap((summary, index) => toDamagedLines(summary, details[index])));
        setLoadError("");
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch damaged inter-store transfer stock:", err);
        setLoadError("Could not load damaged stock.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const storeOptions = useMemo(
    () =>
      Array.from(new Set(candidates.map((line) => line.transfer?.fromStore).filter(Boolean))).map(
        (store) => ({ label: store as string, value: store as string })
      ),
    [candidates]
  );

  // Lines already on the return are shown in the table below instead.
  const eligibleRows = useMemo(() => {
    const added = new Set(lines.map((line) => line.id));
    return candidates.filter(
      (line) => !added.has(line.id) && matchesFilters(line, appliedFilters)
    );
  }, [candidates, lines, appliedFilters]);

  const rowWithQty = (line: StockReturnLine): StockReturnLine => ({
    ...line,
    returnQty: qtyById[line.id] ?? "",
  });

  const toggleChecked = (id: string, checked: boolean) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleAddSelected = () => {
    const picked = eligibleRows.filter((line) => checkedIds.has(line.id)).map(rowWithQty);
    if (picked.length === 0) return;
    if (picked.some((line) => returnQtyError(line))) {
      setShowAddErrors(true);
      return;
    }
    onChange([...lines, ...picked]);
    setCheckedIds(new Set());
    setShowAddErrors(false);
  };

  const totalReturnQty = lines.reduce((sum, line) => sum + (Number(line.returnQty) || 0), 0);
  const canReview = lines.length > 0 && lines.every(isLineValid);

  const handleReview = () => {
    setShowValidation(true);
    if (canReview) onReview();
  };

  const eligibleColumns: ColumnDef<StockReturnLine>[] = [
    {
      id: "select",
      header: "",
      cell: ({ row }) => {
        const line = row.original;
        const isEligible = line.availableBase > 0;
        return (
          <Checkbox
            checked={checkedIds.has(line.id)}
            disabled={!isEligible}
            onChange={(checked) => toggleChecked(line.id, checked)}
            label={`Select ${line.productName} from ${line.transfer?.transferNo}`}
          />
        );
      },
    },
    {
      id: "slNo",
      header: "#",
      cell: ({ row }) => <Dimmed line={row.original}>{row.index + 1}</Dimmed>,
    },
    {
      id: "transferNo",
      header: "TRANSFER NO.",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          <span className="font-semibold whitespace-nowrap text-primary-800">
            {row.original.transfer?.transferNo}
          </span>
        </Dimmed>
      ),
    },
    {
      id: "transferDate",
      header: "TRANSFER DATE",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          <span className="whitespace-nowrap">
            {formatDisplayDate(row.original.transfer?.transferDate ?? "")}
          </span>
        </Dimmed>
      ),
    },
    {
      id: "fromStore",
      header: "FROM STORE",
      cell: ({ row }) => <Dimmed line={row.original}>{row.original.transfer?.fromStore}</Dimmed>,
    },
    {
      accessorKey: "productName",
      header: "PRODUCT NAME",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          <span className="font-semibold">{row.original.productName}</span>
        </Dimmed>
      ),
    },
    {
      accessorKey: "batchNo",
      header: "BATCH NO.",
      cell: ({ row }) => <Dimmed line={row.original}>{row.original.batchNo}</Dimmed>,
    },
    {
      accessorKey: "expiryDate",
      header: "EXPIRY DATE",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          <span className="whitespace-nowrap">{formatExpiry(row.original.expiryDate)}</span>
        </Dimmed>
      ),
    },
    {
      id: "purchaseUnit",
      header: "PURCHASE UNIT",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          <span className="whitespace-nowrap">{purchaseUnitLabel(row.original)}</span>
        </Dimmed>
      ),
    },
    {
      id: "damaged",
      header: "DAMAGED QTY",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          <span className="font-semibold">
            {toPurchaseQty(row.original, row.original.transfer?.damagedBase ?? 0)}
          </span>
        </Dimmed>
      ),
    },
    {
      id: "alreadyReturned",
      header: "ALREADY DISPATCHED/ RETURNED",
      cell: ({ row }) => (
        <Dimmed line={row.original}>
          {toPurchaseQty(row.original, row.original.transfer?.alreadyReturnedBase ?? 0)}
        </Dimmed>
      ),
    },
    {
      id: "eligible",
      header: "ELIGIBLE QTY (REMAINING)",
      cell: ({ row }) => {
        const eligible = availablePurchaseQty(row.original);
        return (
          <Dimmed line={row.original}>
            <span
              className={`font-semibold ${eligible > 0 ? "text-success-600" : "text-pneutral-900"}`}
            >
              {eligible}
            </span>
          </Dimmed>
        );
      },
    },
    {
      id: "returnQty",
      header: "RETURN QTY (PURCHASE UNITS)",
      cell: ({ row }) => {
        const line = row.original;
        const isEligible = line.availableBase > 0;
        const showError = showAddErrors && checkedIds.has(line.id);
        return (
          <Dimmed line={line}>
            <Input
              type="number"
              min={0}
              sizeVariant="sm"
              value={isEligible ? (qtyById[line.id] ?? "") : "0"}
              disabled={!isEligible}
              onChange={(e) => {
                setQtyById((prev) => ({ ...prev, [line.id]: e.target.value }));
                // Typing a quantity is choosing the row.
                if (e.target.value) toggleChecked(line.id, true);
              }}
              aria-label={`Return quantity for ${line.productName}`}
              error={showError ? returnQtyError(rowWithQty(line)) : undefined}
              containerClassName="min-w-24 py-2"
            />
          </Dimmed>
        );
      },
    },
  ];

  const selectedColumns: ColumnDef<StockReturnLine>[] = [
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
      accessorKey: "productName",
      header: "PRODUCT NAME",
      cell: ({ row }) => <span className="font-semibold">{row.original.productName}</span>,
    },
    {
      accessorKey: "batchNo",
      header: "BATCH NO.",
    },
    {
      id: "eligible",
      header: "ELIGIBLE QTY (REMAINING)",
      cell: ({ row }) => (
        <span className="font-semibold">{availablePurchaseQty(row.original)}</span>
      ),
    },
    {
      accessorKey: "returnQty",
      header: "RETURN QTY",
      cell: ({ row }) => (
        <span className="font-semibold text-primary-800">{Number(row.original.returnQty)}</span>
      ),
    },
    {
      id: "action",
      header: "ACTION",
      cell: ({ row }) => (
        <button
          type="button"
          aria-label={`Remove ${row.original.productName}`}
          onClick={() => onChange(lines.filter((line) => line.id !== row.original.id))}
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
          Select damaged stock received through Inter-Store Transfer and eligible for return to the
          Central Warehouse.
        </p>
      </div>

      <div className="flex w-full flex-col gap-sm lg:flex-row lg:items-start">
        <Input
          placeholder="Search by Transfer No..."
          value={pendingFilters.search}
          onChange={(e) => setPendingFilters((prev) => ({ ...prev, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") setAppliedFilters(pendingFilters);
          }}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />

        <Dropdown
          options={storeOptions}
          value={pendingFilters.store}
          onChange={(store) => setPendingFilters((prev) => ({ ...prev, store }))}
          placeholder="All Stores"
          clearable
          className="w-full lg:w-42.5"
        />

        <div className="flex h-12 w-full shrink-0 items-center gap-sm rounded-lg border border-pneutral-300 bg-base-white px-sm lg:w-auto">
          <CalendarDays size={20} className="shrink-0 text-pneutral-500" />
          <input
            type="date"
            value={pendingFilters.dateFrom}
            max={pendingFilters.dateTo || undefined}
            onChange={(e) => setPendingFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            aria-label="Transfer date from"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none lg:w-auto"
          />
          <span className="shrink-0 text-label-l4 text-pneutral-500">–</span>
          <input
            type="date"
            value={pendingFilters.dateTo}
            min={pendingFilters.dateFrom || undefined}
            onChange={(e) => setPendingFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            aria-label="Transfer date to"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none lg:w-auto"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setAppliedFilters(pendingFilters)}
          className="w-full! shrink-0 border-secondary-700! px-4 font-medium! text-secondary-700! lg:w-35.25!"
        >
          Search
        </Button>
      </div>

      <p className="text-label-l5 font-semibold text-pneutral-900">
        Damaged Stock Eligible for Return
      </p>

      <div className="w-full overflow-x-auto">
        <DataTable
          columns={eligibleColumns}
          data={eligibleRows}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              {isLoading
                ? "Loading damaged stock..."
                : loadError || "No damaged stock eligible for return."}
            </div>
          }
        />
      </div>

      <div className="flex w-full justify-end">
        <Button
          type="button"
          variant="primary"
          onClick={handleAddSelected}
          disabled={checkedIds.size === 0}
          className="w-full! gap-2 bg-primary-800! px-4 font-medium! text-pneutral-50! sm:w-63.75!"
        >
          <Image src="/StockReturn/ClipboardWhiteIcon.svg" alt="" width={20} height={20} />
          Add Selected Products
        </Button>
      </div>

      <p className="text-label-l5 font-semibold text-pneutral-900">Selected Products for Return</p>

      <div className="w-full overflow-x-auto">
        <DataTable
          columns={selectedColumns}
          data={lines}
          emptyState={
            <div className="flex h-32 items-center justify-center text-label-l4 text-pneutral-500">
              Tick damaged stock above and click Add Selected Products.
            </div>
          }
        />
      </div>
      {showValidation && lines.length === 0 && (
        <p className="text-p3 text-warning-600">Add at least one product to continue.</p>
      )}

      <div className="flex w-full gap-md rounded-2xl bg-pneutral-50 p-md">
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
        <div className="flex flex-col gap-sm sm:flex-row">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-auto!"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full! gap-2 border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-70!"
            >
              <Image src="/StockReturn/ArrowLeftIcon.svg" alt="" width={20} height={20} />
              Back to Select Return Type
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={lines.length === 0}
            className="w-full! border-secondary-700! px-4 font-medium! text-secondary-700! sm:w-35.25!"
          >
            Save as Draft
          </Button>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleReview}
          className="w-full! gap-2 bg-primary-800! px-4 font-medium! text-pneutral-50! sm:w-57.5!"
        >
          Review and Confirm
          <Image src="/StockReturn/ArrowRightIcon.svg" alt="" width={20} height={20} />
        </Button>
      </div>
    </div>
  );
};

/** A row with nothing left to return is shown faded, as the design does. */
const Dimmed = ({ line, children }: { line: StockReturnLine; children: React.ReactNode }) => (
  <div className={line.availableBase > 0 ? undefined : "opacity-50"}>{children}</div>
);

export default CreateDamagedStockReturn;
