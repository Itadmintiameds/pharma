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
  Stethoscope,
  Bed,
  Clock,
  Building2,
  Briefcase,
  Shield
} from "lucide-react";
import toast from "react-hot-toast";
import Input from "@/app/components/common/Input";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
import BillingItemsTable, {
  BillingRow,
  emptyBillingRow,
} from "./BillingItemsTable";
import { ProductService } from "@/services/ProductService";
import { getCustomersByPhone } from "@/services/CustomerService";
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
  billDiscountAsPercentage,
  calculateBillTotals,
  effectiveGstPercentage,
  formatAmount,
} from "@/utils/billingTotals";

interface BillingProps {
  onCancel: () => void;
  onProceedToPayment: (bill: {
    customer: CustomerInfo;
    lines: BillLine[];
    billDiscountPercentage: number;
  }) => void;
  initialCustomer?: CustomerInfo;
  initialLines?: BillLine[];
  initialBillDiscount?: number;
}

const WalkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7z"/>
  </svg>
);

/**
 * Seven types sit on the first row and Insurance wraps onto the second.
 * Only Walk-in is wired up so far — the rest capture different fields and stay
 * disabled until those flows are built.
 */
const CUSTOMER_TYPES: {
  label: string;
  value: CustomerType;
  icon: React.ReactNode;
}[] = [
  { label: "Walk-in", value: "WALK_IN", icon: <WalkIcon /> },
  { label: "Registered", value: "REGISTERED", icon: <User size={16} /> },
  { label: "OP Patient", value: "OP_PATIENT", icon: <Stethoscope size={16} /> },
  { label: "IP Patient", value: "IP_PATIENT", icon: <Bed size={16} /> },
  { label: "Daycare", value: "DAYCARE", icon: <Clock size={16} /> },
  { label: "Corporate", value: "CORPORATE", icon: <Building2 size={16} /> },
  { label: "Business", value: "BUSINESS", icon: <Briefcase size={16} /> },
  { label: "Insurance", value: "INSURANCE", icon: <Shield size={16} /> },
];

