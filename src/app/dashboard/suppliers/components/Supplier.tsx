"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CircleCheck,
  Info,
  Mail,
  MapPin,
  Phone,
  Truck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import {
  createSupplier,
  getSupplierById,
  updateSupplier,
} from "@/services/SupplierService";
import { supplierSchema } from "@/app/schema/SupplierSchema";
import { SupplierStatus } from "@/types/SupplierData";

interface PostOffice {
  Name: string;
  District: string;
  State: string;
}

interface SupplierProps {
  supplierId?: string | number;
}

/** "YYYY-MM-DDT00:00:00" (the entity's LocalDateTime) -> "YYYY-MM-DD" (native date input value). */
const fromIsoDate = (isoDate?: string): string => {
  if (!isoDate) return "";
  const match = isoDate.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

/** Local "YYYY-MM-DD" for a Date, avoiding UTC-conversion off-by-one errors. */
const toLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getMinDlExpiryDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toLocalDateString(tomorrow);
};

const Supplier = ({ supplierId }: SupplierProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Present when opened from another flow (e.g. Goods Receipt's "Add
  // Supplier") — Cancel/Back/Save all return there instead of the list.
  const returnTo = searchParams.get("returnTo");
  const isEditMode = supplierId !== undefined;

  const [supplierName, setSupplierName] = useState("");
  const [gstin, setGstin] = useState("");
  const [dlno, setDlno] = useState("");
  const [pan, setPan] = useState("");
  const [dlExpiry, setDlExpiry] = useState("");
  const [dlExpiryError, setDlExpiryError] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [fssaiLicense, setFssaiLicense] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [contactPersonName, setContactPersonName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [emailId, setEmailId] = useState("");

  const [registeredOfficeAddress, setRegisteredOfficeAddress] = useState("");
  const [buildingStreet, setBuildingStreet] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [pincodeError, setPincodeError] = useState("");
  const [loadingPincode, setLoadingPincode] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const dlExpiryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getSupplierById(supplierId);
        if (!active) return;

        setSupplierName(data.supplierName || "");
        setGstin(data.gstinNo || "");
        setDlno(data.dlno || "");
        setPan(data.panNo || "");
        setDlExpiry(fromIsoDate(data.dlExpiryDate));
        setIssuingAuthority(data.issuingAuthority || "");
        setFssaiLicense(data.fssaiNo || "");
        setIsActive(data.status !== "INACTIVE");

        setContactPersonName(data.contactPersonName || "");
        setMobileNumber(data.mobileNumber ? String(data.mobileNumber) : "");
        setEmailId(data.supplierEmail || "");

        setRegisteredOfficeAddress(data.address || "");
        setBuildingStreet(data.buildingNo || "");
        setPincode(data.pincode ? String(data.pincode) : "");
        setCity(data.city || "");
        setCities(data.city ? [data.city] : []);
        setDistrict(data.district || "");
        setState(data.state || "");

        setBankName(data.bankName || "");
        setAccountHolderName(data.accountHolderName || "");
        setAccountNumber(data.accountNumber ? String(data.accountNumber) : "");
        setIfscCode(data.ifscCode || "");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch supplier."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [isEditMode, supplierId]);

  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  const validateField = <K extends keyof typeof supplierSchema.shape>(
    field: K,
    value: string
  ) => {
    const fieldSchema = supplierSchema.shape[field];
    const result = fieldSchema.safeParse(value);

    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? "" : (result.error.issues[0]?.message ?? ""),
    }));
  };

  const handleFieldChange =
    <K extends keyof typeof supplierSchema.shape>(
      field: K,
      setter: React.Dispatch<React.SetStateAction<string>>
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setter(value);
      validateField(field, value);
    };

  const validateFields = (fieldValues: Record<string, string>) => {
    const fields = Object.keys(fieldValues) as (keyof typeof supplierSchema.shape)[];
    const result = supplierSchema.pick(
      Object.fromEntries(fields.map((field) => [field, true])) as Record<
        keyof typeof supplierSchema.shape,
        true
      >
    ).safeParse(fieldValues);

    const fieldErrors: Record<string, string> = Object.fromEntries(
      fields.map((field) => [field, ""])
    );

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
    }

    setErrors((prev) => ({ ...prev, ...fieldErrors }));

    return Object.values(fieldErrors).every((message) => !message);
  };

  const validateBasicIdentificationFields = () =>
    validateFields({
      supplierName,
      gstinNo: gstin,
      dlno,
      panNo: pan,
      issuingAuthority,
      fssaiNo: fssaiLicense,
    });

  const validateContactDetailsFields = () =>
    validateFields({
      contactPersonName,
      mobileNumber,
      supplierEmail: emailId,
    });

  const validateAddressDetailsFields = () =>
    validateFields({
      address: registeredOfficeAddress,
      buildingNo: buildingStreet,
      pincode,
    });

  const validateFinancialDetailsFields = () =>
    validateFields({
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
    });

  const resetForm = () => {
    setSupplierName("");
    setGstin("");
    setDlno("");
    setPan("");
    setDlExpiry("");
    setDlExpiryError("");
    setIssuingAuthority("");
    setFssaiLicense("");
    setIsActive(true);
    setContactPersonName("");
    setMobileNumber("");
    setEmailId("");
    setRegisteredOfficeAddress("");
    setBuildingStreet("");
    setPincode("");
    resetAddress();
    setPincodeError("");
    setBankName("");
    setAccountHolderName("");
    setAccountNumber("");
    setIfscCode("");
    setErrors({});
  };

  /** "YYYY-MM-DD" (native date input value) -> "YYYY-MM-DDT00:00:00" (the entity column is a LocalDateTime). */
  const toIsoDate = (yyyyMmDd: string): string | undefined => {
    const match = yyyyMmDd.trim().match(/^\d{4}-\d{2}-\d{2}$/);
    if (!match) return undefined;
    return `${yyyyMmDd}T00:00:00`;
  };

  const toNumber = (value: string): number | undefined => {
    const trimmed = value.trim();
    return trimmed ? Number(trimmed) : undefined;
  };

  const validateDlExpiry = (value: string) => {
    const isValid = !value || value >= getMinDlExpiryDate();
    setDlExpiryError(isValid ? "" : "DL Expiry Date must be a future date.");
    return isValid;
  };

  const handleSave = async (afterSave: "close" | "addNew") => {
    const isBasicIdentificationValid = validateBasicIdentificationFields();
    const isDlExpiryValid = validateDlExpiry(dlExpiry);
    const isContactDetailsValid = validateContactDetailsFields();
    const isAddressDetailsValid = validateAddressDetailsFields();
    const isFinancialDetailsValid = validateFinancialDetailsFields();

    if (
      !isBasicIdentificationValid ||
      !isDlExpiryValid ||
      !isContactDetailsValid ||
      !isAddressDetailsValid ||
      !isFinancialDetailsValid
    ) {
      toast.error("Please fix the highlighted fields before saving.");
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        supplierName: supplierName.trim(),
        gstinNo: gstin || undefined,
        dlno: dlno.trim(),
        panNo: pan || undefined,
        dlExpiryDate: dlExpiry ? toIsoDate(dlExpiry) : undefined,
        issuingAuthority: issuingAuthority || undefined,
        fssaiNo: fssaiLicense || undefined,
        contactPersonName: contactPersonName || undefined,
        mobileNumber: toNumber(mobileNumber),
        supplierEmail: emailId || undefined,
        address: registeredOfficeAddress || undefined,
        buildingNo: buildingStreet || undefined,
        pincode: toNumber(pincode),
        city: city || undefined,
        district: district || undefined,
        state: state || undefined,
        bankName: bankName || undefined,
        accountHolderName: accountHolderName || undefined,
        accountNumber: toNumber(accountNumber),
        ifscCode: ifscCode || undefined,
        status: (isActive ? "ACTIVE" : "INACTIVE") as SupplierStatus,
      };

      let createdSupplierId: number | undefined;
      if (isEditMode) {
        await updateSupplier(supplierId, payload);
      } else {
        const created = await createSupplier(payload);
        createdSupplierId = created.supplierId;
      }

      toast.success(
        isEditMode ? "Supplier updated successfully!" : "Supplier saved successfully!"
      );

      if (isEditMode || afterSave === "close") {
        if (returnTo) {
          const separator = returnTo.includes("?") ? "&" : "?";
          router.push(
            createdSupplierId
              ? `${returnTo}${separator}newSupplierId=${createdSupplierId}`
              : returnTo
          );
        } else {
          router.push("/dashboard/suppliers");
        }
      } else {
        resetForm();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save supplier."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetAddress = () => {
    setCities([]);
    setCity("");
    setDistrict("");
    setState("");
  };

  const fetchAddressByPincode = async (value: string) => {
    try {
      setLoadingPincode(true);

      const response = await fetch(
        `https://api.postalpincode.in/pincode/${value}`
      );
      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const offices: PostOffice[] = data[0].PostOffice;
        const cityList = [...new Set(offices.map((office) => office.Name))];
        const firstOffice = offices[0];

        setCities(cityList);
        setCity(cityList[0] || "");
        setDistrict(firstOffice.District || "");
        setState(firstOffice.State || "");
        setPincodeError("");
      } else {
        resetAddress();
        setPincodeError("No location found for this PIN code.");
      }
    } catch (error) {
      console.error("Pincode lookup failed:", error);
      resetAddress();
      setPincodeError("Unable to verify PIN code. Please try again.");
    } finally {
      setLoadingPincode(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-label-l4 text-pneutral-500">
        Loading supplier details…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-h5 font-semibold text-pneutral-900">
            {isEditMode ? "Edit Supplier" : "Add Supplier"}
          </p>
          <p className="text-label-l4 font-regular text-pneutral-500">
            {isEditMode
              ? "Update this supplier's master record."
              : "Add a new supplier to your master records for purchasing and billing."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnTo || "/dashboard/suppliers")}
          className="h-12! w-auto! min-w-27 shrink-0 gap-2 rounded-lg! border-secondary-700! px-4 text-label-l4! font-medium! text-secondary-700!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          {returnTo ? "Back" : "Back to Suppliers"}
        </Button>
      </div>

      {/* Basic / Identification Details — Figma node 3403:38870 */}
      <div className="flex w-full flex-col items-start gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_4px_rgba(192,193,190,0.2)]">
        <div className="flex items-center gap-xsm">
          <CircleCheck size={24} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Basic / Identification Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="Supplier Name"
            required
            placeholder="Medilife Distributors"
            value={supplierName}
            onChange={handleFieldChange("supplierName", setSupplierName)}
            error={errors.supplierName}
            className="rounded-sm!"
            containerClassName="flex-1"
          />

          <Input
            label="GSTIN"
            required
            placeholder="07AAACM1234F1Z5"
            value={gstin}
            onChange={handleFieldChange("gstinNo", setGstin)}
            error={errors.gstinNo}
            readOnly={isEditMode}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="DL No."
            required
            placeholder="MH-1234567890123"
            value={dlno}
            onChange={handleFieldChange("dlno", setDlno)}
            error={errors.dlno}
            className="rounded-sm!"
            containerClassName="flex-1"
          />

          <Input
            label="DL Validity / Expiry Date (Optional)"
            type="date"
            ref={dlExpiryRef}
            onClick={() => openDatePicker(dlExpiryRef)}
            style={{ cursor: "pointer" }}
            min={getMinDlExpiryDate()}
            value={dlExpiry}
            onChange={(e) => {
              const value = e.target.value;
              setDlExpiry(value);
              validateDlExpiry(value);
            }}
            error={dlExpiryError}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-1">
            <Input
              label="PAN (Optional)"
              placeholder="AAACM1234F"
              value={pan}
              onChange={handleFieldChange("panNo", setPan)}
              error={errors.panNo}
              className="rounded-sm!"
              containerClassName="w-full"
            />
            <p className="px-1 text-label-l3 font-regular text-pneutral-600">
              10-character alphanumeric PAN
            </p>
          </div>

          <Input
            label="Issuing Authority (Optional)"
            placeholder="e.g. State Drug Control Dept Maharashtra"
            value={issuingAuthority}
            onChange={handleFieldChange("issuingAuthority", setIssuingAuthority)}
            error={errors.issuingAuthority}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="FSSAI License No. (Optional)"
            placeholder="e.g. 12345678901234"
            value={fssaiLicense}
            onChange={handleFieldChange("fssaiNo", setFssaiLicense)}
            error={errors.fssaiNo}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
          <div className="hidden flex-1 sm:block" aria-hidden="true" />
        </div>

        <div className="flex flex-col items-start gap-xsm">
          <div className="flex items-center gap-1">
            <span className="text-p3 font-medium text-pneutral-900">
              Supplier Status
            </span>
            <span className="text-p3 font-regular text-warning-600">*</span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((prev) => !prev)}
            className="flex items-center gap-sm"
          >
            <span
              className={`relative h-6 w-9.75 shrink-0 rounded-full transition-colors ${
                isActive ? "bg-success-500" : "bg-warning-500"
              }`}
            >
              <span
                className={`absolute top-1/2 h-5.25 w-5.25 -translate-y-1/2 rounded-full bg-base-white shadow-[0_0_0_5px_rgba(187,247,208,0.8)] transition-all ${
                  isActive ? "left-4" : "left-0.5"
                }`}
              />
            </span>
            <span
              className={`text-p3 font-semibold ${
                isActive ? "text-success-600" : "text-warning-600"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </button>
        </div>
      </div>

      {/* Contact Details — Figma node 3436:42506 */}
      <div className="flex w-full flex-col items-start gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_4px_rgba(192,193,190,0.2)]">
        <div className="flex items-center gap-xsm">
          <Users size={24} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Contact Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="Contact Person Name"
            required
            placeholder="Ramesh Kumar"
            value={contactPersonName}
            onChange={handleFieldChange("contactPersonName", setContactPersonName)}
            error={errors.contactPersonName}
            leftIcon={<Users size={20} className="text-pneutral-500" />}
            className="rounded-sm!"
            containerClassName="flex-1"
          />

          <Input
            label="Mobile Number"
            required
            type="tel"
            placeholder="9876543210"
            value={mobileNumber}
            onChange={handleFieldChange("mobileNumber", setMobileNumber)}
            error={errors.mobileNumber}
            leftIcon={<Phone size={20} className="text-pneutral-500" />}
            readOnly={isEditMode}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="Email ID"
            required
            type="email"
            placeholder="accounts@medilife.com"
            value={emailId}
            onChange={handleFieldChange("supplierEmail", setEmailId)}
            error={errors.supplierEmail}
            leftIcon={<Mail size={20} className="text-pneutral-500" />}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
          <div className="hidden flex-1 sm:block" aria-hidden="true" />
        </div>
      </div>

      {/* Address Details — Figma node 3436:42519 */}
      <div className="flex w-full flex-col items-start gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_4px_rgba(192,193,190,0.2)]">
        <div className="flex items-center gap-xsm">
          <MapPin size={24} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Address Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="Registered Office Address"
            required
            placeholder="123 Industrial Estate, Andheri East"
            value={registeredOfficeAddress}
            onChange={handleFieldChange("address", setRegisteredOfficeAddress)}
            error={errors.address}
            className="rounded-sm!"
            containerClassName="flex-1"
          />

          <Input
            label="Building / Street"
            required
            placeholder="Plot No 45, MIDC Road"
            value={buildingStreet}
            onChange={handleFieldChange("buildingNo", setBuildingStreet)}
            error={errors.buildingNo}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Pincode"
            required
            placeholder="400069"
            value={pincode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPincode(value);
              validateField("pincode", value);

              if (value.length === 6) {
                fetchAddressByPincode(value);
              } else {
                setPincodeError("");
                resetAddress();
              }
            }}
            error={pincodeError || errors.pincode}
            className="rounded-sm!"
          />

          <Dropdown
            label="City"
            required
            options={cities.map((c) => ({ label: c, value: c }))}
            value={city}
            onChange={setCity}
            placeholder="Select City"
            disabled={cities.length === 0}
            isLoading={loadingPincode}
          />

          <Input
            label="District"
            required
            placeholder="Auto-filled from pincode"
            value={district}
            readOnly
            className="rounded-sm!"
          />

          <Input
            label="State"
            required
            placeholder="Auto-filled from pincode"
            value={state}
            readOnly
            className="rounded-sm!"
          />
        </div>
      </div>

      {/* Financial Details — Figma node 3436:42539 */}
      <div className="flex w-full flex-col items-start gap-md rounded-lg bg-white p-md shadow-[4px_4px_12px_-2px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_4px_rgba(192,193,190,0.2)]">
        <div className="flex w-full items-center gap-xsm">
          <Truck size={24} className="shrink-0 text-secondary-700" />
          <p className="flex-1 text-label-l5 font-semibold text-pneutral-900">
            Financial Details
          </p>
          <span className="shrink-0 rounded-sm bg-pneutral-100 px-xsm py-xxsm text-p2 font-medium text-pneutral-900">
            All fields optional
          </span>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="Bank Name (Optional)"
            placeholder="e.g. HDFC Bank"
            value={bankName}
            onChange={handleFieldChange("bankName", setBankName)}
            error={errors.bankName}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
          <Input
            label="Account Holder Name (Optional)"
            placeholder="e.g. Medilife Distributors Pvt. Ltd."
            value={accountHolderName}
            onChange={handleFieldChange("accountHolderName", setAccountHolderName)}
            error={errors.accountHolderName}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <Input
            label="Account Number (Optional)"
            placeholder="e.g. 50100123456789"
            value={accountNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 18);
              setAccountNumber(value);
              validateField("accountNumber", value);
            }}
            error={errors.accountNumber}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
          <Input
            label="IFSC Code (Optional)"
            placeholder="e.g. HDFC0001234"
            value={ifscCode}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().slice(0, 11);
              setIfscCode(value);
              validateField("ifscCode", value);
            }}
            error={errors.ifscCode}
            className="rounded-sm!"
            containerClassName="flex-1"
          />
        </div>
      </div>

      {/* Footer actions — Figma node 3436:42554 */}
      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 items-center gap-1">
          <Info size={14} className="shrink-0 text-pneutral-500" />
          <p className="text-label-l3 font-regular text-pneutral-500">
            GSTIN and mobile number cannot be edited once the supplier is saved.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnTo || "/dashboard/suppliers")}
            className="h-12! w-auto! min-w-27 shrink-0 rounded-lg! border-secondary-700! px-4 text-label-l4! font-medium! text-secondary-700!"
          >
            Cancel
          </Button>

          {!isEditMode && (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => handleSave("addNew")}
              className="h-12! w-auto! min-w-27 shrink-0 rounded-lg! border-secondary-700! px-4 text-label-l4! font-medium! text-secondary-700!"
            >
              Save &amp; Add New
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            disabled={isSaving}
            onClick={() => handleSave("close")}
            className="h-12! w-auto! min-w-27 shrink-0 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50!"
          >
            {isEditMode ? "Save Changes" : "Save & Close"}
            <CircleCheck size={20} className="shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Supplier;
