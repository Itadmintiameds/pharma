"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import Button from "@/app/components/common/Button";
import { formatRupees } from "./CreateSupplierPayment";

interface SupplierPaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSupplierPayment: () => void;
  paymentNo: string;
  paymentAmount: number;
  updatedOutstanding: number;
}

/** Success Modal — Figma node 4312:53333, shown after "Confirm Payment". */
const SupplierPaymentSuccessModal = ({
  isOpen,
  onClose,
  onViewSupplierPayment,
  paymentNo,
  paymentAmount,
  updatedOutstanding,
}: SupplierPaymentSuccessModalProps) => {
  // Escape dismisses the modal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Dark Scrim Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pneutral-900/50 p-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-payment-success-title"
        className="flex max-h-full w-full max-w-120 flex-col items-center gap-md overflow-y-auto rounded-2xl bg-white p-md shadow-[0px_8px_16px_0px_rgba(0,0,0,0.25)]"
      >
        {/* Success Icon Wrapper */}
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-success-50">
          <Check size={32} strokeWidth={1.5} className="text-success-800" />
        </div>

        <p
          id="supplier-payment-success-title"
          className="w-full text-center text-label-l5 font-semibold text-pneutral-900"
        >
          Supplier Payment recorded successfully.
        </p>

        {/* Supplier Payment Number Banner */}
        <div className="flex w-full justify-center rounded-lg bg-pneutral-50 px-md py-sm">
          <p className="text-center text-label-l5 font-semibold text-primary-800">
            Supplier Payment No.: {paymentNo}
          </p>
        </div>

        <div className="flex w-full items-center gap-sm">
          <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">
            Payment Amount
          </p>
          <p className="shrink-0 whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
            {formatRupees(paymentAmount)}
          </p>
        </div>

        <div className="flex w-full items-center gap-sm">
          <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">
            Updated Current Outstanding
          </p>
          <p className="shrink-0 whitespace-nowrap text-label-l4 font-semibold text-primary-800">
            {formatRupees(updatedOutstanding)}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={onViewSupplierPayment}
          className="h-12! max-h-13 min-h-12 w-full! min-w-27 rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50!"
        >
          View Supplier Payment
        </Button>
      </div>
    </div>
  );
};

export default SupplierPaymentSuccessModal;
