"use client";

import React, { useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Button from "@/app/components/common/Button";
import UploadInput from "@/app/components/common/UploadInput";
import ComplianceSuccessModal from "@/app/components/common/ComplianceSuccessModal";
import { useRouter } from "next/navigation";
import { 
  createOrganization, 
  registerPharmacy, 
  uploadPharmacyDocument 
} from "@/services/SetupBusinessService";
import { showToast } from "@/app/components/common/Toast";

interface SetupPharmacyProps {
  businessName: string;
  ownershipType: string;
  panNumber: string;
  gstNumber: string;
  locationType: "single" | "multiple";
  hasOrganization?: boolean;
  existingOrg?: any;
}

const SetupPharmacy = ({
  businessName,
  ownershipType,
  panNumber,
  gstNumber,
  locationType,
  hasOrganization = false,
  existingOrg = null,
}: SetupPharmacyProps) => {
  const [selected, setSelected] = useState("");
  
  // Form input state variables
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [issueAuthority, setIssueAuthority] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [pharmacyPan, setPharmacyPan] = useState("");
  const [pharmacyGst, setPharmacyGst] = useState("");
  const [pharmacyBuildingNo, setPharmacyBuildingNo] = useState("");
  const [pharmacyStreet, setPharmacyStreet] = useState("");
  const [pharmacyLandmark, setPharmacyLandmark] = useState("");

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
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
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
    // Validate required fields
    if (!pharmacyName || !pharmacyPhone || !documentNo || !address.state || !address.district || !address.taluka || !address.city || !pharmacyBuildingNo || !pharmacyStreet || !address.pincode) {
      showToast.warning("Please fill in all required fields.");
      return;
    }

    // Validate PAN Number length if provided
    const finalPan = pharmacyPan || panNumber;
    if (finalPan && finalPan.length !== 10) {
      showToast.warning("PAN Number must be exactly 10 characters.");
      return;
    }

    // Validate GST Number length if provided
    const finalGst = pharmacyGst || gstNumber;
    if (finalGst && finalGst.length !== 15) {
      showToast.warning("GST Number must be exactly 15 characters.");
      return;
    }

    setLoading(true);
    try {
      let orgResponse = existingOrg;
      if (!hasOrganization) {
        // Step 1: Hit Pharma Backend (create organization)
        orgResponse = await createOrganization({
          organizationName: businessName || pharmacyName,
          organizationType: locationType === "single" ? "Single" : "Multiple",
          ownershipType: ownershipType || "Proprietorship",
          panNumber: panNumber || "PAN123456",
          gstNumber: gstNumber || "GST123456789"
        });
        console.log("Step 1 Success (Organization):", orgResponse);
      } else {
        console.log("Using existing organization details:", orgResponse);
      }

      // Step 2: Fetch User ID & Email from server session token
      const userResponse = await fetch("/api/user-info");
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user session info.");
      }
      const { userId, email, accessToken } = await userResponse.json();

      // Map document type
      const docType = selected === "doctor"
        ? "MEDICAL_REGISTRATION_CERTIFICATE"
        : ["hospital", "clinic", "nursingHome"].includes(selected)
          ? "CLINICAL_ESTABLISHMENT_CERTIFICATE"
          : "DRUG_LICENSE";

      // Step 3: Register Pharmacy on Admin Backend
      const regResponse = await registerPharmacy({
        userId: String(userId),
        pharmacyName: pharmacyName,
        pharmacyType: selected.toUpperCase(),
        pharmacyEmail: email ,
        pharmacyPhone: pharmacyPhone,
        panNumber: pharmacyPan || panNumber,
        gstNumber: pharmacyGst || gstNumber,
        pharmacyBranch: address.city,
        pharmacyBuildingNo: pharmacyBuildingNo,
        pharmacyStreet: pharmacyStreet,
        pharmacyCity: address.city,
        pharmacyTaluka: address.taluka,
        pharmacyDistricts: address.district,
        pharmacyPincode: Number(address.pincode),
        pharmacyLandmark: pharmacyLandmark,
        pharmacyState: address.state,
        organizationId: orgResponse.organizationId,
        organizationName: orgResponse.organizationName,
        ownershipType: orgResponse.ownershipType,
        organizationType: locationType === "single" ? "Single" : "Multiple",
        organizationPanNumber: orgResponse.panNumber,
        organizationGstNumber: orgResponse.gstNumber,
        pharmacyRegistrationDocuments: [
          {
            documentNumber: documentNo,
            documentType: docType,
            issueDate: issueDate ? `${issueDate}T00:00:00` : undefined,
            issueAuthority: issueAuthority,
            expiryDate: expiryDate ? `${expiryDate}T00:00:00` : undefined
          }
        ]
      }, accessToken);
      
      console.log("Step 2 Success (Pharmacy Registration):", regResponse);

      // Step 4: Upload File if provided
      if (manualFile && regResponse.data?.pharmacyRegistrationDocuments && regResponse.data.pharmacyRegistrationDocuments.length > 0) {
        const docId = regResponse.data.pharmacyRegistrationDocuments[0].registrationDocumentId;
        const uploadResponse = await uploadPharmacyDocument(
          regResponse.data.pharmacyRegistrationId,
          docId,
          manualFile,
          accessToken
        );
        console.log("Step 3 Success (Document Upload):", uploadResponse);
      }

      showToast.success("Compliance details submitted successfully!");
      setRequestId(regResponse.data?.pharmacyRegistrationId || "");
      setOpen(true);
    } catch (err: any) {
      showToast.error(err?.message || "Compliance submission failed.");
      console.error("Submission pipeline failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ComplianceSuccessModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          window.location.href = "/dashboard";
        }}
        requestId={requestId}
        onDashboard={() => {
          window.location.href = "/dashboard";
        }}
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
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              required
            />

            <Input
              label="Mobile Number"
              placeholder="Enter company phone"
              type="text"
              name="pharmacyPhone"
              id="pharmacyPhone"
              value={pharmacyPhone}
              onChange={(e) => setPharmacyPhone(e.target.value)}
              required
            />

            <Input
              label={documentLabel}
              placeholder="46SSDSF123S556"
              type="text"
              name="documentNo"
              id="documentNo"
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
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
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />

            <Input
              label="Issue Authority"
              placeholder="John Doe"
              type="text"
              name="issueAuthority"
              id="issueAuthority"
              value={issueAuthority}
              onChange={(e) => setIssueAuthority(e.target.value)}
              required
            />

            <Input
              label="Expiry Date"
              type="date"
              name="expiryDate"
              id="expiryDate"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />

            <Input
              label="PAN Number (Optional)"
              placeholder="46SSDSF123S556"
              type="text"
              name="panNumber"
              id="panNumber"
              value={pharmacyPan}
              onChange={(e) => setPharmacyPan(e.target.value)}
              maxLength={10}
            />

            <Input
              label="GST Number (Optional)"
              placeholder="46SSDSF123S556"
              type="text"
              name="gstNumber"
              id="gstNumber"
              value={pharmacyGst}
              onChange={(e) => setPharmacyGst(e.target.value)}
              maxLength={15}
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
              value={pharmacyCity}
              onChange={(e) => setPharmacyCity(e.target.value)}
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
              value={pharmacyBuildingNo}
              onChange={(e) => setPharmacyBuildingNo(e.target.value)}
              required
            />

            <Input
              label="Street/Road/Lane"
              placeholder="Enter Street/Road/Lane"
              type="text"
              name="pharmacyStreet"
              id="pharmacyStreet"
              value={pharmacyStreet}
              onChange={(e) => setPharmacyStreet(e.target.value)}
              required
            />

            <Input
              label="Landmark (optional)"
              placeholder="Enter Landmark"
              type="text"
              name="pharmacyLandmark"
              id="pharmacyLandmark"
              value={pharmacyLandmark}
              onChange={(e) => setPharmacyLandmark(e.target.value)}
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
            loading={loading}
          >
            Submit Compliance
          </Button>
        </div>
      </div>
    </>
  );
};

export default SetupPharmacy;
