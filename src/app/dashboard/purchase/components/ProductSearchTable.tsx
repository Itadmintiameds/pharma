"use client";

import React from "react";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import { formatShelfLife, type ProductStockRow } from "@/utils/productStock";

interface ProductSearchTableProps {
  rows: ProductStockRow[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onAddStock: (row: ProductStockRow) => void;
}

const COLUMNS = ["#", "Product Name", "Stock (Units)", "Shelf Life", "Status", "Action"];

const HEADER_CELL =
  "h-[72px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1]/20 text-[14px] font-medium last:border-r-0";
const BODY_CELL =
  "h-[68px] px-[8px] py-[16px] border-b border-r border-[#E1E1E1] text-[14px] text-pneutral-900 last:border-r-0";

/**
 * Product master list shown after the goods-receipt step, using the same
 * grid tokens as the onboarded-items table in the first flow.
 */
const ProductSearchTable: React.FC<ProductSearchTableProps> = ({
  rows,
  loading = false,
  error = null,
  emptyMessage = "No products found.",
  onAddStock,
}) => {
  return (
    <div className="w-full rounded-[12px] border border-pneutral-200 overflow-hidden bg-white">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-[#9851f5] text-white">
            {COLUMNS.map((col, idx) => (
              <th
                key={col}
                className={`${HEADER_CELL} ${idx === 0 ? "w-[56px] text-center" : idx === 1 ? "text-left" : "text-center"}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={COLUMNS.length} className="h-[160px] text-center text-[14px] text-pneutral-500">
                Loading products…
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={COLUMNS.length} className="h-[160px] text-center text-[14px] text-danger-600">
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="h-[160px] text-center text-[14px] text-pneutral-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={`${row.productId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                <td className={`${BODY_CELL} text-center font-medium`}>{idx + 1}</td>
                <td className={BODY_CELL}>
                  <div className="flex flex-col gap-[2px]">
                    <span className="font-bold text-pneutral-900">{row.productName}</span>
                    <span className="text-[13px] text-pneutral-600">
                      {row.brandName || row.variant || "—"}
                    </span>
                  </div>
                </td>
                <td className={`${BODY_CELL} text-center`}>{row.totalStock}</td>
                <td className={`${BODY_CELL} text-center`}>
                  {formatShelfLife(row.nearestExpiryDate)}
                </td>
                <td className={`${BODY_CELL} text-center`}>
                  <div className="flex justify-center">
                    <StatusBadge status={row.status} />
                  </div>
                </td>
                <td className={`${BODY_CELL} text-center`}>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => onAddStock(row)}
                      className="flex items-center justify-center bg-[#7D32FC] hover:bg-[#6823df] text-white rounded-[4px] px-[16px] h-[36px] min-w-[108px] w-[119px] transition-all duration-300 ease-out text-[14px] font-medium"
                    >
                      Add stock
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductSearchTable;
