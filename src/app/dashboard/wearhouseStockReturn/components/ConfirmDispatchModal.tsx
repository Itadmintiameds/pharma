"use client";

import { useEffect } from "react";
import Image from "next/image";
import Button from "@/app/components/common/Button";

/**
 * The "Confirm dispatch" dialog — Figma nodes 3749:36656 (pharmacy inventory)
 * and 3772:40064 (damaged inter-store stock). Both share this layout; the
 * caller supplies the wording for its scenario.
 */
export interface ConfirmDispatchContent {
  title: string;
  description: string;
  /** The bullet lines in the grey impact box. */
  impactPoints: string[];
  confirmLabel?: string;
}

interface ConfirmDispatchModalProps extends ConfirmDispatchContent {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const ConfirmDispatchModal = ({
  isOpen,
  title,
  description,
  impactPoints,
  confirmLabel = "Yes, Dispatch Stock",
  onCancel,
  onConfirm,
  isSubmitting = false,
}: ConfirmDispatchModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dispatch-title"
        className="relative flex max-h-[95vh] w-115 max-w-full flex-col items-center gap-6 overflow-y-auto rounded-[20px] bg-base-white px-6 py-8 shadow-[0px_6px_16px_0px_#00000014,0px_3px_6px_-4px_#0000001f,0px_9px_28px_8px_#0000000d]"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          disabled={isSubmitting}
          className="absolute top-2.5 right-2.5 disabled:cursor-not-allowed"
        >
          <Image src="/StockReturn/CloseIcon.svg" alt="" width={24} height={24} />
        </button>

        <div className="flex size-19.25 shrink-0 items-center justify-center rounded-full border border-secondary-700 bg-secondary-50">
          <Image src="/StockReturn/TruckIcon.svg" alt="" width={32} height={32} />
        </div>

        <h2
          id="confirm-dispatch-title"
          className="w-full text-label-l5 font-semibold text-pneutral-900"
        >
          {title}
        </h2>

        <p className="w-full text-p3 font-regular text-pneutral-700">{description}</p>

        {impactPoints.length > 0 && (
          <div className="flex w-full flex-col gap-1 rounded-lg bg-sneutral-50 p-sm text-p3 font-regular text-pneutral-700">
            {impactPoints.map((point) => (
              <p key={point}>• {point}</p>
            ))}
          </div>
        )}

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
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDispatchModal;
