"use client";

import Image from "next/image";
import clsx from "clsx";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import { getBillDueSummary } from "@/services/FinancialReportService";
import { BillDueRow } from "@/types/FinancialReportData";
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
import { PENDING_STATUS_OPTIONS, optionLabel } from "../components/reportFilterOptions";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatReportTime,
  formatRupees,
} from "../components/reportUtils";

interface BillDueFilters {
  pharmacyIds: string[];
  doctorIds: number[];
  /** PENDING or FULLY_PAID; empty is ALL. */
  pendingStatus: string;
  patientSearch: string;
  patientNo: string;
  ipNo: string;
  billNo: string;
}

const EMPTY_FILTERS: BillDueFilters = {
  pharmacyIds: [],
  doctorIds: [],
  pendingStatus: "",
  patientSearch: "",
  patientNo: "",
  ipNo: "",
  billNo: "",
};

/** The More Filters fields: one free-text search each. */
const SEARCH_FILTERS = [
  { key: "patientSearch", label: "Patient Name / Mobile", chip: "Patient", placeholder: "Search name or mobile no." },
  { key: "patientNo", label: "Patient No.", chip: "Patient No", placeholder: "Search patient no." },
  { key: "ipNo", label: "IP No.", chip: "IP No", placeholder: "Search IP no." },
  { key: "billNo", label: "Bill No.", chip: "Bill No", placeholder: "Search bill no." },
] as const;

const SEARCH_ICON = <Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />;

/** Red while anything is owed, green once it is settled. */
const pendingClass = (amount: number) =>
  amount > 0 ? "text-warning-600" : "text-success-800";

