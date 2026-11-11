"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccess } from "@/app/components/providers/AccessProvider";

/**
 * The reports built on pharmacy sales bills and sales returns. A warehouse has
 * no sales bills, so on the warehouse side they would only ever come back empty.
 */
const PHARMACY_ONLY_REPORTS = new Set([
  // Bill reports
  "BillSummary",
  "DetailedSaleReport",
  "DoctorWiseSaleReport",
  "BillDueSummary",
  // Receipt reports
  "SalesSummary",
  "PaymentModeSummary",
  "ReceiptDetails",
  // Day Close summaries
  "DayCloseSalesSummary",
  "DayClosePaymentModeSummary",
  "DayCloseReceiptDetails",
  "DayCloseBillCountSummary",
  "DayCloseBillingByPatientType",
  "DayCloseBillingByUser",
  "DayCloseReceiptByUser",
  "DayCloseCurrentBillDetails",
  "DayCloseSalesReturnDetails",
]);

/** The report folder of a path: "/dashboard/reports/BillSummary" → "BillSummary". */
const reportSlug = (pathname: string) =>
  pathname.split("/dashboard/reports/")[1]?.split("/")[0] ?? "";

/**
 * Wraps every report page. On the warehouse side — a Warehouse Manager, or a
 * Super Admin switched into a warehouse — the pharmacy-only reports show a
 * notice instead, and the page (and its API calls) never mounts.
 */
export default function PharmacyOnlyReportGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isWarehouseManager, canActAsWarehouse, actingAsWarehouse } = useAccess();

  const onWarehouseSide = isWarehouseManager || (canActAsWarehouse && actingAsWarehouse);
  if (!onWarehouseSide || !PHARMACY_ONLY_REPORTS.has(reportSlug(pathname))) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl bg-white p-8 text-center">
      <div className="flex size-18 items-center justify-center rounded-full bg-info-50">
        <Image src="/Reports/ExclamationCircle.svg" alt="" width={32} height={32} />
      </div>
      <p className="text-label-l5 font-semibold text-pneutral-900">Pharmacy access needed</p>
      <p className="max-w-120 text-p3 text-pneutral-500">
        This report is built on pharmacy sales bills and returns, so it is not available on the
        warehouse side. {canActAsWarehouse
          ? "Switch to a pharmacy from the top bar to view this report."
          : "Log in with a pharmacy account to view this report."}
      </p>
      <Link
        href="/dashboard/reports"
        className="mt-2 flex h-12 items-center justify-center rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700"
      >
        Back to Reports
      </Link>
    </div>
  );
}
