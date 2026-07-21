"use client";
import Image from "next/image";


interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];

  page: number;
  pageSize: number;
  totalItems: number;

  onPageChange: (page: number) => void;

  loading?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  page,
  pageSize,
  totalItems,
  onPageChange,
  loading = false,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalItems / pageSize);

  const visiblePages = 4;

  // Determine which group of pages to show
  const currentGroup = Math.floor((page - 1) / visiblePages);

  const startPage = currentGroup * visiblePages + 1;
  const endPage = Math.min(startPage + visiblePages - 1, totalPages);

  // Generate page numbers
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );

  return (
    <div className="overflow-hidden bg-white">
      <div>
        <table className="w-full">
          <thead className="bg-pneutral-50 border-b border-pneutral-100 h-[72px] ">
            <tr>
              {columns.map((column) => (
                <td
                  key={column.header}
                  className="text-left p-2 text-p3 font-noto-sans font-semibold"
                >
                  {column.header}
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  No Data Found
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  className="h-[68px] border-b border-pneutral-100"
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className="text-p3 px-2">
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof T])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}

      <div className="flex items-center justify-between border-t border-pneutral-100 px-2 pt-2 ">
        {/* Left Text */}
        <span className="text-p4 font-normal font-noto-sans">
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, totalItems)} of {totalItems} entries
        </span>

        {/* Pagination */}
        <div className="flex items-center gap-3">
          {/* Previous */}
          <button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-11.25 w-11.25 items-center justify-center rounded-xl border border-pneutral-200 bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image
              src="/UserManagement/PreviousIcon.svg"
              alt="Export"
              width={24}
              height={24}
            />
          </button>

          {/* Page Numbers */}
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`flex h-11.25 w-11.25 items-center justify-center rounded-xl border text-label-l5 transition-all
          ${
            page === pageNumber
              ? "border-secondary-700 bg-secondary-500 text-primary-900 font-semibold"
              : "border-pneutral-200 bg-white text-pneutral-900 font-normal"
          }`}
            >
              {pageNumber}
            </button>
          ))}

          {/* Next */}
          <button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-11.25 w-11.25 items-center justify-center rounded-xl border border-pneutral-200 bg-secondary-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image
              src="/UserManagement/NextIcon.svg"
              alt="Export"
              width={24}
              height={24}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
