"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import ReportHeader from "../components/ReportHeader";
import ReportFilterToolbar, { AppliedFilterChip } from "../components/ReportFilterToolbar";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportTable, { ReportColumn } from "../components/ReportTable";
import { usePharmacyOptions, useReportFilters } from "../components/useReportFilters";
import {
  describePeriod,
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatReportTime,
  formatRupees,
  periodChipLabel,
} from "../components/reportUtils";

type PendingStatus = "Pending" | "Fully Paid";

interface BillDueFilters {
  pharmacyId: string;
  referredBy: string;
  pendingStatus: string;
}

const EMPTY_FILTERS: BillDueFilters = { pharmacyId: "", referredBy: "", pendingStatus: "" };

/** One In-Patient bill and what is still owed on it. */
interface BillDueRow {
  patientName: string;
  patientNo: string;
  ipNo: string;
  billNo: string;
  /** ISO date-time. */
  billedAt: string;
  /** Absent when the bill has no Referred By. */
  referredBy?: string;
  totalAmount: number;
  amountReceived: number;
  pendingAmount: number;
  status: PendingStatus;
}

// Sample data in the design's shape, until the report API is wired in.
const SAMPLE_ROWS: BillDueRow[] = [
  { patientName: "Patient A", patientNo: "PAT-1001", ipNo: "IP-1001", billNo: "PB-1001", billedAt: "2026-10-01T10:25:00", referredBy: "Dr. A", totalAmount: 10000, amountReceived: 6000, pendingAmount: 4000, status: "Pending" },
  { patientName: "Patient B", patientNo: "PAT-1002", ipNo: "IP-1002", billNo: "PB-1002", billedAt: "2026-10-03T11:40:00", referredBy: "Dr. B", totalAmount: 8000, amountReceived: 5000, pendingAmount: 3000, status: "Pending" },
  { patientName: "Patient C", patientNo: "PAT-1003", ipNo: "IP-1003", billNo: "PB-1003", billedAt: "2026-10-05T09:35:00", totalAmount: 5000, amountReceived: 2000, pendingAmount: 3000, status: "Pending" },
  { patientName: "Patient D", patientNo: "PAT-1004", ipNo: "IP-1004", billNo: "PB-1004", billedAt: "2026-10-06T14:15:00", referredBy: "Dr. A", totalAmount: 6500, amountReceived: 6500, pendingAmount: 0, status: "Fully Paid" },
  { patientName: "Patient E", patientNo: "PAT-1005", ipNo: "IP-1005", billNo: "PB-1005", billedAt: "2026-10-07T16:10:00", referredBy: "Dr. C", totalAmount: 7500, amountReceived: 3000, pendingAmount: 4500, status: "Pending" },
  { patientName: "Patient F", patientNo: "PAT-1006", ipNo: "IP-1006", billNo: "PB-1006", billedAt: "2026-10-08T11:15:00", totalAmount: 4000, amountReceived: 4000, pendingAmount: 0, status: "Fully Paid" },
];

// Doctors come with the report APIs.
const REFERRED_BY_OPTIONS: DropdownOption[] = [];

const PENDING_STATUS_OPTIONS: DropdownOption[] = [
  { label: "Pending", value: "Pending" },
  { label: "Fully Paid", value: "Fully Paid" },
];

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
    sortValue: (row) => row.patientName,
    cell: (row) => <span className="font-semibold">{row.patientName}</span>,
  },
  {
    key: "patientNo",
    header: "Patient No.",
    className: "min-w-[85px]",
    cell: (row) => <span className="whitespace-nowrap">{row.patientNo}</span>,
  },
  {
    key: "ipNo",
    header: "IP No.",
    className: "min-w-[75px]",
    cell: (row) => <span className="whitespace-nowrap">{row.ipNo}</span>,
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
    sortValue: (row) => row.billedAt,
    cell: (row) => (
      <span className="flex gap-1 whitespace-nowrap">
        <span>{formatReportDate(row.billedAt)}</span>
        <span className="text-pneutral-500">{formatReportTime(row.billedAt)}</span>
      </span>
    ),
  },
  {
    key: "referredBy",
    header: "Referred By",
    className: "min-w-[99px]",
    cell: (row) => <span className="whitespace-nowrap">{row.referredBy ?? "—"}</span>,
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
    cell: (row) => <StatusBadge status={row.status} />,
  },
];

