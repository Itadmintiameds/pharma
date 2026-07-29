"use client";

import React, { useState } from "react";
import GoodsReceipt from "./components/GoodsReceipt";
import PurchaseSuccessModal from "@/app/components/common/PurchaseSuccessModal";
import SearchInput from "@/app/components/common/SearchInput";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Download } from "lucide-react";
import DataTable from "@/app/components/common/table/DataTable";

export interface Purchase {
  id: number;
  invoiceDate: string;
  supplier: string;
  invoiceNo: string;
  paymentType: "Credit" | "Debit";
  creditDays: string;
  amount: number;
}

export const columns: ColumnDef<Purchase>[] = [
  {
    header: "#",
    cell: ({ row }) => row.index + 1,
  },

  {
    accessorKey: "invoiceDate",
    header: "Invoice Date",
  },

  {
    accessorKey: "supplier",
    header: "Supplier",
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
  },

  {
    accessorKey: "amount",
    header: "Amount (₹)",

    cell: ({ row }) =>
      Number(row.original.amount).toLocaleString("en-IN", {
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

export const purchaseData: Purchase[] = [
  {
    id: 1,
    invoiceDate: "02/12/2032",
    supplier: "ABC Pharma Distributor",
    invoiceNo: "012315",
    paymentType: "Credit",
    creditDays: "15 Days",
    amount: 56662.25,
  },
  {
    id: 2,
    invoiceDate: "24/05/2026",
    supplier: "Cipla Ltd.",
    invoiceNo: "012315",
    paymentType: "Credit",
    creditDays: "15 Days",
    amount: 64646.25,
  },
  {
    id: 3,
    invoiceDate: "04/11/2026",
    supplier: "Reddy Labs",
    invoiceNo: "012315",
    paymentType: "Debit",
    creditDays: "N/A",
    amount: 56646.225,
  },
];

const Page = () => {
  const [showGoodsReceipt, setShowGoodsReceipt] = useState(false);
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");

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
              <DataTable columns={columns} data={purchaseData} />
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
        <GoodsReceipt />
      )}
    </>
  );
};

export default Page;
