"use client";

import Dropdown from "@/app/components/common/Dropdown";
import Input from "@/app/components/common/Input";
import LogoCropModal from "@/app/components/common/LogoCropModal";
import { setupBusinessSchema } from "@/app/schema/PharmacyDetailsSchema";
import Image from "next/image";
import React, { useState } from "react";

const OWNERSHIP_TYPE_OPTIONS = [
  "Private Limited Company",
  "Public Limited Company",
  "Limited Liability Partnership (LLP)",
  "Proprietorship",
  "One Person Company (OPC)",
  "Section 8 Company",
  "Producer Company",
  "Nidhi Company",
  "Government Company",
  "Foreign Company",
  "Holding Company",
  "Subsidiary Company",
  "Associate Company",
  "Dormant Company",
].map((name) => ({ label: name, value: name }));

interface SetupBusinessViewProps {
  businessName: string;
  setBusinessName: (val: string) => void;
  ownershipType: string;
  setOwnershipType: (val: string) => void;
  panNumber: string;
  setPanNumber: (val: string) => void;
  gstNumber: string;
  setGstNumber: (val: string) => void;
  locationType: "single" | "multiple";
  setLocationType: (val: "single" | "multiple") => void;
  setLogo: (val: File | null) => void;
}

export default function SetupBusinessView({
  businessName,
  setBusinessName,
  ownershipType,
  setOwnershipType,
  panNumber,
  setPanNumber,
  gstNumber,
  setGstNumber,
  locationType,
  setLocationType,
  setLogo,
}: SetupBusinessViewProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{ src: string; name: string } | null>(
    null,
  );

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-selected later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Logo must be under 5MB.");
      return;
    }

    // Open the cropper with the chosen image instead of using it directly
    setCropState({ src: URL.createObjectURL(file), name: file.name });
  };

  const closeCropper = () => {
    if (cropState) URL.revokeObjectURL(cropState.src);
    setCropState(null);
  };

  const handleCropped = (file: File) => {
    // Swap the preview, releasing the previous object URL to avoid a leak
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setLogo(file);
    closeCropper();
  };

  const removeLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogo(null);
  };

  const validateField = <K extends keyof typeof setupBusinessSchema.shape>(
    field: K,
    value: string,
  ) => {
    const fieldSchema = setupBusinessSchema.shape[field];

    const result = fieldSchema.safeParse(value);

    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? "" : (result.error.issues[0]?.message ?? ""),
    }));
  };

  const handleFieldChange =
    <K extends keyof typeof setupBusinessSchema.shape>(
      field: K,
      setter: (val: string) => void
    ) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (field === "panNumber" || field === "gstNumber") {
          setter(value.toUpperCase());
          validateField(field, value.toUpperCase());
        } else {
          setter(value);
          validateField(field, value);
        }
      };

  return (
    <div className="flex flex-col gap-6 w-full select-none">

      {/* Title */}
      <h1 className="font-work-sans font-semibold text-[24px] leading-[44px] text-pneutral-900">
        Setup Your Business
      </h1>

      {/* Business Details Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
        {/* Header Block with logo aligned to the right on the same line */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-pneutral-900">
            <h2 className="text-h6 font-semibold">
              Business Details
            </h2>
            <p className="text-p4 font-normal font-noto-sans text-pneutral-500">
              Enter your business information
            </p>
          </div>

          {/* Business Logo — compact circular uploader with the label underneath.
              Fixed width so the circle stays put whichever label is showing. */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-[150px]">
            <div className="relative">
              <label className="cursor-pointer group block">
                <div className="relative w-[52px] h-[52px] rounded-full border-2 border-dashed border-pneutral-300 bg-pneutral-50 flex items-center justify-center overflow-hidden group-hover:border-secondary-700 transition-colors">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Business logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-pneutral-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                      />
                    </svg>
                  )}
                </div>

                {/* Edit (pencil) badge inside the image */}
                <span className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full bg-secondary-700 border-2 border-white flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-2.5 h-2.5 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
                    />
                  </svg>
                </span>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>

              {/* Cancel (X) button — shown once a logo is uploaded */}
              {logoPreview && (
                <button
                  type="button"
                  onClick={removeLogo}
                  aria-label="Remove logo"
                  className="absolute -top-1 -right-1 z-10 flex items-center justify-center text-pneutral-900 hover:text-black transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <span className="text-[11px] font-medium text-pneutral-900 text-center whitespace-nowrap">
              {logoPreview ? "Change Logo" : "Upload Logo (Optional)"}
            </span>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Business Name"
            placeholder="MedPlus Healthcare"
            value={businessName}
            onChange={handleFieldChange("businessName", setBusinessName)}
            error={errors.businessName}
            required
          />
          <Dropdown
            label="Ownership Type"
            placeholder="Select ownership type"
            options={OWNERSHIP_TYPE_OPTIONS}
            value={ownershipType}
            onChange={(value: string) => {
              setOwnershipType(value);
              // validateField("ownershipType", value);
            }}
            error={errors.ownershipType}
            searchable
            required
          />
          <Input
            label="PAN Number (Optional)"
            placeholder="ASDF1212AS"
            value={panNumber}
            onChange={handleFieldChange("panNumber", setPanNumber)}
            maxLength={10}
            error={errors.panNumber}
          />
          <Input
            label="GST Number (Optional)"
            placeholder="46SSDSF123S556"
            value={gstNumber}
            onChange={handleFieldChange("gstNumber", setGstNumber)}
            maxLength={15}
            error={errors.gstNumber}
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
            className={`w-full h-[94px] p-[12px] gap-[16px] rounded-[20px] border flex items-center cursor-pointer transition-all duration-200 select-none ${locationType === "single"
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
            className={`w-full h-[94px] p-[12px] gap-[16px] rounded-[20px] border flex items-center cursor-pointer transition-all duration-200 select-none ${locationType === "multiple"
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

      {cropState && (
        <LogoCropModal
          imageSrc={cropState.src}
          fileName={cropState.name}
          onCancel={closeCropper}
          onCropped={handleCropped}
        />
      )}

    </div>
  );
}
