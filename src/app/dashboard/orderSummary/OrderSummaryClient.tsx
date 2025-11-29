"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import Table from "@/app/components/common/Table";
import {
  PurchaseEntryData,
  PurchaseEntryItem,
} from "@/app/types/PurchaseEntry";
import { getPurchaseById } from "@/app/services/PurchaseEntryService";
import { SupplierData } from "@/app/types/SupplierData";
import { getSupplierById } from "@/app/services/SupplierService";
import Footer from "@/app/components/common/Footer";
import { getItemById } from "@/app/services/ItemService";
import { format } from "date-fns";
import Button from "@/app/components/common/Button";
import Loader from "@/app/components/common/Loader";
import { PharmacyData } from "@/app/types/PharmacyData";
import { getUsersPharma } from "@/app/services/PharmacyService";

const OrderSummaryClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invId = searchParams.get("id");

  const [purchaseEntryData, setPurchaseEntryData] =
    useState<PurchaseEntryData | null>(null);
  const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacyData, setPharmacyData] = useState<PharmacyData[] | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const fetchSupplier = async (supplierId: string) => {
    try {
      const supplier = await getSupplierById(supplierId.trim());
      setSupplierData(supplier || null);
    } catch {
      setSupplierData(null);
    }
  };

  useEffect(() => {
    const fetchPurchaseData = async () => {
      if (!invId) return;
      try {
        setLoading(true);
        const response = await getPurchaseById(invId);
        const purchaseData = response.data || null;

        if (purchaseData?.supplierId) {
          await fetchSupplier(purchaseData.supplierId);
        }

        if (purchaseData?.stockItemDtos?.length) {
          const stockItemDtosWithNames = await Promise.all(
            purchaseData.stockItemDtos.map(async (item: PurchaseEntryItem) => {
              try {
                const itemData = await getItemById(item.itemId);

                const gstPercentage = item.gstPercentage || 0;
                const gstAmount = item.gstAmount || 0;
                return {
                  ...item,
                  itemName: itemData?.itemName || "Unknown Item",
                  cgstPercentage: gstPercentage / 2,
                  sgstPercentage: gstPercentage / 2,
                  cgstAmount: gstAmount / 2,
                  sgstAmount: gstAmount / 2,
                };
              } catch {
                const gstPercentage = item.gstPercentage || 0;
                const gstAmount = item.gstAmount || 0;
                return {
                  ...item,
                  itemName: "Failed to fetch",
                  cgstPercentage: gstPercentage / 2,
                  sgstPercentage: gstPercentage / 2,
                  cgstAmount: gstAmount / 2,
                  sgstAmount: gstAmount / 2,
                };
              }
            })
          );
          purchaseData.stockItemDtos = stockItemDtosWithNames;
        }

        setPurchaseEntryData(purchaseData);

      const pharma = await getUsersPharma();
      setPharmacyData(pharma);
      } catch {
        setError("Failed to fetch purchase data");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseData();
  }, [invId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
      </div>
    );
  }
  if (error) return <p className="text-red-500">{error}</p>;
  if (!purchaseEntryData) return <p>No data available.</p>;

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date || date === "N/A") return "N/A";
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime())
      ? "Invalid Date"
      : format(parsedDate, "dd-MM-yyyy");
  };

  const columns = [
    { header: "Item Name", accessor: "itemName" as keyof PurchaseEntryItem },
    { header: "Batch No", accessor: "batchNo" as keyof PurchaseEntryItem },
    {
      header: "Package Qty",
      accessor: "packageQuantity" as keyof PurchaseEntryItem,
    },
    {
      header: "Expiry Date",
      accessor: (row: PurchaseEntryItem) => formatDate(row.expiryDate),
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
      {/* ==== SCREEN VIEW ==== */}
      <main className="space-y-10 print:hidden">
        <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
          Order Summary
        </div>

        <div className="flex space-x-7 w-full">
          <div className="border border-gray w-full h-64 rounded-lg p-6 flex flex-col items-center justify-center text-center">
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

          <div className="border border-gray w-full h-64 rounded-lg p-6 flex">
            <div className="space-y-3">
              {[
                { label: "Invoice No.", value: purchaseEntryData.purchaseBillNo },
                {
                  label: "Invoice Date",
                  value: formatDate(purchaseEntryData.purchaseDate),
                },
                {
                  label: "Payment Due Date",
                  value: formatDate(purchaseEntryData.paymentDueDate),
                },
                { label: "GRN No", value: purchaseEntryData.grnNo },
                { label: "Order Status", value: purchaseEntryData.goodStatus },
                {
                  label: "Payment Status",
                  value: purchaseEntryData.paymentStatus,
                },
                { label: "DL No", value: pharmacyData?.[0]?.licenseNo || "N/A" },
              ].map(({ label, value }, index) => (
                <div key={index} className="flex text-sm space-x-2">
                  <div className="font-semibold">{label}</div>
                  <div>: {String(value ?? "N/A")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray w-full h-64 rounded-lg p-6">
            <div className="space-y-3">
              {[
                { label: "Supplier", value: supplierData?.supplierName },
                { label: "Contact", value: supplierData?.supplierMobile },
                { label: "GSTIN No", value: supplierData?.supplierGstinNo },
                { label: "Email", value: supplierData?.supplierEmail },
                { label: "Address", value: supplierData?.supplierAddress },
              ].map(({ label, value }, index) => (
                <div key={index} className="flex text-sm space-x-2">
                  <div className="font-semibold">{label}</div>
                  <div>: {String(value ?? "N/A")}</div>
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
              { label: "DISCOUNT", value: purchaseEntryData.totalDiscountAmount },
              {
                label: "GRAND TOTAL",
                value: purchaseEntryData.grandTotal,
                isTotal: true,
              },
            ].map(({ label, value, isTotal }, index) => (
              <div
                key={index}
                className={`flex justify-between ${isTotal
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

        <Footer />

        <div className="flex justify-end gap-4 mt-6">
          <Button
            label="Back"
            value=""
            className="w-20"
            onClick={() => router.back()}
          />
          <Button
            label="Print"
            onClick={handlePrint}
            className="w-20 bg-darkPurple text-white"
          />
        </div>
      </main>

      {/* ==== PRINT VIEW ==== */}
      <div className="hidden print:block bg-gray-100 print-section p-4 sm:p-8">
        <header className="mb-4 no-print">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-wide">Order Summary</h1>
        </header>

        <main className="bg-white border border-gray-400 printable-content">
          <section className="flex flex-row border-b border-gray-400">
            {/* Left Column: Bill Details */}
            <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 tracking-wide border-r border-gray-400">
              <p><span className="font-semibold text-gray-800">Invoice No :</span> {purchaseEntryData?.purchaseBillNo || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">Invoice Date :</span> {formatDate(purchaseEntryData?.purchaseDate)}</p>
              <p><span className="font-semibold text-gray-800">Payment Due Date :</span> {formatDate(purchaseEntryData?.paymentDueDate)}</p>
              <p><span className="font-semibold text-gray-800">GRN No :</span> {purchaseEntryData?.grnNo || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">Order Status :</span> {purchaseEntryData?.goodStatus || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">Payment Status :</span> {purchaseEntryData?.paymentStatus || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">DL No :</span>{pharmacyData?.[0]?.licenseNo || "N/A"}</p>
            </div>

            {/* Right Column: Supplier Details */}
            <div className="flex-1 p-4 text-sm text-gray-700 space-y-3 tracking-wide">
              <p><span className="font-semibold text-gray-800">Name :</span> {supplierData?.supplierName || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">Contact :</span> {supplierData?.supplierMobile || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">GSTIN No :</span> {supplierData?.supplierGstinNo || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">Email :</span> {supplierData?.supplierEmail || "N/A"}</p>
              <p><span className="font-semibold text-gray-800">Address :</span> {supplierData?.supplierAddress || "N/A"}</p>
            </div>
          </section>

          <section className="w-full p-6">
            <table className="w-full text-sm text-left text-gray-800 print-table">
              <thead>
                <tr className="font-semibold border-b border-gray-400 tracking-wide">
                  <th className="py-2 px-2">Item Name</th>
                  <th className="py-2 px-2">Batch No.</th>
                  <th className="py-2 px-2">Expiry Date</th>
                  <th className="py-2 px-2 text-right">Quantity</th>
                  <th className="py-2 px-2 text-right">Price</th>
                  <th className="py-2 px-2 text-right">Gross</th>
                  <th className="py-2 px-2 text-right">GST %</th>
                  <th className="py-2 px-2 text-right">GST</th>
                  <th className="py-2 px-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {purchaseEntryData?.stockItemDtos?.map((item, index) => {
                  const grossAmount = item.amount || 0;
                  const gstPercentage = item.gstPercentage || 0;
                  const gstAmount = item.gstAmount || 0;
                  const netAmount = grossAmount + gstAmount;

                  return (
                    <tr key={index} className="border-b border-gray-400 tracking-wide text-gray-700">
                      <td className="py-2 px-2 font-semibold text-gray-800">{item.itemName}</td>
                      <td className="py-2 px-2">{item.batchNo}</td>
                      <td className="py-2 px-2">{formatDate(item.expiryDate)}</td>
                      <td className="py-2 px-2 text-right">{item.packageQuantity}</td>
                      <td className="py-2 px-2 text-right">{item.purchasePrice?.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">{grossAmount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">{gstPercentage}</td>
                      <td className="py-2 px-2 text-right">{gstAmount.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right">{netAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={9} className="p-2 text-right tracking-wide">
                    <span className="mr-4 font-normal text-gray-500">
                      Disc: {purchaseEntryData?.totalDiscount?.toFixed(2) || "0.00"}
                    </span>
                    <span className="mr-4 font-normal text-gray-500">
                      CGST: {totalCgstAmount?.toFixed(2) || "0.00"}
                    </span>
                    <span className="mr-4 font-normal text-gray-500">
                      SGST: {totalSgstAmount?.toFixed(2) || "0.00"}
                    </span>
                    <span className="ml-4 font-bold text-gray-800">
                      TOTAL: {purchaseEntryData?.grandTotal?.toFixed(2) || "0.00"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </main>

        <div className="mt-20">
          <Footer />
        </div>
      </div>
    </>
  );
};

export default OrderSummaryClient;

