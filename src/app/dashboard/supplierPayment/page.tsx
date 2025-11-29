"use client";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import Table from "../../components/common/Table";
import { PurchaseEntryData } from "@/app/types/PurchaseEntry";
import AsyncSelect from "react-select/async";
import { customSelectStyles } from "../../components/common/DropdownStyle";
import { getSupplier } from "@/app/services/SupplierService";
import { supplierPayment } from "@/app/services/PurchaseEntryService";
import { getCreditNote } from "@/app/services/PurchaseReturnService";
import Button from "../../components/common/Button";
import Drawer from "@/app/components/common/Drawer";
import SupplierPayment from "./components/SupplierPayment";

type SupplierOption = {
  label: string;
  value: string;
};

interface Supplier {
  supplierId: string;
  supplierName: string;
}

const Page = () => {
  const [purchaseEntry, setPurchaseEntry] = useState<PurchaseEntryData[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");
  const [selectedSupplier, setSelectedSupplier] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSupplierPayment, setShowSupplierPayment] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [creditNoteValue, setCreditNoteValue] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedBills = useMemo(
    () =>
      purchaseEntry
        .map((row, index) => ({ row, index }))
        .filter(({ index }) => selectedRows.has(index))
        .map(({ row }) => ({
          billNo: row.purchaseBillNo,
          amount: row.grandTotal ?? 0,
          invId: row.invId,
        })),
    [selectedRows, purchaseEntry]
  );

  // const loadSupplierOptions = useCallback(async (inputValue: string) => {
  //   try {
  //     const suppliers = await getSupplier();
  //     const mapped = (suppliers || [])
  //       .map((s: any) => ({ label: s.supplierName, value: s.supplierId }))
  //       .filter((opt: { label: string; value: string }) =>
  //         inputValue
  //           ? opt.label.toLowerCase().startsWith(inputValue.toLowerCase())
  //           : true
  //       );
  //     return mapped;
  //   } catch (e) {
  //     return [];
  //   }
  // }, []);

  const loadSupplierOptions = useCallback(
    async (inputValue: string): Promise<{ label: string; value: string }[]> => {
      try {
        const suppliers: Supplier[] = await getSupplier();

        return suppliers
          .map((s) => ({
            label: s.supplierName,
            value: s.supplierId,
          }))
          .filter((opt) =>
            inputValue
              ? opt.label.toLowerCase().startsWith(inputValue.toLowerCase())
              : true
          );
      } catch (error) {
        console.error("Failed to load suppliers:", error);
        return [];
      }
    },
    []
  );

  const fetchCreditNote = useCallback(async (supplierId: string) => {
    try {
      const creditNote = await getCreditNote(supplierId);
      setCreditNoteValue(creditNote || 0);
    } catch (error) {
      console.error("Error fetching credit note:", error);
      setCreditNoteValue(0);
    }
  }, []);

  const fetchSupplierPayments = useCallback(async () => {
    if (!selectedSupplier?.value) return;
    try {
      setIsLoading(true);
      const status = activeTab === "unpaid" ? "Pending" : "Paid";
      const response = await supplierPayment(status, selectedSupplier.value);
      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      console.log("Data Printtt-----", data);

      setPurchaseEntry(data as PurchaseEntryData[]);

      // Fetch credit note for the selected supplier
      await fetchCreditNote(selectedSupplier.value);
    } catch {
      setPurchaseEntry([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedSupplier, fetchCreditNote]);

  React.useEffect(() => {
    fetchSupplierPayments();
  }, [fetchSupplierPayments]);

const handleRowSelect = useCallback((index: number) => {
  setSelectedRows(prev => {
    const newSelectedRows = new Set(prev);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
    } else {
      newSelectedRows.add(index);
    }
    return newSelectedRows;
  });
}, []);

const handleSelectAll = useCallback(() => {
  setSelectedRows(prev => {
    if (prev.size === purchaseEntry.length) {
      return new Set();
    } else {
      return new Set(purchaseEntry.map((_, index) => index));
    }
  });
}, [purchaseEntry]);

  const openSupplierPaymentDrawer = () => setShowSupplierPayment(true);
  const closeSupplierPaymentDrawer = () => setShowSupplierPayment(false);

  const columns: {
    header: string | React.ReactNode;
    accessor:
      | keyof PurchaseEntryData
      | ((row: PurchaseEntryData, index: number) => React.ReactNode);
    className?: string;
  }[] = useMemo(() => {
    const base: {
      header: string | React.ReactNode;
      accessor:
        | keyof PurchaseEntryData
        | ((row: PurchaseEntryData, index: number) => React.ReactNode);
      className?: string;
    }[] = [
      {
        header: "Invoice Number",
        accessor: "purchaseBillNo",
        className: "text-left",
      },

      {
        header: "Purchase Date",
        accessor: (row: PurchaseEntryData) => {
          return row.purchaseDate
            ? new Date(row.purchaseDate).toLocaleDateString()
            : "";
        },
        className: "text-left",
      },
      {
        header: "Purchase Due Date",
        accessor: (row: PurchaseEntryData) => {
          return row.paymentDueDate
            ? new Date(row.paymentDueDate).toLocaleDateString()
            : "";
        },
        className: "text-left",
      },

      {
        header: "Due In (Days)",
        accessor: (row: PurchaseEntryData) => {
          let dueStatus: string = "—";

          if (row.paymentStatus === "Paid") {
            dueStatus = "Payment Cleared";
          } else if (row.paymentDueDate) {
            const dueDate = new Date(row.paymentDueDate);
            const currentDate = new Date();
            dueDate.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);

            const timeDiff = dueDate.getTime() - currentDate.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) dueStatus = "Overdue";
            else if (daysLeft === 0) dueStatus = "Due Today";
            else dueStatus = `${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
          }

          const status = dueStatus.toLowerCase();

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
                {dueStatus}
              </span>
            </>
          );
        },
      },

      {
        header: "Invoice Amount",
        accessor: (row: PurchaseEntryData) => {
          return row.grandTotal ? `₹${row.grandTotal.toLocaleString()}` : "";
        },
        className: "text-left",
      },
    ];

    if (activeTab === "unpaid") {
      base.unshift({
        header: (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={
                purchaseEntry.length > 0 &&
                selectedRows.size === purchaseEntry.length
              }
              onChange={handleSelectAll}
              className="w-4 h-4 bg-gray-100 border-gray-300 rounded accent-[#4B0082] focus:ring-[#4B0082] cursor-pointer"
            />
            <span className="ml-2">Select</span>
          </div>
        ),
        accessor: (row: PurchaseEntryData, index: number) => (
          <input
            type="checkbox"
            checked={selectedRows.has(index)}
            onChange={() => handleRowSelect(index)}
            className="w-4 h-4 bg-gray-100 border-gray-300 rounded accent-[#4B0082] focus:ring-[#4B0082] cursor-pointer"
          />
        ),
        className: "text-center w-20",
      });
    }

    return base;
  }, [activeTab, purchaseEntry.length, selectedRows, handleRowSelect, handleSelectAll]);

  return (
    <>
      {showSupplierPayment && (
        <Drawer
          setShowDrawer={closeSupplierPaymentDrawer}
          title={"Supplier Payment Details"}
        >
          <SupplierPayment
            supplierName={selectedSupplier?.label ?? ""}
            supplierId={selectedSupplier?.value ?? ""}
            bills={selectedBills}
            creditNoteAmount={creditNoteValue}
            onSuccess={() => {
              closeSupplierPaymentDrawer();
              fetchSupplierPayments();
            }}
          />
        </Drawer>
      )}

      <main className="space-y-10">
        <div className="flex justify-between">
          <div className="justify-start text-darkPurple text-3xl font-medium leading-10">
            Supplier Payment
          </div>

          <div>
            <div className="flex space-x-4">
              <div></div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex text-base font-normal gap-5 text-gray">
            <div
              className={`cursor-pointer transition-colors ${
                activeTab === "unpaid"
                  ? "text-[#442060]"
                  : "hover:text-[#442060]"
              }`}
              onClick={() => {
                setActiveTab("unpaid");
              }}
            >
              Unpaid Dues
            </div>
            <div
              className={`cursor-pointer transition-colors ${
                activeTab === "paid" ? "text-[#442060]" : "hover:text-[#442060]"
              }`}
              onClick={() => {
                setActiveTab("paid");
              }}
            >
              Paid Dues
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {isMounted ? (
              <AsyncSelect<SupplierOption>
                cacheOptions
                loadOptions={loadSupplierOptions}
                isClearable
                value={selectedSupplier}
                onChange={(val) => {
                  const v = val ?? null;
                  setSelectedSupplier(v);
                  if (!v) {
                    setPurchaseEntry([]);
                    setCreditNoteValue(0);
                  }
                }}
                styles={customSelectStyles<SupplierOption>()}
                placeholder="Select supplier..."
                className="w-72"
              />
            ) : (
              <div className="w-72 h-10 bg-gray-100 rounded" />
            )}
            {activeTab === "unpaid" && selectedSupplier?.value && (
              <div className="flex items-center gap-4">
                <Button
                  label={
                    selectedRows.size > 0
                      ? "Confirm Payment"
                      : "Confirm Payment"
                  }
                  onClick={openSupplierPaymentDrawer}
                  disabled={selectedRows.size === 0}
                  title={selectedRows.size === 0 ? "Select bill no" : undefined}
                  className={`px-4 text-white transition-colors duration-150 ${
                    selectedRows.size > 0
                      ? "bg-[#4B0082] hover:bg-[#3a006b]"
                      : "bg-gray-300 text-gray-600 border-gray-300"
                  }`}
                />
                {creditNoteValue > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondaryRed  rounded-lg">
                    <span className="text-sm font-medium text-Red">
                      Credit Note:
                    </span>
                    <span className="text-sm font-bold text-red-900">
                      ₹{creditNoteValue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border border-b-0 text-[#B5B3B3] mt-2"></div>
        </div>

        <Table
          data={purchaseEntry}
          columns={columns}
          noDataMessage={isLoading ? "Loading..." : "No data found"}
        />
      </main>
    </>
  );
};

export default Page;