const COLUMNS: ReportColumn<BillDueRow>[] = [
  {
    key: "serial",
    header: "#",
    className: "min-w-[36px]",
    cell: (_row, index) => index + 1,
  },
  {
    key: "patient",
    header: "Patient Name",
    className: "min-w-[102px]",
    sortValue: (row) => row.patientName ?? "",
    cell: (row) => <span className="font-semibold">{row.patientName || "—"}</span>,
  },
  {
    key: "patientNo",
    header: "Patient No.",
    className: "min-w-[85px]",
    cell: (row) => <span className="whitespace-nowrap">{row.patientNumber || "—"}</span>,
  },
  {
    key: "ipNo",
    header: "IP No.",
    className: "min-w-[75px]",
    cell: (row) => <span className="whitespace-nowrap">{row.ipNumber || "—"}</span>,
  },
  {
    key: "billNo",
    header: "Bill No.",
    className: "min-w-[80px]",
    cell: (row) => (
      <span className="font-semibold whitespace-nowrap text-primary-800">{row.billNo}</span>
    ),
  },
  {
    key: "billedAt",
    header: "Billed Date",
    className: "min-w-[171px]",
    sortValue: (row) => row.billedDate,
    cell: (row) => (
      <span className="flex gap-1 whitespace-nowrap">
        <span>{formatReportDate(row.billedDate)}</span>
        <span className="text-pneutral-500">{formatReportTime(row.billedDate)}</span>
      </span>
    ),
  },
  {
    key: "referredBy",
    header: "Referred By",
    className: "min-w-[99px]",
    cell: (row) => <span className="whitespace-nowrap">{row.referredBy || "—"}</span>,
  },
  {
    key: "totalAmount",
    header: "Total Amount (₹)",
    align: "right",
    className: "min-w-[106px]",
    sortValue: (row) => row.totalAmount,
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.totalAmount)}</span>,
  },
  {
    key: "amountReceived",
    header: "Amount Received (₹)",
    align: "right",
    className: "min-w-[120px]",
    sortValue: (row) => row.amountReceived,
    cell: (row) => {
      const share = row.totalAmount > 0 ? Math.min(row.amountReceived / row.totalAmount, 1) : 0;
      return (
        <span className="flex flex-col items-end gap-1">
          <span className="whitespace-nowrap">{formatRupees(row.amountReceived)}</span>
          {/* How much of the bill has been collected. */}
          <span className="h-1 w-22 rounded-full bg-pneutral-200">
            <span
              className="block h-1 rounded-full bg-secondary-600"
              style={{ width: `${share * 100}%` }}
            />
          </span>
        </span>
      );
    },
  },
  {
    key: "pendingAmount",
    header: "Pending Amount (₹)",
    align: "right",
    className: "min-w-[108px]",
    sortValue: (row) => row.pendingAmount,
    cell: (row) => (
      <span className={clsx("font-semibold whitespace-nowrap", pendingClass(row.pendingAmount))}>
        {formatRupees(row.pendingAmount)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "min-w-[124px]",
    cell: (row) => <StatusBadge status={row.status === "FULLY_PAID" ? "Fully Paid" : "Pending"} />,
  },
];

export default function BillDueSummaryPage() {
  const doctors = useDoctorOptions();
  const report = useFinancialReport({
    emptyFilters: EMPTY_FILTERS,
    toParams: (f) => ({
      doctorIds: f.doctorIds,
      pendingStatus: f.pendingStatus,
      patientSearch: f.patientSearch.trim(),
      patientNo: f.patientNo.trim(),
      ipNo: f.ipNo.trim(),
      billNo: f.billNo.trim(),
    }),
    fetchReport: getBillDueSummary,
    errorMessage: "Failed to fetch the bill due summary report",
  });
  const { filters, clearField } = report;
  const { draft, applied, setDraftField } = filters;

  const chips = [
    ...report.baseChips,
    ...multiSelectChip("doctorIds", "Referred By", applied.doctorIds, doctors.labelOf, () => clearField("doctorIds")),
    ...(applied.pendingStatus
      ? [{
          key: "pendingStatus",
          label: `Pending Status: ${optionLabel(PENDING_STATUS_OPTIONS, applied.pendingStatus)}`,
          onRemove: () => clearField("pendingStatus"),
        }]
      : []),
    ...textFilterChips(applied, SEARCH_FILTERS, clearField),
  ];

  const data = report.report;
  const kpi = data?.kpi;
  const totalBills = data?.billDetails.totalElements ?? 0;
  const billed = kpi?.totalIpBillAmount ?? 0;
  const pending = kpi?.totalPendingAmount ?? 0;

  return (
    <div className="@container flex flex-col gap-4">
      <ReportHeader
        title="Bill Due Summary (In-Patient)"
        description="View pending amounts against In-Patient (IP) pharmacy bills for the selected reporting period."
        onPrint={() => window.print()}
      />

      <ReportFilterToolbar
        period={filters.draftPeriod}
        onPeriodChange={filters.setDraftPeriod}
        chips={chips}
        onReset={report.reset}
        onSearch={report.search}
        searching={report.isLoading}
        moreFilterCount={SEARCH_FILTERS.length}
        moreFilters={SEARCH_FILTERS.map(({ key, label, placeholder }) => (
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
          label="Pending Status"
          labelClassName="px-1"
          options={PENDING_STATUS_OPTIONS}
          value={draft.pendingStatus}
          onChange={(value: string) => setDraftField("pendingStatus", value)}
          placeholder="All"
          clearable
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
              label="Total IP Bill Amount"
              value={formatRupees(billed)}
              icon="/Reports/Banknotes.svg"
              tone="primary"
              highlight={`${totalBills} ${totalBills === 1 ? "bill" : "bills"}`}
              caption="in this period"
            />
            <ReportKpiCard
              label="Total Amount Received"
              value={formatRupees(kpi?.totalAmountReceived ?? 0)}
              icon="/Reports/CheckCircleSolid.svg"
              tone="success"
              highlight={formatPercent(kpi?.totalAmountReceived ?? 0, billed)}
              caption="of billed amount"
            />
            <ReportKpiCard
              label="Total Pending Amount"
              value={formatRupees(pending)}
              icon="/Reports/Clock.svg"
              tone="warning"
              highlight={formatPercent(pending, billed)}
              caption="still outstanding"
            />
          </div>

          <ReportTable
            title="Bill Details"
            subtitles={[`Period: ${describePeriod(filters.appliedPeriod, "to")}`]}
            generatedOn={formatGeneratedOn(data.generatedOn)}
            generatedBy={data.generatedBy}
            columns={COLUMNS}
            rows={data.billDetails.content}
            getRowKey={(row) => String(row.billingId)}
            serverPagination={report.serverPagination(totalBills)}
            totalRow={{
              patient: "Total",
              totalAmount: formatRupees(billed),
              amountReceived: formatRupees(kpi?.totalAmountReceived ?? 0),
              pendingAmount: <span className={pendingClass(pending)}>{formatRupees(pending)}</span>,
            }}
            emptyState={
              <ReportEmptyState title="No bills match your filters" onClearFilters={report.reset} />
            }
          />
        </>
      )}
    </div>
  );
}
