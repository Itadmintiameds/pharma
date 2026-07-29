'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export default function DataTable<TData>({
  columns,
  data,
}: DataTableProps<TData>) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-pneutral-200 bg-white">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="bg-secondary-600 h-18 "
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-p3 font-bold text-pneutral-50 font-noto-sans border border-pneutral-200"
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
              className="border border-pneutral-200"
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-6 border border-pneutral-200 text-pneutral-900 text-label-l4"
                >
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}