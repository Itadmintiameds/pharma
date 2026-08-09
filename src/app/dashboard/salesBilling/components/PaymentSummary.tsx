"use client";

import React, { useRef, useState } from "react";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { showToast } from "@/app/components/common/Toast";
import BillingSuccessModal from "./BillingSuccessModal";
import { downloadElementAsPdf } from "@/utils/downloadPdf";
import { formatDate, formatDateTime } from "@/utils/formatDate";
import { printElement } from "@/utils/printElement";
import { BACK_BUTTON, PRIMARY_BUTTON } from "./billingButtons";
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
  /**
   * Saves the bill (and any prescription) and returns what the success popup
   * should show. Returning null leaves the screen as it is.
   */
  onSave?: () => Promise<{ billNo: string } | null>;
}

/** Every column of the invoice grid is centred, so both ends share a cell. */
const Centered: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span className={`block w-full text-center ${className ?? ""}`}>
    {children}
  </span>
);

/** One `Label : Value` line of the bill details card — 24px tall, 124px
 *  label, 5px colon, the value taking the rest. */
const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex h-6 items-center gap-3">
    <span className="w-[124px] shrink-0 font-body text-p4 font-normal text-pneutral-800">
      {label}
    </span>
    <span className="w-[5px] shrink-0 font-body text-p4 font-normal text-pneutral-800">
      :
    </span>
    <span className="flex-1 truncate font-body text-p4 font-medium text-pneutral-900">
      {value}
    </span>
  </div>
);

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
  onSave,
}) => {
  const [currentMode] = useState<"create" | "view" | "download">(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedBillNo, setSavedBillNo] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  /** Saves through the page, then opens the success popup. */
  const handleSave = async () => {
    if (currentMode === "download") {
      handleDownloadPdf();
      return;
    }

    if (!onSave) {
      if (onDone) onDone();
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await onSave();
      if (saved) setSavedBillNo(saved.billNo);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** No send-bill endpoint yet, so the button only says so. */
  const handleSendToWhatsapp = () => {
    showToast.info("Feature coming soon.");
  };

  /** Hands the invoice to the browser's print dialog — a real printer, not a
   *  silent PDF download. */
  const handlePrint = () => {
    if (!printRef.current) return;
    try {
      printElement(printRef.current, `Invoice ${invoiceNo}`);
    } catch (err) {
      console.error("Failed to open the print view", err);
      showToast.error("Could not open the print dialog.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsSubmitting(true);
    try {
      await downloadElementAsPdf(
        printRef.current,
        `invoice-${invoiceNo.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`
      );
      showToast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate the invoice PDF", err);
      showToast.error("Could not generate the PDF.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<BillLine>[] = [
    {
      id: "slNo",
      header: () => <Centered>Sl. No.</Centered>,
      cell: ({ row }) => <Centered>{row.index + 1}</Centered>,
    },
    {
      accessorKey: "productName",
      header: () => <Centered>Product Name</Centered>,
      cell: ({ row }) => (
        <Centered className="font-semibold text-pneutral-900">
          {row.original.productName || "—"}
        </Centered>
      ),
    },
    {
      accessorKey: "batchNumber",
      header: () => <Centered>Batch</Centered>,
      cell: ({ row }) => <Centered>{row.original.batchNumber || "—"}</Centered>,
    },
    {
      accessorKey: "expiryDate",
      header: () => <Centered>Exp</Centered>,
      cell: ({ row }) => <Centered>{formatDate(row.original.expiryDate)}</Centered>,
    },
    {
      accessorKey: "quantity",
      // Stock is counted in smallest units, so this is what was billed of them.
      header: () => <Centered>Purchase QTY</Centered>,
      cell: ({ row }) => <Centered>{row.original.quantity}</Centered>,
    },
    {
      accessorKey: "discountPercentage",
      header: () => <Centered>Discount (%)</Centered>,
      cell: ({ row }) => <Centered>{row.original.discountPercentage || 0}</Centered>,
    },
    {
      id: "rate",
      header: () => <Centered>Rate (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>
          {formatAmount(
            row.original.sellingPricePerUnit ?? row.original.mrpPerUnit ?? 0
          )}
        </Centered>
      ),
    },
    {
      accessorKey: "gstPercentage",
      header: () => <Centered>GST%</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(row.original.gstPercentage ?? 0)}</Centered>
      ),
    },
    {
      id: "netAmount",
      header: () => <Centered>Net Amount (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(lineNet(row.original))}</Centered>
      ),
    },
  ];

  /** The three invoice facts on the left of the bill details card. */
  const BILL_FACTS = [
    { label: "Bill No", value: invoiceNo || "—" },
    { label: "Bill Date & Time", value: formatDateTime(billDate) },
    { label: "Payment Mode", value: payment.paymentMode || "CASH" },
  ];

  /** The four lines above NET PAYABLE. Discount holds whether or not one was
   *  given, so the card keeps its 184px height either way. */
  const AMOUNT_ROWS = [
    { label: "Gross Amount", value: totals.grossAmount || 0 },
    {
      label: "Discount",
      value: (totals.itemDiscount || 0) + (totals.billDiscount || 0),
    },
    { label: "Taxable Amt", value: totals.taxableAmount || 0 },
    // Amount only — lines can sit on different GST slabs.
    { label: "GST", value: totals.gstAmount || 0 },
  ];

  /** The two customer facts on the right. */
  const CUSTOMER_FACTS = [
    { label: "Customer", value: customer?.customerName || "Walk-in Customer" },
    { label: "Mobile", value: customer?.mobileNo || "—" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full bg-transparent pb-12">
      {/* Printable Ref Wrapper */}
      <div ref={printRef} className="flex flex-col gap-4 w-full bg-transparent">
        {/* Title bar — 70px tall, 16px padding, with the light rule on top */}
        <div className="w-full h-[70px] p-4 flex items-center rounded-xl border border-secondary-600 border-t-secondary-50 bg-secondary-600">
          <h1 className="font-heading text-h4 font-semibold text-secondary-50">
            {currentMode === "view"
              ? "View Payment Invoice"
              : currentMode === "download"
              ? "Download Payment Invoice"
              : "Payment Invoice"}
          </h1>
        </div>

        {/* Bill details — the invoice facts and the customer, side by side.
            Each column is a stack of 24px lines at a 10px rhythm. */}
        <div className="w-full rounded-xl border border-pneutral-200 bg-secondary-50 px-4 py-3 flex flex-col md:flex-row items-start gap-6">
          <div className="flex-1 w-full flex flex-col gap-2.5">
            {BILL_FACTS.map((fact) => (
              <Fact key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </div>

          <div className="flex-1 w-full flex flex-col gap-2.5">
            {CUSTOMER_FACTS.map((fact) => (
              <Fact key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </div>
        </div>

        {/* Invoice grid — DataTable brings its own rounded border, so it is not
            boxed a second time. Height follows the number of lines: a fixed
            minimum would leave dead space under a short bill. */}
        <div className="w-full">
          <DataTable columns={columns} data={lines} />
        </div>

        {/* Amount in words beside the totals — 184px tall, 16px apart */}
        <div className="w-full flex flex-col lg:flex-row items-stretch gap-4">
          <div className="flex-1 lg:min-h-[184px] rounded-lg border border-pneutral-200 bg-white p-4 flex flex-col gap-4">
            <span className="font-body text-p4 font-normal text-pneutral-800">
              Amount in words
            </span>
            <span className="font-body text-p4 font-semibold text-pneutral-900 capitalize">
              {amountInWords(Math.round(totals.netAmount || 0))}
            </span>
          </div>

          {/* Amount summary — four 24px lines at an 8px rhythm, then NET
              PAYABLE on its own 32px line above a hairline. */}
          <div className="w-full lg:w-[364px] shrink-0 lg:h-[184px] rounded-lg border border-pneutral-200 bg-white p-3 flex flex-col gap-2">
            {AMOUNT_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex h-6 items-center justify-between"
              >
                <span className="font-body text-p4 font-normal text-pneutral-800">
                  {row.label}
                </span>
                <span className="font-body text-p4 font-semibold text-pneutral-900">
                  ₹ {formatAmount(row.value)}
                </span>
              </div>
            ))}

            <div className="flex h-8 items-center justify-between border-t border-pneutral-200 pt-2">
              <span className="font-body text-p5 font-semibold text-pneutral-900">
                NET PAYABLE
              </span>
              <span className="font-body text-p5 font-semibold text-pneutral-900">
                ₹ {formatAmount(totals.netAmount || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="w-full h-14 flex flex-wrap items-center justify-between gap-4">
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
          className={`${BACK_BUTTON} w-[108px] shrink-0`}
        >
          Back
        </button>

        {/* Viewing a saved bill prints it; the create flow saves it. */}
        <button
          type="button"
          onClick={currentMode === "view" ? handlePrint : handleSave}
          disabled={isSubmitting}
          className={`${PRIMARY_BUTTON} ${
            currentMode === "view" ? "w-[128px]" : "w-[108px]"
          } shrink-0`}
        >
          {currentMode === "view"
            ? "Print"
            : isSubmitting
            ? "Saving..."
            : currentMode === "download"
            ? "Download"
            : "Save"}
        </button>
      </div>

      <BillingSuccessModal
        isOpen={!!savedBillNo}
        billNo={savedBillNo ?? invoiceNo}
        totalItems={lines.length}
        netAmount={totals.netAmount}
        onSendToWhatsapp={handleSendToWhatsapp}
        onPrint={handlePrint}
        onBackToDashboard={() => {
          setSavedBillNo(null);
          if (onDone) onDone();
        }}
      />
    </div>
  );
};

export default PaymentSummary;
