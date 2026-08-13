"use client";

/**
 * The billing cart grid — rows are built inline instead of through a search box
 * and a modal. Product and batch are picked from dropdowns, quantity and
 * discount are typed straight into the row, and the derived columns (rate, GST,
 * net) recalculate as you type. The last row carries a "+" to add another.
 *
 * Header and cell styling mirror the common DataTable so the grid reads as part
 * of the same table system.
 */

import React, { useMemo, useRef } from "react";
import Image from "next/image";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
import { sanitizeNumber, sanitizePercentage } from "@/app/schema/BillingSchema";
import Input from "@/app/components/common/Input";
import { BillableProduct } from "@/types/BillingData";
import { formatAmount } from "@/utils/billingTotals";
import { formatDate } from "@/utils/formatDate";

/** One editable line. Numeric inputs stay strings so the fields can be blank. */
export interface BillingRow {
  rowId: string;
  productId: string;
  productName: string;
  brandName?: string;
  batchId: string;
  batchNumber: string;
  unit: string;
  hsnCode: string;
  expiryDate: string;
  availableQuantity: number;
  quantity: string;
  discountPercentage: string;
  mrpPerUnit: number;
  sellingPricePerUnit: number;
  gstPercentage: number;
}

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

/**
 * Expiry as a timestamp, taken at the *end* of the stated period so stock
 * expiring this month is still sellable today. Handles the shapes the batches
 * endpoint uses — "YYYY-MM-DD", "YYYY-MM", "MM/YYYY", "DD/MM/YYYY".
 * Anything unreadable sorts last and is never treated as expired.
 */
