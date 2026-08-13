"use client";

/**
 * Step 1 of the POS flow — capture the customer, pull medicines into the cart,
 * apply a bill level discount, then hand the cart to BillingPayment.
 * Designed according to the high-fidelity Billing POS specifications.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ShoppingCart,
  Upload,
  X,
  User,
  Building2,
  Briefcase,
  Shield
} from "lucide-react";
import { showToast } from "@/app/components/common/Toast";
import {
  ADDRESS_MAX,
  CODE_MAX,
  sanitizeAddress,
  sanitizeCode,
  sanitizeName,
  sanitizeNumber,
  sanitizePercentage,
  sanitizePhone,
  validateAddress,
  validateCode,
  validateName,
  validatePhone,
} from "@/app/schema/BillingSchema";
import Input from "@/app/components/common/Input";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
import BillingItemsTable, {
  BillingRow,
  emptyBillingRow,
} from "./BillingItemsTable";
import { ProductService } from "@/services/ProductService";
import { getCustomersByPhone } from "@/services/CustomerService";
import { PRESCRIPTION_MAX_BYTES } from "@/services/BillingService";
import { getAllDoctors, createDoctor } from "@/services/DoctorService";
import {
  BillLine,
  BillableProduct,
  CustomerInfo,
  CustomerRecord,
  CustomerType,
  DoctorRecord,
} from "@/types/BillingData";
import {
  billDiscountBothWays,
  calculateBillTotals,
  formatAmount,
  type DiscountType,
} from "@/utils/billingTotals";
import {
  BACK_BUTTON,
  DARK_BUTTON,
  PRIMARY_BUTTON,
} from "./billingButtons";

interface BillingProps {
  onCancel: () => void;
  onProceedToPayment: (bill: {
    customer: CustomerInfo;
    lines: BillLine[];
    /** As typed on this screen — the unit is carried alongside it. */
    billDiscountValue: number;
    discountType: DiscountType;
    /** Uploaded against the bill once it has an id. */
    prescriptionFile?: File | null;
  }) => void;
  initialCustomer?: CustomerInfo;
  initialLines?: BillLine[];
  initialBillDiscount?: number;
  initialDiscountType?: DiscountType;
}

/**
 * The four live types have artwork. Drawn as a mask rather than an <img> so the
 * glyph takes the chip's own colour — the source SVGs are purple, which made
 * unselected chips look selected.
 */
const TypeIcon = ({ src, size = 16 }: { src: string; size?: number }) => (
  <span
    aria-hidden
    className="inline-block shrink-0 bg-current"
    style={{
      width: size,
      height: size,
      maskImage: `url(${src})`,
      WebkitMaskImage: `url(${src})`,
      maskSize: "contain",
      WebkitMaskSize: "contain",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskPosition: "center",
    }}
  />
);

/**
 * The eight values of the backend CustomerType enum — seven sit on the first
 * row and Insurance wraps onto the second.
 */
const CUSTOMER_TYPES: {
  label: string;
  value: CustomerType;
  icon: React.ReactNode;
}[] = [
  {
    label: "Walk-in",
    value: "WALK_IN",
    // Its artwork reads larger than the rest at the same box size.
    icon: <TypeIcon src="/Billing/Walk-in.svg" size={14} />,
  },
  { label: "Registered", value: "REGISTERED", icon: <User size={16} /> },
  { label: "OP Patient", value: "OP_PATIENT", icon: <TypeIcon src="/Billing/OP.svg" /> },
  { label: "IP Patient", value: "IP_PATIENT", icon: <TypeIcon src="/Billing/IP.svg" /> },
  { label: "Daycare", value: "DAYCARE", icon: <TypeIcon src="/Billing/Daycare.svg" /> },
  { label: "Corporate", value: "CORPORATE", icon: <Building2 size={16} /> },
  { label: "Business", value: "BUSINESS", icon: <Briefcase size={16} /> },
  { label: "Insurance", value: "INSURANCE", icon: <Shield size={16} /> },
];

/** The rest stay disabled until their flows are built. */
const ENABLED_CUSTOMER_TYPES: CustomerType[] = [
  "WALK_IN",
  "OP_PATIENT",
  "IP_PATIENT",
  "DAYCARE",
];

