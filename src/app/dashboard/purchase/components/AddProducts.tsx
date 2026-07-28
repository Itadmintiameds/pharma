"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/app/components/common/Button";
import ProductDetails from "@/app/dashboard/products/component/ProductDetails";
import PackagingDetails from "@/app/dashboard/products/component/PackagingDetails";
import BatchDetails from "@/app/dashboard/products/component/BatchDetails";
import OnboardedProductsTable from "./OnboardedProductsTable";

const PRODUCT_CATEGORIES = [
  { id: 1, label: 'Drugs', iconPath: '/ProductManagement/Drug.svg', width: 'w-[178px]' },
  { id: 2, label: 'Supplements /\nNutraceuticals', iconPath: '/ProductManagement/Suppliments.svg', width: 'w-[246px]' },
  { id: 4, label: 'Cosmetic &\nPersonal Use', iconPath: '/ProductManagement/Cosmetics.svg', width: 'w-[233px]' },
  { id: 3, label: 'Food & Infant\nNutrition', iconPath: '/ProductManagement/Food&Infant.svg', width: 'w-[242px]' },
  { id: 5, label: 'Medical\nDevices & Equipment', iconPath: '/ProductManagement/MedicalDevices.svg', width: 'w-[200px]' },
];

const AddProducts = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Product Details");
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [selectedSubCategory, setSelectedSubCategory] = useState(5); // 5: Consumable, 6: Non-Consumable
  const productDetailsRef = useRef<any>(null);

  const TABS = ["Product Details", "Packaging & Order Details", "Batch & Stock Details"];

  const handleNext = () => {
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = TABS.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1]);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/purchase"); // Or the appropriate list page
  };

  const renderActiveComponent = () => {
    const effectiveCategoryId = selectedCategory === 5 ? selectedSubCategory : selectedCategory;
    switch (activeTab) {
      case "Product Details":
        return <ProductDetails categoryId={effectiveCategoryId} ref={productDetailsRef} />;
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

      {/* Onboarded Products Table */}
      <OnboardedProductsTable />

      {/* Product Category Selection */}
      <div className="flex flex-col p-[16px] gap-[16px] w-full min-w-0 h-[194px] bg-white rounded-xl border-[0.89px] border-pneutral-200 overflow-hidden">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-[18px] text-[#1E1E1D] leading-[28px]">
            Select Product Category
          </h3>
          <p className="font-normal text-[16px] text-[#1E1E1D] leading-[24px]">
            Choose the category that best describes your product.
          </p>
        </div>
        <div className="w-full flex flex-nowrap overflow-x-auto gap-[16px] h-[90px] pb-2">
          {PRODUCT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 flex items-center gap-[4px] p-[8px] h-[74px] rounded-[20px] border cursor-pointer transition-all ${cat.width} ${
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

      {/* Medical Device Sub-Category Selection */}
      {selectedCategory === 5 && (
        <div className="flex flex-col p-[16px] gap-[16px] w-full min-w-0 h-[150px] bg-white rounded-xl border-[0.89px] border-pneutral-200 overflow-hidden">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-[18px] text-[#1E1E1D] leading-[28px]">
              Select Medical Device and Equipment Sub Category
            </h3>
          </div>
          <div className="w-full flex gap-[16px] h-[60px]">
            <div
              onClick={() => setSelectedSubCategory(5)}
              className={`flex-1 flex items-center justify-center p-[8px] rounded-[12px] border cursor-pointer transition-all ${
                selectedSubCategory === 5
                  ? "border-secondary-700 bg-secondary-50 shadow-sm"
                  : "border-[#D5D5D4] bg-white hover:border-gray-400"
              }`}
            >
              <span className="text-[14px] font-semibold text-gray-800">
                Consumable Medical Devices
              </span>
            </div>
            <div
              onClick={() => setSelectedSubCategory(6)}
              className={`flex-1 flex items-center justify-center p-[8px] rounded-[12px] border cursor-pointer transition-all ${
                selectedSubCategory === 6
                  ? "border-secondary-700 bg-secondary-50 shadow-sm"
                  : "border-[#D5D5D4] bg-white hover:border-gray-400"
              }`}
            >
              <span className="text-[14px] font-semibold text-gray-800">
                Non-Consumable Medical Devices
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Details Tabs */}
      <div className="flex items-center gap-4 w-full max-w-[600px] h-[46px] border-b border-gray-200 mt-2">
        {TABS.map((tab) => (
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
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center w-full mt-4 pt-4 border-t border-gray-100">
        <div>
          {activeTab !== "Product Details" && (
            <Button variant="outline" onClick={handleBack} className="w-[120px]">
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleCancel} className="w-[120px]">
            Cancel
          </Button>
          {activeTab === "Batch & Stock Details" ? (
            <Button variant="primary" onClick={() => {
              const productData = productDetailsRef.current?.getFormData();
              console.log("Product Data on Submit:", productData);
              // Ready for API integration!
            }} className="w-[120px]">
              Submit
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} className="w-[120px]">
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProducts;
