"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Input from "@/app/components/common/Input";
import Dropdown, { DropdownOption } from "@/app/components/common/Dropdown";
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
  formatRupees,
  formatRupeesCompact,
  periodChipLabel,
} from "../components/reportUtils";

interface DetailedSaleFilters {
  pharmacyId: string;
  referredBy: string;
  product: string;
}

const EMPTY_FILTERS: DetailedSaleFilters = { pharmacyId: "", referredBy: "", product: "" };

/** One product line of a bill — a bill with three products is three rows. */
interface DetailedSaleRow {
  billNo: string;
  /** ISO date-time. */
  billedAt: string;
  patientName: string;
  referredBy: string;
  productName: string;
  batchNo: string;
  quantity: number;
  saleUnit: string;
  hsnCode: string;
  gstPercent: number;
  grossAmount: number;
  discount: number;
  cgst: number;
  sgst: number;
  netAmount: number;
}

// Sample data in the design's shape, until the report API is wired in.
const SAMPLE_ROWS: DetailedSaleRow[] = [
  { billNo: "PB-1001", billedAt: "2026-10-01T10:25:00", patientName: "Patient A", referredBy: "Dr. A", productName: "Paracetamol 500 mg", batchNo: "PCM001", quantity: 10, saleUnit: "Strip", hsnCode: "3004", gstPercent: 5, grossAmount: 500, discount: 50, cgst: 11.25, sgst: 11.25, netAmount: 472.5 },
  { billNo: "PB-1001", billedAt: "2026-10-01T10:25:00", patientName: "Patient A", referredBy: "Dr. A", productName: "Amoxicillin 500 mg", batchNo: "AMX021", quantity: 2, saleUnit: "Strip", hsnCode: "3004", gstPercent: 5, grossAmount: 800, discount: 0, cgst: 20, sgst: 20, netAmount: 840 },
  { billNo: "PB-1002", billedAt: "2026-10-02T11:40:00", patientName: "Patient B", referredBy: "Dr. B", productName: "Pantoprazole 40 mg", batchNo: "PAN112", quantity: 3, saleUnit: "Strip", hsnCode: "3004", gstPercent: 5, grossAmount: 600, discount: 60, cgst: 13.5, sgst: 13.5, netAmount: 567 },
];

// Doctors come with the report APIs.
const REFERRED_BY_OPTIONS: DropdownOption[] = [];

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
    sortValue: (row) => row.billedAt,
    cell: (row) => <span className="whitespace-nowrap">{formatReportDate(row.billedAt)}</span>,
  },
  {
    key: "patient",
    header: "Patient / Customer",
    className: "min-w-[125px]",
    sortValue: (row) => row.patientName,
    cell: (row) => <span className="font-semibold">{row.patientName}</span>,
  },
  {
    key: "referredBy",
    header: "Referred By",
    className: "min-w-[101px]",
    cell: (row) => <span className="whitespace-nowrap">{row.referredBy}</span>,
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
    cell: (row) => <span className="whitespace-nowrap">{row.batchNo}</span>,
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
    cell: (row) => row.saleUnit,
  },
  {
    key: "hsn",
    header: "HSN",
    className: "min-w-[60px]",
    cell: (row) => row.hsnCode,
  },
  {
    key: "gstPercent",
    header: "GST %",
    align: "right",
    className: "min-w-[55px]",
    cell: (row) => `${row.gstPercent}%`,
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
    cell: (row) => <span className="whitespace-nowrap">{formatRupeesCompact(row.discount)}</span>,
  },
  {
    key: "cgst",
    header: "CGST",
    align: "right",
    className: "min-w-[71px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.cgst)}</span>,
  },
  {
    key: "sgst",
    header: "SGST",
    align: "right",
    className: "min-w-[71px]",
    cell: (row) => <span className="whitespace-nowrap">{formatRupees(row.sgst)}</span>,
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
  const filters = useReportFilters(EMPTY_FILTERS);
  const { draft, applied, setDraftField } = filters;
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

  const pharmacy = usePharmacyOptions((pharmacyId) => {
    filters.setDraft((prev) => ({ ...prev, pharmacyId }));
    filters.setApplied((prev) => ({ ...prev, pharmacyId }));
  });

  const rows = SAMPLE_ROWS;

  // The headline figures are sums over the line items.
  const totals = useMemo(() => {
    const sum = (pick: (row: DetailedSaleRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    const gross = sum((r) => r.grossAmount);
    const discount = sum((r) => r.discount);
    return {
      gross,
      discount,
      gst: sum((r) => r.cgst + r.sgst),
      taxable: gross - discount,
      net: sum((r) => r.netAmount),
      items: rows.length,
      bills: new Set(rows.map((r) => r.billNo)).size,
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
    ...(applied.product
      ? [{ key: "product", label: `Product: ${applied.product}`, onRemove: () => filters.clearField("product") }]
      : []),
  ];

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
        <Input
          label="Product"
          labelClassName="px-1"
          placeholder="Search"
          value={draft.product}
          onChange={(e) => setDraftField("product", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          leftIcon={<Image src="/Reports/MagnifyingGlass.svg" alt="" width={20} height={20} />}
        />
      </ReportFilterToolbar>

      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
        <ReportKpiCard
          label="Gross Amount"
          value={formatRupees(totals.gross)}
          icon="/Reports/Banknotes.svg"
          tone="primary"
          highlight={`${totals.items} ${totals.items === 1 ? "item" : "items"}`}
          caption={`across ${totals.bills} ${totals.bills === 1 ? "bill" : "bills"}`}
        />
        <ReportKpiCard
          label="Total Discount"
          value={formatRupees(totals.discount)}
          icon="/Reports/ReceiptRefundBlue.svg"
          tone="info"
          highlight={formatPercent(totals.discount, totals.gross)}
          caption="of gross amount"
        />
        <ReportKpiCard
          label="GST (CGST + SGST)"
          value={formatRupees(totals.gst)}
          icon="/Reports/Scale.svg"
          tone="danger"
          highlight={formatPercent(totals.gst, totals.taxable)}
          caption="on taxable value"
        />
        <ReportKpiCard
          label="Net Amount"
          value={formatRupees(totals.net)}
          icon="/Reports/CheckCircleSolid.svg"
          tone="success"
          highlight={formatPercent(totals.net, totals.gross)}
          caption="of gross amount"
        />
      </div>

      <ReportTable
        title="Bill Item Details"
        subtitles={[
          `Period: ${describePeriod(filters.appliedPeriod, "to")}`,
          ...(appliedPharmacy ? [`Pharmacy: ${appliedPharmacy}`] : []),
        ]}
        generatedOn={formatGeneratedOn(generatedAt)}
        generatedBy="Admin User"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row, index) => `${row.billNo}-${row.batchNo}-${index}`}
      />
    </div>
  );
}
