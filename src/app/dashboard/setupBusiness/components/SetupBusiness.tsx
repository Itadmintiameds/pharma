"use client";

import React, { useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";

export default function SetupBusinessView() {
  const [businessName, setBusinessName] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  
  // Location type selection: "single" or "multiple"
  const [locationType, setLocationType] = useState<"single" | "multiple">("single");

  return (
    <div className="flex flex-col gap-6 w-full select-none">
      
      {/* Title */}
      <h1 className="font-work-sans font-semibold text-[24px] leading-[44px] text-pneutral-900">
        Setup Your Business
      </h1>

      {/* Business Details Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
        {/* Header Block */}
        <div className="flex flex-col gap-1 text-pneutral-900">
          <h2 className="text-h6 font-semibold">
            Business Details
          </h2>
          <p className="text-p4 font-normal font-noto-sans text-pneutral-500">
            Enter your business information
          </p>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 gap-6 w-full">
          <Input
            label="Business Name"
            placeholder="MedPlus Healthcare"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
          <Input
            label="Ownership Type"
            placeholder="Proprietorship"
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value)}
          />
          <Input
            label="PAN Number (Optional)"
            placeholder="ASDF1212AS"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value)}
          />
          <Input
            label="GST Number (Optional)"
            placeholder="46SSDSF123S556"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Location Details Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
        {/* Header Block */}
        <div className="flex flex-col gap-1 text-pneutral-900">
          <h2 className="text-h6 font-semibold">
            Location Details
          </h2>
          <p className="text-p4 font-normal font-noto-sans text-pneutral-500">
            Select location type
          </p>
        </div>

        {/* Radio Option Cards */}
        <div className="w-full grid grid-cols-2 gap-[16px]">
          
          {/* One Location Option */}
          <div 
            onClick={() => setLocationType("single")}
            className={`w-full h-[94px] p-[12px] gap-[16px] rounded-[20px] border flex items-center cursor-pointer transition-all duration-200 select-none ${
              locationType === "single" 
                ? "border-[#EBE3FE] bg-[#F8F5FF]" 
                : "border-pneutral-200 bg-white hover:border-pneutral-300"
            }`}
          >
            {/* Custom Radio Button Indicator */}
            <div className="flex items-center justify-center shrink-0">
              {locationType === "single" ? (
                <div className="w-[20px] h-[20px] rounded-full bg-[#6C5CE7] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-[20px] h-[20px] rounded-full border border-pneutral-300 bg-white" />
              )}
            </div>

            <Image 
              src="/dashboard/setupBusiness/one-location.svg" 
              alt="One Location" 
              width={68} 
              height={68} 
              className="shrink-0 object-contain"
            />

            {/* Description Text */}
            <div className="flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-pneutral-900 font-work-sans">
                One Location
              </span>
              <span className="text-[12px] font-normal text-pneutral-500 font-body">
                I operate at a single location
              </span>
            </div>
          </div>

          {/* Multiple Locations Option */}
          <div 
            onClick={() => setLocationType("multiple")}
            className={`w-full h-[94px] p-[12px] gap-[16px] rounded-[20px] border flex items-center cursor-pointer transition-all duration-200 select-none ${
              locationType === "multiple" 
                ? "border-[#EBE3FE] bg-[#F8F5FF]" 
                : "border-pneutral-200 bg-white hover:border-pneutral-300"
            }`}
          >
            {/* Custom Radio Button Indicator */}
            <div className="flex items-center justify-center shrink-0">
              {locationType === "multiple" ? (
                <div className="w-[20px] h-[20px] rounded-full bg-[#6C5CE7] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-[20px] h-[20px] rounded-full border border-pneutral-300 bg-white" />
              )}
            </div>

            <Image 
              src="/dashboard/setupBusiness/multiple-location.svg" 
              alt="Multiple Locations" 
              width={68} 
              height={68} 
              className="shrink-0 object-contain"
            />

            {/* Description Text */}
            <div className="flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-pneutral-900 font-work-sans">
                Multiple Locations
              </span>
              <span className="text-[12px] font-normal text-pneutral-500 font-body">
                I operate at multiple location
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
