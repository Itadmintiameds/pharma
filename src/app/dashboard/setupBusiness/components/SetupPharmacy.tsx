"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import Button from "@/app/components/common/Button";
import UploadInput from "@/app/components/common/UploadInput";
import ComplianceSuccessModal from "@/app/components/common/ComplianceSuccessModal";
import { useRouter } from "next/navigation";
import {
  createOrganization,
  registerPharmacy,
  savePharmacyDraft,
  submitPharmacyDraft,
  resubmitPharmacy,
  uploadOrganizationLogo,
  uploadPharmacyDocument,
} from "@/services/SetupBusinessService";
import { checkDocumentNumber } from "@/services/UserManagementService";
import { showToast } from "@/app/components/common/Toast";
import { pharmacyDetailsSchema, setupBusinessSchema } from "@/app/schema/PharmacyDetailsSchema";
import { OrganizationCreateRequest } from "@/types/SetupBusinessData";
import { WarehouseDetails } from "@/types/SetupWarehouseData";
import {
  buildWarehousePayload,
  getWarehousesByOrganizationId,
} from "@/services/SetupWarehouseService";
import SetupWarehouse from "./SetupWarehouse";

interface SetupPharmacyProps {
  businessName: string;
  ownershipType: string;
  panNumber: string;
  gstNumber: string;
  locationType: "single" | "multiple";
  manageCentrally?: boolean | null;
  setManageCentrally?: (val: boolean) => void;
  warehouse?: WarehouseDetails;
  setWarehouse?: React.Dispatch<React.SetStateAction<WarehouseDetails>>;
  showProductManagement?: boolean;
  setShowProductManagement?: (val: boolean) => void;
  hasOrganization?: boolean;
  existingOrg?: any;
  prefillData?: any;
  logo?: File | null;
}

interface PostOffice {
  Name: string;
  Block: string;
  District: string;
  State: string;
}

