"use client";

import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import { getBillSummary } from "@/services/FinancialReportService";
import { BillSummaryRow } from "@/types/FinancialReportData";
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
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatReportTime,
  formatRupees,
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
  { key: "patientNo", label: "Patient No.", chip: "Patient No", placeholder: "Search patient no." },
  { key: "ipNo", label: "IP No.", chip: "IP No", placeholder: "Search IP no." },
  { key: "opNo", label: "OP No.", chip: "OP No", placeholder: "Search OP no." },
  { key: "billNo", label: "Bill No.", chip: "Bill No", placeholder: "Search bill no." },
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
  const doctors = useDoctorOptions();
  const report = useFinancialReport({
    emptyFilters: EMPTY_FILTERS,
    toParams: (f) => ({
      patientSearch: f.patientSearch.trim(),
      doctorIds: f.doctorIds,
      patientNo: f.patientNo.trim(),
      ipNo: f.ipNo.trim(),
      opNo: f.opNo.trim(),
      billNo: f.billNo.trim(),
    }),
    fetchReport: getBillSummary,
    errorMessage: "Failed to fetch the bill summary report",
  });
  const { filters, clearField } = report;
  const { draft, applied, setDraftField } = filters;

  const chips = [
    ...report.baseChips,
    ...textFilterChips(applied, [{ key: "patientSearch", chip: "Patient" }], clearField),
    ...multiSelectChip("doctorIds", "Referred By", applied.doctorIds, doctors.labelOf, () => clearField("doctorIds")),
    ...textFilterChips(applied, NUMBER_FILTERS, clearField),
  ];

  const data = report.report;
  const kpi = data?.kpi;
  const totalBills = data?.billDetails.totalElements ?? 0;

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
        onReset={report.reset}
        onSearch={report.search}
        searching={report.isLoading}
        moreFilterCount={NUMBER_FILTERS.length}
        moreFilters={NUMBER_FILTERS.map(({ key, label, placeholder }) => (
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
        <Input
          label="Patient Name / Mobile"
          labelClassName="px-1"
          placeholder="Search name or mobile no."
          value={draft.patientSearch}
          onChange={(e) => setDraftField("patientSearch", e.target.value)}
          onKeyDown={report.onEnter}
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
              `Period: ${describePeriod(filters.appliedPeriod, "to")}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            columns={COLUMNS}
            rows={data.billDetails.content}
            getRowKey={(row) => String(row.billingId)}
            serverPagination={report.serverPagination(totalBills)}
            emptyState={
              <ReportEmptyState title="No bills match your filters" onClearFilters={report.reset} />
            }
          />
        </>
      )}
    </div>
  );
}
