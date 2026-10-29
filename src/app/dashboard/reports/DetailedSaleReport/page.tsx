"use client";

import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import { getDetailedSaleReport } from "@/services/FinancialReportService";
import { DetailedSaleRow } from "@/types/FinancialReportData";
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
import { GST_OPTIONS, optionLabel } from "../components/reportFilterOptions";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatRupees,
  formatRupeesCompact,
} from "../components/reportUtils";

interface DetailedSaleFilters {
  pharmacyIds: string[];
  doctorIds: number[];
  productSearch: string;
  patientSearch: string;
  patientNo: string;
  ipNo: string;
  opNo: string;
  billNo: string;
  hsnSearch: string;
  gstPercentages: string[];
}

const EMPTY_FILTERS: DetailedSaleFilters = {
  pharmacyIds: [],
  doctorIds: [],
  productSearch: "",
  patientSearch: "",
  patientNo: "",
  ipNo: "",
  opNo: "",
  billNo: "",
  hsnSearch: "",
  gstPercentages: [],
};

/** The free-text More Filters fields; GST % follows them as a multi-select. */
const SEARCH_FILTERS = [
  { key: "patientSearch", label: "Patient Name / Mobile", chip: "Patient", placeholder: "Search name or mobile no." },
  { key: "patientNo", label: "Patient No.", chip: "Patient No", placeholder: "Search patient no." },
  { key: "ipNo", label: "IP No.", chip: "IP No", placeholder: "Search IP no." },
  { key: "opNo", label: "OP No.", chip: "OP No", placeholder: "Search OP no." },
  { key: "billNo", label: "Bill No.", chip: "Bill No", placeholder: "Search bill no." },
  { key: "hsnSearch", label: "HSN Code", chip: "HSN", placeholder: "Search HSN code" },
] as const;

const SEARCH_ICON = <Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />;

const COLUMNS: ReportColumn<DetailedSaleRow>[] = [
  {
    key: "billNo",
    header: "Bill No.",
    className: "min-w-[82px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">{row.billNo}</span>
    ),
  },
  {
    key: "billedAt",
    header: "Billed Date",
    className: "min-w-[107px]",
    sortValue: (row) => row.billedDate,
    cell: (row) => <span className="whitespace-nowrap">{formatReportDate(row.billedDate)}</span>,
  },
  {
    key: "patient",
    header: "Patient / Customer",
    className: "min-w-[125px]",
    sortValue: (row) => row.patientName ?? "",
    cell: (row) => <span className="font-semibold">{row.patientName || "Walk-In Customer"}</span>,
  },
  {
    key: "referredBy",
    header: "Referred By",
    className: "min-w-[101px]",
    cell: (row) => <span className="whitespace-nowrap">{row.referredBy || "—"}</span>,
  },
  {
    key: "product",
    header: "Product",
    className: "min-w-[118px]",
    cell: (row) => <span className="font-semibold">{row.productName}</span>,
  },
  {
    key: "batch",
    header: "Batch",
    className: "min-w-[82px]",
    cell: (row) => <span className="whitespace-nowrap">{row.batchNumber || "—"}</span>,
  },
  {
    key: "quantity",
    header: "Qty",
    align: "right",
    className: "min-w-[55px]",
    cell: (row) => row.quantity,
  },
  {
    key: "saleUnit",
    header: "Sale Unit",
    className: "min-w-[63px]",
    cell: (row) => row.unit || "—",
  },
  {
    key: "hsn",
    header: "HSN",
    className: "min-w-[60px]",
    cell: (row) => row.hsnNo || "—",
  },
  {
    key: "gstPercent",
    header: "GST %",
    align: "right",
    className: "min-w-[55px]",
    cell: (row) => (row.gstPercentage ? `${row.gstPercentage}%` : "—"),
  },
  {
    key: "grossAmount",
    header: "Gross Amount",
    align: "right",
    className: "min-w-[89px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupeesCompact(row.grossAmount)}</span>,
  },
  {
    key: "discount",
    header: "Discount",
    align: "right",
    className: "min-w-[100px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupeesCompact(row.discountAmount)}</span>,
  },
  {
    key: "cgst",
    header: "CGST",
    align: "right",
    className: "min-w-[71px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.cgstAmount)}</span>,
  },
  {
    key: "sgst",
    header: "SGST",
    align: "right",
    className: "min-w-[71px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.sgstAmount)}</span>,
  },
  {
    key: "netAmount",
    header: "Net Amount",
    align: "right",
    className: "min-w-[109px]",
    sortValue: (row) => row.netAmount,
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap">{formatRupees(row.netAmount)}</span>
    ),
  },
];

