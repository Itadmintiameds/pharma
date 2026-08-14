"use client";

/**
 * Step 3 of the POS flow — the receipt. Shows the payment-success banner, the
 * printable tax invoice, and the exits back into the module (new bill or the
 * bills list).
 */

import React, { useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Printer, Plus } from "lucide-react";
import toast from "react-hot-toast";
import {
  BillLine,
  BillTotals,
  CustomerInfo,
  PaymentDetails,
} from "@/types/BillingData";
import {
  amountInWords,
  formatAmount,
  lineDiscount,
  lineGross,
  lineNet,
} from "@/utils/billingTotals";
import { downloadElementAsPdf } from "@/utils/downloadPdf";
import { formatDate, formatMonthYear } from "@/utils/formatDate";

interface BillingPaymentInvoiceProps {
  invoiceNo: string;
  billDate: string;
  customer: CustomerInfo;
  lines: BillLine[];
  totals: BillTotals;
  payment: PaymentDetails;
  /** Clears the cart and starts a fresh bill. */
  onNewBill: () => void;
  /** Returns to the bills list. */
  onDone: () => void;
}

const PAYMENT_MODE_LABELS: Record<PaymentDetails["paymentMode"], string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  CREDIT: "Credit",
};

const BillingPaymentInvoice: React.FC<BillingPaymentInvoiceProps> = ({
  invoiceNo,
  billDate,
  customer,
  lines,
  totals,
  payment,
  onNewBill,
  onDone,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementAsPdf(
        invoiceRef.current,
        `invoice-${invoiceNo.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`
      );
    } catch (err) {
      console.error("Failed to generate the invoice PDF", err);
      toast.error("Could not generate the PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const isCredit = payment.paymentMode === "CREDIT";
  /** Any mode can be part paid for an in-patient, so the balance drives the
   *  banner rather than the mode. */
  const pending = payment.pendingAmount ?? 0;
  const isPartial = !isCredit && pending > 0;

  const summaryRows = [
    { label: "Sub Total", value: formatAmount(totals.grossAmount) },
    { label: "Item Discount", value: `- ${formatAmount(totals.itemDiscount)}` },
    { label: "Bill Discount", value: `- ${formatAmount(totals.billDiscount)}` },
    { label: "Taxable Amount", value: formatAmount(totals.taxableAmount) },
    { label: "GST", value: formatAmount(totals.gstAmount) },
    { label: "Round Off", value: formatAmount(totals.roundOff) },
  ];

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Payment status */}
      <div
        className={`flex items-center gap-4 rounded-[20px] border p-4 ${
          isCredit || isPartial
            ? "border-warning-600 bg-warning-50 text-warning-600"
            : "border-success-600 bg-success-50 text-success-800"
        }`}
      >
        <CheckCircle2 size={32} className="shrink-0" />
        <div className="flex flex-col">
          <div className="text-p4 font-bold font-noto-sans">
            {isCredit
              ? "Bill Generated on Credit"
              : isPartial
                ? "Partial Payment Received"
                : "Payment Success"}
          </div>
          <div className="text-p3 font-normal font-noto-sans">
            {isCredit
              ? `₹ ${formatAmount(payment.amountReceived)} received · ₹ ${formatAmount(
                  pending
                )} pending`
              : `₹ ${formatAmount(
                  payment.amountReceived
                )} received via ${PAYMENT_MODE_LABELS[payment.paymentMode]}${
                  isPartial ? ` · ₹ ${formatAmount(pending)} pending` : ""
                }${
                  payment.changeDue
                    ? ` · ₹ ${formatAmount(payment.changeDue)} change returned`
                    : ""
                }`}
          </div>
        </div>
      </div>

      {/* Printable invoice */}
      <div
        ref={invoiceRef}
        className="bg-white p-6 border border-pneutral-100 rounded-xl flex flex-col gap-5"
      >
        <div className="flex items-start justify-between gap-6 border-b border-pneutral-100 pb-5">
          <div className="flex items-center gap-3">
            <Image
              src="/TiamedsLogo.svg"
              alt="Tiameds"
              width={120}
              height={32}
              className="shrink-0"
            />
          </div>

          <div className="flex flex-col items-end gap-1 text-p3 font-noto-sans text-pneutral-700">
            <div className="text-h6 font-semibold text-pneutral-900">
              Tax Invoice
            </div>
            <div>
              Invoice No.{" "}
              <span className="font-semibold text-pneutral-900">{invoiceNo}</span>
            </div>
            <div>
              Date{" "}
              <span className="font-semibold text-pneutral-900">
                {formatDate(billDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-p2 font-noto-sans text-pneutral-500">
              Billed To
            </span>
            <span className="text-label-l4 font-semibold text-pneutral-900">
              {customer.customerName || "Walk-in Customer"}
            </span>
            <span className="text-p3 font-noto-sans text-pneutral-700">
              {customer.mobileNo || "—"}
            </span>
            <span className="text-p3 font-noto-sans text-pneutral-700">
              {customer.address || "—"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-p2 font-noto-sans text-pneutral-500">
              Prescribed By
            </span>
            <span className="text-label-l4 font-semibold text-pneutral-900">
              {customer.doctorName || "—"}
            </span>
            <span className="text-p3 font-noto-sans text-pneutral-700">
              {customer.age ? `Age ${customer.age}` : "—"}
              {customer.gender ? ` · ${customer.gender}` : ""}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-p2 font-noto-sans text-pneutral-500">
              Payment
            </span>
            <span className="text-label-l4 font-semibold text-pneutral-900">
              {PAYMENT_MODE_LABELS[payment.paymentMode]}
            </span>
            <span className="text-p3 font-noto-sans text-pneutral-700">
              {payment.referenceNo ? `Ref. ${payment.referenceNo}` : "—"}
            </span>
          </div>
        </div>

        {/* The invoice table is laid out by hand rather than through DataTable so
            it keeps the print-friendly borders and the totals rows. */}
        <div className="overflow-hidden rounded-xl border border-pneutral-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="h-14 bg-secondary-600 text-p3 font-bold text-pneutral-50 font-noto-sans">
                <th className="border border-pneutral-200 px-3">Sl. No.</th>
                <th className="border border-pneutral-200 px-3 text-left">
                  Product
                </th>
                <th className="border border-pneutral-200 px-3">Batch</th>
                <th className="border border-pneutral-200 px-3">Expiry</th>
                <th className="border border-pneutral-200 px-3">Qty</th>
                <th className="border border-pneutral-200 px-3">Free</th>
                <th className="border border-pneutral-200 px-3">MRP</th>
                <th className="border border-pneutral-200 px-3">Value</th>
                <th className="border border-pneutral-200 px-3">Disc</th>
                <th className="border border-pneutral-200 px-3">GST</th>
                <th className="border border-pneutral-200 px-3">Amount</th>
              </tr>
            </thead>

            <tbody>
              {lines.map((line, index) => (
                <tr
                  key={line.lineId}
                  className="h-14 text-label-l3 text-pneutral-900"
                >
                  <td className="border border-pneutral-200 px-3 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-pneutral-200 px-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{line.productName}</span>
                      <span className="text-p2 font-noto-sans text-pneutral-500">
                        {line.brandName ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="border border-pneutral-200 px-3 text-center">
                    {line.batchNumber}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-center">
                    {formatMonthYear(line.expiryDate)}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-center">
                    {line.quantity}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-center">
                    {line.freeQuantity || 0}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-right">
                    {formatAmount(line.mrpPerUnit)}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-right">
                    {formatAmount(lineGross(line))}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-right">
                    {formatAmount(lineDiscount(line))}
                  </td>
                  <td className="border border-pneutral-200 px-3 text-center">
                    {line.gstPercentage}%
                  </td>
                  <td className="border border-pneutral-200 px-3 text-right font-semibold">
                    {formatAmount(lineNet(line))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-6 items-start">
          <div className="flex flex-col gap-2">
            <span className="text-p2 font-noto-sans text-pneutral-500">
              Amount in Words
            </span>
            <span className="text-p3 font-semibold font-noto-sans text-pneutral-900">
              {amountInWords(totals.netAmount)}
            </span>

            {payment.remarks && (
              <>
                <span className="mt-2 text-p2 font-noto-sans text-pneutral-500">
                  Remarks
                </span>
                <span className="text-p3 font-noto-sans text-pneutral-700">
                  {payment.remarks}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between text-p3 font-noto-sans text-pneutral-700"
              >
                <span>{row.label}</span>
                <span className="font-medium text-pneutral-900">
                  ₹ {row.value}
                </span>
              </div>
            ))}

            <div className="mt-1 flex items-center justify-between rounded-lg bg-primary-100 px-3 py-3">
              <span className="text-label-l4 font-semibold text-primary-900">
                Net Amount
              </span>
              <span className="text-h6 font-semibold text-primary-800">
                ₹ {formatAmount(totals.netAmount)}
              </span>
            </div>

            {/* A part paid or credit bill carries its balance on the record. */}
            {(isCredit || isPartial) && (
              <>
                <div className="flex items-center justify-between text-p3 font-noto-sans text-pneutral-700">
                  <span>Amount Paid</span>
                  <span className="font-medium text-pneutral-900">
                    ₹ {formatAmount(payment.amountReceived)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-warning-50 px-3 py-3">
                  <span className="text-label-l4 font-semibold text-warning-600">
                    Pending Amount
                  </span>
                  <span className="text-h6 font-semibold text-warning-600">
                    ₹ {formatAmount(pending)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-pneutral-100 pt-4 text-p2 font-noto-sans text-pneutral-500">
          Goods once sold are not returnable without the original invoice.
          Computer generated invoice.
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-pneutral-100 bg-white px-6 py-3">
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onDone}
            className="w-27 h-9 rounded-lg bg-white border border-pneutral-50 shadow-[0_4px_12px_rgba(0,0,0,0.12)] text-label-l3 font-medium text-pneutral-900"
          >
            Done
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-4 flex items-center gap-2 rounded-lg border border-pneutral-300 text-label-l3 font-medium text-pneutral-700"
          >
            <Printer size={16} />
            Print
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-9 px-4 flex items-center gap-2 rounded-lg border border-secondary-600 text-label-l3 font-medium text-secondary-700 disabled:opacity-50"
          >
            <Image
              src="/Purchase/DownloadIcon.svg"
              alt=""
              width={18}
              height={14}
            />
            {isDownloading ? "Preparing..." : "Download PDF"}
          </button>

          <button
            type="button"
            onClick={onNewBill}
            className="h-9 px-5 flex items-center gap-2 rounded-lg bg-primary-800 text-label-l3 font-medium text-pneutral-50"
          >
            <Plus size={16} />
            New Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPaymentInvoice;
