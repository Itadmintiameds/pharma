"use client";

import React, { useState } from "react";
import GoodsReceipt from "./components/GoodsReceipt";
import PurchaseSuccessModal from "@/app/components/common/PurchaseSuccessModal";

const Page = () => {
  const [showGoodsReceipt, setShowGoodsReceipt] = useState(false);
  const [open, setOpen] = useState(true);

  return (
    <>
      {!showGoodsReceipt ? (
        <>
          <div>Purchase Page</div>

          <button
            className="border border-gray-500 px-4 py-2 rounded"
            onClick={() => setShowGoodsReceipt(true)}
          >
            Add Purchase
          </button>

          <PurchaseSuccessModal
            isOpen={open}
            onClose={() => setOpen(false)}
            onAddProduct={() => console.log("Add Product")}
            onViewSummary={() => console.log("View Summary")}
          />
        </>
      ) : (
        <GoodsReceipt />
      )}
    </>
  );
};

export default Page;
