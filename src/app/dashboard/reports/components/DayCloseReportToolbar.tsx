"use client";

import { useEffect } from "react";
import Dropdown from "@/app/components/common/Dropdown";
import type { FinancialReportParams } from "@/types/FinancialReportData";
import ReportFilterToolbar from "./ReportFilterToolbar";
import { useUserOptions } from "./useReportFilters";
import { multiSelectChip, useFinancialReport } from "./useFinancialReport";
import { PATIENT_TYPE_OPTIONS, PAYMENT_MODE_OPTIONS, optionLabel } from "./reportFilterOptions";
import type { ReportPeriodMode } from "./reportUtils";

/**
 * The filters shared by the five Pharmacy Day Closing reports. A day close is
 * one business day, so the period is Today or a Specific Day — no month or
 * range — and there are no More Filters.
 */
export interface DayCloseFilters {
  pharmacyIds: string[];
  patientTypes: string[];
  paymentModes: string[];
  userIds: string[];
}

export const EMPTY_DAY_CLOSE_FILTERS: DayCloseFilters = {
  pharmacyIds: [],
  patientTypes: [],
  paymentModes: [],
  userIds: [],
};

export const dayCloseFiltersToParams = (f: DayCloseFilters): FinancialReportParams => ({
  patientTypes: f.patientTypes,
  paymentModes: f.paymentModes,
  userIds: f.userIds,
});

const DAY_CLOSE_PERIODS: ReportPeriodMode[] = ["today", "day"];

export default function DayCloseReportToolbar<R>({
  report,
}: {
  report: ReturnType<typeof useFinancialReport<DayCloseFilters, R>>;
}) {
  const { filters, clearField } = report;
  const { draft, applied, setDraft, setDraftField } = filters;
  // The users of the pharmacies being picked, so the list follows the Pharmacy field.
  const users = useUserOptions(draft.pharmacyIds);

  // Drop picked users who do not work at the newly picked pharmacies.
  useEffect(() => {
    if (users.loading) return;
    const known = new Set(users.options.map((o) => o.value));
    setDraft((prev) =>
      prev.userIds.every((id) => known.has(id))
        ? prev
        : { ...prev, userIds: prev.userIds.filter((id) => known.has(id)) },
    );
  }, [users.loading, users.options, setDraft]);

  const chips = [
    ...report.baseChips,
    ...multiSelectChip("patientTypes", "Patient Type", applied.patientTypes, (v) => optionLabel(PATIENT_TYPE_OPTIONS, v), () => clearField("patientTypes")),
    ...multiSelectChip("paymentModes", "Payment Mode", applied.paymentModes, (v) => optionLabel(PAYMENT_MODE_OPTIONS, v), () => clearField("paymentModes")),
    // Falls back to the id: the list follows the draft pharmacies, which may no longer hold an applied user.
    ...multiSelectChip("userIds", "User", applied.userIds, (v) => users.labelOf(v) || v, () => clearField("userIds")),
  ];

  return (
    <ReportFilterToolbar
      period={filters.draftPeriod}
      onPeriodChange={filters.setDraftPeriod}
      periodModes={DAY_CLOSE_PERIODS}
      columns={5}
      chips={chips}
      onReset={report.reset}
      onSearch={report.search}
      searching={report.isLoading}
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
      <Dropdown
        label="User"
        labelClassName="px-1"
        options={users.options}
        value={draft.userIds}
        onChange={(value: string[]) => setDraftField("userIds", value)}
        placeholder="Select"
        isLoading={users.loading}
        searchable
        multiple
      />
    </ReportFilterToolbar>
  );
}
