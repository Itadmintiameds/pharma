"use client";

import { X, Check } from "lucide-react";
import Image from "next/image";
import Button from "./Button";

interface ComplianceSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  onDashboard: () => void;
  showAddLocation?: boolean;
  onAddLocation?: () => void;
}

export default function ComplianceSuccessModal({
  isOpen,
  onClose,
  requestId,
  onDashboard,
  showAddLocation = false,
  onAddLocation,
}: ComplianceSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative h-auto w-106.5 rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            aria-label="Close modal"
          >
            <Image
              src="/PharmacyDetails/CloseIcon.svg"
              alt="Close"
              width={17}
              height={17}
            />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Image
            src="/PharmacyDetails/SuccessIcon.svg"
            alt="Login"
            width={71}
            height={71}
          />

          <div className="text-h5 font-bold text-success-500 text-center">
            Compliance Submitted Successfully!
          </div>
          <div className="text-p3 font-normal text-[#4B5563] font-noto-sans text-center">
            Your compliance request has been submitted to TiaMeds Admin for
            verification.
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5 mt-6">
          <div className="text-p2 font-bold text-[#9CA3AF] font-noto-sans">
            Request ID
          </div>

          <div className="h-11 w-full rounded-[7px] border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center text-p4 font-bold text-[#111827]">
            {requestId}
          </div>

          <div className="h-7 w-40.25 border border-danger-600 rounded-3xl bg-danger-50 text-label-l3 font-medium text-warning-600 flex items-center justify-center">
            Pending Verification
          </div>

          <div className="mt-3 text-p2 font-normal font-noto-sans text-[#9CA3AF] text-center">
            You will be notified via email once the verification process is
            completed.
          </div>

          <div className="mt-4 flex flex-col gap-3 w-[326px]">
            {showAddLocation && (
              <Button variant="outline" className="w-full" onClick={onAddLocation}>
                Add Location
              </Button>
            )}
            <Button variant="primary" className="w-full" onClick={onDashboard}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