const ENABLED_CUSTOMER_TYPES: CustomerType[] = ["WALK_IN"];

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
  address: "",
};

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
}) => {
  const [customer, setCustomer] = useState<CustomerInfo>(
    initialCustomer ?? EMPTY_CUSTOMER
  );
  const [rows, setRows] = useState<BillingRow[]>(
    initialLines && initialLines.length > 0
      ? linesToRows(initialLines)
      : [emptyBillingRow()]
  );
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
  const [billDiscountInput, setBillDiscountInput] = useState(
    initialBillDiscount ? String(initialBillDiscount) : "0"
  );
  const [prescriptionName, setPrescriptionName] = useState("");
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

  useEffect(() => {
    const fetchBatches = async () => {
      setLoadingBatches(true);
      try {
        const res = await ProductService.getAllBatches();
        const data = res?.data || [];
        const mapped: BillableProduct[] = data.map((b: any) => ({
          productId: b.productId || "",
          productName: b.productName || "Unknown Product",
          brandName: b.brandName || "",
          batchId: b.batchId || "",
          batchNumber: b.batchNumber || "N/A",
          // Stock is counted in smallest units, so never fall back to the
          // purchase unit here — it would label the quantity wrongly.
          unit: b.purchaseSmallestUnitName || "",
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
        toast.error("Failed to load medicines from server.");
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
    const mobileNo = raw.replace(/\D/g, "").slice(0, 10);
    setCustomer((prev) => ({
      ...prev,
      mobileNo,
      // Any edit invalidates the customer picked for the previous number.
      customerId: null,
      customerName: "",
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
      setCustomer((prev) => ({ ...prev, customerId: null, customerName: "" }));
      return;
    }
    const picked = knownCustomers.find((c) => c.customerId === Number(value));
    setCustomer((prev) => ({
      ...prev,
      customerId: picked?.customerId ?? null,
      customerName: picked?.customerName ?? "",
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
    if (!customer.mobileNo || customer.mobileNo.length !== 10) {
      toast.error("Enter a 10 digit mobile number");
      return;
    }
    if (!customer.customerName.trim()) {
      toast.error("Enter the customer name");
      return;
    }

    setIsSubmitting(true);
    try {
      const doctorId = await resolveDoctor();

      onProceedToPayment({
        customer: { ...customer, doctorId },
        lines,
        billDiscountPercentage: billDiscountAsPercentage(
          lines,
          Number(billDiscountInput) || 0,
          discountType
        ),
      });
    } catch (err) {
      console.error("Failed to save the referring doctor:", err);
      toast.error(
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

  const gstRate = effectiveGstPercentage(totals);

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
      toast.error("Failed to load batch details.");
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

        {/* Walk-in fields — 2x2, each row 72px (24px label + 48px field) */}
        {customer.customerType === "WALK_IN" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone first — the names below are looked up from it. */}
              <Input
                label="Mobile Number"
                type="tel"
                required
                maxLength={10}
                placeholder="10 digit mobile number"
                value={customer.mobileNo}
                onChange={(e) => handlePhoneChange(e.target.value)}
                hint={
                  isLookingUpCustomers
                    ? "Looking up customers…"
                    : customer.mobileNo.length === 10 && knownCustomers.length === 0
                    ? "New number — a customer will be created with this bill."
                    : undefined
                }
              />

              {/* Known number: pick the person. Otherwise type a new name. */}
              {knownCustomers.length > 0 && !isAddingNewCustomer ? (
                <Dropdown
                  label="Name"
                  required
                  placeholder="Select customer"
                  options={customerOptions}
                  value={customer.customerId ?? ""}
                  onChange={handleCustomerSelect}
                  isLoading={isLookingUpCustomers}
                  searchable
                />
              ) : (
                <Input
                  label="Name"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customer.customerName}
                  onChange={(e) => {
                    setField("customerName", e.target.value);
                    // Typing a name means a new customer, not the picked one.
                    setField("customerId", null);
                  }}
                  rightIcon={
                    knownCustomers.length > 0 ? (
                      <button
                        type="button"
                        aria-label="Pick an existing customer instead"
                        title="Pick an existing customer instead"
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
                  onChange={(e) => setNewDoctorName(e.target.value)}
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

              <Input
                label="Address"
                placeholder="e.g. 12, MG Road, Bengaluru"
                value={customer.address}
                onChange={(e) => setField("address", e.target.value)}
              />
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
                    onClick={() => setPrescriptionName("")}
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
                const name = e.target.files?.[0]?.name;
                if (name) {
                  setPrescriptionName(name);
                  toast.success("Prescription file attached");
                }
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
                  onClick={() => setDiscountType("PERCENTAGE")}
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
                type="number"
                step="0.01"
                placeholder="Placeholder"
                value={billDiscountInput}
                onChange={(e) => setBillDiscountInput(e.target.value)}
                className="h-[48px] w-full rounded-[8px] border border-[#C0C1BE] bg-white pl-4 pr-10 text-sm text-pneutral-900 outline-none focus:border-[#7D32FC] transition-all shadow-2xs"
              />
              <span className="absolute right-3.5 font-medium text-[#3C3D3A] text-base select-none">
                {discountType === "AMOUNT" ? "₹" : "%"}
              </span>
            </div>

            <div className="text-[15px] font-medium text-[#378200]">
              Discount Amount : {formatAmount(totals.billDiscount)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (lines.length === 0) return;
              setRows([emptyBillingRow()]);
              toast.success("Cart cleared");
            }}
            className="h-[48px] px-6 rounded-[8px] border-[2px] border-pneutral-900 bg-white hover:bg-pneutral-50 text-pneutral-900 font-semibold text-base flex items-center justify-center gap-2.5 shadow-sm transition-all w-fit cursor-pointer"
          >
            <ShoppingCart size={20} className="text-pneutral-900" />
            Clear Cart
          </button>
        </div>

        {/* Right Side - Totals Card & Proceed Button */}
        <div className="flex flex-col gap-5 w-full">
          {/* Payment Summary Card */}
          <div className="w-full rounded-[16px] border border-[#D5D5D4] bg-white p-4 shadow-sm flex flex-col justify-between h-[226px] text-[15px] font-normal text-pneutral-800">
            {/* Gross Amount */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Gross Amount</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.grossAmount)}</span>
            </div>

            {/* Discount — line discounts plus the bill level one */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Discount</span>
              <span className="text-center">(-)</span>
              <span className="text-right">
                ₹ {formatAmount(totals.itemDiscount + totals.billDiscount)}
              </span>
            </div>

            {/* Taxable */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Taxable</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.taxableAmount)}</span>
            </div>

            {/* GST — blended rate across the cart, never a fixed slab */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">
                GST{gstRate > 0 ? ` (${gstRate.toFixed(2)}%)` : ""}
              </span>
              <span className="text-center">(+)</span>
              <span className="text-right">₹ {formatAmount(totals.gstAmount)}</span>
            </div>

            {/* Net Amount */}
            <div className="grid grid-cols-3 items-center w-full text-[17px] font-semibold text-[#7D32FC]">
              <span className="text-left">Net Amount</span>
              <span className="text-center"></span>
              <span className="text-right font-bold">₹ {formatAmount(totals.netAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end w-full">
            <button
              type="button"
              disabled={lines.length === 0 || isSubmitting}
              onClick={handleProceed}
              className="h-[48px] px-8 rounded-[8px] bg-[#7D32FC] hover:bg-[#6823df] text-white font-semibold text-base shadow-md disabled:opacity-50 transition-all w-full sm:w-auto cursor-pointer block"
            >
              {isSubmitting ? "Please wait…" : "Proceed to Payment"}
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default Billing;
