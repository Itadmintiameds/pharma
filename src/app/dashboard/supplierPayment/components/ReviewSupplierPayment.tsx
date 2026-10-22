"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import Button from "@/app/components/common/Button";
import { createSupplierPayment } from "@/services/SupplierPaymentService";
import { SupplierPaymentData } from "@/types/SupplierPaymentData";
import {
  CARD_CLASS,
  DetailField,
  ImpactRow,
  SupplierPaymentDraft,
  formatDate,
  formatRupees,
} from "./CreateSupplierPayment";

interface ReviewSupplierPaymentProps {
  draft: SupplierPaymentDraft;
  /** Back to the create form, still filled in. */
  onBack: () => void;
  onCancel: () => void;
  /** Called with the payment as saved by the backend. */
  onConfirm: (saved: SupplierPaymentData) => void;
}

const ReviewSupplierPayment = ({
  draft,
  onBack,
  onCancel,
  onConfirm,
}: ReviewSupplierPaymentProps) => {
  const { invoice } = draft;
  const outstandingAfterPayment = invoice.currentOutstanding - draft.paymentAmount;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const confirmPayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // The backend numbers the payment and marks the purchase PAID.
      const saved = await createSupplierPayment({
        supplierId: invoice.supplierId,
        purchaseId: invoice.id,
        supplierPaymentDate: draft.paymentDate,
        paymentMode: draft.paymentMode,
        paymentAmount: draft.paymentAmount,
        transactionNo: draft.referenceNo || undefined,
        remarks: draft.remarks || undefined,
      });
      onConfirm(saved);
    } catch (err) {
      console.error("Failed to create the supplier payment:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create the supplier payment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-md">
      {/* Breadcrumb Row — Figma node 4312:53201; the earlier steps link back. */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-xsm"
      >
        <button
          type="button"
          onClick={onCancel}
          className="text-label-l4 font-semibold text-primary-800"
        >
          Supplier Payment
        </button>
        <span aria-hidden className="text-p3 font-regular text-pneutral-500">
          ›
        </span>
        <button
          type="button"
          onClick={onBack}
          className="text-label-l4 font-semibold text-primary-800"
        >
          Create Supplier Payment
        </button>
        <span aria-hidden className="text-p3 font-regular text-pneutral-500">
          ›
        </span>
        <span aria-current="page" className="text-p3 font-regular text-pneutral-500">
          Review Supplier Payment
        </span>
      </nav>

      {/* SP Review Header Row */}
      <p className="text-h5 font-semibold text-pneutral-900">
        Review Supplier Payment
      </p>

      {/* Purchase Invoice Details Card */}
      <div className={CARD_CLASS}>
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Purchase Invoice Details
        </p>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <DetailField label="Supplier Name" value={invoice.supplierName} />
          <DetailField label="Invoice No." value={invoice.invoiceNo} />
          <DetailField label="GRN No." value={invoice.grnNo} />
          <DetailField label="Invoice Date" value={formatDate(invoice.invoiceDateIso)} />
          <DetailField label="Payment Type" value={invoice.paymentType} />
          <DetailField
            label="Payment Due Date"
            value={formatDate(invoice.paymentDueDateIso)}
          />
        </div>
      </div>

      {/* SP Review Row */}
      <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
        {/* Payment Details Card */}
        <div className={`${CARD_CLASS} min-w-0 lg:flex-1`}>
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Payment Details
          </p>

          <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-4">
            <DetailField label="Payment Date" value={formatDate(draft.paymentDate)} />
            <DetailField label="Payment Mode" value={draft.paymentMode} />
            <DetailField
              label="Reference / Transaction No."
              value={draft.referenceNo || "—"}
            />
            <DetailField
              label="Payment Amount"
              value={formatRupees(draft.paymentAmount)}
              valueClassName="text-primary-800"
            />
          </div>

          <DetailField label="Remarks" value={draft.remarks || "—"} />
        </div>

        {/* Financial Position Card */}
        <div className={`${CARD_CLASS} lg:w-90 lg:shrink-0`}>
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Financial Position
          </p>

          <ImpactRow label="Invoice Amount" value={formatRupees(invoice.invoiceAmount)} />
          <ImpactRow
            label="Total Paid Amount"
            value={formatRupees(invoice.totalPaidAmount)}
          />
          <ImpactRow
            label="Purchase Return Adjusted"
            value={formatRupees(invoice.purchaseReturnAdjusted)}
          />
          <ImpactRow
            label="Current Outstanding"
            value={formatRupees(invoice.currentOutstanding)}
          />
          <ImpactRow
            label="Payment Amount"
            value={formatRupees(draft.paymentAmount)}
            valueClassName="text-primary-800"
          />

          <div className="h-px w-full bg-pneutral-200" />

          <div className="flex w-full items-center gap-xsm">
            <p className="min-w-0 flex-1 text-label-l4 font-semibold text-pneutral-900">
              Outstanding After Payment
            </p>
            <p className="shrink-0 text-label-l5 font-semibold text-primary-800">
              {formatRupees(outstandingAfterPayment)}
            </p>
          </div>
        </div>
      </div>

      {submitError && <p className="text-p2 text-warning-500">{submitError}</p>}

      {/* SP Review Footer Row */}
      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full! min-w-27 gap-xsm rounded-lg! border-0! bg-transparent! px-md text-label-l4! font-medium! text-primary-800! sm:w-44!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back to Edit
        </Button>

        {/* Footer Spacer */}
        <div className="hidden min-w-0 flex-1 sm:block" />

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full! min-w-27 rounded-lg! border-2! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:w-28.5!"
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={confirmPayment}
          loading={isSubmitting}
          className="w-full! min-w-27 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-54.25!"
        >
          Confirm Payment
          <Check size={20} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
};

export default ReviewSupplierPayment;