export default function BillDueSummaryPage() {
  const filters = useReportFilters(EMPTY_FILTERS);
  const { draft, applied, setDraftField } = filters;
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const pharmacy = usePharmacyOptions((pharmacyId) => {
    filters.setDraft((prev) => ({ ...prev, pharmacyId }));
    filters.setApplied((prev) => ({ ...prev, pharmacyId }));
  });

  const rows = SAMPLE_ROWS;

  const totals = useMemo(() => {
    const sum = (pick: (row: BillDueRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    return {
      totalAmount: sum((r) => r.totalAmount),
      amountReceived: sum((r) => r.amountReceived),
      pendingAmount: sum((r) => r.pendingAmount),
      bills: rows.length,
    };
  }, [rows]);

  const handleSearch = () => {
    filters.apply();
    setGeneratedAt(new Date());
  };

  const handleReset = () => {
    filters.reset({ ...EMPTY_FILTERS, pharmacyId: pharmacy.defaultId });
    setGeneratedAt(new Date());
  };

  const appliedPharmacy = pharmacy.labelOf(applied.pharmacyId);
  const appliedReferredBy =
    REFERRED_BY_OPTIONS.find((o) => o.value === applied.referredBy)?.label ?? applied.referredBy;

  const chips: AppliedFilterChip[] = [
    { key: "period", label: periodChipLabel(filters.appliedPeriod) },
    ...(appliedPharmacy
      ? [{ key: "pharmacy", label: `Pharmacy: ${appliedPharmacy}`, onRemove: () => filters.clearField("pharmacyId") }]
      : []),
    ...(appliedReferredBy
      ? [{ key: "referredBy", label: `Referred By: ${appliedReferredBy}`, onRemove: () => filters.clearField("referredBy") }]
      : []),
    ...(applied.pendingStatus
      ? [{ key: "pendingStatus", label: `Pending Status: ${applied.pendingStatus}`, onRemove: () => filters.clearField("pendingStatus") }]
      : []),
  ];

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
        filterCount={4}
        chips={chips}
        onReset={handleReset}
        onSearch={handleSearch}
      >
        <Dropdown
          label="Pharmacy"
          labelClassName="px-1"
          options={pharmacy.options}
          value={draft.pharmacyId}
          onChange={(value) => setDraftField("pharmacyId", value)}
          placeholder="Select"
        />
        <Dropdown
          label="Referred By"
          labelClassName="px-1"
          options={REFERRED_BY_OPTIONS}
          value={draft.referredBy}
          onChange={(value) => setDraftField("referredBy", value)}
          placeholder="Select"
        />
        <Dropdown
          label="Pending Status"
          labelClassName="px-1"
          options={PENDING_STATUS_OPTIONS}
          value={draft.pendingStatus}
          onChange={(value) => setDraftField("pendingStatus", value)}
          placeholder="Select"
          clearable
        />
      </ReportFilterToolbar>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        <ReportKpiCard
          label="Total IP Bill Amount"
          value={formatRupees(totals.totalAmount)}
          icon="/Reports/Banknotes.svg"
          tone="primary"
          highlight={`${totals.bills} ${totals.bills === 1 ? "bill" : "bills"}`}
          caption="in this period"
        />
        <ReportKpiCard
          label="Total Amount Received"
          value={formatRupees(totals.amountReceived)}
          icon="/Reports/CheckCircleSolid.svg"
          tone="success"
          highlight={formatPercent(totals.amountReceived, totals.totalAmount)}
          caption="of billed amount"
        />
        <ReportKpiCard
          label="Total Pending Amount"
          value={formatRupees(totals.pendingAmount)}
          icon="/Reports/Clock.svg"
          tone="warning"
          highlight={formatPercent(totals.pendingAmount, totals.totalAmount)}
          caption="still outstanding"
        />
      </div>

      <ReportTable
        title="Bill Details"
        subtitles={[`Period: ${describePeriod(filters.appliedPeriod, "to")}`]}
        generatedOn={formatGeneratedOn(generatedAt)}
        generatedBy="Admin User"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.billNo}
        totalRow={{
          patient: "Total",
          totalAmount: formatRupees(totals.totalAmount),
          amountReceived: formatRupees(totals.amountReceived),
          pendingAmount: (
            <span className={pendingClass(totals.pendingAmount)}>
              {formatRupees(totals.pendingAmount)}
            </span>
          ),
        }}
      />
    </div>
  );
}
