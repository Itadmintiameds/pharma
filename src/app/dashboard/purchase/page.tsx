"use client";

import React, { useState } from "react";
import GoodsReceipt from "./components/GoodsReceipt";

const Page = () => {
  const [showGoodsReceipt, setShowGoodsReceipt] = useState(false);

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
        </>
      ) : (
        <GoodsReceipt />
      )}
    </>
  );
};

export default Page;