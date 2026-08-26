"use client";

/**
 * Shown once the bill is saved — mirrors PurchaseSuccessModal, with the bill
 * number in place of the GRN and the actions the counter needs next.
 */

import React from "react";
import Image from "next/image";
import { Printer } from "lucide-react";
import { formatAmount } from "@/utils/billingTotals";

/** lucide has no WhatsApp glyph, so the mark is inlined. */
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02h-.01c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24z" />
  </svg>
);

interface BillingSuccessModalProps {
  isOpen: boolean;
  billNo?: string;
  totalItems?: number;
  netAmount?: number;
  onSendToWhatsapp: () => void;
  /** Omitted when the user has no PRINT permission — the button is then dropped. */
  onPrint?: () => void;
  onBackToDashboard: () => void;
}

export default function BillingSuccessModal({
  isOpen,
  billNo,
  totalItems,
  netAmount,
  onSendToWhatsapp,
  onPrint,
  onBackToDashboard,
}: BillingSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      {/* No close affordance in the corner — the bill is already saved, so the
          popup is dismissed through one of the actions at the foot of it. */}
      <div className="relative w-[460px] min-h-[471px] rounded-[20px] bg-white px-6 py-8 flex flex-col gap-6">
        <div className="flex justify-center">
          <Image
            src="/Purchase/CheckIcon.svg"
            alt=""
            width={77}
            height={77}
            className="shrink-0"
          />
        </div>

        <div className="text-center text-label-l5 font-semibold">
          Invoice Generated Successfully!
        </div>

        <div className="w-full h-11 border border-pneutral-200 rounded-lg flex items-center px-4 gap-4">
          <span className="text-label-l3 font-semibold">Bill No</span>
          <span className="text-pneutral-500">:</span>
          <span className="text-p3 font-medium font-noto-sans text-success-900">
            {billNo || "N/A"}
          </span>
        </div>

        <div className="flex gap-3">
          <div className="w-full h-29.5 border border-pneutral-100 rounded-lg flex flex-col items-center justify-center gap-1">
            <div className="text-label-l4 font-medium">Total Items</div>
            <div className="text-h4 font-semibold">{totalItems || 0}</div>
          </div>

          <div className="w-full h-29.5 border border-pneutral-100 rounded-lg flex flex-col items-center justify-center gap-1">
            <div className="text-label-l4 font-medium">NET PAYABLE</div>
            <div className="text-h4 font-semibold">
              ₹ {formatAmount(netAmount || 0)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSendToWhatsapp}
            className="w-[175px] min-w-[108px] h-9 min-h-[36px] max-h-[44px] rounded-[4px] bg-success-700 hover:opacity-90 text-white text-label-l3 font-medium flex items-center justify-center gap-2 transition-opacity cursor-pointer"
          >
            <WhatsAppIcon size={16} />
            Send to Whatsapp
          </button>

          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              aria-label="Print"
              title="Print"
              className="h-9 min-h-[36px] max-h-[44px] px-3 rounded-[4px] border-[1.5px] border-primary-800 bg-white hover:bg-[#F8F5FF] text-primary-800 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <Printer size={16} />
              Print
            </button>
          )}

          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-[154px] min-w-[108px] h-9 min-h-[36px] max-h-[44px] rounded-[4px] bg-primary-800 hover:opacity-90 text-white text-label-l3 font-medium flex items-center justify-center transition-opacity cursor-pointer shadow-[-1px_1px_4px_0px_#00000040]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