export default function DetailedSaleReportPage() {
  const doctors = useDoctorOptions();
  const report = useFinancialReport({
    emptyFilters: EMPTY_FILTERS,
    toParams: (f) => ({
      doctorIds: f.doctorIds,
      productSearch: f.productSearch.trim(),
      patientSearch: f.patientSearch.trim(),
      patientNo: f.patientNo.trim(),
      ipNo: f.ipNo.trim(),
      opNo: f.opNo.trim(),
      billNo: f.billNo.trim(),
      hsnSearch: f.hsnSearch.trim(),
      gstPercentages: f.gstPercentages,
    }),
    fetchReport: getDetailedSaleReport,
    errorMessage: "Failed to fetch the detailed sale report",
  });
  const { filters, clearField } = report;
  const { draft, applied, setDraftField } = filters;

  const chips = [
    ...report.baseChips,
    ...multiSelectChip("doctorIds", "Referred By", applied.doctorIds, doctors.labelOf, () => clearField("doctorIds")),
    ...textFilterChips(applied, [{ key: "productSearch", chip: "Product" }], clearField),
    ...textFilterChips(applied, SEARCH_FILTERS, clearField),
    ...multiSelectChip("gstPercentages", "GST", applied.gstPercentages, (v) => optionLabel(GST_OPTIONS, v), () => clearField("gstPercentages")),
  ];

  const data = report.report;
  const kpi = data?.kpi;
  const totalItems = data?.billDetails.totalElements ?? 0;
  const gross = kpi?.totalGrossAmount ?? 0;
  const discount = kpi?.totalDiscountAmount ?? 0;

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title="Pharma Bill Detailed Sales"
        description="Product-level details of pharmacy sales for the selected reporting period."
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
        <Input
          label="Product"
          labelClassName="px-1"
          placeholder="Search"
          value={draft.productSearch}
          onChange={(e) => setDraftField("productSearch", e.target.value)}
          onKeyDown={report.onEnter}
          leftIcon={SEARCH_ICON}
        />
      </ReportFilterToolbar>

      {report.isLoading ? (
        <ReportLoadingState kpiCount={4} />
      ) : !data ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {report.loadError}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
            <ReportKpiCard
              label="Gross Amount"
              value={formatRupees(gross)}
              icon="/Reports/Banknotes.svg"
              tone="primary"
              highlight={`${totalItems} ${totalItems === 1 ? "item" : "items"}`}
              caption="in this period"
            />
            <ReportKpiCard
              label="Total Discount"
              value={formatRupees(discount)}
              icon="/Reports/ReceiptRefundBlue.svg"
              tone="info"
              highlight={formatPercent(discount, gross)}
              caption="of gross amount"
            />
            <ReportKpiCard
              label="GST (CGST + SGST)"
              value={formatRupees(kpi?.totalGstAmount ?? 0)}
              icon="/Reports/Scale.svg"
              tone="danger"
              highlight={formatPercent(kpi?.totalGstAmount ?? 0, gross - discount)}
              caption="on taxable value"
            />
            <ReportKpiCard
              label="Net Amount"
              value={formatRupees(kpi?.totalNetAmount ?? 0)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(kpi?.totalNetAmount ?? 0, gross)}
              caption="of gross amount"
            />
          </div>

          <ReportTable
            title="Bill Item Details"
            subtitles={[
              `Period: ${describePeriod(filters.appliedPeriod, "to")}`,
              ...(report.pharmacyNames ? [`Pharmacy: ${report.pharmacyNames}`] : []),
            ]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            columns={COLUMNS}
            rows={data.billDetails.content}
            getRowKey={(row) => String(row.billingDetailsId)}
            serverPagination={report.serverPagination(totalItems)}
            emptyState={
              <ReportEmptyState title="No bill items match your filters" onClearFilters={report.reset} />
            }
          />
        </>
      )}
    </div>
  );
}
