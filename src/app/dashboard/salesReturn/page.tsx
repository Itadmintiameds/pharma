"use client";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import PaginationTable from "@/app/components/common/PaginationTable";
import { SalesReturnListData } from "@/app/types/SalesReturnData";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import SalesReturn from "./components/SalesReturn";
import { getSalesReturnList } from "@/app/services/SalesReturnService";
import { getBilling } from "@/app/services/BillingService";
import { toast } from "react-toastify";
import Link from "next/link";
import Modal from "@/app/components/common/Modal";
import Loader from "@/app/components/common/Loader";

const Page = () => {
  const [showSalesReturn, setShowSalesReturn] = useState(false);
  const [salesReturnData, setSalesReturnData] = useState<SalesReturnListData[]>(
    []
  );
  const [bills, setBills] = useState<{ billId: string; billNumber: string }[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  // Dropdown menu state and functions
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleMenu = (returnId?: string) => {
    setOpenMenuId((prev) => (prev === returnId ? null : returnId || null));
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

  const formatDate = (date: string | Date | null | undefined): string => {
    try {
      if (!date) return "--";
      const parsedDate = typeof date === "string" ? new Date(date) : date;
      return format(parsedDate, "dd-MM-yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "--";
    }
  };

  const fetchBills = async () => {
    try {
      const response = await getBilling();
      if (response.status === "success") {
        setBills(
          response.data.map((bill: { billId: string; billId1?: string }) => ({
            billId: bill.billId,
            billNumber: bill.billId1 || bill.billId,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch bills", error);
      toast.error("Failed to fetch bills");
    }
  };

  const fetchSalesReturnData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSalesReturnList();
      if (result.status === "success") {
        const sortedData = result.data.sort((a, b) => {
          const dateA = a.billReturnDateTime
            ? new Date(a.billReturnDateTime).getTime()
            : 0;
          const dateB = b.billReturnDateTime
            ? new Date(b.billReturnDateTime).getTime()
            : 0;
          return dateB - dateA;
        });
        setSalesReturnData(sortedData);
      } else {
        throw new Error(result.message || "Failed to fetch data");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");
      toast.error("Failed to load return data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    fetchSalesReturnData();
  }, []);

  const handleDeleteReturn = async () => {
    if (!selectedReturnId) return;

    try {
      toast.success("Sales return deleted successfully");
      fetchSalesReturnData();
    } catch (error) {
      console.error("Error deleting sales return:", error);
      toast.error("Failed to delete sales return");
    } finally {
      setShowDeleteModal(false);
      setSelectedReturnId(null);
    }
  };

  const [sortConfig, setSortConfig] = useState<{
    key: keyof SalesReturnListData | null;
    direction: "asc" | "desc";
  }>({ key: "billReturnDateTime", direction: "desc" });

  const handleSort = (key: keyof SalesReturnListData) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredData = salesReturnData.filter((item) => {
    const search = searchText.toLowerCase();
    return (
      (item.billReturnId1 || item.billReturnId)
        ?.toLowerCase()
        .includes(search) ||
      item.billId1?.toLowerCase().includes(search) ||
      item.patientName?.toLowerCase().includes(search) ||
      formatDate(item.billReturnDateTime).toLowerCase().includes(search) ||
      item.grandTotal?.toString().includes(search)
    );
  });

  const getSortedData = () => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      // Handle null/undefined values
      if (a[sortConfig.key!] == null)
        return sortConfig.direction === "asc" ? 1 : -1;
      if (b[sortConfig.key!] == null)
        return sortConfig.direction === "asc" ? -1 : 1;

      // Handle different data types
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Date comparison
      if (sortConfig.key === "billReturnDateTime") {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      // Numeric comparison
      if (
        sortConfig.key === "grandTotal" ||
        sortConfig.key === "returnedItem"
      ) {
        return sortConfig.direction === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }

      // String comparison for other fields
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      return sortConfig.direction === "asc"
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  };

  const columns = [
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("billReturnId1")}
        >
          <span>Return ID</span>
          {sortConfig.key === "billReturnId1" ? (
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
      accessor: (row: SalesReturnListData) =>
        row.billReturnId1 || row.billReturnId || "--",
    },
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("patientName")}
        >
          <span>Patient Name</span>
          {sortConfig.key === "patientName" ? (
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
      accessor: (row: SalesReturnListData) => row.patientName || "--",
    },
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("billId1")}
        >
          <span>Bill Number</span>
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
      accessor: (row: SalesReturnListData) => row.billId1 || "--",
    },
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("billReturnDateTime")}
        >
          <span>Return Date</span>
          {sortConfig.key === "billReturnDateTime" ? (
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
      accessor: (row: SalesReturnListData) =>
        formatDate(row.billReturnDateTime),
    },
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("returnedItem")}
        >
          <span>Items Returned</span>
          {sortConfig.key === "returnedItem" ? (
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
      accessor: (row: SalesReturnListData) => row.returnedItem || 0,
    },
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("grandTotal")}
        >
          <span>Grand Total</span>
          {sortConfig.key === "grandTotal" ? (
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
      accessor: (row: SalesReturnListData) =>
        `${row.grandTotal?.toFixed(2) || "0.00"}`,
    },
    {
      header: <BsThreeDotsVertical size={18} />,
      accessor: (row: SalesReturnListData) => (
        <div className="relative menu-container">
          <button
            className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
            onClick={() => toggleMenu(row.billReturnId)}
          >
            <BsThreeDotsVertical size={18} />
          </button>

          {openMenuId === row.billReturnId && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-xl rounded-lg z-10 border border-gray-200">
              <Link
                href={`/dashboard/salesReturn/components/${row.billReturnId}`}
                className="block w-full px-4 py-3 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg transition-colors duration-150"
              >
                View
              </Link>
            </div>
          )}
        </div>
      ),
    },
  ];

  const handleCreateReturn = () => setShowSalesReturn(true);

  return (
    <>
      {showDeleteModal && (
        <Modal
          message="Are you sure you want to delete this sales return?"
          secondaryMessage="This action cannot be undone."
          bgClassName="bg-red-500"
          onConfirm={handleDeleteReturn}
          onCancel={() => {
            setShowDeleteModal(false);
            setSelectedReturnId(null);
          }}
        />
      )}

      {!showSalesReturn ? (
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-darkPurple text-3xl font-medium">
              Sales Return List
            </h1>
            <div className="flex space-x-4">
              <div>
                <Input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search Table"
                  className="w-80 border-gray-300"
                  icon={<Search size={18} />}
                />
              </div>
              <div>
                <Button
                  onClick={handleCreateReturn}
                  label="New Sales Return"
                  className="w-44 bg-darkPurple text-white h-11"
                  icon={<Plus size={15} />}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
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
              noDataMessage="No sales returns found"
            />
          )}
        </main>
      ) : (
        <SalesReturn
          setShowCreateReturn={setShowSalesReturn}
          onSuccess={() => {
            fetchSalesReturnData();
            setShowSalesReturn(false);
          }}
          bills={bills}
        />
      )}
    </>
  );
};

export default Page;