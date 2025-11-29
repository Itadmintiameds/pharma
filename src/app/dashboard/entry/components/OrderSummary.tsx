"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Table from "@/app/components/common/Table";
import {
  PurchaseEntryData,
  PurchaseEntryItem,
} from "@/app/types/PurchaseEntry";
import { getPurchaseById } from "@/app/services/PurchaseEntryService";
import { SupplierData } from "@/app/types/SupplierData";
import { getSupplierById } from "@/app/services/SupplierService";
import Footer from "@/app/components/common/Footer";

const OrderSummary = () => {
    const searchParams = useSearchParams();
    const invId = searchParams.get("id"); // ✅ Get invId from URL
    const [purchaseEntryData, setPurchaseEntryData] =
      useState<PurchaseEntryData | null>(null);
    const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    const fetchSupplier = async (supplierId: string): Promise<void> => {
      console.log("Fetching Supplier for ID:", supplierId);
  
      try {
        const supplier = await getSupplierById(supplierId.trim());
        console.log("Supplier API Response in Frontend:", supplier);
  
        if (!supplier || !supplier.supplierName) {
          console.warn(`Supplier not found for ID: ${supplierId} in frontend`);
          setSupplierData(null);
          return;
        }
  
        setSupplierData(supplier);
      } catch (error) {
        console.error(`Error fetching supplier for ID ${supplierId}:`, error);
        setSupplierData(null);
      }
    };
  
    useEffect(() => {
      const fetchPurchaseData = async () => {
        if (!invId) return;
  
        try {
          setLoading(true);
          const response = await getPurchaseById(invId);
          console.log("Fetched Purchase Data:", response);
  
          const purchaseData = response.data || null;
          setPurchaseEntryData(purchaseData);
  
          if (purchaseData?.supplierId) {
            await fetchSupplier(purchaseData.supplierId);
          }
        } catch (err) {
          console.error("Error fetching purchase data:", err);
          setError("Failed to fetch purchase data");
        } finally {
          setLoading(false);
        }
      };
  
      fetchPurchaseData();
    }, [invId]); 
  
    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!purchaseEntryData) return <p>No data available.</p>;
  
    const columns = [
      { header: "Item Name", accessor: "itemName" as keyof PurchaseEntryItem },
      { header: "Batch No", accessor: "batchNo" as keyof PurchaseEntryItem },
      {
        header: "Package Qty",
        accessor: "packageQuantity" as keyof PurchaseEntryItem,
      },
      {
        header: "Expiry Date",
        accessor: "expiryDate" as keyof PurchaseEntryItem,
      },
      {
        header: "Purchase Price",
        accessor: "purchasePrice" as keyof PurchaseEntryItem,
      },
      { header: "MRP", accessor: "mrpSalePrice" as keyof PurchaseEntryItem },
      { header: "Amount", accessor: "amount" as keyof PurchaseEntryItem },
    ];
  
    const columns1 = [
      { header: "Taxable Amount", accessor: "amount" as keyof PurchaseEntryItem },
      { header: "CGST %", accessor: "cgstPercentage" as keyof PurchaseEntryItem },
      {
        header: "CGST Amount",
        accessor: "cgstAmount" as keyof PurchaseEntryItem,
      },
      { header: "SGST %", accessor: "sgstPercentage" as keyof PurchaseEntryItem },
      {
        header: "SGST Amount",
        accessor: "sgstAmount" as keyof PurchaseEntryItem,
      },
    ];
  
    const totalCgstAmount = purchaseEntryData?.stockItemDtos?.reduce(
      (sum, item) => sum + (item.cgstAmount ?? 0),
      0
    );
    const totalSgstAmount = purchaseEntryData?.stockItemDtos?.reduce(
      (sum, item) => sum + (item.sgstAmount ?? 0),
      0
    );
  
    return (
      <>
        <main className="space-y-10">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
            Order Summary
          </div>
  
          <div className="flex space-x-7 w-fit">
            <div className="border border-gray w-80 h-64 rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <div className="text-darkPurple text-3xl font-bold">
                {/* {String(purchaseEntryData.storeId ?? "N/A")} */}
              </div>
              <Image
                src="/PharmacyLogo.jpg"
                alt="Pharmacy Logo"
                width={200}
                height={200}
              />
            </div>
  
            <div className="border border-gray w-96 h-64 rounded-lg p-6 flex">
              <div>
                {[
                  { label: "Invoice No.", value: purchaseEntryData.purchaseBillNo },
                  {
                    label: "Invoice Date",
                    value: String(purchaseEntryData.purchaseDate ?? "N/A"),
                  },
                  {
                    label: "Payment Due Date",
                    value: String(purchaseEntryData.paymentDueDate ?? "N/A"),
                  },
                  { label: "Order Status", value: purchaseEntryData.goodStatus },
                  {
                    label: "Payment Status",
                    value: purchaseEntryData.paymentStatus,
                  },
                  { label: "DL No", value: "" },
                  { label: "GSTIN No", value: "" },
                ].map(({ label, value }, index) => (
                  <div key={index} className="flex text-sm space-y-3 space-x-2">
                    <div className="font-semibold">{label}</div>
                    <div>: {String(value ?? "N/A")}</div>
                  </div>
                ))}
              </div>
            </div>
  
            <div className="border border-gray w-md h-64 rounded-lg p-6">
              <div>
                {[
                  {
                    label: "Supplier",
                    value: supplierData?.supplierName ?? "N/A",
                  },
                  {
                    label: "Contact",
                    value: supplierData?.supplierMobile ?? "N/A",
                  },
                  {
                    label: "GSTIN No",
                    value: supplierData?.supplierGstinNo ?? "N/A",
                  },
                  { label: "Email", value: supplierData?.supplierEmail ?? "N/A" },
                  {
                    label: "Address",
                    value: supplierData?.supplierAddress ?? "N/A",
                  },
                ].map(({ label, value }, index) => (
                  <div key={index} className="flex text-sm space-y-3 space-x-2">
                    <div className="font-semibold">{label}</div>
                    <div>: {String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
  
          <Table
            data={purchaseEntryData?.stockItemDtos || []}
            columns={columns}
            noDataMessage="No items found"
          />
  
          <div className="flex">
            <div className="w-full max-w-2xl">
              <Table
                data={purchaseEntryData?.stockItemDtos || []}
                columns={columns1}
                noDataMessage="No tax details found"
              />
            </div>
  
            <div className="border h-60 w-lg border-gray rounded-xl p-6 space-y-5 ml-auto font-normal text-sm">
              {[
                { label: "SUB TOTAL", value: purchaseEntryData.totalAmount },
                { label: "TOTAL CGST", value: totalCgstAmount },
                { label: "TOTAL SGST", value: totalSgstAmount },
                { label: "DISCOUNT", value: purchaseEntryData.totalDiscount },
                {
                  label: "GRAND TOTAL",
                  value: purchaseEntryData.grandTotal,
                  isTotal: true,
                },
              ].map(({ label, value, isTotal }, index) => (
                <div
                  key={index}
                  className={`flex justify-between ${
                    isTotal
                      ? "font-semibold text-base bg-primaryPurple h-10 p-1 items-center rounded-lg"
                      : ""
                  }`}
                >
                  <div>{label}</div>
                  <div>{String(value ?? "N/A")}</div>
                </div>
              ))}
            </div>
          </div>
  
          <Footer/>
        </main>
      </>
    )
}

export default OrderSummary