"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Table from "@/app/components/common/Table";
import { getSalesReturnById } from "@/app/services/SalesReturnService";
import { getPatientById } from "@/app/services/PatientService";
import { getItemById } from "@/app/services/ItemService";
import Footer from "@/app/components/common/Footer";
import { format } from "date-fns";
import Button from "@/app/components/common/Button";
import {
  SalesReturnData,
  SalesReturnItemData,
} from "@/app/types/SalesReturnData";
import { PatientData } from "@/app/types/PatientData";
import Loader from "@/app/components/common/Loader";

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const returnId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [salesReturnData, setSalesReturnData] =
    useState<SalesReturnData | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = async () => {
    window.print();
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "N/A";
    try {
      const parsedDate = typeof date === "string" ? new Date(date) : date;
      return isNaN(parsedDate.getTime())
        ? "N/A"
        : format(parsedDate, "dd-MM-yyyy");
    } catch {
      return "N/A";
    }
  };

  useEffect(() => {
    if (!returnId) {
      setError("Return ID is missing");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getSalesReturnById(returnId);

        if (!response || response.status !== "success") {
          throw new Error(
            response?.message || "Failed to fetch return details"
          );
        }

        const apiData = response.data;

        const enrichedItems = await Promise.all(
          apiData.billReturnItemDtos.map(async (item: SalesReturnItemData) => {
            try {
              const itemDetails = await getItemById(item.itemId);
              return {
                ...item,
                itemName: itemDetails?.itemName || "Unknown Item",
              };
            } catch {
              return {
                ...item,
                itemName: "Unknown Item",
              };
            }
          })
        );

        setSalesReturnData({
          ...apiData,
          billReturnItemDtos: enrichedItems,
        });

        if (apiData.patientId) {
          try {
            const patient = await getPatientById(apiData.patientId);
            setPatientData(patient);
          } catch (patientError) {
            console.error("Error fetching patient:", patientError);
          }
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch return details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [returnId]);

  const columns = [
    {
      header: "Item Name",
      accessor: (row: SalesReturnItemData) => row.itemName || "N/A",
    },
    {
      header: "Batch No.",
      accessor: (row: SalesReturnItemData) => row.batchNo || "N/A",
    },
    {
      header: "Expiry Date",
      accessor: (row: SalesReturnItemData) => formatDate(row.expiryDate),
    },
    {
      header: "Billed Qty.",
      accessor: (row: SalesReturnItemData) => row.packageQuantity || 0,
    },
    {
      header: "Returned Qty.",
      accessor: (row: SalesReturnItemData) => row.returnQuantity || 0,
    },
    {
      header: "Refund Amount",
      accessor: (row: SalesReturnItemData) =>
        `${(row.netTotal || 0).toFixed(2)}`,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error!</strong> {error}
      </div>
    );
  }

  if (!salesReturnData) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        Return data not found
      </div>
    );
  }

  return (
    <div>
      {/* SCREEN VIEW */}
      <div className="print:hidden">
        <main className="space-y-6 p-4">
          <h1 className="justify-start text-darkPurple text-3xl font-medium leading-10">
            Sales Return Summary
          </h1>

          <div className="bg-white rounded-lg shadow p-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
                <p className="text-sm text-[#433E3F] mb-1">Patient Name</p>
                <p>
                  {patientData?.firstName
                    ? `${patientData.firstName} ${patientData.lastName || ""}`
                    : salesReturnData.patientName || "--"}
                </p>
              </div>

              <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
                <p className="text-sm text-[#433E3F] mb-1">Mobile Number</p>
                <p>{patientData?.phone || "--"}</p>
              </div>

              <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
                <p className="text-sm text-[#433E3F] mb-1">Bill No.</p>
                <p>{salesReturnData.billId1 || "--"}</p>
              </div>

              <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
                <p className="text-sm text-[#433E3F] mb-1">Return ID</p>
                <p>
                  {salesReturnData.billReturnId1 ||
                    salesReturnData.billReturnId ||
                    "--"}
                </p>
              </div>

              <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
                <p className="text-sm text-[#433E3F] mb-1">Return Date</p>
                <p>{formatDate(salesReturnData.billReturnDateTime)}</p>
              </div>

              <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
                <p className="text-sm text-[#433E3F] mb-1">
                  Total Refund Amount
                </p>
                <p>{salesReturnData.grandTotal?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 w-full">
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Returned Items
            </h2>
            <Table
              data={salesReturnData.billReturnItemDtos || []}
              columns={columns}
              noDataMessage="No items were returned"
            />
          </div>

          {/* Return Reason Section*/}
          {salesReturnData.returnReason && (
            <div className="bg-white rounded-lg shadow p-4 w-full">
              <h2 className="text-lg font-medium text-gray-800">
                Return Reason
              </h2>
              <div className="rounded-lg">
                <p className="text-gray-700 break-words whitespace-pre-wrap">
                  {salesReturnData.returnReason}
                </p>
              </div>
            </div>
          )}

          <Footer />
        </main>

        {/* Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button label="Back" className="w-20" onClick={() => router.back()} />
          <Button
            label="Print"
            onClick={handlePrint}
            className="w-20 bg-darkPurple text-white"
          />
        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="hidden print:block bg-gray-100 print-section p-4 sm:p-8">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-wide">Bill Return Summary</h1>
        </header>

        <main className="bg-white border border-gray-400">
          {/* Patient and Bill Information */}
          <section>
            {/* First Row */}
            <div className="flex flex-col md:flex-row print:flex-row border-b border-gray-400">
              <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">Patient Name :</span>
                  <span>
                    {patientData?.firstName
                      ? `${patientData.firstName} ${patientData.lastName || ""}`
                      : salesReturnData.patientName || "--"}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">Mobile Number :</span>
                  <span>{patientData?.phone || "--"}</span>
                </div>
              </div>

              <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 border-gray-400 tracking-wide">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">Bill No. :</span>
                  <span>{salesReturnData.billId1 || "--"}</span>
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="flex flex-col md:flex-row print:flex-row border-b border-gray-400">
              <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">Return ID :</span>
                  <span>
                    {salesReturnData.billReturnId1 || salesReturnData.billReturnId || "--"}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">Return Date :</span>
                  <span>{formatDate(salesReturnData.billReturnDateTime)}</span>
                </div>
              </div>

              <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 tracking-wide">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">Total Refund Amount :</span>
                  <span>{salesReturnData.grandTotal?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Returned Items Table */}
          <section className="w-full p-6">
            <table className="w-full text-sm text-left text-gray-800">
              <thead>
                <tr className="font-semibold border-b border-gray-400 tracking-wide">
                  <th className="py-2 px-2">SL No.</th>
                  <th className="py-2 px-2">Item Name</th>
                  <th className="py-2 px-2">Batch No.</th>
                  <th className="py-2 px-2">Expiry Date</th>
                  <th className="py-2 px-2">Billed Qty.</th>
                  <th className="py-2 px-2">Returned Qty.</th>
                  <th className="py-2 px-2">Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                {salesReturnData.billReturnItemDtos?.map((item, index) => (
                  <tr key={index} className="border-b border-gray-400 tracking-wide text-gray-700">
                    <td className="py-2 px-2">{index + 1}</td>
                    <td className="py-2 px-2 font-semibold text-gray-800">{item.itemName || "N/A"}</td>
                    <td className="py-2 px-2">{item.batchNo || "N/A"}</td>
                    <td className="py-2 px-2">{formatDate(item.expiryDate)}</td>
                    <td className="py-2 px-2">{item.packageQuantity || 0}</td>
                    <td className="py-2 px-2">{item.returnQuantity || 0}</td>
                    <td className="py-2 px-2">{(item.netTotal || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="py-2 px-2 text-left align-top">
                    {salesReturnData.returnReason && (
                      <div>
                        <span className="font-semibold text-gray-800">Return Reason: </span>
                        <span className="text-gray-700">{salesReturnData.returnReason}</span>
                      </div>
                    )}
                  </td>
                  <td colSpan={3} className="py-2 px-2 text-right font-bold text-gray-800">TOTAL:</td>
                  <td className="py-2 px-2 font-bold text-gray-800">
                    {salesReturnData.grandTotal?.toFixed(2) || "0.00"}
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
    </div>
  );
};

export default Page;







// this code is original code but without adding reason for return functionality................
// "use client";
// import React, { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Table from "@/app/components/common/Table";
// import { getSalesReturnById } from "@/app/services/SalesReturnService";
// import { getPatientById } from "@/app/services/PatientService";
// import { getItemById } from "@/app/services/ItemService";
// import Footer from "@/app/components/common/Footer";
// import { format } from "date-fns";
// import Button from "@/app/components/common/Button";
// import {
//   SalesReturnData,
//   SalesReturnItemData,
// } from "@/app/types/SalesReturnData";
// import { PatientData } from "@/app/types/PatientData";
// import Loader from "@/app/components/common/Loader";

// const Page = () => {
//   const params = useParams();
//   const router = useRouter();
//   const returnId = Array.isArray(params.id) ? params.id[0] : params.id;

//   const [salesReturnData, setSalesReturnData] =
//     useState<SalesReturnData | null>(null);
//   const [patientData, setPatientData] = useState<PatientData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const handlePrint = async () => {
//     window.print();
//   };

//   const formatDate = (date: string | Date | null | undefined): string => {
//     if (!date) return "N/A";
//     try {
//       const parsedDate = typeof date === "string" ? new Date(date) : date;
//       return isNaN(parsedDate.getTime())
//         ? "N/A"
//         : format(parsedDate, "dd-MM-yyyy");
//     } catch {
//       return "N/A";
//     }
//   };

//   useEffect(() => {
//     if (!returnId) {
//       setError("Return ID is missing");
//       setLoading(false);
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const response = await getSalesReturnById(returnId);

//         if (!response || response.status !== "success") {
//           throw new Error(
//             response?.message || "Failed to fetch return details"
//           );
//         }

//         const apiData = response.data;

//         const enrichedItems = await Promise.all(
//           apiData.billReturnItemDtos.map(async (item: SalesReturnItemData) => {
//             try {
//               const itemDetails = await getItemById(item.itemId);
//               return {
//                 ...item,
//                 itemName: itemDetails?.itemName || "Unknown Item",
//               };
//             } catch {
//               return {
//                 ...item,
//                 itemName: "Unknown Item",
//               };
//             }
//           })
//         );

//         setSalesReturnData({
//           ...apiData,
//           billReturnItemDtos: enrichedItems,
//         });

//         if (apiData.patientId) {
//           try {
//             const patient = await getPatientById(apiData.patientId);
//             setPatientData(patient);
//           } catch (patientError) {
//             console.error("Error fetching patient:", patientError);
//           }
//         }
//       } catch (error) {
//         setError(
//           error instanceof Error
//             ? error.message
//             : "Failed to fetch return details"
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [returnId]);

//   const columns = [
//     {
//       header: "Item Name",
//       accessor: (row: SalesReturnItemData) => row.itemName || "N/A",
//     },
//     {
//       header: "Batch No.",
//       accessor: (row: SalesReturnItemData) => row.batchNo || "N/A",
//     },
//     {
//       header: "Expiry Date",
//       accessor: (row: SalesReturnItemData) => formatDate(row.expiryDate),
//     },
//     {
//       header: "Billed Qty.",
//       accessor: (row: SalesReturnItemData) => row.packageQuantity || 0,
//     },
//     {
//       header: "Returned Qty.",
//       accessor: (row: SalesReturnItemData) => row.returnQuantity || 0,
//     },
//     {
//       header: "Refund Amount",
//       accessor: (row: SalesReturnItemData) =>
//         `${(row.netTotal || 0).toFixed(2)}`,
//     },
//   ];

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//         <strong>Error!</strong> {error}
//       </div>
//     );
//   }

//   if (!salesReturnData) {
//     return (
//       <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
//         Return data not found
//       </div>
//     );
//   }

//   return (
//     <div>
//       {/* SCREEN VIEW */}
//       <div className="print:hidden">
//         <main className="space-y-6 p-4">
//           <h1 className="justify-start text-darkPurple text-3xl font-medium leading-10">
//             Sales Return Summary
//           </h1>

//           <div className="bg-white rounded-lg shadow p-6 w-full">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
//                 <p className="text-sm text-[#433E3F] mb-1">Patient Name</p>
//                 <p>
//                   {patientData?.firstName
//                     ? `${patientData.firstName} ${patientData.lastName || ""}`
//                     : salesReturnData.patientName || "--"}
//                 </p>
//               </div>

//               <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
//                 <p className="text-sm text-[#433E3F] mb-1">Mobile Number</p>
//                 <p>{patientData?.phone || "--"}</p>
//               </div>

//               <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
//                 <p className="text-sm text-[#433E3F] mb-1">Bill No.</p>
//                 <p>{salesReturnData.billId1 || "--"}</p>
//               </div>

//               <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
//                 <p className="text-sm text-[#433E3F] mb-1">Return ID</p>
//                 <p>
//                   {salesReturnData.billReturnId1 ||
//                     salesReturnData.billReturnId ||
//                     "--"}
//                 </p>
//               </div>

//               <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
//                 <p className="text-sm text-[#433E3F] mb-1">Return Date</p>
//                 <p>{formatDate(salesReturnData.billReturnDateTime)}</p>
//               </div>

//               <div className="w-full p-6 bg-[#FAFAFA] rounded-lg">
//                 <p className="text-sm text-[#433E3F] mb-1">
//                   Total Refund Amount
//                 </p>
//                 <p>{salesReturnData.grandTotal?.toFixed(2) || "0.00"}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6 w-full">
//             <h2 className="text-lg font-medium text-gray-800 mb-4">
//               Returned Items
//             </h2>
//             <Table
//               data={salesReturnData.billReturnItemDtos || []}
//               columns={columns}
//               noDataMessage="No items were returned"
//             />
//           </div>
//           <Footer />
//         </main>

//         {/* Buttons */}
//         <div className="flex justify-end gap-4 mt-6">
//           <Button label="Back" className="w-20" onClick={() => router.back()} />
//           <Button
//             label="Print"
//             onClick={handlePrint}
//             className="w-20 bg-darkPurple text-white"
//           />
//         </div>
//       </div>

//       {/* PRINT VIEW */}
//      <div className="hidden print:block bg-gray-100 print-section p-4 sm:p-8">
//   <header className="mb-4">
//     <h1 className="text-2xl font-semibold text-gray-800 tracking-wide">Bill Return Summary</h1>
//   </header>

//   <main className="bg-white border border-gray-400">
//     {/* Patient and Bill Information */}
//     <section>
//       {/* First Row */}
//       <div className="flex flex-col md:flex-row print:flex-row border-b border-gray-400">
//         <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
//           <div className="flex flex-col">
//             <span className="font-semibold text-gray-800">Patient Name :</span>
//             <span>
//               {patientData?.firstName
//                 ? `${patientData.firstName} ${patientData.lastName || ""}`
//                 : salesReturnData.patientName || "--"}
//             </span>
//           </div>
//         </div>

//         <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
//           <div className="flex flex-col">
//             <span className="font-semibold text-gray-800">Mobile Number :</span>
//             <span>{patientData?.phone || "--"}</span>
//           </div>
//         </div>

//         <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 border-gray-400 tracking-wide">
//           <div className="flex flex-col">
//             <span className="font-semibold text-gray-800">Bill No. :</span>
//             <span>{salesReturnData.billId1 || "--"}</span>
//           </div>
//         </div>
//       </div>

//       {/* Second Row */}
//       <div className="flex flex-col md:flex-row print:flex-row border-b border-gray-400">
//         <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
//           <div className="flex flex-col">
//             <span className="font-semibold text-gray-800">Return ID :</span>
//             <span>
//               {salesReturnData.billReturnId1 || salesReturnData.billReturnId || "--"}
//             </span>
//           </div>
//         </div>

//         <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 border-b md:border-b-0 print:border-b-0 md:border-r print:border-r border-gray-400 tracking-wide">
//           <div className="flex flex-col">
//             <span className="font-semibold text-gray-800">Return Date :</span>
//             <span>{formatDate(salesReturnData.billReturnDateTime)}</span>
//           </div>
//         </div>

//         <div className="flex-1 p-4 text-sm text-gray-700 space-y-2 tracking-wide">
//           <div className="flex flex-col">
//             <span className="font-semibold text-gray-800">Total Refund Amount :</span>
//             <span>{salesReturnData.grandTotal?.toFixed(2) || "0.00"}</span>
//           </div>
//         </div>
//       </div>
//     </section>

//     {/* Returned Items Table */}
//     <section className="w-full p-6">
//       <table className="w-full text-sm text-left text-gray-800">
//         <thead>
//           <tr className="font-semibold border-b border-gray-400 tracking-wide">
//             <th className="py-2 px-2">SL No.</th>
//             <th className="py-2 px-2">Item Name</th>
//             <th className="py-2 px-2">Batch No.</th>
//             <th className="py-2 px-2">Expiry Date</th>
//             <th className="py-2 px-2">Billed Qty.</th>
//             <th className="py-2 px-2">Returned Qty.</th>
//             <th className="py-2 px-2">Refund Amount</th>
//           </tr>
//         </thead>
//         <tbody>
//           {salesReturnData.billReturnItemDtos?.map((item, index) => (
//             <tr key={index} className="border-b border-gray-400 tracking-wide text-gray-700">
//               <td className="py-2 px-2">{index + 1}</td>
//               <td className="py-2 px-2 font-semibold text-gray-800">{item.itemName || "N/A"}</td>
//               <td className="py-2 px-2">{item.batchNo || "N/A"}</td>
//               <td className="py-2 px-2">{formatDate(item.expiryDate)}</td>
//               <td className="py-2 px-2">{item.packageQuantity || 0}</td>
//               <td className="py-2 px-2">{item.returnQuantity || 0}</td>
//               <td className="py-2 px-2">{(item.netTotal || 0).toFixed(2)}</td>
//             </tr>
//           ))}
//         </tbody>
//         <tfoot className="border-t-2 border-gray-300">
//           <tr>
//             <td colSpan={6} className="py-2 px-2 text-right font-bold text-gray-800">TOTAL:</td>
//             <td className="py-2 px-2 font-bold text-gray-800">
//               {salesReturnData.grandTotal?.toFixed(2) || "0.00"}
//             </td>
//           </tr>
//         </tfoot>
//       </table>
//     </section>
//   </main>
  
//   <div className="mt-20">
//     <Footer />
//   </div>
// </div>
//     </div>
//   );
// };

// export default Page;











// This code is before adding the print functionality (with earlier version of print).............................
// "use client";
// import React, { useEffect, useState, useRef } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Table from "@/app/components/common/Table";
// import { getSalesReturnById } from "@/app/services/SalesReturnService";
// import { getPatientById } from "@/app/services/PatientService";
// import { getItemById } from "@/app/services/ItemService";
// import Footer from "@/app/components/common/Footer";
// import { format } from "date-fns";
// import Button from "@/app/components/common/Button";
// import {
//   SalesReturnData,
//   SalesReturnItemData,
// } from "@/app/types/SalesReturnData";
// import { PatientData } from "@/app/types/PatientData";
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";

// const Page = () => {
//   const params = useParams();
//   const router = useRouter();
//   const returnId = Array.isArray(params.id) ? params.id[0] : params.id;
//   const printRef = useRef<HTMLDivElement>(null);

//   const [salesReturnData, setSalesReturnData] =
//     useState<SalesReturnData | null>(null);
//   const [patientData, setPatientData] = useState<PatientData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const handlePrint = async () => {
//     if (!printRef.current) return;

//     try {
//       const element = printRef.current;
      
    
//       element.classList.add("print-mode");

//       const pdf = new jsPDF("p", "mm", "a4");
//       const pageWidth = pdf.internal.pageSize.getWidth();

//       const canvas = await html2canvas(element, {
//         scale: 2,
//         useCORS: true,
//         allowTaint: true,
//         logging: false,
//         backgroundColor: '#ffffff'
//       });

//       const imgData = canvas.toDataURL("image/png");
//       const imgWidth = canvas.width;
//       const imgHeight = canvas.height;
//       const ratio = imgHeight / imgWidth;
//       const pdfImgHeight = pageWidth * ratio;

//       pdf.addImage(
//         imgData,
//         "PNG",
//         0,
//         0,
//         pageWidth,
//         pdfImgHeight
//       );

     
//       element.classList.remove("print-mode");

//       const pdfBlob = pdf.output("blob");
//       const pdfUrl = URL.createObjectURL(pdfBlob);
//       const printWindow = window.open(pdfUrl);

//       if (printWindow) {
//         printWindow.onload = () => {
//           printWindow.print();
//         };
//       }
//     } catch (error) {
//       console.error("Error generating PDF:", error);
//     }
//   };

//   const formatDate = (date: string | Date | null | undefined): string => {
//     if (!date) return "N/A";
//     try {
//       const parsedDate = typeof date === "string" ? new Date(date) : date;
//       return isNaN(parsedDate.getTime())
//         ? "N/A"
//         : format(parsedDate, "dd-MM-yyyy");
//     } catch {
//       return "N/A";
//     }
//   };

//   useEffect(() => {
//     if (!returnId) {
//       setError("Return ID is missing");
//       setLoading(false);
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const response = await getSalesReturnById(returnId);

//         if (!response || response.status !== "success") {
//           throw new Error(
//             response?.message || "Failed to fetch return details"
//           );
//         }

//         const apiData = response.data;

//         const enrichedItems = await Promise.all(
//           apiData.billReturnItemDtos.map(async (item: SalesReturnItemData) => {
//             try {
//               const itemDetails = await getItemById(item.itemId);
//               return {
//                 ...item,
//                 itemName: itemDetails?.itemName || "Unknown Item",
//               };
//             } catch {
//               return {
//                 ...item,
//                 itemName: "Unknown Item",
//               };
//             }
//           })
//         );

//         setSalesReturnData({
//           ...apiData,
//           billReturnItemDtos: enrichedItems,
//         });

//         if (apiData.patientId) {
//           try {
//             const patient = await getPatientById(apiData.patientId);
//             setPatientData(patient);
//           } catch (patientError) {
//             console.error("Error fetching patient:", patientError);
//           }
//         }
//       } catch (error) {
//         setError(
//           error instanceof Error
//             ? error.message
//             : "Failed to fetch return details"
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [returnId]);

//   const columns = [
//     {
//       header: "Item Name",
//       accessor: (row: SalesReturnItemData) => row.itemName || "N/A",
//     },
//     {
//       header: "Batch No.",
//       accessor: (row: SalesReturnItemData) => row.batchNo || "N/A",
//     },
//     {
//       header: "Expiry Date",
//       accessor: (row: SalesReturnItemData) => formatDate(row.expiryDate),
//     },
//     {
//       header: "Billed Qty.",
//       accessor: (row: SalesReturnItemData) => row.packageQuantity || 0,
//     },
//     {
//       header: "Returned Qty.",
//       accessor: (row: SalesReturnItemData) => row.returnQuantity || 0,
//     },
//     {
//       header: "Refund Amount",
//       accessor: (row: SalesReturnItemData) =>
//         `${(row.netTotal || 0).toFixed(2)}`,
//     },
//   ];

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-darkPurple"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//         <strong>Error!</strong> {error}
//       </div>
//     );
//   }

//   if (!salesReturnData) {
//     return (
//       <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
//         Return data not found
//       </div>
//     );
//   }

//   return (
//     <div>
//       <div ref={printRef}>
//         <main className="space-y-6 p-4">
//           <h1 className="justify-start text-darkPurple text-3xl font-medium leading-10 print-hidden">
//             Bill Return Summary
//           </h1>

//           <div className="bg-white rounded-lg shadow p-6 w-full">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="w-full  p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA] ">
//                 <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%] mb-1 ">
//                   Patient Name
//                 </div>
//                 <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full py-1">
//                   {patientData?.firstName
//                     ? `${patientData.firstName} ${patientData.lastName || ""}`
//                     : salesReturnData.patientName || "--"}
//                 </div>
//               </div>

//               <div className="w-full p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//                 <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%] mb-1">
//                   Mobile Number
//                 </div>
//                 <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full py-1">
//                   {patientData?.phone || "--"}
//                 </div>
//               </div>

//               <div className="w-full  p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//                 <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%] mb-1">
//                   Bill No.
//                 </div>
//                 <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full py-1">
//                   {salesReturnData.billId1 || "--"}
//                 </div>
//               </div>

//               <div className="w-full  p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//                 <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%] mb-1">
//                   Return ID
//                 </div>
//                 <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full py-1">
//                   {salesReturnData.billReturnId1 ||
//                     salesReturnData.billReturnId ||
//                     "--"}
//                 </div>
//               </div>

//               <div className="w-full  px-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//                 <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%] mb-1">
//                   Return Date
//                 </div>
//                 <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full py-1">
//                   {formatDate(salesReturnData.billReturnDateTime)}
//                 </div>
//               </div>

//               <div className="w-full  p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//                 <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%] mb-1">
//                   Total Refund Amount
//                 </div>
//                 <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full py-1">
//                   {salesReturnData.grandTotal?.toFixed(2) || "0.00"}
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6 w-full">
//             <h2 className="text-lg font-medium text-gray-800 mb-4">
//               Returned Items
//             </h2>
//             <Table
//               data={salesReturnData.billReturnItemDtos || []}
//               columns={columns}
//               noDataMessage="No items were returned"
//             />
//           </div>
//           <Footer />
//         </main>
//       </div>

//       {/* Buttons container */}
//       <div className="flex justify-end gap-4 mt-6 print-hidden">
//         <Button
//           label="Back"
//           className="w-20"
//           onClick={() => router.back()}
//         />
//         <Button
//         label="Print"
//           onClick={handlePrint}
//           className="w-20 bg-darkPurple text-white"
//         />
          
//       </div>

//       <style jsx global>{`
//         @media print {
//           body, html {
//             margin: 0;
//             padding: 0;
//             color: black !important;
//             background: white !important;
//           }
//           .print-hidden {
//             display: none !important;
//           }
//           * {
//             color: black !important;
//             background: white !important;
//             border-color: black !important;
//           }
//         }
//         .print-mode * {
//           color: black !important;
//           background: white !important;
//           border-color: black !important;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default Page;





































// This is the original code without adding functionality of printing or any other changes.................................

// "use client";
// import React, { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Table from "@/app/components/common/Table";
// import { getSalesReturnById } from "@/app/services/SalesReturnService";
// import { getPatientById } from "@/app/services/PatientService";
// import { getItemById } from "@/app/services/ItemService";
// import Footer from "@/app/components/common/Footer";
// import { format } from "date-fns";
// import Button from "@/app/components/common/Button";
// import {
//   SalesReturnData,
//   SalesReturnItemData,
// } from "@/app/types/SalesReturnData";
// import { PatientData } from "@/app/types/PatientData";

// const Page = () => {
//   const params = useParams();
//   const router = useRouter();
//   const returnId = Array.isArray(params.id) ? params.id[0] : params.id;

//   const [salesReturnData, setSalesReturnData] =
//     useState<SalesReturnData | null>(null);
//   const [patientData, setPatientData] = useState<PatientData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const formatDate = (date: string | Date | null | undefined): string => {
//     if (!date) return "N/A";
//     try {
//       const parsedDate = typeof date === "string" ? new Date(date) : date;
//       return isNaN(parsedDate.getTime())
//         ? "N/A"
//         : format(parsedDate, "dd-MM-yyyy");
//     } catch {
//       return "N/A";
//     }
//   };

//   useEffect(() => {
//     if (!returnId) {
//       setError("Return ID is missing");
//       setLoading(false);
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const response = await getSalesReturnById(returnId);

//         if (!response || response.status !== "success") {
//           throw new Error(
//             response?.message || "Failed to fetch return details"
//           );
//         }

//         const apiData = response.data;

//         const enrichedItems = await Promise.all(
//           apiData.billReturnItemDtos.map(async (item: SalesReturnItemData) => {
//             try {
//               const itemDetails = await getItemById(item.itemId);
//               return {
//                 ...item,
//                 itemName: itemDetails?.itemName || "Unknown Item",
//               };
//             } catch {
//               return {
//                 ...item,
//                 itemName: "Unknown Item",
//               };
//             }
//           })
//         );

//         setSalesReturnData({
//           ...apiData,
//           billReturnItemDtos: enrichedItems,
//         });

//         if (apiData.patientId) {
//           try {
//             const patient = await getPatientById(apiData.patientId);
//             setPatientData(patient);
//           } catch (patientError) {
//             console.error("Error fetching patient:", patientError);
//           }
//         }
//       } catch (error) {
//         setError(
//           error instanceof Error
//             ? error.message
//             : "Failed to fetch return details"
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [returnId]);

//   const columns = [
//     {
//       header: "Item Name",
//       accessor: (row: SalesReturnItemData) => row.itemName || "N/A",
//     },
//     {
//       header: "Batch No.",
//       accessor: (row: SalesReturnItemData) => row.batchNo || "N/A",
//     },
//     {
//       header: "Expiry Date",
//       accessor: (row: SalesReturnItemData) => formatDate(row.expiryDate),
//     },
//     {
//       header: "Billed Qty.",
//       accessor: (row: SalesReturnItemData) => row.packageQuantity || 0,
//     },
//     {
//       header: "Returned Qty.",
//       accessor: (row: SalesReturnItemData) => row.returnQuantity || 0,
//     },
//     {
//       header: "Refund Amount",
//       accessor: (row: SalesReturnItemData) =>
//         `${(row.netTotal || 0).toFixed(2)}`,
//     },
//   ];

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-darkPurple"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//         <strong>Error!</strong> {error}
//       </div>
//     );
//   }

//   if (!salesReturnData) {
//     return (
//       <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
//         Return data not found
//       </div>
//     );
//   }

//   return (
//     <main className="space-y-6 p-4">
//       <div className="flex justify-between items-center">
//         <h1 className="justify-start text-darkPurple text-3xl font-medium leading-10">
//           Bill Return Summary
//         </h1>
//         <div>
//           <Button
//             onClick={() => router.push("/dashboard/salesReturn")}
//             label="Back to Returns"
//             value=""
//             className="w-48 bg-darkPurple text-white h-11"
//           />
//         </div>
//       </div>

//       <div className="bg-white rounded-lg shadow p-6 w-full">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="w-full h-[96px] p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//             <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%]">
//               Patient Name
//             </div>
//             <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full">
//               {patientData?.firstName
//                 ? `${patientData.firstName} ${patientData.lastName || ""}`
//                 : salesReturnData.patientName || "--"}
//             </div>
//           </div>

//           <div className="w-full h-[96px] p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//             <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%]">
//               Mobile Number
//             </div>
//             <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full">
//               {patientData?.phone || "--"}
//             </div>
//           </div>

//           <div className="w-full h-[96px] p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//             <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%]">
//               Bill No.
//             </div>
//             <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full">
//               {salesReturnData.billId1 || "--"}
//             </div>
//           </div>

//           <div className="w-full h-[96px] p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//             <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%]">
//               Return ID
//             </div>
//             <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full">
//               {salesReturnData.billReturnId1 ||
//                 salesReturnData.billReturnId ||
//                 "--"}
//             </div>
//           </div>

//           <div className="w-full h-[96px] p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//             <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%]">
//               Return Date
//             </div>
//             <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full">
//               {formatDate(salesReturnData.billReturnDateTime)}
//             </div>
//           </div>

//           <div className="w-full h-[96px] p-6 flex flex-col justify-center items-start rounded-lg bg-[#FAFAFA]">
//             <div className="text-sm text-[#433E3F] font-inter font-normal leading-[161.8%]">
//               Total Refund Amount
//             </div>
//             <div className="text-base text-[#0A0A0B] font-inter font-normal leading-[161.8%] truncate w-full">
//               {salesReturnData.grandTotal?.toFixed(2) || "0.00"}
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="bg-white rounded-lg shadow p-6 w-full">
//         <h2 className="text-lg font-medium text-gray-800 mb-4">
//           Returned Items
//         </h2>
//         <Table
//           data={salesReturnData.billReturnItemDtos || []}
//           columns={columns}
//           noDataMessage="No items were returned"
//         />
//       </div>
//       <Footer />
//     </main>
//   );
// };

// export default Page;
