"use client";

import Input from "@/app/components/common/Input";
import { WarehouseDetails } from "@/types/SetupWarehouseData";
import Image from "next/image";
import React, { useState } from "react";

// Per-field format rules (length is capped separately via maxLength=50)
const FIELD_RULES: Partial<
  Record<keyof WarehouseDetails, { regex: RegExp; message: string }>
> = {
  warehouseName: {
    regex: /^[a-zA-Z0-9 ]+$/,
    message: "Only letters and numbers are allowed.",
  },
  warehouseCode: {
    regex: /^[a-zA-Z0-9-]+$/,
    message: "Only letters, numbers and hyphens are allowed.",
  },
  contactPersonName: {
    regex: /^[a-zA-Z ]+$/,
    message: "Only letters are allowed.",
  },
};

interface SetupWarehouseProps {
  manageCentrally: boolean | null;
  setManageCentrally: (val: boolean) => void;
  warehouse: WarehouseDetails;
  setWarehouse: React.Dispatch<React.SetStateAction<WarehouseDetails>>;
  showWarehouseForm?: boolean;
  errors?: Record<string, string>;
}

const CENTRAL_OPTIONS = [
  {
    value: true,
    title: "Yes, we manage products centrally",
    description:
      "We receive products in a central warehouse and supply to our branches",
    image: "/BusinessSetup/Warehouse1.svg",
    alt: "Central warehouse",
  },
  {
    value: false,
    title: "No, we manage products at location level",
    description:
      "We purchase and manage products at each location independently",
    image: "/BusinessSetup/Pharmacy01.svg",
    alt: "Location level",
  },
];

