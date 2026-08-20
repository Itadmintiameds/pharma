"use client";

import Image from "next/image";
import { useState } from "react";
import PaginationFooter, {
    type TablePagination,
} from "./Pagination";

// Re-exported: callers have always imported the pagination shape from here.
export type { TablePagination };

/** Row-level helpers passed to each cell renderer (e.g. to toggle expansion from an actions cell). */
export interface TableRowContext {
    expanded: boolean;
    toggle: () => void;
}

export interface TableColumn<T> {
    header: string;
    /** Tailwind width utility for the cell. Defaults to "min-w-0 flex-1". e.g. "w-20". */
    width?: string;
    align?: "left" | "center";
    render: (row: T, ctx: TableRowContext) => React.ReactNode;
}


interface TableWithoutGridProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    /** Stable unique key per row (index provided for data with duplicate values). */
    rowKey: (row: T, index: number) => string;
    /** Column-header band style: purple top header or muted grey sub-header. */
    headerVariant?: "primary" | "muted";
    /** Render content shown under a row when expanded. Presence enables the expand chevron. */
    renderExpanded?: (row: T) => React.ReactNode;
    /** Outer container: "card" (rounded-xl border), "box" (rounded-lg border), or "none". */
    container?: "card" | "box" | "none";
    /** Optional node rendered inside the container after the rows (e.g. an add-row action). */
    footer?: React.ReactNode;
    /** Controlled pagination. Omit for a non-paginated (e.g. nested) table. */
    pagination?: TablePagination;
    loading?: boolean;
}

export function Chevron({ open }: { open: boolean }) {
    return (
        <Image
            src="/ProductManagement/ChevronDouble.svg"
            alt=""
            width={14}
            height={8}
            className={open ? "" : "-rotate-90"}
        />
    );
}

export default function TableWithoutGrid<T>({
    columns,
    data,
    rowKey,
    headerVariant = "primary",
    renderExpanded,
    container = "card",
    footer,
    pagination,
    loading = false,
}: TableWithoutGridProps<T>) {
    const [open, setOpen] = useState<Set<string>>(new Set());
    const expandable = !!renderExpanded;

    const toggle = (id: string) =>
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const containerClass =
        container === "card"
            ? "overflow-hidden rounded-xl border border-pneutral-100 bg-white"
            : container === "box"
                ? "overflow-hidden rounded-lg border border-pneutral-100 bg-white"
                : "";

    const headerClass =
        headerVariant === "primary"
            ? "h-18 bg-secondary-600 text-pneutral-50"
            : "border-b border-pneutral-100 bg-pneutral-50 py-4 text-pneutral-900";

    const cellClass = (col: TableColumn<T>) =>
        `${col.width ?? "min-w-0 flex-1"} px-2 ${col.align === "center" ? "text-center" : ""
        }`;

    return (
        <div className={containerClass}>
            {/* Header */}
            <div
                className={`flex items-center px-2 text-p3 font-semibold font-noto-sans ${headerClass}`}
            >
                {expandable && <span className="w-10 shrink-0" />}
                {columns.map((col) => (
                    <span key={col.header} className={cellClass(col)}>
                        {col.header}
                    </span>
                ))}
            </div>

            {/* Body */}
            {loading ? (
                <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
                    Loading…
                </div>
            ) : data.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
                    No records found.
                </div>
            ) : (
                data.map((row, index) => {
                    const id = rowKey(row, index);
                    const isOpen = open.has(id);
                    return (
                        <div
                            key={id}
                            className="border-b border-pneutral-100 last:border-b-0"
                        >
                            <div className="flex items-center px-2 py-3">
                                {expandable && (
                                    <button
                                        type="button"
                                        aria-label={isOpen ? "Collapse row" : "Expand row"}
                                        onClick={() => toggle(id)}
                                        className="flex w-10 shrink-0 items-center justify-center"
                                    >
                                        <Chevron open={isOpen} />
                                    </button>
                                )}
                                {columns.map((col) => (
                                    <div key={col.header} className={cellClass(col)}>
                                        {col.render(row, {
                                            expanded: isOpen,
                                            toggle: () => toggle(id),
                                        })}
                                    </div>
                                ))}
                            </div>
                            {isOpen && renderExpanded!(row)}
                        </div>
                    );
                })
            )}

            {footer}

            {pagination && <PaginationFooter {...pagination} />}
        </div>
    );
}
