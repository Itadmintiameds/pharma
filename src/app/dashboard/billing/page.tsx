"use client";

import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import PaginationTable from "@/app/components/common/PaginationTable";
import { BillingData } from "@/app/types/BillingData";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import Billing from "./components/Billing";
import { getBilling } from "@/app/services/BillingService";
import { getPatientById } from "@/app/services/PatientService";
import BillingSummary from "./components/BillingSummary";
import Loader from "@/app/components/common/Loader";

const Page = () => {
  const [showBilling, setShowBilling] = useState(false);
  const [billingData, setBillingData] = useState<BillingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [showBillSummary, setShowBillSummary] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleMenu = (billId?: string) => {
    setOpenMenuId((prev) => (prev === billId ? null : billId || null));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".menu-container")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDate = (date: string | Date): string => {
    const parsedDate = typeof date === "string" ? new Date(date) : date;
    return format(parsedDate, "dd-MM-yyyy");
  };

  const [sortConfig, setSortConfig] = useState<{
    key: keyof BillingData | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const handleSort = (key: keyof BillingData) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };



  

  const getSortedData = () => {
    const sorted = [...filteredData];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        return 0;
      });
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.billDateTime).getTime() -
          new Date(a.billDateTime).getTime()
      );
    }

    return sorted;
  };

  const displayValue = (
    value: string | number | null | undefined
  ): string | number => {
    return value !== undefined && value !== null && value !== "" ? value : "--";
  };

  const columns = [
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("billId1")}
        >
          <span>Bill ID</span>
          {sortConfig.key === "billId1" ? (
            sortConfig.direction === "asc" ? (
              <FaArrowUp />
            ) : (
              <FaArrowDown />
            )
          ) : (
            <FaArrowDown />
          )}
        </div>
      ),
      accessor: (row: BillingData) => displayValue(row.billId1),
    },
    {
      header: "Patient Name",
      accessor: (row: BillingData) => displayValue(row.patientName),
    },

    {
      header: "Mobile No.",
      accessor: (row: BillingData) => displayValue(row.phone),
    },
    {
      header: "Patient Type",
      accessor: (row: BillingData) => displayValue(row.patientType),
    },
    {
      header: "Bill Date",
      accessor: (row: BillingData) =>
        row.billDateTime ? formatDate(row.billDateTime) : "--",
    },
    {
      header: "Patient ID",
      accessor: (row: BillingData) => displayValue(row.patientId1),
    },
    {
      header: "Payment Status",
      accessor: (row: BillingData) => {
        const value = displayValue(row.paymentStatus);

        if (value === "--") {
          return (
            <span className="px-2 py-1 rounded-xl text-sm font-medium bg-gray-200 text-gray-600">
              {value}
            </span>
          );
        }

        if (typeof value === "string") {
          const status = value.toLowerCase();
          const isPending = status === "pending";

          const bgClass = isPending ? "bg-warning" : "bg-green";
          const textClass = isPending ? "text-warning" : "text-green";
          const displayText = status.charAt(0).toUpperCase() + status.slice(1);

          return (
            <span
              className={`px-2 py-1 rounded-xl text-sm font-medium ${bgClass} ${textClass}`}
            >
              {displayText}
            </span>
          );
        }

        return (
          <span className="px-2 py-1 rounded-xl text-sm font-medium bg-gray-200 text-gray-600">
            {String(value)}
          </span>
        );
      },
    },

    {
      header: "Payment Mode",
      accessor: (row: BillingData) => {
        const value = displayValue(row.paymentType);

        const paymentTypeMap: Record<string, string> = {
          cash: "Cash",
          upi: "UPI",
          upiCash: "UPI & Cash",
          creditCard: "Credit Card",
          debitCard: "Debit Card",
          net_banking: "Net Banking",
        };

        return paymentTypeMap[value] || "--";
      },
    },

    {
      header: "Bill Amount",
      accessor: (row: BillingData) => displayValue(row.grandTotal),
    },
    {
      header: <BsThreeDotsVertical size={18} />,
      accessor: (row: BillingData) => (
        <div className="relative group  menu-container">
          <button
            className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
            onClick={() => toggleMenu(row.billId)}
          >
            <BsThreeDotsVertical size={18} />
          </button>
          {openMenuId === row.billId && (
            <div className="absolute right-0 mt-2 min-w-[160px] bg-white shadow-xl rounded-lg transition-opacity duration-200 z-10 whitespace-nowrap">
              <button
                onClick={() => handleBillingSummary(row.billId)}
                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
              >
                View
              </button>
              <button className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg">
                Edit
              </button>
              <button
                // onClick={() => handleBillingSummary(row.billId)}
                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  const handleBillingSummary = (billId?: string) => {
    if (billId) {
      setCurrentBillId(billId);
    }
    setShowBillSummary(true);
  };

  const handleBilling = () => {
    setShowBilling(true);
  };

  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getBilling();
        if (result.status === "success") {
          const billingList = result.data;

          const enrichedBillingData = await Promise.all(
            billingList.map(async (bill: BillingData) => {
              try {
                const patient = await getPatientById(bill.patientId);
                console.log("patient-----", patient);

                return {
                  ...bill,
                  patientName: `${patient.firstName} ${patient.lastName}`,
                  phone: patient.phone,
                  patientId1: patient.patientId1,
                };
              } catch (err) {
                console.error(
                  `Failed to fetch patient for ID ${bill.patientId}`,
                  err
                );
                return {
                  ...bill,
                  patientName: "Unknown",
                  mobileNo: "N/A",
                  patientId1: "N/A",
                };
              }
            })
          );

          setBillingData(enrichedBillingData);
        } else {
          setError(result.message || "Failed to fetch data");
        }
      } catch (error) {
        console.error("Error fetching billing data:", error);
        setError("Something went wrong while fetching billing data");
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  const filteredData = billingData
    .filter((item) => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const billDate = new Date(item.billDateTime);
      return billDate >= oneMonthAgo;
    })
    .filter((item) => {
      const search = searchText.toLowerCase();

      const billDateFormatted = format(
        new Date(item.billDateTime),
        "dd-MM-yyyy"
      );

      return (
        item.billId1?.toLowerCase().includes(search) ||
        item.patientName?.toLowerCase().includes(search) ||
        item.patientType?.toLowerCase().includes(search) ||
        billDateFormatted.toLowerCase().includes(search) ||
        item.patientId?.toLowerCase().includes(search) ||
        item.paymentStatus?.toLowerCase().includes(search) ||
        item.paymentType?.toLowerCase().includes(search) ||
        item.grandTotal?.toString().toLowerCase().includes(search)
      );
    });

  return (
    <>
      {showBillSummary && currentBillId ? (
        <BillingSummary
          billId={currentBillId}
          onClose={() => {
            setShowBillSummary(false);
            setCurrentBillId(null);
          }}
        />
      ) : showBilling ? (
        <Billing setShowBilling={setShowBilling} />
      ) : (
        <main className="space-y-10">
          <div className="flex justify-between">
            <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
              Sales List
            </div>

            <div>
              <div className="flex space-x-4">
                <div>
                  <Input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search Table..."
                    className="w-80 border-gray-300"
                    icon={<Search size={18} />}
                  />
                </div>
                {/* <div>
                  <Button
                    label="Filter"
                    value=""
                    className="w-24 text-black h-11"
                    icon={<Filter size={15} />}
                  ></Button>
                </div> */}
                <div>
                  <Button
                    onClick={() => handleBilling()}
                    label="Generate Sale"
                    value=""
                    className="w-40 bg-darkPurple text-white h-11 "
                    icon={<Plus size={15} />}
                  ></Button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              {/* <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div> */}
              <Loader type="spinner" size="md" text="Loading ..." fullScreen={false} />
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error!</strong> {error}
            </div>
          ) : (
            <PaginationTable
              data={getSortedData()}
              columns={columns}
              noDataMessage="No purchase records found"
            />
          )}
        </main>
      )}
    </>
  );
};

export default Page;