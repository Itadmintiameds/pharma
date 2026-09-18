"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleCheck,
  FileText,
  MapPin,
  Truck,
  Users,
} from "lucide-react";
import Button from "@/app/components/common/Button";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import { getSupplierById } from "@/services/SupplierService";
import { SupplierData } from "@/types/SupplierData";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_-2px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_4px_rgba(192,193,190,0.2)]";

const formatMobileNumber = (mobile?: number) => {
  if (!mobile) return undefined;
  const digits = String(mobile);
  return digits.length === 10
    ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    : `+91 ${digits}`;
};

/** "YYYY-MM-DD..." (the entity's LocalDateTime) -> "DD-MM-YYYY". */
const formatDlExpiryDate = (isoDate?: string) => {
  if (!isoDate) return undefined;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  const [, yyyy, mm, dd] = match;
  return `${dd}-${mm}-${yyyy}`;
};

interface DetailFieldProps {
  label: string;
  value?: string;
}

const DetailField = ({ label, value }: DetailFieldProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="text-label-l4 font-semibold text-pneutral-900">
      {value || "—"}
    </p>
  </div>
);

interface SupplierViewProps {
  supplierId: string | number;
  description?: string;
  onEdit?: () => void;
}

// Figma node 3469:5832 ("SV Header Row") + 3469:5841 ("Basic / Identification Details Card")
// + 3469:5865 ("Contact Details") + 3469:5879 ("Address Details") + 3469:5903 ("Financial Details")
const SupplierView = ({
  supplierId,
  description = "Complete supplier master record including identification, contact, and financial details.",
  onEdit,
}: SupplierViewProps) => {
  const router = useRouter();

  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSupplierById(supplierId);
        if (active) setSupplier(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch supplier."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [supplierId]);

  if (loading) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-label-l4 text-pneutral-500">
        Loading supplier details…
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-label-l4 text-danger-600">
        {error || "Supplier not found."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col gap-xsm">
          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-h5 font-semibold text-pneutral-900">
              {supplier.supplierName}
            </p>
            <StatusBadge
              status={supplier.status === "INACTIVE" ? "Inactive" : "Active"}
            />
          </div>
          <p className="text-label-l4 font-regular text-pneutral-500">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-sm sm:flex-row sm:items-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/suppliers")}
            className="h-12! w-full! min-w-27 shrink-0 gap-2 rounded-lg! border-2! border-pneutral-900! px-4 text-label-l4! font-medium! text-pneutral-900! sm:w-auto!"
          >
            <ArrowLeft size={20} className="shrink-0" />
            Back to Suppliers
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onEdit}
            className="h-12! w-full! min-w-27 shrink-0 gap-2 rounded-lg! bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
          >
            <FileText size={20} className="shrink-0" />
            Edit Supplier
          </Button>
        </div>
      </div>

      {/* Basic / Identification Details Card — Figma node 3469:5841 */}
      <div
        className={`flex w-full flex-col items-start gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <div className="flex items-center gap-xsm">
          <CircleCheck size={18} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Basic / Identification Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField label="Supplier Name" value={supplier.supplierName} />
          <DetailField label="GSTIN" value={supplier.gstinNo} />
          <DetailField label="DL No." value={supplier.dlno} />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField
            label="DL Validity / Expiry Date"
            value={formatDlExpiryDate(supplier.dlExpiryDate)}
          />
          <DetailField label="PAN" value={supplier.panNo} />
          <DetailField
            label="Issuing Authority"
            value={supplier.issuingAuthority}
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField label="FSSAI License No." value={supplier.fssaiNo} />
          <div className="hidden flex-1 sm:block" aria-hidden="true" />
          <div className="hidden flex-1 sm:block" aria-hidden="true" />
        </div>
      </div>

      {/* Contact Details Card — Figma node 3469:5865 */}
      <div
        className={`flex w-full flex-col items-start gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <div className="flex items-center gap-xsm">
          <Users size={18} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Contact Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField
            label="Contact Person Name"
            value={supplier.contactPersonName}
          />
          <DetailField
            label="Mobile Number"
            value={formatMobileNumber(supplier.mobileNumber)}
          />
          <DetailField label="Email ID" value={supplier.supplierEmail} />
        </div>
      </div>

      {/* Address Details Card — Figma node 3469:5879 */}
      <div
        className={`flex w-full flex-col items-start gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <div className="flex items-center gap-xsm">
          <MapPin size={18} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Address Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField
            label="Registered Office Address"
            value={supplier.address}
          />
          <DetailField label="Building / Street" value={supplier.buildingNo} />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField label="City" value={supplier.city} />
          <DetailField label="District" value={supplier.district} />
          <DetailField label="State" value={supplier.state} />
          <DetailField
            label="Pincode"
            value={supplier.pincode ? String(supplier.pincode) : undefined}
          />
        </div>
      </div>

      {/* Financial Details Card — Figma node 3469:5903 */}
      <div
        className={`flex w-full flex-col items-start gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <div className="flex items-center gap-xsm">
          <Truck size={18} className="shrink-0 text-secondary-700" />
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Financial Details
          </p>
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField label="Bank Name" value={supplier.bankName} />
          <DetailField
            label="Account Holder Name"
            value={supplier.accountHolderName}
          />
        </div>

        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <DetailField
            label="Account Number"
            value={
              supplier.accountNumber ? String(supplier.accountNumber) : undefined
            }
          />
          <DetailField label="IFSC Code" value={supplier.ifscCode} />
        </div>
      </div>
    </div>
  );
};

export default SupplierView;
