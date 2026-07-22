"use client";

import React from "react";
import ProductDetails from "@/app/dashboard/products/component/ProductDetails";
import PackagingDetails from "@/app/dashboard/products/component/PackagingDetails";
import BatchDetails from "@/app/dashboard/products/component/BatchDetails";

const AddProducts = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Product Details */}
      <ProductDetails />

      {/* Packaging Details */}
      <PackagingDetails />

      {/* Batch Details */}
      <BatchDetails />
    </div>
  );
};

export default AddProducts;