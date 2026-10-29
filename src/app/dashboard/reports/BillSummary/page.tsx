"use client";

import { useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
import ReportHeader from "../components/ReportHeader";
import ReportFilterToolbar, { AppliedFilterChip } from "../components/ReportFilterToolbar";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportTable, { ReportColumn } from "../components/ReportTable";
import { usePharmacyOptions, useReportFilters } from "../components/useReportFilters";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatReportTime,
  formatRupees,
  periodChipLabel,
} from "../components/reportUtils";

interface BillSummaryFilters {
  pharmacyId: string;
  /** Patient name or mobile number. */
  patient: string;
  referredBy: string;
}

const EMPTY_FILTERS: BillSummaryFilters = { pharmacyId: "", patient: "", referredBy: "" };

interface BillSummaryRow {
  billNo: string;
  pharmacyName: string;
  patientName: string;
  /** Absent for walk-in customers. */
  patientNo?: string;
  /** ISO date-time. */
  billedAt: string;
  items: number;
  totalAmount: number;
}

interface BillSummaryTotals {
  totalSales: number;
  billCount: number;
  totalSalesReturn: number;
  netSales: number;
}

// Sample data in the design's shape, until the report API is wired in.
const SAMPLE_ROWS: BillSummaryRow[] = [
  { billNo: "PB-1001", pharmacyName: "Indiranagar Pharmacy", patientName: "Patient A", patientNo: "PAT-1001", billedAt: "2026-10-01T10:25:00", items: 3, totalAmount: 5000 },
  { billNo: "PB-1002", pharmacyName: "Indiranagar Pharmacy", patientName: "Patient B", patientNo: "PAT-1002", billedAt: "2026-10-02T11:40:00", items: 2, totalAmount: 2000 },
  { billNo: "PB-1003", pharmacyName: "Indiranagar Pharmacy", patientName: "Walk-In Customer", billedAt: "2026-10-03T14:15:00", items: 4, totalAmount: 3000 },
  { billNo: "PB-1004", pharmacyName: "Indiranagar Pharmacy", patientName: "Patient C", patientNo: "PAT-1003", billedAt: "2026-10-05T09:35:00", items: 2, totalAmount: 4000 },
  { billNo: "PB-1005", pharmacyName: "Indiranagar Pharmacy", patientName: "Patient D", patientNo: "PAT-1004", billedAt: "2026-10-07T16:10:00", items: 5, totalAmount: 6000 },
];

const SAMPLE_TOTALS: BillSummaryTotals = {
  totalSales: 20000,
  billCount: 5,
  totalSalesReturn: 1000,
  netSales: 19000,
};

// Doctors come with the report APIs.
const REFERRED_BY_OPTIONS: DropdownOption[] = [];

const COLUMNS: ReportColumn<BillSummaryRow>[] = [
  {
    key: "pharmacy",
    header: "Pharmacy",
    className: "min-w-[155px]",
    cell: (row) => row.pharmacyName,
  },
  {
    key: "patient",
    header: "Patient / Customer Name",
    className: "min-w-[175px]",
    sortValue: (row) => row.patientName,
    cell: (row) => <span className="font-semibold">{row.patientName}</span>,
  },
  {
    key: "patientNo",
    header: "Patient No.",
    className: "min-w-[138px]",
    cell: (row) => <span className="whitespace-nowrap">{row.patientNo ?? "---"}</span>,
  },
  {
    key: "billNo",
    header: "Bill No.",
    className: "min-w-[133px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">{row.billNo}</span>
    ),
  },
  {
    key: "billedAt",
    header: "Billed Date",
    className: "min-w-[223px]",
    sortValue: (row) => row.billedAt,
    cell: (row) => (
      <span className="flex gap-1 whitespace-nowrap">
        <span>{formatReportDate(row.billedAt)}</span>
        <span className="text-pneutral-500">{formatReportTime(row.billedAt)}</span>
      </span>
    ),
  },
  {
    key: "items",
    header: "Items",
    align: "right",
    className: "min-w-[122px]",
    cell: (row) => row.items,
  },
  {
    key: "totalAmount",
    header: "Total Amount",
    align: "right",
    className: "min-w-[160px]",
    sortValue: (row) => row.totalAmount,
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap">{formatRupees(row.totalAmount)}</span>
    ),
  },
];

