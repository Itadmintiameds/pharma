"use client";

import { useEffect, useMemo, useState } from "react";
import { usePharmacyStore } from "@/store/pharmacyStore";
import type { DropdownOption } from "@/app/components/common/Dropdown";
import { ReportPeriod, defaultReportPeriod } from "./reportUtils";

/**
 * Draft and applied filter state for a report page.
 *
 * The toolbar edits the draft; `apply` (the Search button) copies it over, and
 * only the applied copy drives the chips and — once the APIs are wired — the
 * request. `F` is the page's own filter fields beside the period.
 */
export function useReportFilters<F extends object>(emptyFilters: F) {
  const [draftPeriod, setDraftPeriod] = useState<ReportPeriod>(defaultReportPeriod);
  const [draft, setDraft] = useState<F>(emptyFilters);
  const [appliedPeriod, setAppliedPeriod] = useState<ReportPeriod>(draftPeriod);
  const [applied, setApplied] = useState<F>(emptyFilters);

  const setDraftField = <K extends keyof F>(key: K, value: F[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const apply = () => {
    setAppliedPeriod(draftPeriod);
    setApplied(draft);
  };

  /** Resets the draft and the applied filters together, like a fresh visit. */
  const reset = (filters: F = emptyFilters) => {
    const period = defaultReportPeriod();
    setDraftPeriod(period);
    setAppliedPeriod(period);
    setDraft(filters);
    setApplied(filters);
  };

  /** A chip's ✕: clears the field in both copies, so it does not come back on the next Search. */
  const clearField = <K extends keyof F>(key: K) => {
    setDraft((prev) => ({ ...prev, [key]: emptyFilters[key] }));
    setApplied((prev) => ({ ...prev, [key]: emptyFilters[key] }));
  };

  return {
    draftPeriod,
    setDraftPeriod,
    draft,
    setDraft,
    setDraftField,
    appliedPeriod,
    applied,
    setApplied,
    apply,
    reset,
    clearField,
  };
}

/**
 * The pharmacies the user can report on, as dropdown options, and the one
 * selected in the navbar to default to. The store rehydrates after the first
 * render, so `onDefault` fires once it has a pharmacy to offer.
 */
export function usePharmacyOptions(onDefault: (pharmacyId: string) => void) {
  const { pharmacies, selectedPharmacy } = usePharmacyStore();

  const options: DropdownOption[] = useMemo(
    () => pharmacies.map((p) => ({ label: p.pharmacyName, value: p.pharmacyId })),
    [pharmacies],
  );

  const defaultId = selectedPharmacy?.pharmacyId ?? "";
  useEffect(() => {
    if (defaultId) onDefault(defaultId);
    // Only a change of pharmacy should re-default; the callback is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultId]);

  const labelOf = (pharmacyId: string) =>
    options.find((o) => o.value === pharmacyId)?.label ?? "";

  return { options, defaultId, labelOf };
}
