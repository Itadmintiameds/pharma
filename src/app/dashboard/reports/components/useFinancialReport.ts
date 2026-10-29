"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/app/components/common/Toast";
import { usePharmacyStore } from "@/store/pharmacyStore";
import type { FinancialReportParams } from "@/types/FinancialReportData";
import type { AppliedFilterChip } from "./ReportFilterToolbar";
import { PAGE_SIZE_OPTIONS } from "./ReportTable";
import { periodChipLabel, periodToParams } from "./reportUtils";
import { usePharmacyOptions, useReportFilters } from "./useReportFilters";

interface UseFinancialReportOptions<F, R> {
  /** The page's filter fields with nothing set; `pharmacyIds` is defaulted here. */
  emptyFilters: F;
  /** The applied filters as query parameters — period and paging are added here. */
  toParams: (filters: F) => FinancialReportParams;
  fetchReport: (params: FinancialReportParams) => Promise<R>;
  errorMessage: string;
}

/**
 * Everything a /financial-report page shares: draft/applied filters defaulted
 * to the navbar's pharmacy, server paging, and the fetch that follows them.
 *
 * The report refetches whenever the applied filters, period or page change,
 * and on every Search — even one with unchanged filters.
 */
export function useFinancialReport<F extends { pharmacyIds: string[] }, R>({
  emptyFilters,
  toParams,
  fetchReport,
  errorMessage,
}: UseFinancialReportOptions<F, R>) {
  // The navbar's pharmacy: the default selection, and what the backend reports
  // on when no pharmacy is sent.
  const defaultPharmacyId = usePharmacyStore((s) => s.selectedPharmacy?.pharmacyId ?? "");
  const baseFilters = useMemo(
    () => ({ ...emptyFilters, pharmacyIds: defaultPharmacyId ? [defaultPharmacyId] : [] }),
    // emptyFilters is a module constant on every page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultPharmacyId],
  );

  const filters = useReportFilters(baseFilters);
  const { applied, appliedPeriod } = filters;

  const pharmacy = usePharmacyOptions((pharmacyId) => {
    // Only fills an empty selection — the store can rehydrate after the first render.
    filters.setDraft((prev) => (prev.pharmacyIds.length ? prev : { ...prev, pharmacyIds: [pharmacyId] }));
    filters.setApplied((prev) => (prev.pharmacyIds.length ? prev : { ...prev, pharmacyIds: [pharmacyId] }));
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchCount, setSearchCount] = useState(0);
  const [report, setReport] = useState<R | null>(null);
  const [loadError, setLoadError] = useState("");

  const params: FinancialReportParams = {
    ...periodToParams(appliedPeriod),
    ...toParams(applied),
    pharmacyIds: applied.pharmacyIds,
    page: page - 1,
    size: pageSize,
  };

  // Identifies the request the current filters call for. Loading is derived
  // rather than set: until the response for this exact key lands, it is loading.
  const requestKey = JSON.stringify([params, searchCount]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const isLoading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;

    fetchReport(params)
      .then((data) => {
        if (!active) return;
        setReport(data);
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error(`${errorMessage}:`, err);
        const message = err?.message || errorMessage;
        setReport(null);
        setLoadError(message);
        showToast.error(message);
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });

    return () => {
      active = false;
    };
    // requestKey is built from params; fetchReport is a module-level service.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const search = () => {
    filters.apply();
    setPage(1);
    setSearchCount((n) => n + 1);
  };

  const reset = () => {
    filters.reset(baseFilters);
    setPage(1);
    setSearchCount((n) => n + 1);
  };

  /** A chip's ✕. Clearing `pharmacyIds` goes back to the navbar's pharmacy. */
  const clearField = (key: keyof F) => {
    filters.clearField(key);
    setPage(1);
  };

  /** Search on Enter, for the text fields. */
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  const pharmacyNames = applied.pharmacyIds.map(pharmacy.labelOf).filter(Boolean).join(", ");
  const isDefaultPharmacy =
    applied.pharmacyIds.length === 1 && applied.pharmacyIds[0] === defaultPharmacyId;

  /** The period chip and, once pharmacies are known, the pharmacy chip. */
  const baseChips: AppliedFilterChip[] = [
    { key: "period", label: periodChipLabel(appliedPeriod) },
    ...(pharmacyNames
      ? [{
          key: "pharmacy",
          label: `Pharmacy: ${pharmacyNames}`,
          // Clearing goes back to the navbar's pharmacy, so there is nothing to clear from it.
          onRemove: isDefaultPharmacy ? undefined : () => clearField("pharmacyIds"),
        }]
      : []),
  ];

  return {
    filters,
    pharmacy,
    pharmacyNames,
    baseChips,
    report,
    isLoading,
    loadError,
    search,
    reset,
    clearField,
    onEnter,
    serverPagination: (totalItems: number) => ({
      page,
      pageSize,
      totalItems,
      onPageChange: setPage,
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    }),
  };
}

/** One chip per text filter that is set: "Bill No: PB-1001". */
export function textFilterChips<F>(
  applied: F,
  fields: readonly { key: keyof F & string; chip: string }[],
  clearField: (key: keyof F) => void,
): AppliedFilterChip[] {
  return fields
    .filter(({ key }) => String(applied[key] ?? "").trim())
    .map(({ key, chip }) => ({
      key,
      label: `${chip}: ${String(applied[key]).trim()}`,
      onRemove: () => clearField(key),
    }));
}

/** One chip for a multi-select that has values: "Referred By: Dr. A, Dr. B". */
export function multiSelectChip<V>(
  key: string,
  name: string,
  values: V[],
  labelOf: (value: V) => string,
  onRemove: () => void,
): AppliedFilterChip[] {
  const labels = values.map(labelOf).filter(Boolean).join(", ");
  return labels ? [{ key, label: `${name}: ${labels}`, onRemove }] : [];
}