const expiryTime = (raw?: string): number => {
  const value = (raw || "").trim();
  if (!value || value === "N/A") return Number.POSITIVE_INFINITY;

  const endOfDay = (y: number, m: number, d: number) =>
    new Date(y, m - 1, d, 23, 59, 59).getTime();
  /** Day 0 of the next month is the last day of this one. */
  const endOfMonth = (y: number, m: number) =>
    new Date(y, m, 0, 23, 59, 59).getTime();

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (match) return endOfDay(+match[1], +match[2], +match[3]);

  match = /^(\d{4})[-/](\d{1,2})$/.exec(value);
  if (match) return endOfMonth(+match[1], +match[2]);

  match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(value);
  if (match) return endOfDay(+match[3], +match[2], +match[1]);

  match = /^(\d{1,2})[-/](\d{4})$/.exec(value);
  if (match) return endOfMonth(+match[2], +match[1]);

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

/** Clamps a typed quantity to what the batch actually has on hand. */
const capToStock = (value: string, available: number) => {
  if (value === "" || !available) return value;
  return Number(value) > available ? String(available) : value;
};

let rowSeq = 0;

export const emptyBillingRow = (): BillingRow => ({
  rowId: `row-${++rowSeq}`,
  productId: "",
  productName: "",
  brandName: "",
  batchId: "",
  batchNumber: "",
  unit: "",
  hsnCode: "",
  expiryDate: "",
  availableQuantity: 0,
  quantity: "",
  discountPercentage: "",
  mrpPerUnit: 0,
  sellingPricePerUnit: 0,
  gstPercentage: 0,
});

/** MRP × qty — the row before any discount. */
export const billingRowTotal = (row: BillingRow) =>
  (Number(row.quantity) || 0) * (row.mrpPerUnit || 0);

/** Total less the row discount. Nothing is added for GST — MRP already
 *  includes it. */
export const billingRowNet = (row: BillingRow) => {
  const total = billingRowTotal(row);
  return total - (total * (Number(row.discountPercentage) || 0)) / 100;
};

/** Per-column overrides for the cell that renders it. */
interface CellMeta {
  cellClassName?: string;
  headerClassName?: string;
}

interface BillingItemsTableProps {
  /** Every batch on hand — the source for both dropdowns. */
  catalog: BillableProduct[];
  rows: BillingRow[];
  onChange: (rows: BillingRow[]) => void;
  /** Pulls full batch details when a batch is picked. */
  onBatchSelected?: (batchId: string) => Promise<BillableProduct | null>;
  isLoading?: boolean;
}

const BillingItemsTable: React.FC<BillingItemsTableProps> = ({
  catalog,
  rows,
  onChange,
  onBatchSelected,
  isLoading = false,
}) => {
  // One entry per product, even though the catalog is keyed by batch.
  const productOptions: DropdownOption[] = useMemo(() => {
    const seen = new Map<string, string>();
    catalog.forEach((batch) => {
      if (batch.productId && !seen.has(batch.productId)) {
        seen.set(batch.productId, batch.productName);
      }
    });
    return Array.from(seen, ([value, label]) => ({ label, value }));
  }, [catalog]);

  /**
   * Batches for a product, first-expiry-first and with expired stock left out
   * entirely. A batch with no readable expiry sorts last rather than being
   * hidden — better to offer it than to lose sellable stock.
   */
  const batchOptionsFor = (productId: string): DropdownOption[] =>
    catalog
      .filter(
        (batch) =>
          batch.productId === productId &&
          // Nothing expired, and nothing with an empty shelf.
          expiryTime(batch.expiryDate) >= startOfToday() &&
          batch.availableQuantity > 0
      )
      .sort((a, b) => expiryTime(a.expiryDate) - expiryTime(b.expiryDate))
      .map((batch) => ({ label: batch.batchNumber, value: batch.batchId }));

  /**
   * The column defs must keep the same function identities across renders —
   * rebuilding them remounts each cell, which would drop focus after a single
   * keystroke. So the handlers read the current rows from a ref instead of
   * closing over them.
   */
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const patchRow = (rowId: string, patch: Partial<BillingRow>) =>
    onChangeRef.current(
      rowsRef.current.map((row) =>
        row.rowId === rowId ? { ...row, ...patch } : row
      )
    );

  const handleProductChange = (row: BillingRow, productId: string) => {
    const product = catalog.find((batch) => batch.productId === productId);
    // Switching product invalidates whatever batch was on the row.
    patchRow(row.rowId, {
      productId,
      productName: product?.productName || "",
      brandName: product?.brandName || "",
      batchId: "",
      batchNumber: "",
      unit: "",
      hsnCode: product?.hsnCode || "",
      expiryDate: "",
      availableQuantity: 0,
      mrpPerUnit: 0,
      sellingPricePerUnit: 0,
      gstPercentage: 0,
    });
  };

  const handleBatchChange = async (row: BillingRow, batchId: string) => {
    const listed = catalog.find((batch) => batch.batchId === batchId);

    // HSN belongs to the product, not the batch, and the batch endpoints do not
    // all return it. It is therefore carried across both passes below: an empty
    // one must never wipe the value picking the product already filled in.
    let hsnCode = row.hsnCode || listed?.hsnCode || "";

    const applyBatch = (batch: BillableProduct) => {
      hsnCode = batch.hsnCode || hsnCode;
      patchRow(row.rowId, {
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        unit: String(batch.unit || ""),
        hsnCode,
        expiryDate: batch.expiryDate,
        availableQuantity: batch.availableQuantity,
        mrpPerUnit: batch.mrpPerUnit,
        sellingPricePerUnit: batch.sellingPricePerUnit || batch.mrpPerUnit,
        gstPercentage: batch.gstPercentage,
        // Carrying a quantity across from a bigger batch could oversell this one.
        quantity: capToStock(row.quantity || "1", batch.availableQuantity),
      });
    };

    if (listed) applyBatch(listed);

    // The list endpoint is enough to fill the row; this refresh keeps stock and
    // pricing honest at the moment of selection.
    if (onBatchSelected) {
      const detailed = await onBatchSelected(batchId);
      if (detailed) applyBatch(detailed);
    }
  };

  const addRow = () =>
    onChangeRef.current([...rowsRef.current, emptyBillingRow()]);

  const removeRow = (rowId: string) => {
    const remaining = rowsRef.current.filter((row) => row.rowId !== rowId);
    // Never leave the grid without a row to type into.
    onChangeRef.current(remaining.length > 0 ? remaining : [emptyBillingRow()]);
  };

  /**
   * Column defs mirror the common DataTable's shape; the editable cells reach
   * back into the row handlers above.
   */
  const columns = useMemo<ColumnDef<BillingRow>[]>(
    () => [
      {
        id: "slNo",
        header: "SL.NO",
        cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
      },
      {
        id: "productName",
        header: "Product Name",
        cell: ({ row }) => (
          <Dropdown
            placeholder="Product Name"
            options={productOptions}
            value={row.original.productId}
            onChange={(value: string) => handleProductChange(row.original, value)}
            isLoading={isLoading}
            searchable
          />
        ),
      },
      {
        id: "batch",
        header: "Batch",
        cell: ({ row }) => (
          <Dropdown
            placeholder="Batch"
            options={batchOptionsFor(row.original.productId)}
            value={row.original.batchId}
            onChange={(value: string) => handleBatchChange(row.original, value)}
            disabled={!row.original.productId}
            searchable
          />
        ),
      },
      {
        id: "hsn",
        header: "HSN",
        // Sits on the product, so it fills in with the product, not the batch.
        cell: ({ row }) => row.original.hsnCode || "—",
      },
      {
        id: "available",
        header: "Available",
        cell: ({ row }) =>
          row.original.batchId
            ? `${row.original.availableQuantity} ${row.original.unit}`.trim()
            : "\u2014",
      },
      {
        id: "expiry",
        header: "Exp",
        cell: ({ row }) => formatDate(row.original.expiryDate),
      },
      {
        id: "quantity",
        // Unit stacks under the label so the column stays narrow.
        header: () => (
          <span className="flex flex-col items-center leading-tight">
            <span>Purchase</span>
            <span>QTY</span>
          </span>
        ),
        meta: {
          cellClassName: "w-[83px] py-4 px-2",
          // Matching padding on the header, or its text would widen the column.
          headerClassName: "w-[83px] px-2",
        },
        cell: ({ row }) => (
          <Input
            sizeVariant="sm"
            containerClassName="w-12 mx-auto"
            // text + inputMode keeps the numeric keypad without the spinner or
            // the scroll-wheel stepping a number input does.
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={row.original.quantity}
            disabled={!row.original.batchId}
            onChange={(e) =>
              patchRow(row.original.rowId, {
                // Never sell more than the batch holds.
                quantity: capToStock(
                  sanitizeNumber(e.target.value),
                  row.original.availableQuantity
                ),
              })
            }
          />
        ),
      },
      {
        id: "discount",
        header: () => (
          <span className="flex flex-col items-center leading-tight">
            <span>Discount</span>
            <span>(%)</span>
          </span>
        ),
        meta: {
          cellClassName: "w-[83px] py-4 px-2",
          // Matching padding on the header, or its text would widen the column.
          headerClassName: "w-[83px] px-2",
        },
        cell: ({ row }) => (
          <Input
            sizeVariant="sm"
            containerClassName="w-12 mx-auto"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={row.original.discountPercentage}
            disabled={!row.original.batchId}
            onChange={(e) =>
              patchRow(row.original.rowId, {
                discountPercentage: sanitizePercentage(e.target.value),
              })
            }
          />
        ),
      },
      {
        id: "mrp",
        // The bill is raised at MRP, which is tax-inclusive — never the
        // selling price.
        header: "MRP (₹)",
        cell: ({ row }) =>
          row.original.batchId
            ? formatAmount(row.original.mrpPerUnit)
            : "\u2014",
      },
      {
        id: "gst",
        header: "GST%",
        cell: ({ row }) =>
          row.original.batchId
            ? Number(row.original.gstPercentage || 0).toFixed(2)
            : "\u2014",
      },
      {
        id: "total",
        // MRP x qty, before the discount — so the row reads as
        // Total - Discount = Net Amount.
        header: "Total (₹)",
        cell: ({ row }) =>
          row.original.batchId
            ? formatAmount(billingRowTotal(row.original))
            : "—",
      },
      {
        id: "netAmount",
        header: "Net Amount (₹)",
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.batchId ? formatAmount(billingRowNet(row.original)) : "\u2014"}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row, table }) => {
          const isLastRow = row.index === table.getRowModel().rows.length - 1;
          return (
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                aria-label={`Remove row ${row.index + 1}`}
                title="Remove row"
                onClick={() => removeRow(row.original.rowId)}
                className="hover:opacity-70 transition-opacity cursor-pointer"
              >
                <Image src="/Billing/delete.svg" alt="" width={20} height={20} />
              </button>

              {isLastRow && (
                <button
                  type="button"
                  aria-label="Add row"
                  title="Add row"
                  onClick={addRow}
                  className="hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <Image
                    src="/Billing/add_circle.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    // Deliberately not keyed on `rows` — see the ref note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productOptions, catalog, isLoading]
  );

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
  });

  const lastRowIndex = table.getRowModel().rows.length - 1;

  return (
    /* The wrapper can't clip to its radius — the row dropdowns open outside it —
       so the corner cells round themselves instead. */
    <div className="w-full rounded-xl border border-pneutral-200 bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-secondary-600 h-[72px]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`px-4 py-3 text-p3 font-bold text-pneutral-50 font-noto-sans border-r border-secondary-500 text-center last:border-r-0 first:rounded-tl-xl last:rounded-tr-xl ${
                    (header.column.columnDef.meta as CellMeta)?.headerClassName ??
                    ""
                  }`}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border border-pneutral-200 h-17 text-pneutral-900 text-label-l4"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`px-2 border border-pneutral-200 text-center align-middle whitespace-nowrap ${
                    (cell.column.columnDef.meta as CellMeta)?.cellClassName ?? ""
                  } ${
                    row.index === lastRowIndex
                      ? "first:rounded-bl-xl last:rounded-br-xl"
                      : ""
                  }`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillingItemsTable;
