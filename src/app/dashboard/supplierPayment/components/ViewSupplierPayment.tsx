"use client";

import { ArrowLeft } from "lucide-react";
import Button from "@/app/components/common/Button";
import {
  CARD_CLASS,
  DetailField,
  EligibleInvoice,
  ImpactRow,
  formatDate,
  formatRupees,
} from "./CreateSupplierPayment";

/** Everything the view shows about one recorded supplier payment. */
export interface SupplierPaymentRecord {
  paymentNo: string;
  /** yyyy-mm-dd */
  paymentDateIso: string;
  paymentAmount: number;
  paymentMode: string;
  referenceNo: string;
  remarks: string;
  /** The invoice as it stood just before this payment. */
  invoice: EligibleInvoice;
  recordedBy: string;
  /** "28-10-2026 10:35 AM" */
  recordedAt: string;
}

/** A label/amount row in semibold — the "Outstanding …" totals. */
const TotalRow = ({
  label,
  value,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex w-full items-center gap-xsm">
    <p className="min-w-0 flex-1 text-label-l4 font-semibold text-pneutral-900">
      {label}
    </p>
    <p className={`shrink-0 text-label-l5 font-semibold ${valueClassName}`}>{value}</p>
  </div>
);

interface ViewSupplierPaymentProps {
  payment: SupplierPaymentRecord;
  onBack: () => void;
}

const ViewSupplierPayment = ({ payment, onBack }: ViewSupplierPaymentProps) => {
  const { invoice } = payment;
  const outstandingAfterPayment = invoice.currentOutstanding - payment.paymentAmount;

  return (
    <div className="flex flex-col gap-md">
      {/* SP View Header Row */}
      <p className="text-h5 font-semibold text-pneutral-900">View Supplier Payment</p>

      {/* Supplier Payment Details Card */}
      <div className={CARD_CLASS}>
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Supplier Payment Details
        </p>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <DetailField
            label="Supplier Payment No."
            value={payment.paymentNo}
            valueClassName="text-primary-800"
          />
          <DetailField label="Payment Date" value={formatDate(payment.paymentDateIso)} />
          <DetailField label="Payment Amount" value={formatRupees(payment.paymentAmount)} />
          <DetailField label="Payment Mode" value={payment.paymentMode} />
          <DetailField
            label="Reference / Transaction No."
            value={payment.referenceNo || "—"}
          />
        </div>

        <DetailField label="Remarks" value={payment.remarks || "—"} />
      </div>

      {/* Related Purchase Invoice Card */}
      <div className={CARD_CLASS}>
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Related Purchase Invoice
        </p>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Supplier Name" value={invoice.supplierName} />
          <DetailField label="Invoice No." value={invoice.invoiceNo} />
          <DetailField label="GRN No." value={invoice.grnNo} />
          <DetailField label="Invoice Date" value={formatDate(invoice.invoiceDateIso)} />
          <DetailField label="Payment Type" value={invoice.paymentType} />
          <DetailField
            label="Payment Due Date"
            value={formatDate(invoice.paymentDueDateIso)}
          />
          <DetailField label="Invoice Amount" value={formatRupees(invoice.invoiceAmount)} />
        </div>
      </div>

      {/* SP View Financial Row */}
      <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
        {/* Financial Position Card */}
        <div className={`${CARD_CLASS} min-w-0 lg:flex-1`}>
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Financial Position
          </p>

          <ImpactRow label="Invoice Amount" value={formatRupees(invoice.invoiceAmount)} />
          <ImpactRow
            label="Total Paid Amount Before Payment"
            value={formatRupees(invoice.totalPaidAmount)}
          />
          <ImpactRow
            label="Purchase Return Adjusted"
            value={formatRupees(invoice.purchaseReturnAdjusted)}
          />
          <TotalRow
            label="Outstanding Before Payment"
            value={formatRupees(invoice.currentOutstanding)}
          />

          <div className="h-px w-full bg-pneutral-200" />

          <ImpactRow
            label="Payment Amount"
            value={formatRupees(payment.paymentAmount)}
            valueClassName="text-primary-800"
          />
          <TotalRow
            label="Outstanding After Payment"
            value={formatRupees(outstandingAfterPayment)}
            valueClassName="text-primary-800"
          />
        </div>

        {/* Recording Information Card */}
        <div className={`${CARD_CLASS} lg:w-90 lg:shrink-0`}>
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Recording Information
          </p>

          <div className="flex w-full flex-col gap-md">
            <DetailField label="Recorded By" value={payment.recordedBy || "—"} />
            <DetailField label="Recorded On" value={payment.recordedAt || "—"} />
          </div>
        </div>
      </div>

      {/* SP View Footer Row */}
      <div className="flex w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full! min-w-27 gap-xsm rounded-lg! border-2! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:w-79.5!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back to Supplier Payment List
        </Button>
      </div>
    </div>
  );
};

export default ViewSupplierPayment;