export default function SetupWarehouse({
  manageCentrally,
  setManageCentrally,
  warehouse,
  setWarehouse,
  showWarehouseForm = false,
  errors = {},
}: SetupWarehouseProps) {
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof WarehouseDetails, string>>
  >({});

  const validateField = (field: keyof WarehouseDetails, value: string) => {
    const rule = FIELD_RULES[field];
    const message = value && rule && !rule.regex.test(value) ? rule.message : "";
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const updateField =
    (field: keyof WarehouseDetails) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setWarehouse((prev) => ({ ...prev, [field]: value }));
        validateField(field, value);
      };

  const errorFor = (field: keyof WarehouseDetails) =>
    fieldErrors[field] || errors[field];

  return (
    <div className="flex flex-col gap-6 w-full select-none">
      {/* Product Maintenance Card — hidden once the warehouse form is shown */}
      {!showWarehouseForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col items-center gap-4">
          {/* Top Icon */}
          <div className="p-8 rounded-full bg-[#EBE3FE] flex items-center justify-center">
            <Image
              src="/BusinessSetup/Warehouse.svg"
              alt="Product maintenance"
              width={96}
              height={96}
              className="object-contain"
            />
          </div>

          {/* Question Heading */}
          <h2 className="text-h4 font-semibold text-pneutral-900 text-center">
            Do you manage your products centrally?
          </h2>

          {/* Radio Option Cards — stacked full width */}
          <div className="w-full flex flex-col gap-4">
            {CENTRAL_OPTIONS.map((option) => {
              const isSelected = manageCentrally === option.value;

              return (
                <div
                  key={String(option.value)}
                  onClick={() => setManageCentrally(option.value)}
                  className={`w-full p-3 gap-4 rounded-[20px] border flex items-center cursor-pointer transition-all duration-200 select-none ${isSelected
                    ? "border-[#EBE3FE] bg-[#F8F5FF]"
                    : "border-pneutral-100 bg-white hover:border-pneutral-300"
                    }`}
                >
                  {/* Custom Radio Button Indicator */}
                  <div className="flex items-center justify-center shrink-0">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-secondary-700 flex items-center justify-center ring-4 ring-[#E1E1FE]/70">
                        <svg
                          className="w-3.5 h-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-[1.5px] border-pneutral-200 bg-white" />
                    )}
                  </div>

                  {/* Large circular image */}
                  <div
                    className={`shrink-0 w-[110px] h-[110px] rounded-full flex items-center justify-center ${isSelected ? "bg-[#EBE3FE]" : "bg-pneutral-100"
                      }`}
                  >
                    <Image
                      src={option.image}
                      alt={option.alt}
                      width={66}
                      height={66}
                      className="object-contain"
                    />
                  </div>

                  {/* Description Text */}
                  <div className="flex flex-col justify-center gap-1">
                    <span className="text-[20px] leading-7 font-semibold text-pneutral-900 font-work-sans">
                      {option.title}
                    </span>
                    <span className="text-p4 font-normal text-pneutral-700 font-noto-sans">
                      {option.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Central Warehouse Details Card — after Continue when managing centrally */}
      {manageCentrally === true && showWarehouseForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
          {/* Header Block */}
          <div className="flex flex-col gap-1 text-pneutral-900">
            <h2 className="text-h6 font-semibold">Enter minimal details of your central warehouse</h2>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full">
            <Input
              label="Warehouse Name"
              placeholder="MedPlus Healthcare"
              value={warehouse.warehouseName}
              onChange={updateField("warehouseName")}
              error={errorFor("warehouseName")}
              maxLength={50}
              required
            />

            <Input
              label="Code (Optional)"
              placeholder="WH-001"
              value={warehouse.warehouseCode}
              onChange={updateField("warehouseCode")}
              error={errorFor("warehouseCode")}
              maxLength={50}
            />

            {/* Address — required, multiline */}
            <div className="w-full col-span-2">
              <label className="mb-1 block text-label-l4 font-medium text-pneutral-900">
                Address
                <span className="ml-2 text-warning-500 font-semibold text-label-l2">
                  *
                </span>
              </label>
              <textarea
                placeholder="Enter warehouse address"
                value={warehouse.warehouseAddress}
                onChange={(e) =>
                  setWarehouse((prev) => ({
                    ...prev,
                    warehouseAddress: e.target.value,
                  }))
                }
                className={`w-full min-h-[100px] resize-none rounded-md border bg-white px-3 py-3 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500 transition-all ${errors.warehouseAddress
                  ? "border-warning-500"
                  : "border-pneutral-300"
                  }`}
              />
              {errors.warehouseAddress && (
                <p className="mt-1 text-p2 text-warning-500">
                  {errors.warehouseAddress}
                </p>
              )}
            </div>

            <Input
              label="Contact Person (Optional)"
              placeholder="name"
              value={warehouse.contactPersonName}
              onChange={updateField("contactPersonName")}
              error={errorFor("contactPersonName")}
              maxLength={50}
            />

            {/* Mobile Number — optional, +91 prefix */}
            <div className="w-full">
              <label className="mb-1 block text-label-l4 font-medium text-pneutral-900">
                Mobile Number (Optional)
              </label>
              <div
                className={`flex h-12 w-full items-center rounded-md border bg-white transition-all ${errors.mobileNumber
                  ? "border-warning-500"
                  : "border-pneutral-300"
                  }`}
              >
                <select className="h-full bg-pneutral-50 border-r border-pneutral-300 px-3 text-p4 text-pneutral-900 outline-none rounded-l-md">
                  <option>+91</option>
                </select>
                <input
                  type="text"
                  placeholder="Enter company phone"
                  className="h-full w-full bg-transparent px-4 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500"
                  value={warehouse.mobileNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^[0-9]+$/.test(val)) {
                      if (val.length <= 10) {
                        setWarehouse((prev) => ({
                          ...prev,
                          mobileNumber: val,
                        }));
                      }
                    }
                  }}
                />
              </div>
              {errors.mobileNumber && (
                <p className="mt-1 text-p2 text-warning-500">
                  {errors.mobileNumber}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