/** Types that bill a patient rather than a walk-in customer. */
const PATIENT_TYPES: CustomerType[] = ["OP_PATIENT", "IP_PATIENT", "DAYCARE"];

/** The visit number's label — daycare is admitted, so it files under IP. */
const VISIT_NUMBER_LABELS: Partial<Record<CustomerType, string>> = {
  OP_PATIENT: "OP Number",
  IP_PATIENT: "IP Number",
  DAYCARE: "IP Number",
};

const EMPTY_CUSTOMER: CustomerInfo = {
  customerType: "",
  customerId: null,
  doctorId: null,
  customerName: "",
  mobileNo: "",
  age: "",
  gender: "",
  doctorName: "",
  referredBy: "",
  patientNumber: "",
  visitNumber: "",
  address: "",
};

/**
 * The fields the batches endpoint returns that the cart needs. Everything is
 * optional — the mapping below supplies a fallback for each.
 */
interface BatchApiRow {
  productId?: string;
  productName?: string;
  brandName?: string;
  batchId?: string;
  batchNumber?: string;
  purchaseSmallestUnitName?: string;
  // The batches endpoint is untyped and the two product shapes disagree on the
  // name, so both are read.
  hsnCode?: string;
  hsnNo?: string;
  expiryDate?: string;
  stockQty?: number | string;
  totalStock?: number | string;
  mrpPerUnit?: number | string;
  mrp?: number | string;
  sellingPricePerUnit?: number | string;
  sellingPrice?: number | string;
  gstPercentage?: number | string;
  rackLocation?: string;
}

/** Rebuilds the cart lines the payment and invoice screens expect. */
const rowsToLines = (rows: BillingRow[]): BillLine[] =>
  rows
    .filter((row) => row.batchId && Number(row.quantity) > 0)
    .map((row) => ({
      lineId: row.rowId,
      productId: row.productId,
      productName: row.productName,
      brandName: row.brandName,
      batchId: row.batchId,
      batchNumber: row.batchNumber,
      unit: row.unit || "Unit",
      hsnCode: row.hsnCode,
      expiryDate: row.expiryDate,
      quantity: Number(row.quantity) || 0,
      freeQuantity: 0,
      mrpPerUnit: row.mrpPerUnit,
      sellingPricePerUnit: row.sellingPricePerUnit || row.mrpPerUnit,
      discountPercentage: Number(row.discountPercentage) || 0,
      gstPercentage: row.gstPercentage,
      availableQuantity: row.availableQuantity,
    }));

/** Reopens a saved bill in the grid. */
const linesToRows = (lines: BillLine[]): BillingRow[] =>
  lines.map((line) => ({
    ...emptyBillingRow(),
    productId: line.productId,
    productName: line.productName,
    brandName: line.brandName,
    batchId: line.batchId,
    batchNumber: line.batchNumber,
    unit: String(line.unit || "Unit"),
    hsnCode: line.hsnCode || "",
    expiryDate: line.expiryDate,
    availableQuantity: line.availableQuantity,
    quantity: String(line.quantity),
    discountPercentage: String(line.discountPercentage || ""),
    mrpPerUnit: line.mrpPerUnit,
    sellingPricePerUnit: line.sellingPricePerUnit || line.mrpPerUnit,
    gstPercentage: line.gstPercentage,
  }));

