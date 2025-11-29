"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Table from "@/app/components/common/Table";
import { PurchaseReturnData } from "@/app/types/PurchaseReturnData";
import { getPurchaseReturnById } from "@/app/services/PurchaseReturnService";
import { getSupplierById } from "@/app/services/SupplierService";
import { getItemById } from "@/app/services/ItemService";
import Footer from "@/app/components/common/Footer";
import Button from "@/app/components/common/Button";

const Page = () => {
  const router = useRouter();
  const params = useParams();
  const returnId = params.id as string;

  const [purchaseReturnData, setPurchaseReturnData] =
    useState<PurchaseReturnData | null>(null);
  const [supplier, setSupplier] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string>();

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchPurchaseReturn = async () => {
      if (!returnId) return;

      try {
        const purchaseReturnData = await getPurchaseReturnById(returnId);
        setPurchaseReturnData(purchaseReturnData);

        if (purchaseReturnData?.supplierId) {
          const supplier = await getSupplierById(purchaseReturnData.supplierId);
          setSupplier(supplier?.supplierName || "Unknown Supplier");
        }

        const updatedItems = await Promise.all(
          purchaseReturnData?.purchaseReturnItemDtos?.map(
            async (item: { itemId: string }) => {
              let itemName = "Unknown Item";

              if (item?.itemId) {
                const fetchedItem = await getItemById(item.itemId);
                itemName = fetchedItem?.itemName || itemName;
              }

              return {
                ...item,
                itemName,
              };
            }
          ) || []
        );

        setPurchaseReturnData({
          ...purchaseReturnData,
          purchaseReturnItemDtos: updatedItems,
        });
      } catch (err) {
        console.error("Error fetching purchase return:", err);
        setError("Failed to fetch return details or supplier.");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseReturn();
  }, [returnId]);

  return (
    <div>
      {/* ==== SCREEN VIEW ==== */}
      <main className="space-y-10 p-4 print:hidden">
        <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
          Purchase Return Details
        </div>

        <div className="flex space-x-4">
          <div className="w-full h-24 border border-Gray rounded-lg flex items-center px-6 space-x-4">
            <div>
              <Image
                src="/OrderId.svg"
                alt="Company Logo"
                width={45}
                height={32}
              />
            </div>
            <div className="grid">
              <span className="font-normal text-sm text-gray mb-1">
                Return ID
              </span>
              <span className="font-normal text-base">
                {purchaseReturnData?.returnId1}
              </span>
            </div>
          </div>

          <div className="w-full h-24 border border-Gray rounded-lg flex items-center px-6 space-x-4">
            <div>
              <Image
                src="/Date.svg"
                alt="Company Logo"
                width={45}
                height={32}
              />
            </div>
            <div className="grid">
              <span className="font-normal text-sm text-gray mb-1">
                Return Date
              </span>
              <span className="font-normal text-base">
                {purchaseReturnData?.returnDate
                  ? new Date(purchaseReturnData.returnDate).toLocaleDateString("en-GB")
                  : ""}
              </span>
            </div>
          </div>

          <div className="w-full h-24 border border-Gray rounded-lg flex items-center px-6 space-x-4">
            <div>
              <Image
                src="/Rupees.svg"
                alt="Company Logo"
                width={45}
                height={32}
              />
            </div>
            <div className="grid">
              <span className="font-normal text-sm text-gray mb-1">
                Return Amount
              </span>
              <span className="font-normal text-base">
                {purchaseReturnData?.returnAmount?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {purchaseReturnData?.purchaseReturnItemDtos?.map((item, index) => (
          <div
            key={index}
            className="border border-gray-300 w-full rounded-lg p-5 flex gap-8"
          >
            <div className="space-y-5 w-1/2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="grid">
                  <div className="font-normal text-sm text-gray mb-1">
                    Item Name
                  </div>
                  <div className="font-normal text-base">
                    {item.itemName || "Unknown Item"}
                  </div>
                </div>

                <div className="grid">
                  <div className="font-normal text-sm text-gray mb-1">
                    Batch Number
                  </div>
                  <div className="font-normal text-base">{item.batchNo}</div>
                </div>

                <div className="grid">
                  <div className="font-normal text-sm text-gray mb-1">
                    Invoice Number
                  </div>
                  <div className="font-normal text-base">
                    {purchaseReturnData?.purchaseBillNo || "N/A"}
                  </div>
                </div>

                <div className="grid">
                  <div className="font-normal text-sm text-gray mb-1">
                    Supplier
                  </div>
                  <div className="font-normal text-base">{supplier}</div>
                </div>

                <div className="grid">
                  <div className="font-normal text-sm text-gray mb-1">
                    Return Type
                  </div>
                  <div className="font-normal text-base">{item.returnType}</div>
                </div>

                <div className="grid">
                  <div className="font-normal text-sm text-gray mb-1">
                    Return Quantity
                  </div>
                  <div className="font-normal text-base">
                    {item.returnQuantity}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <Table
                data={[
                  {
                    discrepancyIn: item.discrepancyIn,
                    discrepancy: item.discrepancy,
                  },
                ]}
                columns={[
                  {
                    header: "Discrepancy In",
                    accessor: "discrepancyIn" as const,
                  },
                  {
                    header: "Discrepancy",
                    accessor: "discrepancy" as const,
                  },
                ]}
                noDataMessage="No purchase items found"
              />
            </div>
          </div>
        ))}

        <Footer />

        {/* Buttons container */}
        <div className="flex justify-end gap-4 mt-6">
          <Button label="Back" className="w-20" onClick={() => router.back()} />
          <Button
            label="Print"
            onClick={handlePrint}
            className="w-20 bg-darkPurple text-white"
          />
        </div>
      </main>

      <div className="hidden print:block bg-gray-100 print-section p-4 sm:p-8">
        <header className="mb-4 text-center">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-wide">
            Purchase Return Details
          </h1>
        </header>

        <main className="bg-white border border-gray-400 print:w-full print:max-w-full print:overflow-hidden">
          <section>
            <div className="flex flex-row flex-wrap border-b border-gray-400">
              <div className="w-full sm:w-1/2 p-4 border-b sm:border-b-0 sm:border-r border-gray-400 space-y-1">
                <p className="font-semibold text-gray-800">Return ID :</p>
                <p className="text-gray-700 tracking-wide">
                  {purchaseReturnData?.returnId1 || "N/A"}
                </p>
              </div>
              <div className="w-full sm:w-1/2 p-4 space-y-1">
                <p className="font-semibold text-gray-800">Return Date :</p>
                <p className="text-gray-700 tracking-wide">
                  {purchaseReturnData?.returnDate
                    ? new Date(
                        purchaseReturnData.returnDate
                      ).toLocaleDateString("en-GB")
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Row 2: Return Amount */}
            <div className="w-full p-4 text-sm text-gray-700 tracking-wide border-b border-gray-400">
              <div className="flex flex-col">
                <span className="font-semibold text-gray-800">
                  Return Amount :
                </span>
                <span>
                  {purchaseReturnData?.returnAmount?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </section>

          {/* Row 3: Table */}
          <section className="w-full overflow-x-auto print:overflow-visible">
            <table className="w-full table-fixed text-sm text-left text-gray-800 border border-gray-400 border-collapse print:text-xs">
              <thead>
                <tr className="font-semibold border-b border-gray-400 tracking-wide">
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Item Name
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Batch Number
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Invoice No.
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Supplier
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Return Type
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Return Quantity
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Discrepancy In
                  </th>
                  <th className="py-2 px-2 border border-gray-400 break-words">
                    Discrepancy
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseReturnData?.purchaseReturnItemDtos?.map(
                  (item, index) => (
                    <tr key={index} className="tracking-wide text-gray-700">
                      <td className="py-2 px-2 border border-gray-400 font-semibold text-gray-800 break-words">
                        {item.itemName || "Unknown Item"}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {item.batchNo || "N/A"}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {purchaseReturnData?.purchaseBillNo || "N/A"}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {supplier || "N/A"}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {item.returnType || "N/A"}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {item.returnQuantity || 0}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {item.discrepancyIn || "N/A"}
                      </td>
                      <td className="py-2 px-2 border border-gray-400 break-words">
                        {item.discrepancy || "N/A"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </section>
        </main>

        <div className="mt-20">
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Page;
