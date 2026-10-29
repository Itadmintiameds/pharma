"use client";

import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import { getDoctorWiseSalesReport } from "@/services/FinancialReportService";
import { DoctorWiseRow } from "@/types/FinancialReportData";
import ReportHeader from "../components/ReportHeader";
import ReportFilterToolbar from "../components/ReportFilterToolbar";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportTable, { ReportColumn } from "../components/ReportTable";
import ReportLoadingState from "../components/ReportLoadingState";
import ReportEmptyState from "../components/ReportEmptyState";
import { useDoctorOptions } from "../components/useReportFilters";
import {
  multiSelectChip,
  textFilterChips,
  useFinancialReport,
} from "../components/useFinancialReport";
import {
  GST_OPTIONS,
  PATIENT_TYPE_OPTIONS,
  optionLabel,
} from "../components/reportFilterOptions";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatRupees,
} from "../components/reportUtils";

interface DoctorWiseFilters {
  pharmacyIds: string[];
  doctorIds: number[];
  patientTypes: string[];
  productSearch: string;
  hsnSearch: string;
  gstPercentages: string[];
}

const EMPTY_FILTERS: DoctorWiseFilters = {
  pharmacyIds: [],
  doctorIds: [],
  patientTypes: [],
  productSearch: "",
  hsnSearch: "",
  gstPercentages: [],
};

/** The free-text More Filters fields; GST % follows them as a multi-select. */
const SEARCH_FILTERS = [
  { key: "productSearch", label: "Product", chip: "Product", placeholder: "Search product" },
  { key: "hsnSearch", label: "HSN Code", chip: "HSN", placeholder: "Search HSN code" },
] as const;

const SEARCH_ICON = <Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />;

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
  const doctors = useDoctorOptions();
  const report = useFinancialReport({
    emptyFilters: EMPTY_FILTERS,
    toParams: (f) => ({
      doctorIds: f.doctorIds,
      patientTypes: f.patientTypes,
      productSearch: f.productSearch.trim(),
      hsnSearch: f.hsnSearch.trim(),
      gstPercentages: f.gstPercentages,
    }),
    fetchReport: getDoctorWiseSalesReport,
    errorMessage: "Failed to fetch the doctor-wise sales report",
  });
  const { filters, clearField } = report;
  const { draft, applied, setDraftField } = filters;

  const chips = [
    ...report.baseChips,
    ...multiSelectChip("doctorIds", "Referred By", applied.doctorIds, doctors.labelOf, () => clearField("doctorIds")),
    ...multiSelectChip("patientTypes", "Patient Type", applied.patientTypes, (v) => optionLabel(PATIENT_TYPE_OPTIONS, v), () => clearField("patientTypes")),
    ...textFilterChips(applied, SEARCH_FILTERS, clearField),
    ...multiSelectChip("gstPercentages", "GST", applied.gstPercentages, (v) => optionLabel(GST_OPTIONS, v), () => clearField("gstPercentages")),
  ];

  const data = report.report;
  const kpi = data?.kpi;
  const rows = data?.billDetails.content ?? [];
  const totalRows = data?.billDetails.totalElements ?? 0;
  const saleValue = kpi?.totalSaleValue ?? 0;

  // The KPIs carry value totals for the whole report, but not quantities —
  // those can only be summed when every row is on this page.
  const allRowsShown = rows.length === totalRows;
  const sum = (pick: (row: DoctorWiseRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

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
        onReset={report.reset}
        onSearch={report.search}
        searching={report.isLoading}
        moreFilterCount={SEARCH_FILTERS.length + 1}
        moreFilters={
          <>
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
            <Dropdown
              label="GST %"
              labelClassName="px-1"
              options={GST_OPTIONS}
              value={draft.gstPercentages}
              onChange={(value: string[]) => setDraftField("gstPercentages", value)}
              placeholder="Select"
              multiple
            />
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
        <Dropdown
          label="Patient Type"
          labelClassName="px-1"
          options={PATIENT_TYPE_OPTIONS}
          value={draft.patientTypes}
          onChange={(value: string[]) => setDraftField("patientTypes", value)}
          placeholder="Select"
          multiple
        />
      </ReportFilterToolbar>

      {report.isLoading ? (
        <ReportLoadingState kpiCount={3} />
      ) : !data ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {report.loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
            <ReportKpiCard
              label="Total Sale Value"
              value={formatRupees(saleValue)}
              icon="/Reports/Banknotes.svg"
              tone="primary"
              highlight={`${totalRows} ${totalRows === 1 ? "product line" : "product lines"}`}
              caption="in this period"
            />
            <ReportKpiCard
              label="Total Return Value"
              value={formatRupees(kpi?.totalReturnValue ?? 0)}
              icon="/Reports/ReceiptRefundRed.svg"
              tone="warning"
              highlight={formatPercent(kpi?.totalReturnValue ?? 0, saleValue)}
              caption="of sale value"
            />
            <ReportKpiCard
              label="Net Sale Value"
              value={formatRupees(kpi?.netSaleValue ?? 0)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(kpi?.netSaleValue ?? 0, saleValue)}
              caption="retained after returns"
            />
          </div>

          <ReportTable
            title="Referred By Sales Details"
            subtitles={[
              `Period: ${describePeriod(filters.appliedPeriod, "to")}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            columns={COLUMNS}
            rows={rows}
            getRowKey={(row) => `${row.pharmacyId}-${row.doctorId}-${row.productId}`}
            serverPagination={report.serverPagination(totalRows)}
            totalRow={{
              referredBy: "Total",
              saleQuantity: allRowsShown ? sum((r) => r.saleQuantity) : undefined,
              returnQuantity: allRowsShown ? sum((r) => r.returnQuantity) : undefined,
              saleValue: formatRupees(saleValue),
              returnValue: formatRupees(kpi?.totalReturnValue ?? 0),
              netSaleValue: formatRupees(kpi?.netSaleValue ?? 0),
            }}
            emptyState={
              <ReportEmptyState title="No sales match your filters" onClearFilters={report.reset} />
            }
          />
        </>
      )}
    </div>
  );
}
