"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { getDoctorsByPharmacies } from "@/services/FinancialReportService";
import { getUserNames } from "@/services/UserManagementService";
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

/**
 * The referring doctors of the pharmacies picked in the filter, for the
 * Referred By filter; their ids go out as `doctorIds`. Reloads when the
 * Pharmacy field changes, and drops picked doctors the new pharmacies lack.
 */
export function useDoctorOptions<F extends { pharmacyIds: string[]; doctorIds: number[] }>({
  draft,
  setDraft,
}: {
  draft: F;
  setDraft: Dispatch<SetStateAction<F>>;
}) {
  // No pharmacy picked means the navbar's, as it does for the report itself.
  const navbarPharmacyId = usePharmacyStore((s) => s.selectedPharmacy?.pharmacyId ?? "");
  const pharmacyIds = draft.pharmacyIds.length ? draft.pharmacyIds : navbarPharmacyId ? [navbarPharmacyId] : [];
  const pharmacyKey = pharmacyIds.join(",");

  const [options, setOptions] = useState<DropdownOption[]>([]);
  // The selection the options were loaded for; loading until it matches.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pharmacyKey) return;
    let active = true;
    const ids = pharmacyKey.split(",");
    getDoctorsByPharmacies(ids)
      .then((doctors) => {
        if (!active) return;
        // With several pharmacies, name the pharmacy so same-named doctors can be told apart.
        const showPharmacy = ids.length > 1;
        const seen = new Set<number>();
        setOptions(
          doctors.flatMap((d) => {
            if (seen.has(d.doctorId)) return [];
            seen.add(d.doctorId);
            return [{
              label: showPharmacy ? `${d.doctorName} (${d.pharmacyName})` : d.doctorName,
              value: d.doctorId,
            }];
          }),
        );
      })
      .catch((err) => {
        // The filter just stays empty; the report itself still loads.
        console.error("Failed to fetch doctors:", err);
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoadedKey(pharmacyKey);
      });
    return () => {
      active = false;
    };
  }, [pharmacyKey]);

  const loading = !!pharmacyKey && loadedKey !== pharmacyKey;

  useEffect(() => {
    if (loading) return;
    const known = new Set(options.map((o) => o.value));
    setDraft((prev) =>
      prev.doctorIds.every((id) => known.has(id))
        ? prev
        : { ...prev, doctorIds: prev.doctorIds.filter((id) => known.has(id)) },
    );
  }, [loading, options, setDraft]);

  // Falls back to the id: the list follows the draft pharmacies, which may no longer hold an applied doctor.
  const labelOf = (doctorId: number) =>
    options.find((o) => o.value === doctorId)?.label ?? String(doctorId);

  return { options, loading, labelOf };
}

/**
 * The users of the given pharmacies, for the Day Close reports' User filter;
 * their ids go out as `userIds`. Reloads when the pharmacy selection changes.
 */
export function useUserOptions(pharmacyIds: string[]) {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  // The selection the options were loaded for; loading until it matches.
  const pharmacyKey = pharmacyIds.join(",");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getUserNames(pharmacyKey ? pharmacyKey.split(",") : [])
      .then((users) => {
        if (active) setOptions(users.map((u) => ({ label: u.userName, value: u.userId })));
      })
      .catch((err) => {
        // The filter just stays empty; the report itself still loads.
        console.error("Failed to fetch users:", err);
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoadedKey(pharmacyKey);
      });
    return () => {
      active = false;
    };
  }, [pharmacyKey]);

  const labelOf = (userId: string) =>
    options.find((o) => o.value === userId)?.label ?? "";

  return { options, loading: loadedKey !== pharmacyKey, labelOf };
}
