"use client";

import { toast, Toaster, ToastOptions } from "react-hot-toast";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

const commonStyle: ToastOptions = {
  duration: 3000,
  position: "top-right",
  style: {
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "14px",
    fontWeight: "500",
    background: "#fff",
    color: "#1F2937",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    border: "1px solid #E5E7EB",
  },
};

export const showToast = {
  success: (message: string) =>
    toast(message, {
      ...commonStyle,
      icon: <CheckCircle size={20} color="#16A34A" />,
    }),

  error: (message: string) =>
    toast(message, {
      ...commonStyle,
      icon: <XCircle size={20} color="#DC2626" />,
    }),

  warning: (message: string) =>
    toast(message, {
      ...commonStyle,
      icon: <AlertTriangle size={20} color="#F59E0B" />,
    }),

  info: (message: string) =>
    toast(message, {
      ...commonStyle,
      icon: <Info size={20} color="#2563EB" />,
    }),
};

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
    />
  );
}