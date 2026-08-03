"use client";

import React from "react";
import Image from "next/image";

interface ConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTaxInvoice: () => void;
  onGoToPurchase: () => void;
  invoiceNo?: string;
  /** Backend-generated GRN; the line is omitted when absent. */
  grnNo?: string;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
  isOpen,
  onClose,
  onViewTaxInvoice,
  onGoToPurchase,
  invoiceNo = "201233",
  grnNo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="relative w-[460px] min-h-[281px] rounded-[20px] bg-white px-6 py-8 flex flex-col gap-6">
        <div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center"
          >
            <Image
              src="/Purchase/CloseIcon.svg"
              alt="Close"
              width={20}
              height={20}
              className="shrink-0"
            />
          </button>
        </div>

        <div className="flex justify-center">
          <Image
            src="/Purchase/CheckIcon.svg"
            alt="Success"
            width={77}
            height={77}
            className="shrink-0"
          />
        </div>
        
        <div className="flex flex-col gap-3 justify-center items-center">
          <div className="w-[393px] text-center p-2 text-pneutral-900">
            <span className="font-semibold text-[20px] leading-[32px]">
              Your Tax Invoice no. {invoiceNo} is Saved Successfully.
            </span>
            {grnNo && (
              <span className="block text-p3 font-medium font-noto-sans text-success-900">
                GRN No. {grnNo}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between w-[412px] mx-auto mt-auto">
          <button 
            onClick={onViewTaxInvoice}
            className="w-36 h-9 border-[1.5px] border-primary-800 rounded-lg text-label-l3 font-medium text-primary-800 hover:bg-primary-50 transition-colors"
          >
            View Tax Invoice
          </button>
          <button 
            onClick={onGoToPurchase}
            className="w-36 h-9 rounded-lg bg-primary-800 text-label-l3 font-medium text-white hover:bg-primary-900 transition-colors"
          >
            Go to Purchase
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;
