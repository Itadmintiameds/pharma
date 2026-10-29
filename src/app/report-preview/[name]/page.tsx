"use client";

// TEMPORARY visual-check route — delete after verifying the report pages.
import { use } from "react";
import DoctorWiseSaleReportPage from "@/app/dashboard/reports/DoctorWiseSaleReport/page";
import BillDueSummaryPage from "@/app/dashboard/reports/BillDueSummary/page";

export default function Preview({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  return (
    <main className="min-h-screen bg-secondary-50 p-6">
      {name === "due" ? <BillDueSummaryPage /> : <DoctorWiseSaleReportPage />}
    </main>
  );
}
