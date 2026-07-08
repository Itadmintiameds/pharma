"use client";

import React, { useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Button from "@/app/components/common/Button";
import UploadInput from "@/app/components/common/UploadInput";
import ComplianceSuccessModal from "@/app/components/common/ComplianceSuccessModal";
import { useRouter } from "next/navigation";

const SetupPharmacy = () => {
  const [selected, setSelected] = useState("pharmacy");
  const pharmacyTypes = [
    {
      id: "pharmacy",
      label: "Pharmacy",
      icon: "/PharmacyDetails/PharmacyIcon.svg",
    },
    {
      id: "clinic",
      label: "Clinic",
      icon: "/PharmacyDetails/ClinicIcon.svg",
    },
    {
      id: "nursingHome",
      label: "Nursing Home",
      icon: "/PharmacyDetails/NursingHomeIcon.svg",
    },
    {
      id: "hospital",
      label: "Hospital",
      icon: "/PharmacyDetails/HospitalIcon.svg",
    },
    {
      id: "doctor",
      label: "Doctor",
      icon: "/PharmacyDetails/DoctorIcon.svg",
    },
  ];

  const documentLabel =
    selected === "doctor"
      ? "Medical Registration Certificate"
      : ["hospital", "clinic", "nursingHome"].includes(selected)
        ? "Clinical Establishment Certificate"
        : "Drug License Number";

  const [address, setAddress] = useState({
    pincode: "",
    state: "",
    district: "",
    taluka: "",
    city: "",
  });

  const [cities, setCities] = useState<string[]>([]);
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [existingManualFile, setExistingManualFile] = useState<string | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const resetAddress = (pincode = "") => {
    setCities([]);

    setAddress({
      pincode,
      state: "",
      district: "",
      taluka: "",
      city: "",
    });
  };

  const fetchAddressByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;

    try {
      setLoadingPincode(true);

      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );

      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const offices = data[0].PostOffice;

        const cityList = [
          ...new Set<string>(
            offices.map((office: any) => office.Name as string).filter(Boolean),
          ),
        ];

        setCities(cityList);

        const firstOffice = offices[0];

        setCities(cityList);

        setAddress({
          pincode,
          state: firstOffice.State || "",
          district: firstOffice.District || "",
          taluka: firstOffice.Block || "",
          city: cityList[0] || "",
        });
      } else {
        resetAddress(pincode);
      }
    } catch (error) {
      console.error("Pincode lookup failed:", error);
      resetAddress(pincode);
    } finally {
      setLoadingPincode(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // await submitCompliance();

      setOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <ComplianceSuccessModal
        isOpen={open}
        onClose={() => setOpen(false)}
        requestId="TMED-COMP-2025-000123"
        onDashboard={() => router.push("/dashboard")}
      />

      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 h-115 flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-pneutral-900">
            <div className="text-h6 font-semibold">Business Type</div>
            <div className="text-p4 font-normal font-noto-sans">
              Select your business type
            </div>
          </div>

          <div className=" grid grid-cols-4 gap-4">
            {pharmacyTypes.map((item) => {
              const isSelected = selected === item.id;

              return (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className={`relative p-6 h-42.5 rounded-[20px] border border-pneutral-200 cursor-pointer transition-all
              ${isSelected ? "bg-secondary-50" : "bg-white"}`}
                >
                  <input
                    id={item.id}
                    type="radio"
                    name="businessType"
                    value={item.id}
                    checked={isSelected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="absolute left-4 top-4 h-5 w-5 accent-secondary-700"
                  />

                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div
                      className={`flex h-[88px] w-[88px] items-center justify-center rounded-full
                  ${isSelected ? "bg-[#EEE5FF]" : "bg-pneutral-100"}`}
                    >
                      <Image
                        src={item.icon}
                        alt={item.label}
                        width={88}
                        height={88}
                      />
                    </div>

                    <span className="text-p4 font-semibold text-pneutral-900">
                      {item.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-pneutral-900">
            <div className="text-h6 font-semibold">
              Primary Location / Pharmacy Details
            </div>
            <div className="text-p4 font-normal font-noto-sans">
              Enter your Primary Location Details
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Input
              label="Pharmacy Name"
              placeholder="MedPlus Healthcare"
              type="text"
              name="pharmacyName"
              id="pharmacyName"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label="Mobile Number"
              placeholder="Enter company phone"
              type="text"
              name="pharmacyPhone"
              id="pharmacyPhone"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label={documentLabel}
              placeholder="46SSDSF123S556"
              type="text"
              name="documentNo"
              id="documentNo"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <UploadInput
              onFileSelect={setManualFile}
              existingFile={existingManualFile || undefined}
            />

            <Input
              label="Issue Date"
              type="date"
              name="issueDate"
              id="issueDate"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label="Issue Authority"
              placeholder="John Doe"
              type="text"
              name="issueAuthority"
              id="issueAuthority"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label="Expiry Date"
              type="date"
              name="expiryDate"
              id="expiryDate"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label="PAN Number (Optional)"
              placeholder="46SSDSF123S556"
              type="text"
              name="panNumber"
              id="panNumber"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
            />

            <Input
              label="GST Number (Optional)"
              placeholder="46SSDSF123S556"
              type="text"
              name="gstNumber"
              id="gstNumber"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
            />

            <Input
              label="Pin Code"
              placeholder="Enter 6-digit pin code"
              type="text"
              name="pharmacyPincode"
              id="pharmacyPincode"
              value={address.pincode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);

                setAddress((prev) => ({
                  ...prev,
                  pincode: value,
                }));

                if (value.length === 6) {
                  fetchAddressByPincode(value);
                } else {
                  resetAddress(value);
                }
              }}
              required
            />

            <Input
              label="State"
              placeholder="Select State"
              type="text"
              name="pharmacyState"
              id="pharmacyState"
              value={address.state}
              readOnly
              required
            />

            <Input
              label="District"
              placeholder="Select District"
              type="text"
              name="pharmacyDistricts"
              id="pharmacyDistricts"
              value={address.district}
              readOnly
              required
            />

            <Input
              label="Taluka"
              placeholder="Select Taluka"
              type="text"
              name="pharmacyTaluka"
              id="pharmacyTaluka"
              value={address.taluka}
              readOnly
              required
            />
            {/* 
            <Input
              label="City/Town/Village"
              placeholder="Enter city/town/village"
              type="text"
              name="pharmacyCity"
              id="pharmacyCity"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            /> */}

            <div className="flex flex-col gap-1">
              <label className="mb-1 block text-label-l4 font-medium text-pneutral-900">
                City/Town/Village
                <span className="ml-2 text-warning-500">*</span>
              </label>

              <select
                value={address.city}
                onChange={(e) =>
                  setAddress((prev) => ({
                    ...prev,
                    city: e.target.value,
                  }))
                }
                className="h-11 w-full rounded-[7px] border border-pneutral-200 bg-white px-3 text-pneutral-900 focus:outline-none"
              >
                {cities.length === 0 ? (
                  <option value="">Select City</option>
                ) : (
                  cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))
                )}
              </select>
            </div>

            <Input
              label="Building No"
              placeholder="Enter building no"
              type="text"
              name="pharmacyBuildingNo"
              id="pharmacyBuildingNo"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label="Street/Road/Lane"
              placeholder="Enter Street/Road/Lane"
              type="text"
              name="pharmacyStreet"
              id="pharmacyStreet"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
              required
            />

            <Input
              label="Landmark (optional)"
              placeholder="Enter Landmark"
              type="text"
              name="pharmacyLandmark"
              id="pharmacyLandmark"
              // value={password}
              // onChange={handlePasswordChange}
              // error={passwordError}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-between">
        <div>
          <Button variant="secondary" className="w-35.25">
            Save Draft
          </Button>
        </div>

        <div className="flex gap-6">
          <Button variant="outline">Cancel</Button>

          <Button
            variant="primary"
            className="w-[210px]"
            onClick={handleSubmit}
          >
            Submit Compliance
          </Button>
        </div>
      </div>
    </>
  );
};

export default SetupPharmacy;