const Billing: React.FC<BillingProps> = ({
  onCancel,
  onProceedToPayment,
  initialCustomer,
  initialLines,
  initialBillDiscount,
  initialDiscountType,
}) => {
  const [customer, setCustomer] = useState<CustomerInfo>(
    initialCustomer ?? EMPTY_CUSTOMER
  );
  const [rows, setRows] = useState<BillingRow[]>(
    initialLines && initialLines.length > 0
      ? linesToRows(initialLines)
      : [emptyBillingRow()]
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialDiscountType ?? "AMOUNT"
  );
  const [billDiscountInput, setBillDiscountInput] = useState(
    initialBillDiscount ? String(initialBillDiscount) : "0"
  );
  const [prescriptionName, setPrescriptionName] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batches fetched from server
  const [batchCatalog, setBatchCatalog] = useState<BillableProduct[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);

  // Customers registered against the typed phone number
  const [knownCustomers, setKnownCustomers] = useState<CustomerRecord[]>([]);
  const [isLookingUpCustomers, setIsLookingUpCustomers] = useState(false);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);

  // Referring doctors
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isAddingNewDoctor, setIsAddingNewDoctor] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Validation messages shown under the customer fields. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (key: string, message: string) =>
    setFieldErrors((prev) => ({ ...prev, [key]: message }));

  const isPatientType = PATIENT_TYPES.includes(
    customer.customerType as CustomerType
  );
  /** "Customer" for a walk-in, "Patient" for OP/IP/Daycare. */
  const personLabel = isPatientType ? "Patient" : "Customer";
  const visitNumberLabel =
    VISIT_NUMBER_LABELS[customer.customerType as CustomerType] ?? "Visit Number";

  useEffect(() => {
    const fetchBatches = async () => {
      setLoadingBatches(true);
      try {
        const res = await ProductService.getAllBatches();
        const data = res?.data || [];
        const mapped: BillableProduct[] = (data as BatchApiRow[]).map((b) => ({
          productId: b.productId || "",
          productName: b.productName || "Unknown Product",
          brandName: b.brandName || "",
          batchId: b.batchId || "",
          batchNumber: b.batchNumber || "N/A",
          // Stock is counted in smallest units, so never fall back to the
          // purchase unit here — it would label the quantity wrongly.
          unit: b.purchaseSmallestUnitName || "",
          hsnCode: b.hsnCode || b.hsnNo || "",
          expiryDate: b.expiryDate || "N/A",
          availableQuantity: Number(b.stockQty ?? b.totalStock) || 0,
          mrpPerUnit: Number(b.mrpPerUnit) || Number(b.mrp) || 0,
          sellingPricePerUnit: Number(b.sellingPricePerUnit) || Number(b.sellingPrice) || Number(b.mrpPerUnit) || 0,
          gstPercentage: Number(b.gstPercentage) || 0,
          rackNo: b.rackLocation || "",
        }));
        setBatchCatalog(mapped);
      } catch (err) {
        console.error("Failed to fetch batches:", err);
        showToast.error("Failed to load medicines from server.");
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, []);

  // Referring doctors for this pharmacy, loaded once.
  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoadingDoctors(true);
      try {
        setDoctors(await getAllDoctors());
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  const setField = <K extends keyof CustomerInfo>(
    key: K,
    value: CustomerInfo[K]
  ) => setCustomer((prev) => ({ ...prev, [key]: value }));

  const customerOptions: DropdownOption[] = [
    ...knownCustomers.map((c) => ({
      label: c.customerName,
      value: c.customerId,
    })),
    { label: "+ Add New Customer", value: "ADD_NEW" },
  ];

  /** The patient id the customer lookup returned for a record. */
  const patientNoOf = (record?: CustomerRecord) =>
    record?.patientNo ?? record?.patientNumber ?? "";

  /**
   * One patient, one patient number. It belongs to the person picked rather
   * than to the phone number they share, so it is read straight off their
   * record — never offered as a choice, and never re-typed. A person with no
   * number on file has one captured with this bill.
   */
  const patientOnRecord = isAddingNewCustomer
    ? undefined
    : knownCustomers.find((c) => c.customerId === customer.customerId);
  const patientNoOnRecord = patientNoOf(patientOnRecord);

  const doctorOptions: DropdownOption[] = [
    ...doctors.map((d) => ({ label: d.doctorName, value: d.doctorId })),
    { label: "+ Add New Doctor", value: "ADD_NEW" },
  ];

  /**
   * A number can be shared by a household, so a full number is looked up and
   * the matching names offered. Nothing found means a new customer, which the
   * billing API creates from the name and phone on submit.
   */
  const handlePhoneChange = async (raw: string) => {
    const mobileNo = sanitizePhone(raw);
    setFieldError("mobileNo", validatePhone(mobileNo));
    setCustomer((prev) => ({
      ...prev,
      mobileNo,
      // Any edit invalidates the customer picked for the previous number.
      customerId: null,
      customerName: "",
      patientNumber: "",
    }));
    setIsAddingNewCustomer(false);

    if (mobileNo.length < 10) {
      setKnownCustomers([]);
      return;
    }

    setIsLookingUpCustomers(true);
    try {
      const matches = await getCustomersByPhone(mobileNo);
      setKnownCustomers(matches);
      // A single match needs no picking.
      if (matches.length === 1) {
        setCustomer((prev) => ({
          ...prev,
          customerId: matches[0].customerId,
          customerName: matches[0].customerName,
          patientNumber: patientNoOf(matches[0]),
        }));
      }
    } catch (err) {
      console.error("Failed to look up customers:", err);
      setKnownCustomers([]);
    } finally {
      setIsLookingUpCustomers(false);
    }
  };

  const handleCustomerSelect = (value: string | number) => {
    if (value === "ADD_NEW") {
      setIsAddingNewCustomer(true);
      setCustomer((prev) => ({
        ...prev,
        customerId: null,
        customerName: "",
        patientNumber: "",
      }));
      return;
    }
    const picked = knownCustomers.find((c) => c.customerId === Number(value));
    setCustomer((prev) => ({
      ...prev,
      customerId: picked?.customerId ?? null,
      customerName: picked?.customerName ?? "",
      // The picked person's own patient number, not another family member's.
      patientNumber: patientNoOf(picked),
    }));
  };

  const handleDoctorSelect = (value: string | number) => {
    if (value === "ADD_NEW") {
      setIsAddingNewDoctor(true);
      setCustomer((prev) => ({ ...prev, doctorId: null, referredBy: "" }));
      return;
    }
    const picked = doctors.find((d) => d.doctorId === Number(value));
    setCustomer((prev) => ({
      ...prev,
      doctorId: picked?.doctorId ?? null,
      referredBy: picked?.doctorName ?? "",
    }));
  };

  /**
   * Validates the customer block, saves a newly typed doctor so the bill can
   * carry its id, and hands the cart to the payment screen.
   */
  const handleProceed = async () => {
    // Every message lands under its own field; the toast is kept for failures
    // that belong to no single field.
    const nextErrors = {
      mobileNo: validatePhone(customer.mobileNo),
      customerName: validateName(customer.customerName, `${personLabel} name`),
      // Required only when the patient has no number on file yet — a number
      // that came off their record is already valid.
      patientNumber:
        isPatientType && !patientNoOnRecord
          ? validateCode(customer.patientNumber ?? "", "Patient number", CODE_MAX)
          : "",
      // The visit number is optional, so it is only checked once typed.
      visitNumber:
        isPatientType && (customer.visitNumber ?? "").trim()
          ? validateCode(customer.visitNumber ?? "", visitNumberLabel, CODE_MAX)
          : "",
      address: validateAddress(customer.address),
    };

    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      showToast.error("Please correct the highlighted fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const doctorId = await resolveDoctor();

      // A number already on the customer's record travels with their id, so
      // only a newly typed one is sent — to attach it to the customer or to
      // create them with it.
      const patientNumber = customer.patientNumber?.trim() ?? "";

      onProceedToPayment({
        customer: {
          ...customer,
          doctorId,
          patientNumber: patientNoOnRecord ? "" : patientNumber,
        },
        lines,
        billDiscountValue: Number(billDiscountInput) || 0,
        discountType,
        prescriptionFile,
      });
    } catch (err) {
      console.error("Failed to save the referring doctor:", err);
      showToast.error(
        err instanceof Error ? err.message : "Failed to save the referring doctor."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Creates the typed-in doctor so the bill can reference its id. */
  const resolveDoctor = async (): Promise<number | null> => {
    if (!isAddingNewDoctor) return customer.doctorId ?? null;
    if (!newDoctorName.trim()) return null;

    const created = await createDoctor(newDoctorName.trim());
    setDoctors((prev) => [...prev, created]);
    setIsAddingNewDoctor(false);
    setNewDoctorName("");
    setCustomer((prev) => ({
      ...prev,
      doctorId: created.doctorId,
      referredBy: created.doctorName,
    }));
    return created.doctorId;
  };

  /**
   * Each customer type collects a different set of details, so switching type
   * clears whatever the previous one captured. Clicking the selected type again
   * collapses the card back to the picker.
   */
  const selectCustomerType = (type: CustomerType) => {
    setCustomer((prev) =>
      prev.customerType === type
        ? EMPTY_CUSTOMER
        : { ...EMPTY_CUSTOMER, customerType: type }
    );
    setKnownCustomers([]);
    setIsAddingNewCustomer(false);
    setIsAddingNewDoctor(false);
    setNewDoctorName("");
  };

  // Both are plain arithmetic over a handful of rows — cheap enough to derive
  // on every render, and hand-memoizing them defeats the React Compiler.
  const lines = rowsToLines(rows);

  const totals = calculateBillTotals(
    lines,
    Number(billDiscountInput) || 0,
    discountType
  );

  // Whichever unit the cashier typed, the other is shown back to them.
  const billDiscount = billDiscountBothWays(
    totals.grossAmount,
    Number(billDiscountInput) || 0,
    discountType
  );

  /**
   * Refreshes stock and pricing for the batch the grid just selected. This is
   * the same batch-details call the old search flow used.
   */
  const fetchBatchDetails = async (batchId: string): Promise<BillableProduct | null> => {
    try {
      const res = await ProductService.getBatchById(batchId);
      const b = res?.data;
      if (!b) return null;
      return {
        productId: b.productId || "",
        productName: b.productName || "",
        brandName: b.brandName || "",
        batchId: b.batchId || batchId,
        batchNumber: b.batchNumber || "",
        unit: b.purchaseSmallestUnitName || "",
        expiryDate: b.expiryDate || "",
        availableQuantity: Number(b.stockQty ?? b.totalStock) || 0,
        mrpPerUnit: Number(b.mrpPerUnit) || Number(b.mrp) || 0,
        sellingPricePerUnit:
          Number(b.sellingPricePerUnit) || Number(b.sellingPrice) || Number(b.mrpPerUnit) || 0,
        gstPercentage: Number(b.gstPercentage) || 0,
        rackNo: b.rackLocation || "",
      };
    } catch (err) {
      console.error("Failed to fetch batch details:", err);
      showToast.error("Failed to load batch details.");
      return null;
    }
  };


  return (
    <div className="flex flex-col gap-5 text-pneutral-900 pb-12">
      {/* Title */}
      <div className="text-[24px] font-semibold tracking-normal text-[#1E1E1D]">
        Billing POS
      </div>

      {/* Customer Information Card — collapsed to the type picker until a type
          is chosen, then it grows to hold that type's fields. */}
      <div className="w-full min-h-[172px] rounded-[12px] border border-pneutral-200 bg-white p-3 shadow-sm flex flex-col gap-4">
        <div className="text-label-l5 font-semibold text-pneutral-800">
          Customer Information
        </div>

        {/* Customer types — 7 on the first row, the 8th wraps below */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
          {CUSTOMER_TYPES.map((type) => {
            const isSelected = customer.customerType === type.value;
            const isEnabled = ENABLED_CUSTOMER_TYPES.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                disabled={!isEnabled}
                title={isEnabled ? undefined : "Coming soon"}
                onClick={() => selectCustomerType(type.value)}
                className={`h-[34px] px-3 py-1.5 rounded-[8px] border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all select-none ${
                  !isEnabled
                    ? "bg-sneutral-100 border-pneutral-300 text-pneutral-500 cursor-not-allowed"
                    : isSelected
                    ? "bg-[#F8F5FF] border-[#7D32FC] text-[#7D32FC] font-semibold shadow-2xs cursor-pointer"
                    : "bg-white border-[#D5D5D4] text-[#3C3D3A] hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <span
                  className={
                    !isEnabled
                      ? "text-pneutral-500"
                      : isSelected
                      ? "text-[#7D32FC]"
                      : "text-[#3C3D3A]"
                  }
                >
                  {type.icon}
                </span>
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Customer fields — 2x2, each row 72px (24px label + 48px field).
            Walk-in, OP, IP and Daycare all capture the same block today; a
            type that needs extra fields adds them alongside this grid. */}
        {customer.customerType !== "" && (
          <>
            {/* Patient types open with their own section heading — no rule
                under it, and 16px clear of the type chips above. */}
            {isPatientType && (
              <div className="flex items-end">
                <span className="font-body font-medium text-label-l4 text-pneutral-900">
                  Patient Details
                </span>
              </div>
            )}

            {/* items-start keeps each field at its own height — without it a
                short field stretches to match the address box beside it and
                its dropdown menu opens well below the control. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Phone first — the names below are looked up from it. */}
              <Input
                label="Mobile Number"
                type="tel"
                required
                maxLength={10}
                placeholder="10 digit mobile number"
                value={customer.mobileNo}
                onChange={(e) => handlePhoneChange(e.target.value)}
                error={fieldErrors.mobileNo}
                hint={
                  isLookingUpCustomers
                    ? `Looking up ${personLabel.toLowerCase()}s…`
                    : customer.mobileNo.length === 10 && knownCustomers.length === 0
                    ? `New number — a ${personLabel.toLowerCase()} will be created with this bill.`
                    : undefined
                }
              />

              {/* Known number: pick the person. Otherwise type a new name. */}
              {knownCustomers.length > 0 && !isAddingNewCustomer ? (
                <Dropdown
                  label={`${personLabel} Name`}
                  required
                  placeholder={`Select ${personLabel.toLowerCase()}`}
                  options={customerOptions}
                  value={customer.customerId ?? ""}
                  onChange={handleCustomerSelect}
                  isLoading={isLookingUpCustomers}
                  error={fieldErrors.customerName}
                  searchable
                />
              ) : (
                <Input
                  label={`${personLabel} Name`}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customer.customerName}
                  onChange={(e) => {
                    const name = sanitizeName(e.target.value);
                    setField("customerName", name);
                    // Typing a name means a new customer, not the picked one.
                    setField("customerId", null);
                    setFieldError(
                      "customerName",
                      validateName(name, `${personLabel} name`)
                    );
                  }}
                  error={fieldErrors.customerName}
                  rightIcon={
                    knownCustomers.length > 0 ? (
                      <button
                        type="button"
                        aria-label={`Pick an existing ${personLabel.toLowerCase()} instead`}
                        title={`Pick an existing ${personLabel.toLowerCase()} instead`}
                        onClick={() => {
                          setIsAddingNewCustomer(false);
                          setField("customerName", "");
                        }}
                        className="flex items-center text-pneutral-500 hover:text-pneutral-900 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    ) : undefined
                  }
                />
              )}

              {/* Patient id — filled from the patient's own record when they
                  have one, typed once for a patient who does not. */}
              {isPatientType &&
                (patientNoOnRecord ? (
                  <Input
                    label="Patient Number"
                    readOnly
                    value={patientNoOnRecord}
                    onChange={() => {}}
                    hint="On file for this patient."
                  />
                ) : (
                  <Input
                    label="Patient Number"
                    required
                    placeholder="Enter patient number"
                    value={customer.patientNumber ?? ""}
                    onChange={(e) => {
                      const code = sanitizeCode(e.target.value);
                      setField("patientNumber", code);
                      setFieldError(
                        "patientNumber",
                        validateCode(code, "Patient number")
                      );
                    }}
                    error={fieldErrors.patientNumber}
                    hint={
                      !fieldErrors.patientNumber
                        ? "Saved against this patient with the bill."
                        : undefined
                    }
                  />
                ))}

              {/* Visit number — OP for outpatients, IP for inpatients/daycare.
                  Optional: a patient may be billed without one. */}
              {isPatientType && (
                <Input
                  label={visitNumberLabel}
                  placeholder={`Enter ${visitNumberLabel}`}
                  value={customer.visitNumber ?? ""}
                  onChange={(e) => {
                    const code = sanitizeCode(e.target.value);
                    setField("visitNumber", code);
                    setFieldError(
                      "visitNumber",
                      code ? validateCode(code, visitNumberLabel) : ""
                    );
                  }}
                  error={fieldErrors.visitNumber}
                />
              )}

              {!isAddingNewDoctor ? (
                <Dropdown
                  label="Referred By"
                  placeholder="Select doctor or add new"
                  options={doctorOptions}
                  value={customer.doctorId ?? ""}
                  onChange={handleDoctorSelect}
                  isLoading={isLoadingDoctors}
                  searchable
                />
              ) : (
                <Input
                  label="Referred By"
                  placeholder="e.g. Dr. Anitha Rao"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(sanitizeName(e.target.value))}
                  hint="Saved as a new doctor when the bill is generated."
                  rightIcon={
                    <button
                      type="button"
                      aria-label="Select an existing doctor instead"
                      title="Select an existing doctor instead"
                      onClick={() => {
                        setIsAddingNewDoctor(false);
                        setNewDoctorName("");
                      }}
                      className="flex items-center text-pneutral-500 hover:text-pneutral-900 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  }
                />
              )}

              {isPatientType ? (
                /* Patient address is a 100px box under its own label */
                <div className="flex flex-col gap-0">
                  <label
                    htmlFor="patientAddress"
                    className="font-heading font-medium text-label-l4 text-pneutral-800 mb-1"
                  >
                    Address
                  </label>
                  <textarea
                    id="patientAddress"
                    placeholder="e.g. 12, MG Road, Bengaluru"
                    value={customer.address}
                    onChange={(e) => {
                      const address = sanitizeAddress(e.target.value);
                      setField("address", address);
                      setFieldError("address", validateAddress(address));
                    }}
                    maxLength={ADDRESS_MAX}
                    className="h-[100px] min-h-[100px] w-full resize-none rounded-[4px] border border-pneutral-300 bg-white p-3 text-p4 text-pneutral-900 outline-none transition-all duration-200 placeholder:text-pneutral-500 focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300"
                  />
                </div>
              ) : (
                <Input
                  label="Address"
                  placeholder="e.g. 12, MG Road, Bengaluru"
                  value={customer.address}
                  maxLength={ADDRESS_MAX}
                  onChange={(e) => {
                    const address = sanitizeAddress(e.target.value);
                    setField("address", address);
                    setFieldError("address", validateAddress(address));
                  }}
                  error={fieldErrors.address}
                />
              )}
            </div>

            {/* Prescription strip */}
            <div className="h-[36px] rounded-[12px] flex items-center gap-4">
              <span className="text-label-l4 font-medium text-black">
                Prescription (Optional)
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-[170px] min-w-[108px] h-[36px] min-h-[36px] max-h-[44px] px-3 rounded-[4px] border-[1.5px] border-primary-800 bg-white hover:bg-[#F8F5FF] text-primary-800 font-medium text-label-l3 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Upload size={16} />
                Upload
              </button>

              {prescriptionName && (
                <span className="flex items-center gap-2 text-p3 font-medium text-pneutral-700 max-w-[280px]">
                  <span className="truncate">📄 {prescriptionName}</span>
                  <button
                    type="button"
                    aria-label="Remove prescription"
                    onClick={() => {
                      setPrescriptionName("");
                      setPrescriptionFile(null);
                    }}
                    className="text-pneutral-500 hover:text-red-500 shrink-0 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size > PRESCRIPTION_MAX_BYTES) {
                  showToast.error("Prescription must be 5 MB or smaller.");
                  e.target.value = "";
                  return;
                }

                setPrescriptionFile(file);
                setPrescriptionName(file.name);
                showToast.success("Prescription file attached");
              }}
            />
          </>
        )}
      </div>

      {/* Everything below the card only makes sense once a customer type is
          picked — until then the screen is just the title and the card. */}
      {customer.customerType === "" ? null : (
      <>
      {/* Product search bar and its result dropdown are parked — rows are now
          built directly in the grid below. Kept for reference in case the
          search-first flow comes back.
      <div className="relative w-full">
        ... search input + barcode button, then a results table whose "Select"
        button called handleSelectBatch(). The results memo and that handler
        were removed along with it — restore from git history if needed.
      </div>
      */}

      {/* Cart grid — product/batch dropdowns and inline qty/discount */}
      <BillingItemsTable
        catalog={batchCatalog}
        rows={rows}
        onChange={setRows}
        onBatchSelected={fetchBatchDetails}
        isLoading={loadingBatches}
      />

      {/* Bottom Section - Discount, Totals & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start mt-4">
        {/* Left Side - Discount Card & Clear Cart */}
        <div className="flex flex-col gap-5 w-full">
          {/* Discount Card */}
          <div className="w-full rounded-[12px] border border-[#EAEAE9] bg-white p-4 shadow-sm flex flex-col justify-between h-[226px]">
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-medium text-[#000000]">Discount</span>
              <div className="h-[36px] w-[122px] p-[4px] rounded-[12px] border border-[#EAEAE9] bg-[#F5F5F5] flex items-center">
                <button
                  type="button"
                  onClick={() => setDiscountType("AMOUNT")}
                  className={`h-[28px] flex-1 rounded-[8px] text-sm flex items-center justify-center transition-all cursor-pointer ${
                    discountType === "AMOUNT"
                      ? "bg-white font-semibold text-[#000000] shadow-[0px_2px_6px_0px_#00000040]"
                      : "font-normal text-[#3C3D3A] hover:text-black"
                  }`}
                >
                  ₹
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType("PERCENTAGE");
                    setBillDiscountInput((prev) => sanitizePercentage(prev));
                  }}
                  className={`h-[28px] flex-1 rounded-[8px] text-sm flex items-center justify-center transition-all cursor-pointer ${
                    discountType === "PERCENTAGE"
                      ? "bg-white font-semibold text-[#000000] shadow-[0px_2px_6px_0px_#00000040]"
                      : "font-normal text-[#3C3D3A] hover:text-black"
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="relative flex items-center w-full my-1">
              <input
                // text + inputMode: no spinner and no scroll-wheel stepping.
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={billDiscountInput}
                onChange={(e) =>
                  setBillDiscountInput(
                    discountType === "PERCENTAGE"
                      ? sanitizePercentage(e.target.value)
                      : sanitizeNumber(e.target.value)
                  )
                }
                className="h-[48px] w-full rounded-[8px] border border-[#C0C1BE] bg-white pl-4 pr-10 text-sm text-pneutral-900 outline-none focus:border-[#7D32FC] transition-all shadow-2xs"
              />
              <span className="absolute right-3.5 font-medium text-[#3C3D3A] text-base select-none">
                {discountType === "AMOUNT" ? "₹" : "%"}
              </span>
            </div>

            {/* Typed in one unit, echoed back in the other */}
            <div className="text-[15px] font-medium text-[#378200]">
              {discountType === "AMOUNT"
                ? `Discount Percentage : ${billDiscount.percentage.toFixed(2)}%`
                : `Discount Amount : ₹ ${formatAmount(billDiscount.amount)}`}
            </div>
          </div>

        </div>

        {/* Right Side - Totals Card & Proceed Button */}
        <div className="flex flex-col gap-5 w-full">
          {/* Payment Summary Card */}
          <div className="w-full rounded-[16px] border border-[#D5D5D4] bg-white p-4 shadow-sm flex flex-col justify-between h-[226px] text-[15px] font-normal text-pneutral-800">
            {/* Taxable and GST are the tax split of what is being paid — MRP is
                tax-inclusive, so the GST was extracted out of the net rather
                than added to it. */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Taxable</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.taxableAmount)}</span>
            </div>

            {/* GST — the amount only; lines can sit on different slabs */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">GST</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.gstAmount)}</span>
            </div>

            {/* Total — the sum of the grid's own Total column (MRP x qty), so
                Total - Discount = Net Amount. Display only; nothing is sent. */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Total</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.grossAmount)}</span>
            </div>

            {/* Discount — every rupee taken off: the per-row discounts and the
                bill level one together. */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Discount</span>
              <span className="text-center">(-)</span>
              <span className="text-right">
                ₹ {formatAmount(totals.itemDiscount + totals.billDiscount)}
              </span>
            </div>

            {/* Net Amount */}
            <div className="grid grid-cols-3 items-center w-full text-[17px] font-semibold text-[#7D32FC]">
              <span className="text-left">Net Amount</span>
              <span className="text-center"></span>
              <span className="text-right font-bold">₹ {formatAmount(totals.netAmount)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Action row under the two cards — leaving the cart, emptying it, and
          taking it to payment. */}
      <div className="w-full h-14 flex flex-wrap items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={`${BACK_BUTTON} w-[164px] shrink-0`}
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => {
              if (lines.length === 0) return;
              setRows([emptyBillingRow()]);
              showToast.success("Cart cleared");
            }}
            className={`${DARK_BUTTON} w-[161px] shrink-0`}
          >
            <ShoppingCart size={24} />
            Clear Cart
          </button>
        </div>

        <button
          type="button"
          disabled={lines.length === 0 || isSubmitting}
          onClick={handleProceed}
          className={`${PRIMARY_BUTTON} w-[219px] shrink-0`}
        >
          {isSubmitting ? "Please wait…" : "Proceed to Payment"}
        </button>
      </div>
      </>
      )}
    </div>
  );
};

export default Billing;
