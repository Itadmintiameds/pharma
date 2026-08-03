"use client";

import React, { useState, useEffect } from "react";
import AddProducts from "./AddProducts";
import Input from "@/app/components/common/Input";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
import Image from "next/image";
import { usePurchaseStore } from "@/store/usePurchaseStore";
import { getAllSupplier, createSupplier } from "@/services/SupplierService";
import { SupplierData } from "@/types/SupplierData";
import toast from "react-hot-toast";

interface GoodsReceiptProps {
  onClose?: () => void;
}

const GoodsReceipt: React.FC<GoodsReceiptProps> = ({ onClose }) => {
  const { 
    setPurchaseHeader, 
    supplierId, 
    supplierName: storeSupplierName,
    invoiceNo: storeInvoiceNo, 
    invoiceDate: storeInvoiceDate, 
    paymentType: storePaymentType, 
    creditDays: storeCreditDays 
  } = usePurchaseStore();

  const [showAddProducts, setShowAddProducts] = useState(false);
  const [supplierName, setSupplierName] = useState(storeSupplierName || "");
  const [invoiceNo, setInvoiceNo] = useState(storeInvoiceNo || "");
  const [invoiceDate, setInvoiceDate] = useState(storeInvoiceDate || "");
  const [paymentType, setPaymentType] = useState<"" | "CASH" | "CREDIT">(storePaymentType || "");
  const [creditDays, setCreditDays] = useState(storeCreditDays ? String(storeCreditDays) : "");

  // Supplier Master states
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(supplierId || null);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoadingSuppliers(true);
        const data = await getAllSupplier();
        setSuppliers(data || []);
        if (supplierId && data && data.length > 0) {
          const matched = data.find((s) => s.supplierId === supplierId);
          if (matched && matched.supplierId) {
            setSelectedSupplierId(matched.supplierId);
            setSupplierName(matched.supplierName);
          }
        }
      } catch (error) {
        console.error("Failed to load suppliers:", error);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, [supplierId]);

  const supplierOptions: DropdownOption[] = [
    ...suppliers.map((s) => ({ label: s.supplierName, value: s.supplierId || "" })),
    { label: "+ Add New Supplier", value: "ADD_NEW" },
  ];

  const handleNext = async () => {
    if (!invoiceNo.trim()) {
      toast.error("Please enter Invoice No.");
      return;
    }
    if (!invoiceDate) {
      toast.error("Please select Invoice Date");
      return;
    }
    if (!paymentType) {
      toast.error("Please select Payment Type");
      return;
    }
    if (paymentType === "CREDIT" && !creditDays) {
      toast.error("Please enter Credit Days");
      return;
    }

    let finalSupplierId = selectedSupplierId;
    let finalSupplierName = supplierName;

    if (isAddingNewSupplier) {
      if (!newSupplierName.trim()) {
        toast.error("Please enter the new Supplier Name");
        return;
      }
      try {
        setIsCreatingSupplier(true);
        const created = await createSupplier({ supplierName: newSupplierName.trim() });
        finalSupplierId = created.supplierId || null;
        finalSupplierName = created.supplierName || newSupplierName.trim();
        toast.success("New supplier created successfully!");
      } catch (error) {
        toast.error("Failed to create supplier");
        setIsCreatingSupplier(false);
        return;
      } finally {
        setIsCreatingSupplier(false);
      }
    } else {
      if (!finalSupplierId) {
        toast.error("Please select a supplier");
        return;
      }
    }

    setPurchaseHeader({
      supplierId: finalSupplierId!,
      supplierName: finalSupplierName,
      invoiceNo,
      invoiceDate,
      paymentType,
      creditDays: creditDays ? Number(creditDays) : 0,
    });
    setShowAddProducts(true);
  };

  if (showAddProducts) {
    return <AddProducts onClose={onClose} />;
  }

  const paymentDueDate =
    invoiceDate && creditDays
      ? (() => {
          const due = new Date(invoiceDate);
          due.setDate(due.getDate() + Number(creditDays));

          return due.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        })()
      : "";
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-pneutral-900">
          <div className="text-h4 font-semibold">Goods Receipt</div>
          <div className="text-p3 font-normal font-noto-sans">
            Add product from supplier invoice
          </div>
        </div>

        <div className="min-h-[180px] bg-white p-4 border border-pneutral-100 rounded-xl">
          <div className="grid grid-cols-3 gap-4 items-start">
            {!isAddingNewSupplier ? (
              <Dropdown
                label="Supplier Name"
                placeholder="Select Supplier or Add New"
                required
                options={supplierOptions}
                value={selectedSupplierId || ""}
                isLoading={isLoadingSuppliers}
                onChange={(val) => {
                  if (val === "ADD_NEW") {
                    setIsAddingNewSupplier(true);
                    setSelectedSupplierId(null);
                    setSupplierName("");
                  } else {
                    const id = Number(val);
                    setSelectedSupplierId(id);
                    const selected = suppliers.find((s) => s.supplierId === id);
                    if (selected) setSupplierName(selected.supplierName);
                  }
                }}
              />
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] text-secondary-600 font-semibold">New Supplier</span>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingNewSupplier(false)} 
                    className="text-[11px] text-primary-600 underline hover:text-primary-800 font-medium"
                  >
                    Select Existing
                  </button>
                </div>
                <Input
                  label="Enter Supplier Name"
                  placeholder="e.g. ABC Pharma Distributor"
                  type="text"
                  name="newSupplierName"
                  id="newSupplierName"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  required
                />
              </div>
            )}

            <Input
              label="Invoice No."
              placeholder="INV-2507/16-001"
              type="text"
              name="invoiceNo"
              id="invoiceNo"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              required
            />

            <Input
              label="Invoice Date"
              type="date"
              name="invoiceDate"
              id="invoiceDate"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />

            {/* GRN No. is generated by /purchase/create — not captured here. */}
          </div>
        </div>

        <div className="bg-white p-4 border border-pneutral-100 rounded-xl">
          <div className="text-label-l4 font-medium text-pneutral-900">
            Payment Type
            <span className="ml-2 text-warning-500 font-semibold text-label-l2">
              *
            </span>
          </div>

          <div className="grid grid-cols-[1fr_1fr_400px] gap-4 items-end">
            {" "}
            <label
              className={`h-12 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all border-2
    ${
      paymentType === "CASH"
        ? "border-secondary-600 "
        : "border-transparent bg-white"
    }`}
            >
              <input
                type="radio"
                name="paymentType"
                value="CASH"
                checked={paymentType === "CASH"}
                onChange={() => setPaymentType("CASH")}
                className="accent-secondary-600"
              />
              <span className="text-p4 font-medium">Cash</span>
            </label>
            <label
              className={`h-12 flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all border-2
    ${
      paymentType === "CREDIT"
        ? "border-secondary-600"
        : "border-transparent bg-white"
    }`}
            >
              <input
                type="radio"
                name="paymentType"
                value="CREDIT"
                checked={paymentType === "CREDIT"}
                onChange={() => setPaymentType("CREDIT")}
                className="accent-[#7D32FC]"
              />
              <span className="text-p4 font-medium">Credit</span>
            </label>
            {paymentType === "CREDIT" && (
              <Input
                label="Credit Days"
                placeholder="30 Days"
                type="number"
                name="creditDays"
                id="creditDays"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                required
              />
            )}
          </div>
        </div>

        {paymentType === "CREDIT" && creditDays && invoiceDate && (
          <div className="h-19.5 p-4 flex items-center gap-4 border border-warning-600 rounded-[20px] bg-warning-50 text-warning-600">
            <Image
              src="/Purchase/InfoIcon.svg"
              alt="Edit"
              width={30}
              height={30}
              className="shrink-0"
            />

            <div className="flex flex-col">
              <div className="text-p4 font-bold font-noto-sans">
                Payment Due Date
              </div>
              <div className="text-p3 font-semibold font-noto-sans">
                {paymentDueDate}
                <span className="text-sm font-normal">
                  ({creditDays} days from invoice date)
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-6 right-6 flex gap-4">
          <button 
            onClick={() => {
              usePurchaseStore.getState().resetPurchase();
              if (onClose) onClose();
            }}
            className="w-27 h-9 rounded-lg bg-white border border-pneutral-50 shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:shadow-md transition-all duration-200 text-label-l3 font-medium text-pneutral-900"
          >
            Cancel
          </button>
          <button
            className="w-27 h-9 text-label-l3 font-medium rounded-lg text-pneutral-50 bg-primary-800 disabled:opacity-50"
            onClick={handleNext}
            disabled={isCreatingSupplier || isLoadingSuppliers}
          >
            {isCreatingSupplier ? "Creating..." : "Next"}
          </button>
        </div>
      </div>
    </>
  );
};

export default GoodsReceipt;
