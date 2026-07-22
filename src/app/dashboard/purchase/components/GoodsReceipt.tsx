"use client";

import React, { useState } from "react";
import AddProducts from "./AddProducts";

const GoodsReceipt = () => {
  const [showAddProducts, setShowAddProducts] = useState(false);

  if (showAddProducts) {
    return <AddProducts />;
  }

  return (
    <>
      <div>GoodsReceipt</div>

      <button
        className="border border-gray-500 px-4 py-2 rounded"
        onClick={() => setShowAddProducts(true)}
      >
        Next
      </button>
    </>
  );
};

export default GoodsReceipt;