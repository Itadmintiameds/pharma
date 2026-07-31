"use client";

import React, { useEffect, useState } from "react";
import GoodsReceipt from "./components/GoodsReceipt";
import PurchaseSuccessModal from "@/app/components/common/PurchaseSuccessModal";
import SearchInput from "@/app/components/common/SearchInput";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Download } from "lucide-react";
import DataTable from "@/app/components/common/table/DataTable";
import { PurchaseData } from "@/types/PurchaseData";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { getSupplierById } from "@/services/SupplierService";

export const columns: ColumnDef<PurchaseData>[] = [
  {
    header: "#",
    cell: ({ row }) => row.index + 1,
  },

  {
    accessorKey: "invoiceDate",
    header: "Invoice Date",
  },

  {
    accessorKey: "supplierName",
    header: "Supplier",

    cell: ({ row }) => row.original.supplierName ?? "—",
  },

  {
    accessorKey: "invoiceNo",
    header: "Invoice No",
  },

  {
    accessorKey: "paymentType",
    header: "Payment Type",

    cell: ({ row }) => {
      const type = row.original.paymentType;

      return (
        <div
          className={`inline-flex h-8 w-16.5 items-center rounded-full justify-center text-label-l3 font-medium
          ${
            type === "Credit"
              ? "border border-warning-600 bg-warning-50 text-warning-600"
              : "border border-success-600 bg-success-50 text-success-600"
          }`}
        >
          {type}
        </div>
      );
    },
  },

  {
    accessorKey: "creditDays",
    header: "Credit Days",

    cell: ({ row }) => {
      const creditDays = row.original.creditDays;
      return creditDays ? `${creditDays} Days` : "N/A";
    },
  },

  {
    accessorKey: "totalNetAmount",
    header: "Amount (₹)",

    cell: ({ row }) =>
      Number(row.original.totalNetAmount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      }),
  },

  {
    header: "Action",

    cell: () => (
      <div className="flex justify-center gap-5 cursor-pointer">
        <Image
          src="/Purchase/ViewIcon.svg"
          alt="Close"
          width={25}
          height={19}
          className="shrink-0"
        />

        <Image
          src="/Purchase/DownloadIcon.svg"
          alt="Close"
          width={25}
          height={19}
          className="shrink-0"
        />
      </div>
    ),
  },
];

const Page = () => {
  const [showGoodsReceipt, setShowGoodsReceipt] = useState(false);
  const [search, setSearch] = useState("");
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllPurchases();

        const uniqueSupplierIds = Array.from(
          new Set(data.map((purchase) => purchase.supplierId).filter(Boolean))
        );

        const supplierEntries = await Promise.all(
          uniqueSupplierIds.map(async (supplierId) => {
            try {
              const supplier = await getSupplierById(supplierId);
              return [supplierId, supplier.supplierName] as const;
            } catch (err) {
              console.error(`Failed to fetch supplier ${supplierId}:`, err);
              return [supplierId, undefined] as const;
            }
          })
        );
        const supplierNameById = new Map(supplierEntries);

        const enrichedData = data.map((purchase) => ({
          ...purchase,
          supplierName:
            purchase.supplierName ?? supplierNameById.get(purchase.supplierId),
        }));

        setPurchases(enrichedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch purchases.");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  return (
    <>
      {!showGoodsReceipt ? (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-h4 font-semibold">Goods Receipt</div>
              <div className="text-p3 font-normal font-noto-sans">
                Add product from supplier invoice
              </div>
            </div>

            <div className="w-full flex gap-2 items-center">
              <div className="flex-1">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search product by name, generic, code..."
                  onQRCodeClick={() => {
                    console.log("Open QR Scanner");
                  }}
                />
              </div>
              <div>
                <button
                  className="w-52 h-12 rounded-lg bg-primary-800 text-label-l4 font-medium text-pneutral-50"
                  onClick={() => setShowGoodsReceipt(true)}
                >
                  Add New Purchase
                </button>
              </div>
            </div>

            <div>
              {loading ? (
                <div className="text-p3 font-normal text-pneutral-500 py-8 text-center">
                  Loading purchases...
                </div>
              ) : error ? (
                <div className="text-p3 font-normal text-danger-600 py-8 text-center">
                  {error}
                </div>
              ) : (
                <DataTable columns={columns} data={purchases} />
              )}
            </div>
          </div>
          {/* <PurchaseSuccessModal
            isOpen={open}
            onClose={() => setOpen(false)}
            onAddProduct={() => console.log("Add Product")}
            onViewSummary={() => console.log("View Summary")}
          /> */}
        </>
      ) : (
        <GoodsReceipt onClose={() => setShowGoodsReceipt(false)} />
      )}
    </>
  );
};

export default Page;