const SetupPharmacy = ({
  businessName,
  ownershipType,
  panNumber,
  gstNumber,
  locationType,
  manageCentrally = null,
  setManageCentrally,
  warehouse,
  setWarehouse,
  showProductManagement = false,
  setShowProductManagement,
  hasOrganization = false,
  existingOrg = null,
  prefillData = null,
  logo = null,
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

  const documentPlaceholder =
    selected === "doctor"
      ? "MCI-12345-2020"
      : ["hospital", "clinic", "nursingHome"].includes(selected)
        ? "CEA/MH/2024/00123"
        : "20B-MH-123456";

  const selectedBusinessType =
    pharmacyTypes.find((type) => type.id === selected)?.label ?? "Business";

  const pharmacyNameLabel = `${selectedBusinessType} Name`;

  const [address, setAddress] = useState({
    pincode: "",
    state: "",
    district: "",
    taluka: "",
    city: "",
  });

  const [cities, setCities] = useState<string[]>([]);
  const [talukas, setTalukas] = useState<string[]>([]);
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [existingManualFile, setExistingManualFile] = useState<string | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingDocumentNo, setCheckingDocumentNo] = useState(false);

  const issueDateRef = useRef<HTMLInputElement>(null);
  const expiryDateRef = useRef<HTMLInputElement>(null);

  // Local (not UTC) date — toISOString() shifts to the previous day for IST
  // mornings, which made today unselectable as an issue date.
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current;
    if (!input) return;
    if (typeof (input as any).showPicker === "function") {
      (input as any).showPicker();
    } else {
      input.focus();
    }
  };

  // New multiple-location org: the primary form is followed by the Product
  // Management screen (create org happens on final submit there).
  const isNewMultiple = !hasOrganization && locationType === "multiple";

  const handleNext = () => {
    if (!validateForm()) return;

    const businessResult = setupBusinessSchema.safeParse({
      businessName,
      ownershipType,
      panNumber,
      gstNumber,
    });

    if (!businessResult.success) {
      showToast.error("Business Details are incomplete or invalid. Please fill them out first.");
      return;
    }

    setShowProductManagement?.(true);
  };

  // On the Product Maintenance step: "Yes" reveals the warehouse form (Continue),
  // "No" submits directly.
  const handleProductManagementNext = () => {
    if (manageCentrally === null) {
      showToast.error("Please select how you manage your products.");
      return;
    }
    if (manageCentrally === true && !showWarehouseForm) {
      setShowWarehouseForm(true);
      return;
    }
    handleSubmit();
  };

  // Switching to "No" hides any revealed warehouse form
  const handleManageCentrally = (val: boolean) => {
    setManageCentrally?.(val);
    if (!val) setShowWarehouseForm(false);
  };

  const getFormData = () => ({
    pharmacyType: selected,
    pharmacyName,
    pharmacyPhone,
    documentNo,
    issueDate,
    issueAuthority,
    expiryDate,
    pharmacyPan,
    pharmacyGst,
    pharmacyPincode: address.pincode,
    pharmacyBuildingNo,
    pharmacyStreet,
    pharmacyLandmark,
    manualFile: manualFile || existingManualFile || null,
  });

  const resetAddress = (pincode = "") => {
    setCities([]);
    setTalukas([]);

    setAddress({
      pincode,
      state: "",
      district: "",
      taluka: "",
      city: "",
    });
  };

  const fetchAddressByPincode = async (
    pincode: string,
    preserve?: { taluka?: string; city?: string },
  ) => {
    if (pincode.length !== 6) return;

    try {
      setLoadingPincode(true);

      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );

      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {

        const offices: PostOffice[] = data[0].PostOffice;

        const cityList = [...new Set(offices.map((office) => office.Name))];

        const talukaList = [...new Set(offices.map((office) => office.Block))];

        setCities(cityList);
        setTalukas(talukaList);

        const firstOffice = offices[0];

        setAddress({
          pincode,
          state: firstOffice.State || "",
          district: firstOffice.District || "",
          taluka:
            preserve?.taluka && talukaList.includes(preserve.taluka)
              ? preserve.taluka
              : talukaList[0] || "",
          city:
            preserve?.city && cityList.includes(preserve.city)
              ? preserve.city
              : cityList[0] || "",
        });

        // Matched a location — clear any earlier "no location" message
        setErrors((prev) => ({ ...prev, pharmacyPincode: "" }));
      } else {
        resetAddress(pincode);
        setErrors((prev) => ({
          ...prev,
          pharmacyPincode: "No location found for this PIN code.",
        }));
      }
    } catch (error) {
      console.error("Pincode lookup failed:", error);
      resetAddress(pincode);
      setErrors((prev) => ({
        ...prev,
        pharmacyPincode: "Unable to verify PIN code. Please try again.",
      }));
    } finally {
      setLoadingPincode(false);
    }
  };

  // Autofill the form when editing an existing registration (reqId in URL)
  useEffect(() => {
    if (!prefillData) return;

    const data = prefillData;

    // Match business type ignoring case/underscores/spaces
    // (e.g. "NURSING_HOME" or "NURSINGHOME" -> "nursingHome")
    const normalizeType = (value: string) =>
      value.replace(/[^a-z]/gi, "").toLowerCase();
    const typeId =
      pharmacyTypes.find(
        (type) =>
          normalizeType(type.id) === normalizeType(String(data.pharmacyType || "")),
      )?.id || "";
    setSelected(typeId);

    setPharmacyName(data.pharmacyName || "");
    setPharmacyPhone(data.pharmacyPhone || "");
    setPharmacyPan(data.panNumber || "");
    setPharmacyGst(data.gstNumber || "");
    setPharmacyBuildingNo(data.pharmacyBuildingNo || "");
    setPharmacyStreet(data.pharmacyStreet || "");
    setPharmacyLandmark(data.pharmacyLandmark || "");

    const doc = data.pharmacyRegistrationDocuments?.[0];
    if (doc) {
      setDocumentNo(doc.documentNumber || "");
      setIssueAuthority(doc.issueAuthority || "");
      setIssueDate(doc.issueDate ? String(doc.issueDate).split("T")[0] : "");
      setExpiryDate(doc.expiryDate ? String(doc.expiryDate).split("T")[0] : "");
      setExistingManualFile(doc.documentUrl || null);
    }

    const pincode = data.pharmacyPincode ? String(data.pharmacyPincode) : "";
    const taluka = data.pharmacyTaluka || "";
    const city = data.pharmacyCity || "";

    setAddress({
      pincode,
      state: data.pharmacyState || "",
      district: data.pharmacyDistricts || data.pharmacyDistrict || "",
      taluka,
      city,
    });
    setTalukas(taluka ? [taluka] : []);
    setCities(city ? [city] : []);

    // Load the full taluka/city dropdown options while keeping the saved selection
    if (pincode.length === 6) {
      fetchAddressByPincode(pincode, { taluka, city });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData]);

  const validateField = <K extends keyof typeof pharmacyDetailsSchema.shape>(
    field: K,
    value: string,
  ) => {
    const fieldSchema = pharmacyDetailsSchema.shape[field];

    const result = fieldSchema.safeParse(value);

    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? "" : (result.error.issues[0]?.message ?? ""),
    }));
  };

  const validateForm = () => {
    const result = pharmacyDetailsSchema.safeParse(getFormData());

    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: Record<string, string> = {};

    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as string;

      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    });

    setErrors(fieldErrors);

    return false;
  };

  // Returns true when the document number is already registered elsewhere.
  // A draft re-saving its own document number is not a duplicate.
  const isDocumentNumberDuplicate = async (value: string) => {
    const originalDocumentNo =
      prefillData?.pharmacyRegistrationDocuments?.[0]?.documentNumber;
    if (originalDocumentNo && value === originalDocumentNo) return false;

    return checkDocumentNumber(value);
  };

  const handleDocumentNoBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();

    if (!value) return;

    setCheckingDocumentNo(true);
    try {
      const exists = await isDocumentNumberDuplicate(value);

      if (exists) {
        setErrors((prev) => ({
          ...prev,
          documentNo: "This document number is already registered.",
        }));
      }
    } catch (error) {
      console.error("Document number check failed:", error);
    } finally {
      setCheckingDocumentNo(false);
    }
  };

  const handleFieldChange =
    <K extends keyof typeof pharmacyDetailsSchema.shape>(
      field: K,
      setter: React.Dispatch<React.SetStateAction<string>>,
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setter(value);
      validateField(field, value);
    };

  // Editing an existing draft: submit updates via PUT instead of creating a new registration
  const isDraftEdit =
    !!prefillData?.pharmacyRegistrationId &&
    String(prefillData?.registrationStatus || "").toUpperCase() === "DRAFT";

  // The top-level registrationStatus can lag (it may still read "SUBMITTED"
  // after a reviewer requests changes), so the current state is taken from the
  // most recent status review. A registration sent back for correction is
  // resubmitted via PUT /{reqId}/resubmit rather than registered anew.
  const latestReviewStatus = (() => {
    const reviews = prefillData?.pharmacyStatusReviews as
      | { status?: string; statusDate?: string }[]
      | undefined;
    if (!Array.isArray(reviews) || reviews.length === 0) return "";
    const latest = reviews.reduce((a, b) =>
      new Date(b.statusDate ?? 0).getTime() >= new Date(a.statusDate ?? 0).getTime()
        ? b
        : a,
    );
    return String(latest?.status || "").toUpperCase();
  })();

  const isCorrectionResubmit =
    !!prefillData?.pharmacyRegistrationId && latestReviewStatus === "CORRECTION";

  // Either edit path (draft submit or correction resubmit) reuses the existing
  // document / warehouse rows so the backend updates them in place.
  const isExistingEdit = isDraftEdit || isCorrectionResubmit;

  const getDocType = () =>
    selected === "doctor"
      ? "MEDICAL_REGISTRATION_CERTIFICATE"
      : ["hospital", "clinic", "nursingHome"].includes(selected)
        ? "CLINICAL_ESTABLISHMENT_CERTIFICATE"
        : "DRUG_LICENSE";

  const handleSaveDraft = async () => {
    setDraftLoading(true);
    try {
      const userResponse = await fetch("/api/user-info");
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user session info.");
      }
      const { userId, email, accessToken } = await userResponse.json();

      // Drafts allow partial data — send only the fields that are filled in
      const payload: Record<string, any> = { userId: String(userId) };

      // Re-saving an existing draft: include the id so the backend updates it
      // instead of creating a new draft (users can hold multiple drafts)
      if (isDraftEdit) {
        payload.pharmacyRegistrationId = prefillData.pharmacyRegistrationId;
      }

      if (pharmacyName) payload.pharmacyName = pharmacyName;
      if (selected) payload.pharmacyType = selected.toUpperCase();
      if (email) payload.pharmacyEmail = email;
      if (pharmacyPhone) payload.pharmacyPhone = pharmacyPhone;
      // No org fallback here — only send PAN/GST the user actually entered
      if (pharmacyPan) payload.panNumber = pharmacyPan;
      if (pharmacyGst) payload.gstNumber = pharmacyGst;
      if (address.city) {
        payload.pharmacyBranch = address.city;
        payload.pharmacyCity = address.city;
      }
      if (pharmacyBuildingNo) payload.pharmacyBuildingNo = pharmacyBuildingNo;
      if (pharmacyStreet) payload.pharmacyStreet = pharmacyStreet;
      if (address.taluka) payload.pharmacyTaluka = address.taluka;
      if (address.district) payload.pharmacyDistricts = address.district;
      if (address.pincode) payload.pharmacyPincode = Number(address.pincode);
      if (pharmacyLandmark) payload.pharmacyLandmark = pharmacyLandmark;
      if (address.state) payload.pharmacyState = address.state;

      if (existingOrg) {
        payload.organizationId = existingOrg.organizationId;
        payload.organizationName = existingOrg.organizationName;
        payload.ownershipType = existingOrg.ownershipType;
        payload.organizationPanNumber = existingOrg.panNumber;
        payload.organizationGstNumber = existingOrg.gstNumber;
      } else if (businessName) {
        payload.organizationName = businessName;
        payload.ownershipType = ownershipType;
        payload.organizationPanNumber = panNumber;
        payload.organizationGstNumber = gstNumber;
      }
      payload.organizationType = locationType === "single" ? "Single" : "Multiple";

      // Send back the existing row's id so the backend updates it in place
      // instead of inserting a duplicate document on every draft save
      const existingDocId = isDraftEdit
        ? prefillData?.pharmacyRegistrationDocuments?.[0]?.registrationDocumentId
        : undefined;

      if (documentNo) {
        payload.pharmacyRegistrationDocuments = [
          {
            ...(existingDocId ? { registrationDocumentId: existingDocId } : {}),
            documentNumber: documentNo,
            documentType: getDocType(),
            ...(issueDate ? { issueDate: `${issueDate}T00:00:00` } : {}),
            ...(issueAuthority ? { issueAuthority } : {}),
            ...(expiryDate ? { expiryDate: `${expiryDate}T00:00:00` } : {}),
          },
        ];
      }

      // Central-inventory choice + warehouse list — only once a "Multiple" org
      // has made the central-management choice
      if (manageCentrally !== null) {
        payload.centralizedInventory = manageCentrally === true;
        if (manageCentrally === true && warehouse?.warehouseName?.trim()) {
          payload.pharmacyRegistrationWareHouses = [{ ...warehouse }];
        }
      }

      const draftResponse = await savePharmacyDraft(payload, accessToken);
      console.log("Draft saved:", draftResponse);

      // Upload document file if provided, same as the submit flow
      if (
        manualFile &&
        draftResponse.data?.pharmacyRegistrationDocuments &&
        draftResponse.data.pharmacyRegistrationDocuments.length > 0
      ) {
        // The response can hold several document rows; upload to the row we
        // just saved, not whichever comes first
        const responseDocs = draftResponse.data.pharmacyRegistrationDocuments;
        const docId = (
          responseDocs.find(
            (d: { registrationDocumentId?: number }) =>
              existingDocId != null &&
              d.registrationDocumentId === existingDocId,
          ) ?? responseDocs[0]
        ).registrationDocumentId;
        const uploadResponse = await uploadPharmacyDocument(
          draftResponse.data.pharmacyRegistrationId,
          docId,
          manualFile,
          accessToken,
        );
        console.log("Draft document uploaded:", uploadResponse);
      }

      showToast.success("Draft saved successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      showToast.error(err?.message || "Failed to save draft.");
      console.error("Draft save failed:", err);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const isDuplicate = await isDocumentNumberDuplicate(documentNo.trim());

      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          documentNo: "This document number is already registered.",
        }));
        return;
      }
    } catch (error) {
      console.error("Document number check failed:", error);
      return;
    }

    if (!hasOrganization) {
      const businessResult = setupBusinessSchema.safeParse({
        businessName,
        ownershipType,
        panNumber,
        gstNumber,
      });

      if (!businessResult.success) {
        showToast.error("Business Details are incomplete or invalid. Please fill them out first.");
        return;
      }

      // Multiple-location orgs must declare how products are managed, and a
      // central warehouse requires an address before we can create the org.
      if (locationType === "multiple") {
        if (manageCentrally === null) {
          showToast.error("Please select how you manage your products.");
          return;
        }
        if (manageCentrally && !warehouse?.warehouseName?.trim()) {
          showToast.error("Please enter the warehouse name.");
          return;
        }
        if (manageCentrally && !warehouse?.warehouseAddress?.trim()) {
          showToast.error("Please enter the central warehouse address.");
          return;
        }
      }
    }

    setLoading(true);
    try {
      let orgResponse = existingOrg;
      if (!hasOrganization) {
        // Step 1: Hit Pharma Backend (create organization)
        const orgPayload: OrganizationCreateRequest = {
          organizationName: businessName,
          organizationType: locationType === "single" ? "Single" : "Multiple",
          ownershipType: ownershipType,
          panNumber: panNumber,
          gstNumber: gstNumber,
        };

        // For "Multiple" orgs, attach centralizedInventory (+ warehouse when central)
        if (locationType === "multiple" && warehouse) {
          Object.assign(
            orgPayload,
            buildWarehousePayload(manageCentrally, warehouse),
          );
        }

        orgResponse = await createOrganization(orgPayload);
        console.log("Step 1 Success (Organization):", orgResponse);

        // Upload the org logo once the organization exists. It's optional, so a
        // failure here shouldn't abort the registration — warn and continue.
        if (logo) {
          try {
            await uploadOrganizationLogo(logo);
            console.log("Organization logo uploaded");
          } catch (logoErr) {
            console.error("Logo upload failed:", logoErr);
            showToast.error("Organization created, but the logo upload failed.");
          }
        }
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
      const docType = getDocType();

      // When editing an existing registration (draft submit or correction
      // resubmit), reuse its document row so the backend updates it in place
      // instead of inserting a duplicate
      const existingDocId = isExistingEdit
        ? prefillData?.pharmacyRegistrationDocuments?.[0]?.registrationDocumentId
        : undefined;

      // Same for the central warehouse row
      const existingWarehouseId = isExistingEdit
        ? prefillData?.pharmacyRegistrationWareHouses?.[0]?.pharmacyRegistrationWarehouseId
        : undefined;

      // The warehouse's own backend code, so the registration points at the
      // organization's warehouse instead of describing a new one. Already on
      // state for an existing org; for one just created above the code is
      // generated server-side, so read it back.
      let warehouseCodeId =
        warehouse?.warehouseId ||
        prefillData?.pharmacyRegistrationWareHouses?.[0]?.warehouseId;
      if (
        manageCentrally === true &&
        !warehouseCodeId &&
        orgResponse?.organizationId
      ) {
        const orgWarehouses = await getWarehousesByOrganizationId(
          orgResponse.organizationId,
        );
        warehouseCodeId = orgWarehouses[0]?.warehouseId;
      }

      const registrationPayload = {
        userId: String(userId),
        pharmacyName: pharmacyName,
        pharmacyType: selected.toUpperCase(),
        pharmacyEmail: email,
        pharmacyPhone: pharmacyPhone,
        panNumber: pharmacyPan, //|| panNumber,
        gstNumber: pharmacyGst, //|| gstNumber,
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
        // Central-inventory flag + warehouse list (only populated when a
        // "Multiple" org manages products centrally)
        centralizedInventory: manageCentrally === true,
        pharmacyRegistrationWareHouses:
          manageCentrally === true && warehouse
            ? [
                {
                  ...(existingWarehouseId
                    ? { pharmacyRegistrationWarehouseId: existingWarehouseId }
                    : {}),
                  ...warehouse,
                  ...(warehouseCodeId ? { warehouseId: warehouseCodeId } : {}),
                },
              ]
            : [],
        pharmacyRegistrationDocuments: [
          {
            ...(existingDocId ? { registrationDocumentId: existingDocId } : {}),
            documentNumber: documentNo,
            documentType: docType,
            issueDate: issueDate ? `${issueDate}T00:00:00` : undefined,
            issueAuthority: issueAuthority,
            expiryDate: expiryDate ? `${expiryDate}T00:00:00` : undefined,
          },
        ],
      };

      // Step 3: On Admin Backend — resubmit a correction (PUT /resubmit),
      // submit a draft (PUT /submit), or register a new pharmacy (POST)
      const regResponse = isCorrectionResubmit
        ? await resubmitPharmacy(
            prefillData.pharmacyRegistrationId,
            registrationPayload,
            accessToken,
          )
        : isDraftEdit
          ? await submitPharmacyDraft(
              prefillData.pharmacyRegistrationId,
              registrationPayload,
              accessToken,
            )
          : await registerPharmacy(registrationPayload, accessToken);

      console.log("Step 2 Success (Pharmacy Registration):", regResponse);

      // Step 4: Upload File if provided
      if (
        manualFile &&
        regResponse.data?.pharmacyRegistrationDocuments &&
        regResponse.data.pharmacyRegistrationDocuments.length > 0
      ) {
        // Upload to the row we just saved, not whichever comes first
        const responseDocs = regResponse.data.pharmacyRegistrationDocuments;
        const docId = (
          responseDocs.find(
            (d: { registrationDocumentId?: number }) =>
              existingDocId != null &&
              d.registrationDocumentId === existingDocId,
          ) ?? responseDocs[0]
        ).registrationDocumentId;
        const uploadResponse = await uploadPharmacyDocument(
          regResponse.data.pharmacyRegistrationId,
          docId,
          manualFile,
          accessToken,
        );
        console.log("Step 3 Success (Document Upload):", uploadResponse);
      }

      // showToast.success("Compliance details submitted successfully!");
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
        showAddLocation={locationType === "multiple"}
        onAddLocation={() => {
          setOpen(false);
          // Full reload of the setup page so it re-runs getUserOrganization():
          // the org now exists, so the org + warehouse steps are hidden and
          // only the pharmacy details are asked for the new location.
          window.location.href = "/dashboard/setupBusiness";
        }}
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-h4 font-semibold text-pneutral-900">
            {showWarehouseForm
              ? "Central Warehouse Details"
              : showProductManagement
                ? "Product Maintenance"
                : ""}
          </div>
          
        </div>

        <div className="flex flex-col gap-5">
          {showProductManagement ? (
            <SetupWarehouse
              manageCentrally={manageCentrally}
              setManageCentrally={handleManageCentrally}
              warehouse={warehouse!}
              setWarehouse={setWarehouse!}
              showWarehouseForm={showWarehouseForm}
            />
          ) : (
          <>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
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
                    onChange={(e) => {
                      setSelected(e.target.value);
                      validateField("pharmacyType", e.target.value);
                    }}
                    className="absolute left-4 top-4 h-5 w-5 accent-secondary-700"
                  />

                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div
                      className={`flex h-22 w-22 items-center justify-center rounded-full
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
          {errors.pharmacyType && (
            <p className="mt-2 text-sm text-red-500">{errors.pharmacyType}</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-pneutral-100 flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-pneutral-900">
            <div className="text-h6 font-semibold">
              {isNewMultiple ? "Primary Location" : "Pharmacy Details"}
            </div>
            <div className="text-p4 font-normal font-noto-sans">
              {isNewMultiple
                ? "Enter your Primary Location Details"
                : "Enter your Pharmacy Details"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Input
              label={pharmacyNameLabel}
              placeholder="MedPlus Healthcare"
              type="text"
              name="pharmacyName"
              id="pharmacyName"
              value={pharmacyName}
              onChange={handleFieldChange("pharmacyName", setPharmacyName)}
              error={errors.pharmacyName}
              required
            />

            <Input
              label="Mobile Number"
              placeholder="Enter company phone"
              type="text"
              name="pharmacyPhone"
              id="pharmacyPhone"
              inputMode="numeric"
              leftAddon={
                <select
                  aria-label="Country code"
                  className="h-full bg-transparent border-r border-pneutral-300 px-3 text-p4 text-pneutral-900 outline-none cursor-pointer"
                >
                  <option>+91</option>
                </select>
              }
              value={pharmacyPhone}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]+$/.test(val)) {
                  if (val.length <= 10) {
                    setPharmacyPhone(val);
                    validateField("pharmacyPhone", val);
                  }
                }
              }}
              error={errors.pharmacyPhone}
              required
            />

            <Input
              label={documentLabel}
              placeholder={documentPlaceholder}
              type="text"
              name="documentNo"
              id="documentNo"
              maxLength={30}
              value={documentNo}
              onChange={handleFieldChange("documentNo", setDocumentNo)}
              onBlur={handleDocumentNoBlur}
              error={errors.documentNo}
              required
            />

            <UploadInput
              onFileSelect={setManualFile}
              existingFile={existingManualFile || undefined}
              required
              hasError={!!errors.manualFile}
            />

            <Input
              label="Issue Date"
              type="date"
              name="issueDate"
              id="issueDate"
              ref={issueDateRef}
              onClick={() => openDatePicker(issueDateRef)}
              style={{ cursor: "pointer" }}
              value={issueDate}
              onChange={handleFieldChange("issueDate", setIssueDate)}
              error={errors.issueDate}
              max={today}
              required
            />

            <Input
              label="Issue Authority"
              placeholder="FDA"
              type="text"
              name="issueAuthority"
              id="issueAuthority"
              value={issueAuthority}
              onChange={handleFieldChange("issueAuthority", setIssueAuthority)}
              error={errors.issueAuthority}
              required
            />

            <Input
              label="Expiry Date"
              type="date"
              name="expiryDate"
              id="expiryDate"
              ref={expiryDateRef}
              onClick={() => openDatePicker(expiryDateRef)}
              style={{ cursor: "pointer" }}
              value={expiryDate}
              onChange={handleFieldChange("expiryDate", setExpiryDate)}
              error={errors.expiryDate}
              min={today}
              max="9999-12-31"
              required
            />

            <Input
              label="PAN Number (Optional)"
              placeholder="ABCDE1234F"
              type="text"
              name="panNumber"
              id="panNumber"
              value={pharmacyPan}
              onChange={handleFieldChange("pharmacyPan", setPharmacyPan)}
              error={errors.pharmacyPan}
            />

            <Input
              label="GST Number (Optional)"
              placeholder="29ABCDE1234F1Z5"
              type="text"
              name="gstNumber"
              id="gstNumber"
              value={pharmacyGst}
              onChange={handleFieldChange("pharmacyGst", setPharmacyGst)}
              error={errors.pharmacyGst}
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

                validateField("pharmacyPincode", value);

                if (value.length === 6) {
                  fetchAddressByPincode(value);
                } else {
                  resetAddress(value);
                }
              }}
              error={errors.pharmacyPincode}
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

            {/* <Input
              label="Taluka"
              placeholder="Select Taluka"
              type="text"
              name="pharmacyTaluka"
              id="pharmacyTaluka"
              value={address.taluka}
              readOnly
              required
            /> */}

            <Dropdown
              label="Taluka"
              placeholder="Select Taluka"
              options={talukas.map((taluka) => ({
                label: taluka,
                value: taluka,
              }))}
              value={address.taluka}
              onChange={(value: string) =>
                setAddress((prev) => ({
                  ...prev,
                  taluka: value,
                }))
              }
              disabled={talukas.length === 0}
              searchable
              required
            />

            <Dropdown
              label="City/Town/Village"
              placeholder="Select City"
              options={cities.map((city) => ({
                label: city,
                value: city,
              }))}
              value={address.city}
              onChange={(value: string) =>
                setAddress((prev) => ({
                  ...prev,
                  city: value,
                }))
              }
              disabled={cities.length === 0}
              searchable
              required
            />


            <Input
              label="Building No and name"
              placeholder="Enter building no"
              type="text"
              name="pharmacyBuildingNo"
              id="pharmacyBuildingNo"
              value={pharmacyBuildingNo}
              onChange={handleFieldChange(
                "pharmacyBuildingNo",
                setPharmacyBuildingNo,
              )}
              error={errors.pharmacyBuildingNo}
              required
            />

            <Input
              label="Street/Road/Lane"
              placeholder="Enter Street/Road/Lane"
              type="text"
              name="pharmacyStreet"
              id="pharmacyStreet"
              value={pharmacyStreet}
              onChange={handleFieldChange("pharmacyStreet", setPharmacyStreet)}
              error={errors.pharmacyStreet}
              required
            />

            <Input
              label="Landmark (optional)"
              placeholder="Enter Landmark"
              type="text"
              name="pharmacyLandmark"
              id="pharmacyLandmark"
              value={pharmacyLandmark}
              onChange={handleFieldChange(
                "pharmacyLandmark",
                setPharmacyLandmark,
              )}
              error={errors.pharmacyLandmark}
            />
          </div>
        </div>
          </>
          )}
        </div>

      <div className="mt-5 flex justify-between">
        <div>
          <Button
            variant="secondary"
            className="w-35.25"
            onClick={handleSaveDraft}
            loading={draftLoading}
          >
            Save Draft
          </Button>
        </div>

        <div className="flex gap-6">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>Cancel</Button>

          <Button
            variant="primary"
            className="w-[210px]"
            onClick={
              isNewMultiple && !showProductManagement
                ? handleNext
                : showProductManagement
                  ? handleProductManagementNext
                  : handleSubmit
            }
            disabled={
              showProductManagement &&
              !showWarehouseForm &&
              manageCentrally === null
            }
            loading={loading}
          >
            {isNewMultiple && !showProductManagement
              ? "Next"
              : showProductManagement &&
                manageCentrally === true &&
                !showWarehouseForm
                ? "Continue"
                : isCorrectionResubmit
                  ? "Resubmit"
                  : isDraftEdit
                    ? "Submit Draft"
                    : "Submit Compliance"}
          </Button>
        </div>
      </div>
      </div>
    </>
  );
};

export default SetupPharmacy;
