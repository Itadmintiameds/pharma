"use client";

import Image from "next/image";

/**
 * The one pagination control the tables share.
 *
 * Every list in the module fetches its rows in a single call and filters them
 * client-side, so pagination here is pure presentation: the page holds the page
 * number, slices its own filtered array, and hands the slice down along with
 * the *unsliced* total. Nothing in here fetches or knows about the data.
 */
export interface TablePagination {
    /** 1-based. */
    page: number;
    pageSize: number;
    /** Rows in the whole filtered set, not in the current slice. */
    totalItems: number;
    onPageChange: (page: number) => void;
}

/** Stands in for the pages the window skips over. */
const ELLIPSIS = -1;

/**
 * The page numbers to actually draw: always the first and last, always the
 * current one and its neighbours, and an ellipsis wherever that skips a run.
 *
 * A button per page is fine for the six-page tables this started on, but a bill
 * list runs to hundreds — a hundred buttons wrap into a wall that pushes the
 * table off screen, and nobody reaches page 57 by hunting for it anyway. The
 * window is at most seven slots, so the control does not change width as you
 * page through it.
 */
export const pageWindow = (page: number, totalPages: number): number[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Clamped so the run stays three wide at both ends too, where the current
    // page has no neighbour on one side to balance it.
    const from = Math.min(Math.max(page - 1, 2), totalPages - 3);
    const to = Math.max(Math.min(page + 1, totalPages - 1), 4);

    return [
        1,
        ...(from > 2 ? [ELLIPSIS] : []),
        ...Array.from({ length: to - from + 1 }, (_, i) => from + i),
        ...(to < totalPages - 1 ? [ELLIPSIS] : []),
        totalPages,
    ];
};

/** The page buttons on their own, without the surrounding count. */
export function PaginationControl({
    page,
    pageSize,
    totalItems,
    onPageChange,
}: TablePagination) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="flex h-11.25 w-11.25 items-center justify-center rounded-xl border border-pneutral-200 bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Image
                    src="/UserManagement/PreviousIcon.svg"
                    alt=""
                    width={24}
                    height={24}
                />
            </button>

            {pageWindow(page, totalPages).map((n, i) =>
                n === ELLIPSIS ? (
                    // Not a button: there is no single page it could go to, and
                    // a disabled one is just a dead target in the row.
                    <span
                        // The gaps are the only repeated values in the list, so
                        // they are keyed by position.
                        key={`gap-${i}`}
                        aria-hidden
                        className="flex h-11.25 w-6 items-end justify-center pb-2 text-label-l5 text-pneutral-500"
                    >
                        …
                    </span>
                ) : (
                    <button
                        type="button"
                        key={n}
                        onClick={() => onPageChange(n)}
                        aria-current={page === n ? "page" : undefined}
                        className={`flex h-11.25 w-11.25 items-center justify-center rounded-xl border text-label-l5 transition-all ${page === n
                            ? "border-secondary-700 bg-secondary-500 text-primary-900 font-semibold"
                            : "border-pneutral-200 bg-white text-pneutral-900 font-normal"
                            }`}
                    >
                        {n}
                    </button>
                )
            )}

            <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="flex h-11.25 w-11.25 items-center justify-center rounded-xl border border-pneutral-200 bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Image
                    src="/UserManagement/NextIcon.svg"
                    alt=""
                    width={24}
                    height={24}
                />
            </button>
        </div>
    );
}

/**
 * The strip under a table: how much of the set is on screen, and the pages.
 *
 * Rendered even when everything fits on one page — the row count is worth
 * having on its own, and a footer that appears and disappears as a search
 * narrows the list makes the table jump.
 */
export default function PaginationFooter(props: TablePagination) {
    const { page, pageSize, totalItems } = props;
    const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pneutral-100 px-2 py-3">
            <span className="text-p4 font-normal font-noto-sans">
                Showing {from} to {to} of {totalItems} entries
            </span>

            <PaginationControl {...props} />
        </div>
    );
}
