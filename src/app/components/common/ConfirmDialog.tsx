"use client";

import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive action. */
  destructive?: boolean;
  /** Disables buttons and shows a busy label while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-[36px] px-4 border-[1.5px] border-pneutral-300 rounded-lg text-label-l3 font-medium text-pneutral-700 hover:bg-pneutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-[36px] px-4 rounded-lg text-label-l3 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-secondary-700 hover:bg-secondary-800"
              }`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
