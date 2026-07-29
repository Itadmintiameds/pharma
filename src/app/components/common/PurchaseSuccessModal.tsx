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
      <div className="relative w-[460px] h-[499px] rounded-[20px] bg-white px-6 py-8 flex flex-col gap-5">
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
            alt="Close"
            width={77}
            height={77}
            className="shrink-0"
          />
        </div>
        <div className="flex flex-col gap-3 justify-center items-center">
          <div className="text-label-l5 font-semibold">
            Stock Added Successfully!
          </div>
          <div className="text-p3 font-normal text-success-900 font-noto-sans">
            Products have been added to inventory.
          </div>
        </div>

        <div className="w-full h-11 border border-pneutral-200 rounded-lg flex justify-around items-center">
          <div className="text-label-l3 font-semibold">GIRN Number</div>
          <div className="text-p3 font-medium font-noto-sans text-success-900">
            GRN-250716-001
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-full h-29.5 border border-pneutral-100 rounded-lg flex flex-col items-center justify-center">
            <div className="text-label-l4 font-medium">Total Items</div>
            <div className="text-h4 font-semibold">2</div>
          </div>

          <div className="w-full h-29.5 border border-pneutral-100 rounded-lg flex flex-col items-center justify-center">
            <div className="text-label-l4 font-medium text-center">
              Total Purchase Qty
            </div>
            <div className="text-h4 font-semibold">15</div>
          </div>

          <div className="w-full h-29.5 border border-pneutral-100 rounded-lg flex flex-col items-center justify-center">
            <div className="text-label-l4 font-medium">Total Free Qty</div>
            <div className="text-h4 font-semibold">1</div>
          </div>
        </div>

        <div className="flex justify-between">
          <button className="w-36 h-9 border-[1.5px] border-primary-800 rounded-lg text-label-l3 font-medium text-primary-800">
            Add New Product
          </button>
          <button className="w-36 h-9 rounded-lg bg-primary-800 text-label-l3 font-medium text-white">
            View Summary
          </button>
        </div>
      </div>
    </div>
  );
}
