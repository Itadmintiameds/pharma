"use client";

import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import { Plus, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import PurchaseEntry from "./components/PurchaseEntry";
import { PurchaseEntryData } from "@/app/types/PurchaseEntry";
import PaginationTable from "@/app/components/common/PaginationTable";
import {
  getPurchase,
} from "@/app/services/PurchaseEntryService";
import { getSupplierById } from "@/app/services/SupplierService";
import { BsThreeDotsVertical } from "react-icons/bs";
import Link from "next/link";
import { format } from "date-fns";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";
import Loader from "@/app/components/common/Loader";

const Page = () => {
  const [showPurchasEntry, setShowPurchasEntry] = useState(false);
  const [purchaseEntryData, setPurchaseEntryData] = useState<
    PurchaseEntryData[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const toggleMenu = (invId?: string) => {
    setOpenMenuId((prev) => (prev === invId ? null : invId || null));
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

  const fetchSupplier = async (supplierId: string): Promise<string> => {
    try {
      const supplier = await getSupplierById(supplierId.trim());

      if (!supplier || !supplier.supplierName) {
        console.warn(`Supplier not found for ID: ${supplierId} in frontend`);
        return "Unknown Supplier1";
      }

      return supplier.supplierName;
    } catch (error) {
      console.error(`Error fetching supplier for ID ${supplierId}:`, error);
      return "Unknown Supplier2";
    }
  };

  useEffect(() => {
    const fetchPurchaseEntry = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getPurchase();

        if (!response?.data || response.status !== "success") {
          throw new Error("Failed to fetch purchases");
        }

        const purchases: PurchaseEntryData[] = response.data;

        const purchasesWithSuppliers = await Promise.all(
          purchases.map(async (purchase) => {
            const supplierName = await fetchSupplier(purchase.supplierId);

            let dueStatus: string = "—";

            if (purchase.paymentStatus === "Paid") {
              dueStatus = "Payment Cleared";
            } else if (purchase.paymentDueDate) {
              const dueDate = new Date(purchase.paymentDueDate);
              const currentDate = new Date();
              dueDate.setHours(0, 0, 0, 0);
              currentDate.setHours(0, 0, 0, 0);

              const timeDiff = dueDate.getTime() - currentDate.getTime();
              const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

              if (daysLeft < 0) dueStatus = "Overdue";
              else if (daysLeft === 0) dueStatus = "Due Today";
              else dueStatus = `${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
            }

            return { ...purchase, supplierName, dueStatus };
          })
        );

        setPurchaseEntryData(
          purchasesWithSuppliers.sort(
            (a, b) =>
              new Date(b.purchaseDate).getTime() -
              new Date(a.purchaseDate).getTime()
          )
        );
      } catch (error) {
        console.error("Error fetching purchases:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseEntry();
  }, []);

  const handlePurchesEntry = () => {
    setShowPurchasEntry(true);
  };

  const formatDate = (date: string | Date): string => {
    const parsedDate = typeof date === "string" ? new Date(date) : date;
    return format(parsedDate, "dd-MM-yyyy");
  };

  const [sortConfig, setSortConfig] = useState<{
    key: keyof PurchaseEntryData | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const handleSort = (key: keyof PurchaseEntryData) => {
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
    }

    return sorted;
  };

  // const handleConfirmPayment = async (invId: string) => {
  //   try {
  //     await confirmPurchasePayment(invId);
  //     toast.success("Payment status updated to Paid", {
  //       position: "top-right",
  //       autoClose: 3000,
  //     });
  //     window.location.reload();
  //   } catch (error) {
  //     console.log(error);
  //     toast.error("Failed to update payment status", {
  //       position: "top-right",
  //       autoClose: 3000,
  //     });
  //   }
  // };

  const columns = [
    {
      header: (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleSort("grnNo")}
        >
          <span>GRN No</span>
          {sortConfig.key === "grnNo" ? (
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
      accessor: "grnNo" as keyof PurchaseEntryData,
    },
    {
      header: "Supplier Name",
      accessor: "supplierName" as keyof PurchaseEntryData,
    },
    {
      header: "Purchase Date",
      accessor: (row: PurchaseEntryData) => formatDate(row.purchaseDate),
    },
    {
      header: "Invoice No.",
      accessor: "purchaseBillNo" as keyof PurchaseEntryData,
    },
    {
      header: "Invoice Amount",
      accessor: "grandTotal" as keyof PurchaseEntryData,
    },
    {
      header: "Due In (Days)",
      accessor: (row: PurchaseEntryData) => {
        const status = row.dueStatus?.toLowerCase();

        const textClass =
          status === "due today"
            ? "text-warning"
            : status === "overdue"
              ? "text-danger"
              : status === "payment cleared"
                ? "text-green"
                : "";

        const bgClass =
          status === "due today"
            ? "bg-warning2"
            : status === "overdue"
              ? "bg-danger"
              : status === "payment cleared"
                ? "bg-green2"
                : "";

        return (
          <>
            <span
              className={`inline-block w-2 h-2 rounded-full ${bgClass}`}
            ></span>
            <span
              className={`px-2 py-1 rounded-xl text-sm font-medium ${textClass}`}
            >
              {row.dueStatus}
            </span>
          </>
        );
      },
    },

    {
      header: "Payment Status",
      accessor: (row: PurchaseEntryData) => {
        const isPending = row.paymentStatus?.toLowerCase() === "pending";

        const bgClass = isPending ? "bg-warning" : "bg-green";
        const textClass = isPending ? "text-warning" : "text-green";

        return (
          <span
            className={`px-2 py-1 rounded-xl text-sm font-medium ${bgClass} ${textClass}`}
          >
            {row.paymentStatus}
          </span>
        );
      },
    },

    {
      header: "Goods Status",
      accessor: (row: PurchaseEntryData) => {
        const isReceived = row.goodStatus?.toLowerCase() === "received";

        const bgClass = isReceived ? "bg-green2" : "bg-warning2";
        const textClass = isReceived ? "text-green" : "text-warning";

        return (
          <>
            <span
              className={`inline-block w-2 h-2 rounded-full ${bgClass}`}
            ></span>
            <span
              className={`px-2 py-1 rounded-xl text-sm font-medium ${textClass}`}
            >
              {row.goodStatus}
            </span>
          </>
        );
      },
    },
    {
      header: <BsThreeDotsVertical size={18} />,
      accessor: (row: PurchaseEntryData) => (
        <div className="relative menu-container">
          <button
            className="p-2 rounded-full hover:bg-gray-200 cursor-pointer"
            onClick={() => toggleMenu(row.invId)}
          >
            <BsThreeDotsVertical size={18} />
          </button>

          {openMenuId === row.invId && (
            <div className="absolute right-0 mt-2 min-w-[160px] bg-white shadow-xl rounded-lg transition-opacity duration-200 z-10 whitespace-nowrap">
              <Link
                href={`/dashboard/orderSummary?id=${row.invId}`}
                className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg"
              >
                View
              </Link>

              <button className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg">
                Edit
              </button>

              <button className="block w-full px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-purple-950 hover:text-white hover:rounded-lg">
                Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  const filteredData = purchaseEntryData
    .filter((item) => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const purchaseDate = new Date(item.purchaseDate);
      return purchaseDate >= oneMonthAgo;
    })
    .filter((item) => {
      const search = searchText.toLowerCase();

      const purchaseDateFormatted = format(
        new Date(item.purchaseDate),
        "dd-MM-yyyy"
      );

      return (
        item.grnNo?.toLowerCase().includes(search) ||
        item.supplierName?.toLowerCase().includes(search) ||
        purchaseDateFormatted.toLowerCase().includes(search) ||
        item.purchaseBillNo?.toLowerCase().includes(search) ||
        item.grandTotal?.toString().toLowerCase().includes(search) ||
        item.paymentStatus?.toString().toLowerCase().includes(search) ||
        item.goodStatus?.toString().toLowerCase().includes(search)
      );
    });

  return (
    <>
      {!showPurchasEntry && (
        <main className="space-y-10">
          <div className="flex justify-between">
            <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
              Purchase List
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
                    onClick={() => handlePurchesEntry()}
                    label="Filter"
                    value=""
                    className="w-24 text-black h-11"
                    icon={<Filter size={15} />}
                  ></Button>
                </div> */}
                <div>
                  <Button
                    onClick={() => handlePurchesEntry()}
                    label="New Purchase Entry"
                    value=""
                    className="w-52 bg-darkPurple text-white h-11 "
                    icon={<Plus size={15} />}
                  ></Button>
                </div>
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
              noDataMessage="No purchase records found"
            />
          )}
        </main>
      )}

      {showPurchasEntry && (
        <PurchaseEntry setShowPurchaseEntry={setShowPurchasEntry} />
      )}
    </>
  );
};

export default Page;