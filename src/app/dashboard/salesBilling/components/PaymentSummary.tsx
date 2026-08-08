"use client";

import React, { useRef, useState } from "react";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Printer } from "lucide-react";
import { downloadElementAsPdf } from "@/utils/downloadPdf";
import {
  BillLine,
  BillTotals,
  CustomerInfo,
  PaymentDetails,
} from "@/types/BillingData";
import {
  amountInWords,
  formatAmount,
  lineNet,
} from "@/utils/billingTotals";

interface PaymentSummaryProps {
  invoiceNo: string;
  billDate: string;
  customer: CustomerInfo;
  lines: BillLine[];
  totals: BillTotals;
  payment: PaymentDetails;
  mode?: "create" | "view" | "download";
  onBack?: () => void;
  onDone?: () => void;
  onNewBill?: () => void;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  invoiceNo,
  billDate,
  customer,
  lines,
  totals,
  payment,
  mode = "create",
  onBack,
  onDone,
}) => {
  const [currentMode] = useState<"create" | "view" | "download">(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsSubmitting(true);
    try {
      await downloadElementAsPdf(
        printRef.current,
        `invoice-${invoiceNo.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`
      );
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate the invoice PDF", err);
      toast.error("Could not generate the PDF.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<BillLine>[] = [
    {
      header: "#",
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "productName",
      header: "Product Name",
      cell: ({ row }) => (
        <span className="font-medium text-[#1E1E1D]">
          {row.original.productName || "—"}
        </span>
      ),
    },
    {
      accessorKey: "batchNumber",
      header: "Batch",
      cell: ({ row }) => row.original.batchNumber || "—",
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => row.original.unit || "BOX",
    },
    {
      accessorKey: "quantity",
      header: "QTY",
      cell: ({ row }) => (
        <span className="font-semibold text-[#1E1E1D]">{row.original.quantity}</span>
      ),
    },
    {
      header: "Rate (₹)",
      cell: ({ row }) => {
        const rate =
          row.original.sellingPricePerUnit ?? row.original.mrpPerUnit ?? 0;
        return `₹ ${formatAmount(rate)}`;
      },
    },
    {
      accessorKey: "gstPercentage",
      header: "GST (%)",
      cell: ({ row }) => `${row.original.gstPercentage ?? 0}%`,
    },
    {
      header: "Amount (₹)",
      cell: ({ row }) => {
        const lineAmt = lineNet(row.original);
        return (
          <span className="font-semibold text-[#1E1E1D]">
            ₹ {formatAmount(lineAmt)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full bg-transparent pb-12">
      {/* Printable Ref Wrapper */}
      <div ref={printRef} className="flex flex-col gap-4 w-full bg-transparent">
        {/* Title Header */}
        <div className="w-full min-h-[70px] px-4 py-3 flex items-center bg-secondary-600 border-t border-secondary-50 rounded-xl shadow-sm">
          <h1 className="text-white font-semibold text-[22px] sm:text-[24px] leading-tight">
            {currentMode === "view"
              ? "View Payment Invoice"
              : currentMode === "download"
              ? "Download Payment Invoice"
              : "Payment Invoice"}
          </h1>
        </div>

        {/* Top Summary Card (Invoice & Customer Info Wrapper) */}
        <div className="w-full bg-white border border-[#D5D5D4] rounded-xl p-4 shadow-2xs">
          <div className="w-full px-4 py-3 bg-[#F8F5FF] border border-[#D5D5D4] rounded-lg flex flex-col md:flex-row items-start justify-between gap-6 text-[14px]">
            {/* Left Side: Invoice details */}
            <div className="flex-1 flex flex-col gap-2.5 w-full">
              <div className="flex items-center">
                <span className="w-[140px] sm:w-[160px] text-[#3C3D3A]">
                  Invoice No
                </span>
                <span className="w-4 text-[#3C3D3A]">:</span>
                <span className="font-medium text-[#1E1E1D]">
                  {invoiceNo || "—"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[140px] sm:w-[160px] text-[#3C3D3A]">
                  Invoice Date & Time
                </span>
                <span className="w-4 text-[#3C3D3A]">:</span>
                <span className="font-medium text-[#1E1E1D]">
                  {billDate
                    ? billDate.includes("T")
                      ? billDate.replace("T", " ")
                      : billDate
                    : "—"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[140px] sm:w-[160px] text-[#3C3D3A]">
                  Payment Mode
                </span>
                <span className="w-4 text-[#3C3D3A]">:</span>
                <span className="font-semibold text-[#1E1E1D] px-2 py-0.5 rounded bg-white border border-[#D5D5D4] text-xs uppercase shadow-2xs">
                  {payment.paymentMode || "CASH"}
                </span>
              </div>
            </div>

            {/* Right Side: Customer info */}
            <div className="flex-1 flex flex-col gap-2.5 w-full md:max-w-[420px]">
              <div className="flex items-center">
                <span className="w-[80px] sm:w-[100px] text-[#3C3D3A]">
                  Customer
                </span>
                <span className="w-4 text-[#3C3D3A]">:</span>
                <span className="font-medium text-[#1E1E1D]">
                  {customer?.customerName || "Walk-in Customer"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-[80px] sm:w-[100px] text-[#3C3D3A]">
                  Mobile
                </span>
                <span className="w-4 text-[#3C3D3A]">:</span>
                <span className="font-medium text-[#1E1E1D]">
                  {customer?.mobileNo || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="w-full bg-white border border-[#D5D5D4] rounded-xl p-4 shadow-2xs">
          <DataTable columns={columns} data={lines} />
        </div>

        {/* Bottom Totals & Words Section */}
        <div className="w-full bg-white border border-[#D5D5D4] rounded-xl p-3 flex flex-col lg:flex-row items-stretch gap-4 sm:gap-6 shadow-2xs">
          {/* First Card: Amount in Words */}
          <div className="flex-[2] w-full min-h-[160px] rounded-lg border border-[#D5D5D4] bg-white p-4 flex flex-col justify-start gap-2">
            <div className="text-[14px] text-[#3C3D3A] font-normal">
              Amount in words
            </div>
            <div className="text-[16px] sm:text-[18px] font-semibold text-[#1E1E1D] capitalize">
              {amountInWords(Math.round(totals.netAmount || 0))}
            </div>
          </div>

          {/* Next Card: Gross & Net Payable Summary */}
          <div className="w-full lg:w-[360px] rounded-lg border border-[#D5D5D4] bg-white p-3 flex flex-col justify-between gap-3 shrink-0">
            <div className="flex flex-col gap-1.5 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-[#3C3D3A] font-normal">Gross Amount</span>
                <span className="font-semibold text-[#1E1E1D]">
                  ₹ {formatAmount(totals.grossAmount || 0)}
                </span>
              </div>
              {(totals.itemDiscount > 0 || totals.billDiscount > 0) && (
                <div className="flex items-center justify-between text-[#3C3D3A]">
                  <span>Discount</span>
                  <span className="font-semibold text-[#1E1E1D]">
                    ₹ {formatAmount((totals.itemDiscount || 0) + (totals.billDiscount || 0))}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[#3C3D3A]">
                <span>Taxable Amt</span>
                <span className="font-semibold text-[#1E1E1D]">
                  ₹ {formatAmount(totals.taxableAmount || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#3C3D3A]">
                {/* Amount only — lines can sit on different GST slabs */}
                <span>GST</span>
                <span className="font-semibold text-[#1E1E1D]">
                  ₹ {formatAmount(totals.gstAmount || 0)}
                </span>
              </div>
            </div>

            <div className="w-full border-t border-[#D5D5D4] pt-2 flex items-center justify-between">
              <span className="text-[16px] sm:text-[18px] font-semibold text-[#1E1E1D] uppercase">
                NET PAYABLE
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-[#1E1E1D]">
                ₹ {formatAmount(totals.netAmount || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 mt-2">
        <button
          type="button"
          onClick={() => {
            if (onBack) {
              onBack();
            } else if (onDone) {
              onDone();
            } else {
              window.location.href = "/dashboard/salesBilling";
            }
          }}
          disabled={isSubmitting}
          className="w-[164px] h-[56px] rounded-[8px] border-[2.5px] border-[#1E1E1D] bg-white hover:bg-gray-50 text-[#1E1E1D] font-semibold text-[16px] flex items-center justify-center transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          {currentMode === "view" ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isSubmitting}
            className="h-[56px] px-6 rounded-[8px] bg-[#1E1E1D] hover:bg-[#3C3D3A] text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Printer size={20} />
            Print
          </button>

          {currentMode !== "view" ? (
            <button
              type="button"
              onClick={() => {
                if (currentMode === "download") {
                  handleDownloadPdf();
                } else {
                  toast.success("Bill saved successfully!");
                  if (onDone) onDone();
                }
              }}
              disabled={isSubmitting}
              className="w-[272px] h-[56px] rounded-[8px] bg-primary-800 hover:opacity-90 text-white font-semibold text-[16px] flex items-center justify-center transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSubmitting
                ? "Processing..."
                : currentMode === "download"
                ? "Download PDF"
                : "Save & Back to Dashboard"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isSubmitting}
              className="w-[200px] h-[56px] rounded-[8px] bg-primary-800 hover:opacity-90 text-white font-semibold text-[16px] flex items-center justify-center transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSubmitting ? "Generating..." : "Download Invoice"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;