export default function BillSummaryPage() {
  const filters = useReportFilters(EMPTY_FILTERS);
  const { draft, applied, setDraftField } = filters;
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const pharmacy = usePharmacyOptions((pharmacyId) => {
    filters.setDraft((prev) => ({ ...prev, pharmacyId }));
    filters.setApplied((prev) => ({ ...prev, pharmacyId }));
  });

  const rows = SAMPLE_ROWS;
  const totals = SAMPLE_TOTALS;

  const handleSearch = () => {
    filters.apply();
    setGeneratedAt(new Date());
  };

  const handleReset = () => {
    filters.reset({ ...EMPTY_FILTERS, pharmacyId: pharmacy.defaultId });
    setGeneratedAt(new Date());
  };

  const appliedPharmacy = pharmacy.labelOf(applied.pharmacyId);
  const appliedReferredBy =
    REFERRED_BY_OPTIONS.find((o) => o.value === applied.referredBy)?.label ?? applied.referredBy;

  const chips: AppliedFilterChip[] = [
    { key: "period", label: periodChipLabel(filters.appliedPeriod) },
    ...(appliedPharmacy
      ? [{ key: "pharmacy", label: `Pharmacy: ${appliedPharmacy}`, onRemove: () => filters.clearField("pharmacyId") }]
      : []),
    ...(applied.patient
      ? [{ key: "patient", label: `Patient: ${applied.patient}`, onRemove: () => filters.clearField("patient") }]
      : []),
    ...(appliedReferredBy
      ? [{ key: "referredBy", label: `Referred By: ${appliedReferredBy}`, onRemove: () => filters.clearField("referredBy") }]
      : []),
  ];

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title="Pharma Bill Summary"
        description="A bill-level summary of pharmacy sales for the selected reporting period."
        onPrint={() => window.print()}
      />

      <ReportFilterToolbar
        period={filters.draftPeriod}
        onPeriodChange={filters.setDraftPeriod}
        filterCount={4}
        chips={chips}
        onReset={handleReset}
        onSearch={handleSearch}
      >
        <Dropdown
          label="Pharmacy"
          labelClassName="px-1"
          options={pharmacy.options}
          value={draft.pharmacyId}
          onChange={(value) => setDraftField("pharmacyId", value)}
          placeholder="Select"
        />
        <Input
          label="Patient Name / Mobile"
          labelClassName="px-1"
          placeholder="Search"
          value={draft.patient}
          onChange={(e) => setDraftField("patient", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          leftIcon={<Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />}
        />
        <Dropdown
          label="Referred By"
          labelClassName="px-1"
          options={REFERRED_BY_OPTIONS}
          value={draft.referredBy}
          onChange={(value) => setDraftField("referredBy", value)}
          placeholder="Select"
        />
      </ReportFilterToolbar>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        <ReportKpiCard
          label="Total Sales"
          value={formatRupees(totals.totalSales)}
          icon="/Reports/Banknotes.svg"
          tone="primary"
          highlight={`${totals.billCount} ${totals.billCount === 1 ? "bill" : "bills"}`}
          caption="in this period"
        />
        <ReportKpiCard
          label="Total Sales Return"
          value={formatRupees(totals.totalSalesReturn)}
          icon="/Reports/ReceiptRefundRed.svg"
          tone="warning"
          highlight={formatPercent(totals.totalSalesReturn, totals.totalSales)}
          caption="of total sales"
        />
        <ReportKpiCard
          label="Net Sales"
          value={formatRupees(totals.netSales)}
          icon="/Reports/CheckCircleSolid.svg"
          tone="success"
          highlight={formatPercent(totals.netSales, totals.totalSales)}
          caption="retained after returns"
        />
      </div>

      <ReportTable
        title="Bill Details"
        subtitles={[
          `Period: ${describePeriod(filters.appliedPeriod, "to")}`,
          ...(appliedPharmacy ? [`Pharmacy: ${appliedPharmacy}`] : []),
        ]}
        generatedOn={formatGeneratedOn(generatedAt)}
        generatedBy="Admin User"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.billNo}
      />
    </div>
  );
}
