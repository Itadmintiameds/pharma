"use client";

import React, { useState } from "react";
import AddProducts from "./AddProducts";
import Input from "@/app/components/common/Input";
import Image from "next/image";

const GoodsReceipt = () => {
  const [showAddProducts, setShowAddProducts] = useState(false);

  if (showAddProducts) {
    return <AddProducts />;
  }

  const [paymentType, setPaymentType] = useState<"" | "CASH" | "CREDIT">("");
  const [creditDays, setCreditDays] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

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

        <div className="h-50 bg-white p-4 border border-pneutral-100 rounded-xl">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Supplier Name"
              placeholder="ABC Pharma Distributor"
              type="text"
              name="supplierName"
              id="supplierName"
              required
            />

            <Input
              label="Invoice No."
              placeholder="INV-2507/16-001"
              type="text"
              name="invoiceNo"
              id="invoiceNo"
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

            <Input
              label="GRN No."
              type="text"
              name="grnNo"
              id="grnNo"
              required
            />
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
          <button className="w-27 h-9 rounded-lg bg-white border border-pneutral-50 shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:shadow-md transition-all duration-200 text-label-l3 font-medium text-pneutral-900">
            Cancel
          </button>
          <button className="w-27 h-9 text-label-l3 font-medium rounded-lg text-pneutral-50 bg-primary-800">
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default GoodsReceipt;
