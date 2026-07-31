"use client";

import Image from "next/image";
import { useState } from "react";

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

export interface TablePagination {
    page: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
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

            {/* Pagination */}
            {pagination && (
                <div className="flex items-center justify-between border-t border-pneutral-100 px-2 py-3">
                    <span className="text-p4 font-normal font-noto-sans">
                        Showing{" "}
                        {pagination.totalItems === 0
                            ? 0
                            : (pagination.page - 1) * pagination.pageSize + 1}{" "}
                        to{" "}
                        {Math.min(
                            pagination.page * pagination.pageSize,
                            pagination.totalItems
                        )}{" "}
                        of {pagination.totalItems} entries
                    </span>

                    <Pagination {...pagination} />
                </div>
            )}
        </div>
    );
}

function Pagination({
    page,
    pageSize,
    totalItems,
    onPageChange,
}: TablePagination) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex items-center gap-3">
            <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="flex h-11.25 w-11.25 items-center justify-center rounded-xl border border-pneutral-200 bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Image
                    src="/UserManagement/PreviousIcon.svg"
                    alt="Previous"
                    width={24}
                    height={24}
                />
            </button>

            {pageNumbers.map((n) => (
                <button
                    key={n}
                    onClick={() => onPageChange(n)}
                    className={`flex h-11.25 w-11.25 items-center justify-center rounded-xl border text-label-l5 transition-all ${page === n
                        ? "border-secondary-700 bg-secondary-500 text-primary-900 font-semibold"
                        : "border-pneutral-200 bg-white text-pneutral-900 font-normal"
                        }`}
                >
                    {n}
                </button>
            ))}

            <button
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
                className="flex h-11.25 w-11.25 items-center justify-center rounded-xl border border-pneutral-200 bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Image
                    src="/UserManagement/NextIcon.svg"
                    alt="Next"
                    width={24}
                    height={24}
                />
            </button>
        </div>
    );
}
