"use client";

import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/app/components/common/Button";
import ProductDetails from "@/app/dashboard/products/component/ProductDetails";
import PackagingDetails, { PackagingDetailsRef } from "@/app/dashboard/products/component/PackagingDetails";
import BatchDetails, { BatchDetailsRef } from "@/app/dashboard/products/component/BatchDetails";
import PurchaseSuccessModal from "@/app/components/common/PurchaseSuccessModal";
import InvoiceSummary from "./InvoiceSummary";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { ProductService } from "@/services/ProductService";
import { buildProductAttributes } from "@/utils/productOnboardPayload";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { usePurchaseStore } from "@/store/usePurchaseStore";
import toast from "react-hot-toast";

const PRODUCT_CATEGORIES = [
  { id: 1, label: 'Drugs', iconPath: '/ProductManagement/Drug.svg', width: 'w-[178px]' },
  { id: 2, label: 'Supplements /\nNutraceuticals', iconPath: '/ProductManagement/Suppliments.svg', width: 'w-[246px]' },
  { id: 4, label: 'Cosmetic &\nPersonal Use', iconPath: '/ProductManagement/Cosmetics.svg', width: 'w-[233px]' },
  { id: 3, label: 'Food & Infant\nNutrition', iconPath: '/ProductManagement/Food&Infant.svg', width: 'w-[242px]' },
  { id: 5, label: 'Medical\nDevices & Equipment', iconPath: '/ProductManagement/MedicalDevices.svg', width: 'w-[200px]' },
];

interface AddProductsProps {
  onClose?: () => void;
}

