"use client";

import { useEffect } from "react";
import { Check, CircleX } from "lucide-react";
import Button from "@/app/components/common/Button";

interface ConfirmSalesReturnProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToList: () => void;
  onViewSalesReturn: () => void;
  returnNo: string;
  billNo: string;
  returnAmount: string;
  outstandingAdjustment: string;
  refundAmount: string;
  status: string;
}

/** Label on the left, bold value on the right — one line of the summary. */
const SummaryRow = ({
  label,
  value,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex w-full items-center gap-sm">
    <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-700">
      {label}
    </p>
    <p
      className={`shrink-0 whitespace-nowrap text-label-l4 font-semibold ${valueClassName}`}
    >
      {value}
    </p>
  </div>
);

/** Success Modal — Figma node 4023:55055, shown after "Confirm Sales Return". */
const ConfirmSalesReturn = ({
  isOpen,
  onClose,
  onBackToList,
  onViewSalesReturn,
  returnNo,
  billNo,
  returnAmount,
  outstandingAdjustment,
  refundAmount,
  status,
}: ConfirmSalesReturnProps) => {
  // Escape closes the modal, like the close icon
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
        aria-labelledby="sales-return-success-title"
        className="flex max-h-full w-full max-w-130 flex-col gap-md overflow-y-auto rounded-2xl bg-white px-md pt-md pb-7 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.25)]"
      >
        {/* Close Row */}
        <div className="flex w-full justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-pneutral-500"
          >
            <CircleX size={16} />
          </button>
        </div>

        {/* Success Header Col */}
        <div className="flex w-full flex-col items-center gap-sm">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success-50">
            {/* check-circle/solid */}
            <span className="flex size-7 items-center justify-center rounded-full bg-success-600">
              <Check size={16} strokeWidth={3} className="text-white" />
            </span>
          </div>
          <p
            id="sales-return-success-title"
            className="text-center text-label-l5 font-semibold text-pneutral-900"
          >
            Sales Return Completed Successfully
          </p>
        </div>

        {/* Return Number Banner */}
        <div className="flex w-full justify-center rounded-lg bg-secondary-50 px-md py-sm">
          <p className="text-label-l4 font-semibold text-primary-800">
            {returnNo}
          </p>
        </div>

        <div className="flex w-full flex-col gap-md">
          <SummaryRow label="Original Bill No." value={billNo} />
          <SummaryRow label="Return Amount" value={returnAmount} />
          <SummaryRow
            label="Outstanding Adjustment"
            value={outstandingAdjustment}
          />
          <SummaryRow
            label="Refund Amount"
            value={refundAmount}
            valueClassName="text-primary-800"
          />
          <SummaryRow
            label="Status"
            value={status}
            valueClassName="text-success-600"
          />
        </div>

        <div className="flex w-full flex-col gap-sm sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToList}
            className="h-12! max-h-13 min-h-12 w-full! min-w-27 rounded-lg! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:w-60! sm:shrink-0"
          >
            Back to Sales Return List
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onViewSalesReturn}
            className="h-12! max-h-13 min-h-12 w-full! min-w-27 rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:flex-1"
          >
            View Sales Return
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSalesReturn;
