"use client";

import { useMemo, useState } from "react";
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
  formatRupees,
  periodChipLabel,
} from "../components/reportUtils";

interface DoctorWiseFilters {
  pharmacyId: string;
  referredBy: string;
  patientType: string;
}

const EMPTY_FILTERS: DoctorWiseFilters = { pharmacyId: "", referredBy: "", patientType: "" };

/** One product's sales under one Referred By value. */
interface DoctorWiseRow {
  referredBy: string;
  productName: string;
  saleQuantity: number;
  returnQuantity: number;
  saleValue: number;
  returnValue: number;
  netSaleValue: number;
}

// Sample data in the design's shape, until the report API is wired in.
const SAMPLE_ROWS: DoctorWiseRow[] = [
  { referredBy: "Dr. A", productName: "Paracetamol 500 mg", saleQuantity: 20, returnQuantity: 2, saleValue: 1000, returnValue: 100, netSaleValue: 900 },
  { referredBy: "Dr. A", productName: "Amoxicillin 500 mg", saleQuantity: 10, returnQuantity: 0, saleValue: 4000, returnValue: 0, netSaleValue: 4000 },
  { referredBy: "Dr. B", productName: "Pantoprazole 40 mg", saleQuantity: 15, returnQuantity: 3, saleValue: 3000, returnValue: 600, netSaleValue: 2400 },
  { referredBy: "Dr. B", productName: "Azithromycin 500 mg", saleQuantity: 5, returnQuantity: 0, saleValue: 2500, returnValue: 0, netSaleValue: 2500 },
];

// Doctors come with the report APIs.
const REFERRED_BY_OPTIONS: DropdownOption[] = [];

const PATIENT_TYPE_OPTIONS: DropdownOption[] = [
  { label: "In-Patient", value: "IP" },
  { label: "Out-Patient", value: "OP" },
];

const COLUMNS: ReportColumn<DoctorWiseRow>[] = [
  {
    key: "referredBy",
    header: "Referred By",
    className: "min-w-[177px]",
    sortValue: (row) => row.referredBy,
    cell: (row) => <span className="font-semibold">{row.referredBy}</span>,
  },
  {
    key: "product",
    header: "Product Name",
    className: "min-w-[171px]",
    sortValue: (row) => row.productName,
    cell: (row) => row.productName,
  },
  {
    key: "saleQuantity",
    header: "Sale Quantity",
    align: "right",
    className: "min-w-[154px]",
    cell: (row) => row.saleQuantity,
  },
  {
    key: "returnQuantity",
    header: "Return Quantity",
    align: "right",
    className: "min-w-[154px]",
    cell: (row) => row.returnQuantity,
  },
  {
    key: "saleValue",
    header: "Sale Value",
    align: "right",
    className: "min-w-[155px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.saleValue)}</span>,
  },
  {
    key: "returnValue",
    header: "Return Value",
    align: "right",
    className: "min-w-[141px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.returnValue)}</span>,
  },
  {
    key: "netSaleValue",
    header: "Net Sale Value",
    align: "right",
    className: "min-w-[154px]",
    sortValue: (row) => row.netSaleValue,
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap">{formatRupees(row.netSaleValue)}</span>
    ),
  },
];

export default function DoctorWiseSaleReportPage() {
  const filters = useReportFilters(EMPTY_FILTERS);
  const { draft, applied, setDraftField } = filters;
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const pharmacy = usePharmacyOptions((pharmacyId) => {
    filters.setDraft((prev) => ({ ...prev, pharmacyId }));
    filters.setApplied((prev) => ({ ...prev, pharmacyId }));
  });

  const rows = SAMPLE_ROWS;

  const totals = useMemo(() => {
    const sum = (pick: (row: DoctorWiseRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    return {
      saleQuantity: sum((r) => r.saleQuantity),
      returnQuantity: sum((r) => r.returnQuantity),
      saleValue: sum((r) => r.saleValue),
      returnValue: sum((r) => r.returnValue),
      netSaleValue: sum((r) => r.netSaleValue),
    };
  }, [rows]);

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
  const appliedPatientType =
    PATIENT_TYPE_OPTIONS.find((o) => o.value === applied.patientType)?.label ?? "";

  const chips: AppliedFilterChip[] = [
    { key: "period", label: periodChipLabel(filters.appliedPeriod) },
    ...(appliedPharmacy
      ? [{ key: "pharmacy", label: `Pharmacy: ${appliedPharmacy}`, onRemove: () => filters.clearField("pharmacyId") }]
      : []),
    ...(appliedReferredBy
      ? [{ key: "referredBy", label: `Referred By: ${appliedReferredBy}`, onRemove: () => filters.clearField("referredBy") }]
      : []),
    ...(appliedPatientType
      ? [{ key: "patientType", label: `Patient Type: ${appliedPatientType}`, onRemove: () => filters.clearField("patientType") }]
      : []),
  ];

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title="Doctor-wise / Referred By Pharma Sales"
        description="Product-level pharmacy sales grouped by the Referred By value captured during billing."
        icon="/Reports/ChartBar.svg"
        onPrint={() => window.print()}
      />

      <ReportFilterToolbar
        period={filters.draftPeriod}
        onPeriodChange={filters.setDraftPeriod}
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
        <Dropdown
          label="Referred By"
          labelClassName="px-1"
          options={REFERRED_BY_OPTIONS}
          value={draft.referredBy}
          onChange={(value) => setDraftField("referredBy", value)}
          placeholder="Select"
        />
        <Dropdown
          label="Patient Type"
          labelClassName="px-1"
          options={PATIENT_TYPE_OPTIONS}
          value={draft.patientType}
          onChange={(value) => setDraftField("patientType", value)}
          placeholder="Select"
          clearable
        />
      </ReportFilterToolbar>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        <ReportKpiCard
          label="Total Sale Value"
          value={formatRupees(totals.saleValue)}
          icon="/Reports/Banknotes.svg"
          tone="primary"
          highlight={`${totals.saleQuantity} ${totals.saleQuantity === 1 ? "unit" : "units"}`}
          caption="sold"
        />
        <ReportKpiCard
          label="Total Return Value"
          value={formatRupees(totals.returnValue)}
          icon="/Reports/ReceiptRefundRed.svg"
          tone="warning"
          highlight={formatPercent(totals.returnValue, totals.saleValue)}
          caption="of sale value"
        />
        <ReportKpiCard
          label="Net Sale Value"
          value={formatRupees(totals.netSaleValue)}
          icon="/Reports/CheckCircleSolid.svg"
          tone="success"
          highlight={formatPercent(totals.netSaleValue, totals.saleValue)}
          caption="retained after returns"
        />
      </div>

      <ReportTable
        title="Referred By Sales Details"
        subtitles={[
          `Period: ${describePeriod(filters.appliedPeriod, "to")}`,
          ...(appliedPharmacy ? [`Pharmacy: ${appliedPharmacy}`] : []),
        ]}
        generatedOn={formatGeneratedOn(generatedAt)}
        generatedBy="Admin User"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row, index) => `${row.referredBy}-${row.productName}-${index}`}
        totalRow={{
          referredBy: "Total",
          saleQuantity: totals.saleQuantity,
          returnQuantity: totals.returnQuantity,
          saleValue: formatRupees(totals.saleValue),
          returnValue: formatRupees(totals.returnValue),
          netSaleValue: formatRupees(totals.netSaleValue),
        }}
      />
    </div>
  );
}