const AddProducts: React.FC<AddProductsProps> = ({ onClose }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Product Details");
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [selectedSubCategory, setSelectedSubCategory] = useState(5); // 5: Consumable, 6: Non-Consumable
  const [viewState, setViewState] = useState<'search' | 'add' | 'summary'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const productDetailsRef = useRef<any>(null);
  const packagingDetailsRef = useRef<PackagingDetailsRef>(null);
  const batchDetailsRef = useRef<BatchDetailsRef>(null);

  const { selectedPharmacy } = usePharmacyStore();
  const store = usePurchaseStore();

  const tableColumns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: 'id', header: '#', cell: (info) => info.row.index + 1 },
    { accessorKey: 'productName', header: 'Product Name', cell: (info) => <span className="font-bold text-pneutral-900">{info.getValue() || info.row.original.productId}</span> },
    { accessorKey: 'brandName', header: 'Brand', cell: (info) => info.getValue() || '-' },
    { accessorKey: 'batchNumber', header: 'Batch No.', cell: (info) => info.getValue() || info.row.original.batchId },
    { accessorKey: 'expiryDate', header: 'Expiry', cell: (info) => info.getValue() || '-' },
    { accessorKey: 'purchaseQuantity', header: 'Qty', cell: (info) => info.getValue() },
    { accessorKey: 'freeQty', header: 'Free Qty', cell: (info) => Number(info.getValue() || 0) },
    { accessorKey: 'mrp', header: 'MRP', cell: (info) => Number(info.getValue() || 0).toFixed(2) },
    { accessorKey: 'grossAmount', header: 'Gross Amt', cell: (info) => Number(info.getValue() || 0).toFixed(2) },
    { accessorKey: 'gst', header: 'GST', cell: (info) => Number(info.getValue() || 0).toFixed(2) },
    { accessorKey: 'netAmount', header: 'Net Amount', cell: (info) => <span className="font-semibold text-secondary-700">₹{Number(info.getValue() || 0).toFixed(2)}</span> },
  ], []);

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
    setViewState('search'); // Go back to search view instead of list page
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setHasSearched(true);
      // Actual API call would happen here
    } else {
      setHasSearched(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!selectedPharmacy?.pharmacyId) {
        toast.error("Pharmacy ID is required");
        return;
      }

      setIsSubmitting(true);
      const productData = productDetailsRef.current?.getFormData();
      const packagingData = packagingDetailsRef.current?.getFormData();
      const batchData = batchDetailsRef.current?.getFormData();

      console.log("Collected Form Data:", { productData, packagingData, batchData });

      // Medical Devices (5) splits into Consumable (5) / Non-Consumable (6)
      const productCategoryId =
        selectedCategory === 5 ? selectedSubCategory : selectedCategory;

      // Construct Payload for /product/onboard
      const payload = {
        pharmacyId: selectedPharmacy.pharmacyId,
        productCategoryId,
        productName: productData?.productName || "",
        brandName: productData?.brandName || "",
        gstPercentage: Number(productData?.gst || 0),
        hsnNo: productData?.hsnCode || "",
        packagingDetails: [
          {
            purchaseUnit: packagingData?.purchaseUnit || "",
            purchaseUnitContains: Number(packagingData?.eachStripContains || 0),
            smallestUnit: packagingData?.smallestUnit || ""
          }
        ],
        batchDetails: [
          {
            batchNumber: batchData?.batchNumber || "",
            manufacturingDate: batchData?.manufacturingDate || "",
            expiryDate: batchData?.expiryDate || "",
            purchaseUnit: batchData?.purchaseUnit || "",
            purchasePrice: Number(batchData?.purchasePricePerBox || 0),
            mrp: Number(batchData?.mrpPerBox || 0),
            sellingPrice: Number(batchData?.sellingPricePerBox || 0),
            purchasePricePerUnit: Number(batchData?.purchasePricePerSmallestUnit || 0),
            mrpPerUnit: Number(batchData?.mrpPerSmallestUnit || 0),
            sellingPricePerUnit: Number(batchData?.sellingPricePerSmallestUnit || 0),
            rackLocation: batchData?.rackLocation || "",
            freeQuantity: Number(batchData?.freeQuantity || 0),
            freeUnit: batchData?.freeUnit || "",
            stockQuantity: Number(batchData?.purchaseQuantity || 0)
          }
        ],
        // Category specific attributes (productAttributeDrugs, ...Cosmetics, etc.)
        ...buildProductAttributes(productCategoryId, productData)
      };

      const response = await ProductService.onboardProduct(payload);
      
      const productId = response?.data?.productId || "";
      const batchId = response?.data?.batchDetails?.[0]?.batchId || "";
      const packagingId = response?.data?.packagingDetails?.[0]?.packagingId || "";

      if (!productId || !batchId) {
        console.warn("Warning: Missing productId or batchId from onboard response:", response?.data);
      }

      // Add to Purchase Store
      const purchaseQty = Number(batchData?.purchaseQuantity || 0);
      const purchasePrice = Number(batchData?.purchasePricePerSmallestUnit || batchData?.purchasePricePerBox || 0);
      const gstPercentage = Number(productData?.gst || 0);
      
      const grossAmount = purchaseQty * purchasePrice;
      const gst = (grossAmount * gstPercentage) / 100;
      const netAmount = grossAmount + gst;

      const containsVal = packagingData?.eachStripContains || "1";
      const unitVal = packagingData?.smallestUnit || "";
      const variant = `1x${containsVal} ${unitVal}`.trim();

      store.addPurchaseDetail({
        productId,
        productName: productData?.productName || "Unnamed Product",
        brandName: productData?.brandName || "",
        batchId,
        batchNumber: batchData?.batchNumber || "",
        packagingId,
        expiryDate: batchData?.expiryDate || "",
        hsnCode: productData?.hsnCode || "",
        variant,
        mrp: Number(batchData?.mrpPerSmallestUnit || batchData?.mrpPerBox || batchData?.mrp || 0),
        freeQty: String(batchData?.freeQuantity || 0),
        freeQtyUnit: !isNaN(Number(batchData?.freeUnit)) ? Number(batchData?.freeUnit) : 1,
        purchaseQuantity: purchaseQty,
        grossAmount,
        gst,
        netAmount
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error("Failed to onboard product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurchaseSubmit = async (discount: number = 0): Promise<boolean> => {
    try {
      const storeState = usePurchaseStore.getState();
      
      let formattedInvoiceDate = storeState.invoiceDate;
      if (formattedInvoiceDate && !formattedInvoiceDate.includes('T')) {
        formattedInvoiceDate = `${formattedInvoiceDate}T00:00:00`;
      }

      const totalGross = storeState.purchaseDetails.reduce((sum, item) => sum + item.grossAmount, 0);
      const totalGst = storeState.purchaseDetails.reduce((sum, item) => sum + item.gst, 0);
      const totalNet = (totalGross - discount) + totalGst;
      
      if (storeState.purchaseDetails.some(item => !item.batchId || !item.productId)) {
        toast.error("Error: An item is missing its Batch ID or Product ID! Please refresh and re-add the product.");
        return false;
      }

      const payload = {
        pharmacyId: selectedPharmacy?.pharmacyId || "",
        supplierId: storeState.supplierId,
        supplierName: storeState.supplierName || "Default Supplier",
        grnNo: storeState.grnNo,
        invoiceNo: storeState.invoiceNo,
        invoiceDate: formattedInvoiceDate,
        paymentType: storeState.paymentType,
        creditDays: storeState.creditDays,
        supplierPaymentStatus: "PENDING",
        totalGrossAmount: totalGross,
        totalDiscount: discount,
        totalGst: totalGst,
        totalNetAmount: totalNet,
        purchaseDetails: storeState.purchaseDetails.map(item => ({
          productId: item.productId,
          productName: item.productName || item.productId,
          batchId: item.batchId,
          batchNumber: item.batchNumber || item.batchId,
          packagingId: item.packagingId || null,
          freeQuantity: Number(item.freeQty || 0),
          freeUnit: Number(item.freeQtyUnit || 1),
          purchaseQuantity: Number(item.purchaseQuantity || 0),
          grossAmount: item.grossAmount,
          gst: item.gst,
          netAmount: item.netAmount
        }))
      };

      await import('@/services/PurchaseService').then(m => m.PurchaseService.createPurchase(payload));
      toast.success("Purchase created successfully!");
      return true;
    } catch (error: any) {
      const respData = error?.response?.data;
      console.error("Error creating purchase (backend error):", respData || error);
      const errMsg = respData?.message || (typeof respData === 'string' ? respData : "Failed to save tax invoice");
      toast.error(String(errMsg || "Failed to save tax invoice"));
      return false;
    }
  };
  
  const handleGoToPurchase = () => {
    usePurchaseStore.getState().resetPurchase();
    if (onClose) {
      onClose();
    } else {
      window.location.href = "/dashboard/purchase";
    }
  };



  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-1 w-full mb-1">
        <h2 className="font-semibold text-[24px] text-pneutral-900 leading-[32px]">
          {viewState === 'search' ? "Search Products" : viewState === 'add' ? "Add Items to Invoice" : ""}
        </h2>
      </div>

      {viewState !== 'summary' && store.purchaseDetails.length > 0 && (
        <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-xl border border-pneutral-200 shadow-sm mb-3">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-pneutral-900">Onboarded Items ({store.invoiceNo || store.grnNo})</h3>
              <p className="text-xs text-pneutral-600">Total Items: {store.purchaseDetails.length} | Net Payable: ₹{store.totalNetAmount.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setViewState('summary')}
              className="px-4 py-2 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              View Summary & Save Invoice
            </button>
          </div>
          <DataTable columns={tableColumns} data={store.purchaseDetails} />
        </div>
      )}

      {viewState === 'summary' ? (
        <InvoiceSummary 
          onCancel={() => setViewState('search')} 
          onSubmit={handlePurchaseSubmit}
          onSuccessGoToPurchase={handleGoToPurchase} 
        />
      ) : viewState === 'search' ? (
        <>
          <div className="flex w-full items-center gap-4 relative">
            {/* Search Bar Container */}
            <div className="relative flex-1">
              <div className="flex items-center w-full h-[56px] bg-[#FFFFFF] rounded-lg border-[2.5px] border-[#E1E1E1] px-4 gap-4 shadow-sm focus-within:border-primary-500">
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
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                      setShowDropdown(false);
                    }
                  }}
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

              {/* Search Dropdown */}
              {showDropdown && (
                <div className="absolute top-[60px] left-0 w-full bg-white rounded-lg border border-pneutral-200 shadow-[0px_4px_12px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col">
                  {/* Header Row */}
                  <div className="flex w-full bg-[#EAEAE9] text-[14px] font-semibold text-pneutral-900 h-[72px]">
                    <div className="flex-1 border-r border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">Product Name</div>
                    <div className="flex-1 border-r border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">Varient</div>
                    <div className="flex-1 border-r border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">Stock(Units)</div>
                    <div className="flex-1 border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">Action</div>
                  </div>
                  {/* Data Row (Dummy Data) */}
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex w-full bg-white text-[14px] font-normal text-pneutral-900 h-[68px] hover:bg-gray-50">
                      <div className="flex-1 border-r border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">Paracetamol 500mg</div>
                      <div className="flex-1 border-r border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">Strip of 10 Tablets</div>
                      <div className="flex-1 border-r border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">150</div>
                      <div className="flex-1 border-b border-pneutral-200 p-[16px_8px] flex items-center justify-center">
                        <button
                          onClick={() => {
                            console.log("Add stock clicked for product", item);
                            setShowDropdown(false);
                            // Call the component here later
                          }}
                          className="flex items-center justify-center bg-[#7D32FC] hover:bg-[#6823df] text-white rounded-[4px] px-[16px] h-[36px] min-w-[108px] w-[119px] max-h-[44px] transition-all duration-300 ease-out text-[14px] font-medium"
                        >
                          Add stock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setViewState('add')}
              className="flex items-center justify-center gap-2 bg-[#9851f5] hover:bg-[#8645d9] text-white rounded-[8px] px-[16px] h-[48px] min-w-[108px] w-[141px] max-h-[52px] transition-all duration-300 ease-out text-[16px] font-medium leading-[20px] shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Item
            </button>
          </div>

          {/* Search Results Placeholder */}
          <div className="flex flex-col items-center justify-center h-[300px] w-full rounded-xl border border-dashed border-pneutral-300 bg-white mt-4">
            <div className="flex flex-col items-center gap-2 text-pneutral-500">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
              <p className="text-[16px] font-medium text-pneutral-900">Search for a product</p>
              <p className="text-[14px]">Or click '+ Add Item' to create a new one</p>
            </div>
          </div>
        </>
      ) : (
        <>
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

          {/* Render all tabs but hide inactive ones to preserve refs and state */}
          <div className={activeTab === "Product Details" ? "block w-full" : "hidden"}>
            <ProductDetails categoryId={selectedCategory === 5 ? selectedSubCategory : selectedCategory} ref={productDetailsRef} />
          </div>
          <div className={activeTab === "Packaging & Order Details" ? "block w-full" : "hidden"}>
            <PackagingDetails ref={packagingDetailsRef} />
          </div>
          <div className={activeTab === "Batch & Stock Details" ? "block w-full" : "hidden"}>
            <BatchDetails ref={batchDetailsRef} />
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between items-center w-full mt-4 pt-4 border-t border-gray-100 pb-8">
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
                <Button 
                  variant="primary" 
                  onClick={handleSubmit} 
                  className="w-[120px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              ) : (
                <Button variant="primary" onClick={handleNext} className="w-[120px]">
                  Next
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      <PurchaseSuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onAddProduct={() => {
          setShowSuccessModal(false);
          setViewState('search');
        }}
        onViewSummary={() => {
          setShowSuccessModal(false);
          setViewState('summary');
        }}
        grnNo={usePurchaseStore.getState().grnNo}
        totalItems={usePurchaseStore.getState().purchaseDetails.length}
        totalPurchaseQty={usePurchaseStore.getState().purchaseDetails.reduce((sum, item) => sum + item.purchaseQuantity, 0)}
        totalFreeQty={usePurchaseStore.getState().purchaseDetails.reduce((sum, item) => sum + Number(item.freeQty || 0), 0)}
      />
    </div>
  );
};

export default AddProducts;
