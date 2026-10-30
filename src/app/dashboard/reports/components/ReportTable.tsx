"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { PaginationControl } from "@/app/components/common/table/Pagination";

export interface ReportColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Given, the column sorts when its header is clicked, by this value. */
  sortValue?: (row: T) => string | number;
  /** Width classes for the column, e.g. "min-w-[155px]". */
  className?: string;
  /** `index` is the row's 0-based position in the sorted report, across pages. */
  cell: (row: T, index: number) => React.ReactNode;
}

interface ReportTableProps<T> {
  title: string;
  /** Lines under the title: "Period: …", "Pharmacy: …". */
  subtitles: string[];
  generatedOn: string;
  generatedBy: string;
  columns: ReportColumn<T>[];
  /**
   * The rows to draw: every row of the report, which the table pages itself —
   * or, with `serverPagination`, just the page the server returned.
   */
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  /**
   * A tinted "Total" row under the body, keyed by column key; columns left out
   * stay blank. It totals the whole report, so it shows on every page.
   */
  totalRow?: Partial<Record<string, React.ReactNode>>;
  /** Paging done by the API: the table draws `rows` as they are and reports page changes. */
  serverPagination?: ServerPagination;
  /** Drawn in place of the table and paging row when there are no rows. */
  emptyState?: React.ReactNode;
}

export interface ServerPagination {
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Rows across every page. */
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** The backend accepts a size of 1–500. */
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25];

type SortState = { key: string; direction: "asc" | "desc" } | null;

/**
 * The results card of a report: title block, the table, and the paging row.
 *
 * Paging is client-side over `rows` unless `serverPagination` is given. Sorting
 * is always over the rows in hand — so with server paging it orders the current
 * page only. The table scrolls sideways rather than squeezing when the columns
 * outgrow the card (the detailed sale report has fifteen of them).
 */
export default function ReportTable<T>({
  title,
  subtitles,
  generatedOn,
  generatedBy,
  columns,
  rows,
  getRowKey,
  totalRow,
  serverPagination,
  emptyState,
}: ReportTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const sortedRows = useMemo(() => {
    const column = sort && columns.find((c) => c.key === sort.key);
    if (!sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      return (typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right))) * factor;
    });
  }, [rows, columns, sort]);

  const pageSize = serverPagination?.pageSize ?? localPageSize;
  const totalItems = serverPagination?.totalItems ?? sortedRows.length;
  // A new search can leave fewer pages than the one being viewed.
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = serverPagination?.page ?? Math.min(localPage, totalPages);
  const pageRows = serverPagination
    ? sortedRows
    : sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min((currentPage - 1) * pageSize + pageRows.length, totalItems);

  const changePage = serverPagination?.onPageChange ?? setLocalPage;
  const changePageSize = (size: number) => {
    if (serverPagination) {
      serverPagination.onPageSizeChange(size);
    } else {
      setLocalPageSize(size);
      setLocalPage(1);
    }
  };

  /** Unsorted → ascending → descending → unsorted. */
  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
    if (!serverPagination) setLocalPage(1);
  };

  const showEmptyState = totalItems === 0 && emptyState;

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl bg-white p-4 shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-label-l5 font-semibold text-pneutral-900">{title}</h2>
            <span className="rounded-sm bg-primary-100 px-2 py-1 text-p2 font-medium text-primary-800">
              {totalItems} {totalItems === 1 ? "record" : "records"}
            </span>
          </div>
          {subtitles.map((line) => (
            <p key={line} className="text-p3 text-pneutral-500">{line}</p>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-p3 text-pneutral-500">
          <p>Generated on: {generatedOn}</p>
          <p>Generated by: {generatedBy}</p>
        </div>
      </div>

      {showEmptyState ? emptyState : (
      <>
      <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {columns.map((column) => {
                const sorted = sort?.key === column.key ? sort.direction : null;
                return (
                  <th
                    key={column.key}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={clsx(
                      "h-15 border-r border-b border-pneutral-200 bg-secondary-600 px-3 py-2 text-label-l3 font-semibold text-pneutral-50 uppercase last:border-r-0",
                      column.align === "right" ? "text-right" : "text-left",
                      column.className,
                    )}
                  >
                    <div
                      className={clsx(
                        "flex items-center gap-1",
                        column.align === "right" && "justify-end",
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={clsx(
                            "flex flex-1 items-center gap-1 uppercase",
                            column.align === "right" ? "justify-end text-right" : "justify-between text-left",
                          )}
                        >
                          <span>{column.header}</span>
                          <Image
                            src={sorted ? "/Reports/SortDown.svg" : "/Reports/Sort.svg"}
                            alt=""
                            width={16}
                            height={16}
                            className={clsx("shrink-0", sorted === "asc" && "rotate-180")}
                          />
                        </button>
                      ) : (
                        <span>{column.header}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="h-15 px-3 text-center text-p3 text-pneutral-500">
                  No records found.
                </td>
              </tr>
            )}

            {pageRows.map((row, i) => {
              const index = (currentPage - 1) * pageSize + i;
              return (
                <tr key={getRowKey(row, index)} className="[&:last-child>td]:border-b-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        "h-15 border-r border-b border-pneutral-200 bg-white px-3 py-2 text-p3 text-pneutral-900 last:border-r-0",
                        column.align === "right" && "text-right",
                      )}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>

          {totalRow && pageRows.length > 0 && (
            <tfoot>
              <tr>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      "h-15 border-t border-r border-pneutral-200 bg-primary-100 px-3 py-2 text-p3 font-semibold whitespace-nowrap text-primary-900 last:border-r-0",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {totalRow[column.key]}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="flex-1 text-p3 text-pneutral-500">
          Showing {from} to {to} of {totalItems} records
        </p>

        <label className="flex items-center gap-3 text-p3 text-pneutral-500">
          Records per page
          <span className="relative">
            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="h-9 w-21 appearance-none rounded-sm border border-pneutral-300 bg-white px-3 text-p2 text-pneutral-500 outline-none focus:border-secondary-300"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <Image
              src="/Reports/ChevronDownMini.svg"
              alt=""
              width={16}
              height={16}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </span>
        </label>

        <PaginationControl
          page={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={changePage}
        />
      </div>
      </>
      )}
    </div>
  );
}
