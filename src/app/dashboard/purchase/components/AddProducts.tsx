"use client";

import React, { useState } from "react";
import Image from "next/image";
import ProductDetails from "@/app/dashboard/products/component/ProductDetails";
import PackagingDetails from "@/app/dashboard/products/component/PackagingDetails";
import BatchDetails from "@/app/dashboard/products/component/BatchDetails";

const PRODUCT_CATEGORIES = [
  { id: 'drugs', label: 'Drugs', iconPath: '/ProductManagement/Drug.svg', width: 'w-[178px]' },
  { id: 'supplements', label: 'Supplements /\nNutraceuticals', iconPath: '/ProductManagement/Suppliments.svg', width: 'w-[246px]' },
  { id: 'cosmetic', label: 'Cosmetic &\nPersonal Use', iconPath: '/ProductManagement/Cosmetics.svg', width: 'w-[233px]' },
  { id: 'food', label: 'Food & Infant\nNutrition', iconPath: '/ProductManagement/Food&Infant.svg', width: 'w-[242px]' },
  { id: 'medical', label: 'Medical\nDevices & Equipment', iconPath: '/ProductManagement/MedicalDevices.svg', width: 'w-[296px]' },
];

const AddProducts = () => {
  const [activeTab, setActiveTab] = useState("Product Details");
  const [selectedCategory, setSelectedCategory] = useState("drugs");

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "Product Details":
        return <ProductDetails />;
      case "Packaging & Order Details":
        return <PackagingDetails />;
      case "Batch & Stock Details":
        return <BatchDetails />;
      default:
        return <ProductDetails />;
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-1 w-full">
        <h2 className="font-semibold text-[24px] text-pneutral-900 leading-[32px]">
          Add Items to Invoice
        </h2>
      </div>

      {/* Search Bar */}
      <div className="flex items-center w-full h-[56px] bg-[#FFFFFF] rounded-lg border-[2.5px] border-[#E1E1E1] px-4 gap-4 shadow-sm">
        <Image
          src="/BusinessSetup/SearchIcon.svg"
          alt="Search"
          width={24}
          height={24}
          className="shrink-0"
        />
        <input
          type="text"
          placeholder="Search product by name, generic, code..."
          className="flex-1 bg-transparent outline-none text-pneutral-900 text-[14px]"
        />
        <Image
          src="/ProductManagement/ScanIcon.svg"
          alt="Scan"
          width={24}
          height={24}
          className="shrink-0 cursor-pointer"
        />
      </div>

      {/* Product Category Selection */}
      <div className="flex flex-col p-[16px] gap-[16px] w-full h-[268px] bg-white rounded-xl border-[0.89px] border-pneutral-200">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-[18px] text-[#1E1E1D] leading-[28px]">
            Select Product Category
          </h3>
          <p className="font-normal text-[16px] text-[#1E1E1D] leading-[24px]">
            Choose the category that best describes your product.
          </p>
        </div>
        <div className="w-full flex flex-wrap gap-[16px] h-[164px]">
          {PRODUCT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-[4px] p-[8px] h-[74px] rounded-[20px] border cursor-pointer transition-all ${cat.width} ${
                  isSelected
                    ? "border-secondary-700 bg-secondary-50 shadow-[0px_4px_6px_-2px_#00000008,0px_12px_16px_-4px_#00000014]"
                    : "border-[#D5D5D4] bg-white hover:border-gray-400"
                }`}
              >
                <Image src={cat.iconPath} alt={cat.label} width={58} height={58} className="shrink-0 object-contain" />
                <span className="text-[14px] font-semibold text-gray-800 whitespace-pre-line leading-tight">
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Tabs */}
      <div className="flex items-center gap-4 w-full max-w-[600px] h-[46px] border-b border-gray-200 mt-2">
        {["Product Details", "Packaging & Order Details", "Batch & Stock Details"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-full px-1 text-[14px] font-medium transition-colors relative ${
              activeTab === tab
                ? "text-secondary-700 font-semibold"
                : "text-pneutral-500 hover:text-pneutral-700"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary-700 rounded-t-md"></span>
            )}
          </button>
        ))}
      </div>

{renderActiveComponent()}
      {/* Render Active Component 
      <div className="w-full mt-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        
      </div>*/}
    </div>
  );
};

export default AddProducts;
