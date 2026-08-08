"use client";

import { X, LockKeyholeOpen } from "lucide-react";
import Button from "@/app/components/common/Button";
import Image from "next/image";

interface DeactivateUserProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  userName?: string;
  employeeId?: string;
  loading?: boolean;
}

const DeactivateUser = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  employeeId,
  loading = false,
}: DeactivateUserProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative flex w-87.5 h-91.5 flex-col gap-6 rounded-md border border-pneutral-100 bg-white p-6 shadow-lg animate-modalFadeSlide">
        <div className="relative flex items-center justify-center">
          <div className="text-p5 font-noto-sans font-semibold text-pneutral-900">
            Deactivate User
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute right-0 top-1/2 -translate-y-1/2 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <Image
              src="/UserManagement/CloseIcon.svg"
              alt="Close"
              width={13}
              height={13}
            />
          </button>
        </div>

        <div className="flex justify-center">
          <Image
            src="/UserManagement/DeactiveUserIcon.svg"
            alt="Close"
            width={88}
            height={88}
          />
        </div>

        <div className="text-p4 font-500 font-noto-sans text-pneutral-800 flex flex-col justify-center items-center">
          Are you sure you want to deactivate <br />{" "}
          <span className="font-semibold">
            {userName || "this user"}
            {employeeId ? ` (${employeeId})` : ""}?
          </span>
        </div>

        <div className="text-p4 font-normal font-noto-sans flex justify-center text-pneutral-800">
          The user will not be able to login.
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-27 h-9 min-w-27 min-h-9 max-h-11 opacity-100 shadow-[-1px_1px_4px_0px_#00000040] rounded-lg text-label-l3 font-medium text-pneutral-900 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-27 h-9 min-w-27 min-h-9 max-h-11 opacity-100 shadow-[-1px_1px_4px_0px_#00000040] rounded-lg text-label-l3 font-medium bg-warning-500 text-pneutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeactivateUser;
