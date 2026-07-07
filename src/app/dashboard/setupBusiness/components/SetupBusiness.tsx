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
    <div className="flex flex-col gap-6 w-full font-body select-none">
      
      {/* Title */}
      <h1 className="font-work-sans font-semibold text-[24px] leading-[44px] text-pneutral-900">
        Setup Your Business
      </h1>

      {/* Business Details Card */}
      <div className="w-full bg-white p-[24px] rounded-[12px] border-[0.89px] border-pneutral-200 flex flex-col gap-[24px] shrink-0">
        {/* Header Block */}
        <div className="w-full flex flex-col gap-[4px]">
          <h2 className="font-work-sans font-semibold text-[20px] leading-[28px] text-pneutral-900">
            Business Details
          </h2>
          <p className="font-body font-normal text-[16px] leading-[24px] text-pneutral-500">
            Enter your business information
          </p>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 gap-x-[24px] gap-y-[16px] w-full">
          <Input
            label="Business Name"
            placeholder="e.g. MedPlus Healthcare"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full h-[48px] min-h-[48px] max-h-[52px]"
          />
          <Input
            label="Ownership Type"
            placeholder="e.g. Proprietorship"
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value)}
            className="w-full h-[48px] min-h-[48px] max-h-[52px]"
          />
          <Input
            label="PAN Number (Optional)"
            placeholder="e.g. ASDF1212AS"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value)}
            className="w-full h-[48px] min-h-[48px] max-h-[52px]"
          />
          <Input
            label="GST Number (Optional)"
            placeholder="e.g. 46SSDSF123S556"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
            className="w-full h-[48px] min-h-[48px] max-h-[52px]"
          />
        </div>
      </div>

      {/* Location Details Card */}
      <div className="w-full bg-white p-[24px] rounded-[12px] border-[0.89px] border-pneutral-200 flex flex-col gap-[24px] shrink-0">
        {/* Header Block */}
        <div className="w-full flex flex-col gap-[4px]">
          <h2 className="font-work-sans font-semibold text-[18px] leading-[28px] text-pneutral-900">
            Location Details
          </h2>
          <p className="font-body font-normal text-[16px] leading-[24px] text-pneutral-500">
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

            {/* Icon Block (Enlarged to 72px round container) */}
            <div className="w-[72px] h-[72px] rounded-full bg-secondary-50/50 flex items-center justify-center shrink-0">
              <Image 
                src="/dashboard/setupBusiness/one-location.svg" 
                alt="One Location" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>

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

            {/* Icon Block (Enlarged to 72px round container) */}
            <div className="w-[72px] h-[72px] rounded-full bg-secondary-50/50 flex items-center justify-center shrink-0">
              <Image 
                src="/dashboard/setupBusiness/multiple-location.svg" 
                alt="Multiple Locations" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>

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
