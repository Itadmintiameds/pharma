"use client";

import { useEffect } from "react";
import Image from "next/image";
import Button from "@/app/components/common/Button";
import type { StockReturnSource } from "@/app/dashboard/wearhouseStockReturn/components/StockReturnType";
import type { ReceiptTotals } from "../stockReturnReceipt";

/** "Confirm Receipt" dialog — Figma node 3832:47276. Left only through its buttons. */
interface StockRecieptConfirmModalProps {
  isOpen: boolean;
  source: StockReturnSource;
  totals: ReceiptTotals;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const unitsLabel = (qty: number) => `${qty} ${qty === 1 ? "unit" : "units"}`;

const StockRecieptConfirmModal = ({
  isOpen,
  source,
  totals,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: StockRecieptConfirmModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  const hasDiscrepancy = totals.notReceived > 0;
  const stockLabel =
    source === "DAMAGED_INTER_STORE" ? "Warehouse Damaged/Non-Saleable Stock" : "Warehouse Stock";

  const impactPoints = [
    `${stockLabel}: ${unitsLabel(totals.received)} will be added.`,
    ...(hasDiscrepancy
      ? [`Not Received Qty (${unitsLabel(totals.notReceived)}) will be recorded as a discrepancy.`]
      : []),
    "Stock in Transit for this return will be fully reconciled and closed.",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-receipt-title"
        className="flex max-h-[95vh] w-115 max-w-full flex-col items-center gap-6 overflow-y-auto rounded-[20px] bg-base-white px-6 py-8 shadow-[0px_6px_16px_0px_#00000014,0px_3px_6px_-4px_#0000001f,0px_9px_28px_8px_#0000000d]"
      >
        <div className="flex size-19.25 shrink-0 items-center justify-center rounded-full border border-warning-600 bg-warning-100">
          <Image src="/StockReturn/WarningRedIcon.svg" alt="" width={32} height={32} />
        </div>

        <h2
          id="confirm-receipt-title"
          className="w-full text-center text-label-l5 font-semibold text-pneutral-900"
        >
          Confirm Receipt of this Stock Return?
        </h2>

        {hasDiscrepancy && (
          <div className="flex w-full items-start gap-sm rounded-lg bg-warning-50 p-sm">
            <Image
              src="/StockReturn/WarningRedSmallIcon.svg"
              alt=""
              width={24}
              height={24}
              className="shrink-0"
            />
            <p className="flex-1 text-p3 font-semibold text-warning-600">
              {unitsLabel(totals.notReceived)} {totals.notReceived === 1 ? "is" : "are"} recorded
              as Not Received. Do you want to confirm and complete this Stock Return?
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-1 rounded-lg bg-pneutral-50 p-sm text-p3 font-regular text-pneutral-600">
          {impactPoints.map((point) => (
            <p key={point}>• {point}</p>
          ))}
        </div>

        <div className="flex w-full gap-sm">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full! flex-1 border-secondary-700! px-4 font-medium! text-secondary-700!"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            loading={isSubmitting}
            className="w-full! flex-1 bg-primary-800! px-4 font-medium! text-pneutral-50!"
          >
            Yes, Confirm Receipt
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StockRecieptConfirmModal;
