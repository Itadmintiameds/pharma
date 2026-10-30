"use client";

import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import type { FinancialReportParams } from "@/types/FinancialReportData";
import ReportFilterToolbar from "./ReportFilterToolbar";
import { useDoctorOptions } from "./useReportFilters";
import { multiSelectChip, textFilterChips, useFinancialReport } from "./useFinancialReport";
import { PATIENT_TYPE_OPTIONS, PAYMENT_MODE_OPTIONS, optionLabel } from "./reportFilterOptions";

/**
 * The filters shared by the three Pharmacy Receipts reports — Sales Summary,
 * Payment Mode Summary and Receipt Details.
 */
export interface ReceiptsFilters {
  pharmacyIds: string[];
  patientTypes: string[];
  paymentModes: string[];
  doctorIds: number[];
  patientSearch: string;
  patientNo: string;
  ipNo: string;
  billNo: string;
}

export const EMPTY_RECEIPTS_FILTERS: ReceiptsFilters = {
  pharmacyIds: [],
  patientTypes: [],
  paymentModes: [],
  doctorIds: [],
  patientSearch: "",
  patientNo: "",
  ipNo: "",
  billNo: "",
};

export const receiptsFiltersToParams = (f: ReceiptsFilters): FinancialReportParams => ({
  patientTypes: f.patientTypes,
  paymentModes: f.paymentModes,
  doctorIds: f.doctorIds,
  patientSearch: f.patientSearch.trim(),
  patientNo: f.patientNo.trim(),
  ipNo: f.ipNo.trim(),
  billNo: f.billNo.trim(),
});

/** The free-text More Filters fields; Referred By leads them as a multi-select. */
const SEARCH_FILTERS = [
  { key: "patientSearch", label: "Patient Name / Mobile", chip: "Patient", placeholder: "Search name or mobile no." },
  { key: "patientNo", label: "Patient No.", chip: "Patient No", placeholder: "Search patient no." },
  { key: "ipNo", label: "IP No.", chip: "IP No", placeholder: "Search IP no." },
  { key: "billNo", label: "Bill No.", chip: "Bill No", placeholder: "Search bill no." },
] as const;

const SEARCH_ICON = <Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />;

export default function ReceiptsReportToolbar<R>({
  report,
}: {
  report: ReturnType<typeof useFinancialReport<ReceiptsFilters, R>>;
}) {
  const doctors = useDoctorOptions();
  const { filters, clearField } = report;
  const { draft, applied, setDraftField } = filters;

  const chips = [
    ...report.baseChips,
    ...multiSelectChip("patientTypes", "Patient Type", applied.patientTypes, (v) => optionLabel(PATIENT_TYPE_OPTIONS, v), () => clearField("patientTypes")),
    ...multiSelectChip("paymentModes", "Payment Mode", applied.paymentModes, (v) => optionLabel(PAYMENT_MODE_OPTIONS, v), () => clearField("paymentModes")),
    ...multiSelectChip("doctorIds", "Referred By", applied.doctorIds, doctors.labelOf, () => clearField("doctorIds")),
    ...textFilterChips(applied, SEARCH_FILTERS, clearField),
  ];

  return (
    <ReportFilterToolbar
      period={filters.draftPeriod}
      onPeriodChange={filters.setDraftPeriod}
      chips={chips}
      onReset={report.reset}
      onSearch={report.search}
      searching={report.isLoading}
      moreFilterCount={SEARCH_FILTERS.length + 1}
      moreFilters={
        <>
          <Dropdown
            label="Referred By"
            labelClassName="px-1"
            options={doctors.options}
            value={draft.doctorIds}
            onChange={(value: number[]) => setDraftField("doctorIds", value)}
            placeholder="Select"
            isLoading={doctors.loading}
            searchable
            multiple
          />
          {SEARCH_FILTERS.map(({ key, label, placeholder }) => (
            <Input
              key={key}
              label={label}
              labelClassName="px-1"
              placeholder={placeholder}
              value={draft[key]}
              onChange={(e) => setDraftField(key, e.target.value)}
              onKeyDown={report.onEnter}
              leftIcon={SEARCH_ICON}
            />
          ))}
        </>
      }
    >
      <Dropdown
        label="Pharmacy"
        labelClassName="px-1"
        options={report.pharmacy.options}
        value={draft.pharmacyIds}
        onChange={(value: string[]) => setDraftField("pharmacyIds", value)}
        placeholder="Select"
        multiple
      />
      <Dropdown
        label="Patient Type"
        labelClassName="px-1"
        options={PATIENT_TYPE_OPTIONS}
        value={draft.patientTypes}
        onChange={(value: string[]) => setDraftField("patientTypes", value)}
        placeholder="Select"
        multiple
      />
      <Dropdown
        label="Payment Mode"
        labelClassName="px-1"
        options={PAYMENT_MODE_OPTIONS}
        value={draft.paymentModes}
        onChange={(value: string[]) => setDraftField("paymentModes", value)}
        placeholder="Select"
        multiple
      />
    </ReportFilterToolbar>
  );
}
