"use client";

import React, { useState } from "react";
import Image from "next/image";

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: () => void;
  onViewSummary: () => void;
}

export default function PurchaseSuccessModal({
  isOpen,
  onClose,
  onAddProduct,
  onViewSummary,
}: PurchaseSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="relative w-[460px] h-[499px] rounded-[20px] bg-white px-6 py-8 flex flex-col gap-6">
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

        
      </div>
    </div>
  );
}
