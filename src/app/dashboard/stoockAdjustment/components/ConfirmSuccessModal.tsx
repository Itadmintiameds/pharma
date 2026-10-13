"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import Button from "@/app/components/common/Button";

interface ConfirmSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToList: () => void;
  onViewStockAdjustment: () => void;
  adjustmentNo: string;
  /** "01-Oct-2026, 03:15 PM" */
  adjustedAt: string;
  status: string;
}

/** Success Modal — Figma node 4191:44161, shown after "Confirm Adjustment". */
const ConfirmSuccessModal = ({
  isOpen,
  onClose,
  onBackToList,
  onViewStockAdjustment,
  adjustmentNo,
  adjustedAt,
  status,
}: ConfirmSuccessModalProps) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-adjustment-success-title"
        className="flex max-h-full w-full max-w-136.5 flex-col items-center gap-md overflow-y-auto rounded-2xl bg-white px-xlg py-hg shadow-[0px_8px_16px_0px_rgba(0,0,0,0.25)]"
      >
        {/* Success Icon Wrapper */}
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-success-50">
          <Check size={32} strokeWidth={1.5} className="text-success-800" />
        </div>

        <p
          id="stock-adjustment-success-title"
          className="w-full text-center text-label-l5 font-semibold text-pneutral-900"
        >
          Stock Adjustment completed successfully.
        </p>

        {/* Adjustment Number Banner */}
        <div className="flex w-full justify-center rounded-lg bg-pneutral-50 px-md py-sm">
          <p className="text-center text-label-l5 font-semibold text-primary-800">
            Stock Adjustment No.: {adjustmentNo}
          </p>
        </div>

        <div className="flex w-full items-center gap-sm">
          <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">
            Adjustment Date &amp; Time
          </p>
          <p className="shrink-0 whitespace-nowrap text-label-l4 font-semibold text-pneutral-900">
            {adjustedAt}
          </p>
        </div>

        <div className="flex w-full items-center gap-sm">
          <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">Status</p>
          {/* Figma "Badge" — green, small */}
          <span className="shrink-0 rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-center text-label-l3 font-medium text-success-800">
            {status}
          </span>
        </div>

        <div className="flex w-full flex-col gap-sm sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToList}
            className="h-12! max-h-13 min-h-12 w-full! min-w-27 rounded-lg! border-2! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:flex-1"
          >
            Back to Stock Adjustment
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onViewStockAdjustment}
            className="h-12! max-h-13 min-h-12 w-full! min-w-27 rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:flex-1"
          >
            View Stock Adjustment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSuccessModal;
