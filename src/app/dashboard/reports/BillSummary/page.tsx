"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import { showToast } from "@/app/components/common/Toast";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { getBillSummary } from "@/services/FinancialReportService";
import { BillSummaryResponse, BillSummaryRow } from "@/types/FinancialReportData";
import ReportHeader from "../components/ReportHeader";
import ReportFilterToolbar, { AppliedFilterChip } from "../components/ReportFilterToolbar";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportTable, { PAGE_SIZE_OPTIONS, ReportColumn } from "../components/ReportTable";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportEmptyState from "../components/ReportEmptyState";
import {
  useDoctorOptions,
  usePharmacyOptions,
  useReportFilters,
} from "../components/useReportFilters";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatReportTime,
  formatRupees,
  periodChipLabel,
  periodToParams,
} from "../components/reportUtils";

interface BillSummaryFilters {
  pharmacyIds: string[];
  /** Patient name or mobile number. */
  patientSearch: string;
  doctorIds: number[];
  patientNo: string;
  ipNo: string;
  opNo: string;
  billNo: string;
}

const EMPTY_FILTERS: BillSummaryFilters = {
  pharmacyIds: [],
  patientSearch: "",
  doctorIds: [],
  patientNo: "",
  ipNo: "",
  opNo: "",
  billNo: "",
};

/** The More Filters fields: one free-text search each. */
const NUMBER_FILTERS = [
  { key: "patientNo", label: "Patient No.", placeholder: "Search patient no." },
  { key: "ipNo", label: "IP No.", placeholder: "Search IP no." },
  { key: "opNo", label: "OP No.", placeholder: "Search OP no." },
  { key: "billNo", label: "Bill No.", placeholder: "Search bill no." },
] as const;

const SEARCH_ICON = <Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />;

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
    sortValue: (row) => row.patientName ?? "",
    cell: (row) => <span className="font-semibold">{row.patientName || "Walk-In Customer"}</span>,
  },
  {
    key: "patientNo",
    header: "Patient No.",
    className: "min-w-[138px]",
    cell: (row) => <span className="whitespace-nowrap">{row.patientNumber || "---"}</span>,
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
    sortValue: (row) => row.billedDate,
    cell: (row) => (
      <span className="flex gap-1 whitespace-nowrap">
        <span>{formatReportDate(row.billedDate)}</span>
        <span className="text-pneutral-500">{formatReportTime(row.billedDate)}</span>
      </span>
    ),
  },
  {
    key: "items",
    header: "Items",
    align: "right",
    className: "min-w-[122px]",
    cell: (row) => row.itemCount,
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
  // The navbar's pharmacy: the default selection, and what the backend
  // reports on when no pharmacy is sent.
  const defaultPharmacyId = usePharmacyStore((s) => s.selectedPharmacy?.pharmacyId ?? "");
  const baseFilters = useMemo(
    () => ({ ...EMPTY_FILTERS, pharmacyIds: defaultPharmacyId ? [defaultPharmacyId] : [] }),
    [defaultPharmacyId],
  );

  const filters = useReportFilters(baseFilters);
  const { draft, applied, appliedPeriod, setDraftField } = filters;

  const pharmacy = usePharmacyOptions((pharmacyId) => {
    // Only fills an empty selection — the store can rehydrate after the first render.
    filters.setDraft((prev) => (prev.pharmacyIds.length ? prev : { ...prev, pharmacyIds: [pharmacyId] }));
    filters.setApplied((prev) => (prev.pharmacyIds.length ? prev : { ...prev, pharmacyIds: [pharmacyId] }));
  });
  const doctors = useDoctorOptions();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  // Bumped by Search, so searching again with unchanged filters still refetches.
  const [searchCount, setSearchCount] = useState(0);
  const [report, setReport] = useState<BillSummaryResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  // Identifies the request the current filters call for. Loading is derived
  // rather than set: until the response for this exact key lands, it is loading.
  const requestKey = JSON.stringify([applied, appliedPeriod, page, pageSize, searchCount]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const isLoading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;

    getBillSummary({
      ...periodToParams(appliedPeriod),
      pharmacyIds: applied.pharmacyIds,
      patientSearch: applied.patientSearch.trim(),
      doctorIds: applied.doctorIds,
      patientNo: applied.patientNo.trim(),
      ipNo: applied.ipNo.trim(),
      opNo: applied.opNo.trim(),
      billNo: applied.billNo.trim(),
      page: page - 1,
      size: pageSize,
    })
      .then((data) => {
        if (!active) return;
        setReport(data);
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch the bill summary report:", err);
        const message = err?.message || "Failed to fetch the bill summary report.";
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
    // requestKey is built from these exact values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const handleSearch = () => {
    filters.apply();
    setPage(1);
    setSearchCount((n) => n + 1);
  };

  const handleReset = () => {
    filters.reset(baseFilters);
    setPage(1);
    setSearchCount((n) => n + 1);
  };

  const clearField = (key: keyof BillSummaryFilters) => {
    filters.clearField(key);
    setPage(1);
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const pharmacyNames = applied.pharmacyIds.map(pharmacy.labelOf).filter(Boolean).join(", ");
  const doctorNames = applied.doctorIds.map(doctors.labelOf).filter(Boolean).join(", ");
  const isDefaultPharmacy =
    applied.pharmacyIds.length === 1 && applied.pharmacyIds[0] === defaultPharmacyId;

  const chips: AppliedFilterChip[] = [
    { key: "period", label: periodChipLabel(appliedPeriod) },
    ...(pharmacyNames
      ? [{
          key: "pharmacy",
          label: `Pharmacy: ${pharmacyNames}`,
          // Clearing goes back to the navbar's pharmacy, so there is nothing to clear from it.
          onRemove: isDefaultPharmacy ? undefined : () => clearField("pharmacyIds"),
        }]
      : []),
    ...(applied.patientSearch.trim()
      ? [{ key: "patientSearch", label: `Patient: ${applied.patientSearch.trim()}`, onRemove: () => clearField("patientSearch") }]
      : []),
    ...(doctorNames
      ? [{ key: "doctorIds", label: `Referred By: ${doctorNames}`, onRemove: () => clearField("doctorIds") }]
      : []),
    ...NUMBER_FILTERS.filter(({ key }) => applied[key].trim()).map(({ key, label }) => ({
      key,
      label: `${label.replace(/\.$/, "")}: ${applied[key].trim()}`,
      onRemove: () => clearField(key),
    })),
  ];

  const kpi = report?.kpi;
  const totalBills = report?.billDetails.totalElements ?? 0;

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
        chips={chips}
        onReset={handleReset}
        onSearch={handleSearch}
        searching={isLoading}
        moreFilterCount={NUMBER_FILTERS.length}
        moreFilters={NUMBER_FILTERS.map(({ key, label, placeholder }) => (
          <Input
            key={key}
            label={label}
            labelClassName="px-1"
            placeholder={placeholder}
            value={draft[key]}
            onChange={(e) => setDraftField(key, e.target.value)}
            onKeyDown={onEnter}
            leftIcon={SEARCH_ICON}
          />
        ))}
      >
        <Dropdown
          label="Pharmacy"
          labelClassName="px-1"
          options={pharmacy.options}
          value={draft.pharmacyIds}
          onChange={(value: string[]) => setDraftField("pharmacyIds", value)}
          placeholder="Select"
          multiple
        />
        <Input
          label="Patient Name / Mobile"
          labelClassName="px-1"
          placeholder="Search name or mobile no."
          value={draft.patientSearch}
          onChange={(e) => setDraftField("patientSearch", e.target.value)}
          onKeyDown={onEnter}
          leftIcon={SEARCH_ICON}
        />
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
      </ReportFilterToolbar>

      {isLoading ? (
        <ReportLoadingState kpiCount={3} />
      ) : !report ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {loadError || "Failed to fetch the bill summary report."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
            <ReportKpiCard
              label="Total Sales"
              value={formatRupees(kpi?.totalSalesAmount ?? 0)}
              icon="/Reports/Banknotes.svg"
              tone="primary"
              highlight={`${totalBills} ${totalBills === 1 ? "bill" : "bills"}`}
              caption="in this period"
            />
            <ReportKpiCard
              label="Total Sales Return"
              value={formatRupees(kpi?.totalSalesReturnAmount ?? 0)}
              icon="/Reports/ReceiptRefundRed.svg"
              tone="warning"
              highlight={formatPercent(kpi?.totalSalesReturnAmount ?? 0, kpi?.totalSalesAmount ?? 0)}
              caption="of total sales"
            />
            <ReportKpiCard
              label="Net Sales"
              value={formatRupees(kpi?.netSalesAmount ?? 0)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(kpi?.netSalesAmount ?? 0, kpi?.totalSalesAmount ?? 0)}
              caption="retained after returns"
            />
          </div>

          <ReportTable
            title="Bill Details"
            subtitles={[
              `Period: ${describePeriod(appliedPeriod, "to")}`,
              ...(pharmacyNames ? [`Pharmacy: ${pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(report.generatedOn)}
            generatedBy={report.generatedBy}
            columns={COLUMNS}
            rows={report.billDetails.content}
            getRowKey={(row) => String(row.billingId)}
            serverPagination={{
              page,
              pageSize,
              totalItems: totalBills,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
            }}
            emptyState={
              <ReportEmptyState title="No bills match your filters" onClearFilters={handleReset} />
            }
          />
        </>
      )}
    </div>
  );
}
