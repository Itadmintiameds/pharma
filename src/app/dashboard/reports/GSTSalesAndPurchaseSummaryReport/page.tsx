"use client";

import { Fragment, useEffect, useId, useMemo, useState } from "react";
import clsx from "clsx";
import Dropdown, { type DropdownOption } from "@/app/components/common/Dropdown";
import { showToast } from "@/app/components/common/Toast";
import {
  downloadReportExport,
  getGstRegistrations,
  getGstSalesPurchaseSummary,
} from "@/services/FinancialReportService";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import type {
  FinancialReportParams,
  GstClassification,
  GstLedger,
  GstLedgerRow,
  GstSalesPurchaseSummaryResponse,
  GstSummary,
  GstTransactionType,
  ReportExportFormat,
} from "@/types/FinancialReportData";
import { warehouseLabel } from "@/types/UserData";
import { printElement } from "@/utils/printElement";
import ReportHeader from "../components/ReportHeader";
import ReportFilterToolbar, { DateField, type AppliedFilterChip } from "../components/ReportFilterToolbar";
import ReportKpiCard from "../components/ReportKpiCard";
import ReportLoadingState from "../components/ReportLoadingState";
import { GST_OPTIONS, optionLabel } from "../components/reportFilterOptions";
import { REPORT_PRINT_CSS } from "../components/reportPrintStyles";
import type { ReportAction } from "../components/useFinancialReport";
import {
  formatGeneratedOn,
  formatPercent,
  formatReportDate,
  formatRupees,
  toDateInputValue,
} from "../components/reportUtils";

const TITLE = "GST Sales & Purchase Summary Report";
const EXPORT_KEY = "gst-sales-purchase-summary";

const CARD_SHADOW =
  "shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]";

const TRANSACTION_TYPE_OPTIONS: DropdownOption[] = [
  { label: "All", value: "ALL" },
  { label: "Sales", value: "SALES" },
  { label: "Purchases", value: "PURCHASES" },
];

const CLASSIFICATION_OPTIONS: DropdownOption[] = [
  { label: "All", value: "ALL" },
  { label: "Local (CGST + SGST)", value: "LOCAL" },
  { label: "Central (IGST)", value: "CENTRAL" },
];

/** Locations go into one multi-select, so their values carry the kind: "P:<id>" / "W:<id>". */
const pharmacyValue = (id: string) => `P:${id}`;
const warehouseValue = (id: string) => `W:${id}`;
const idsOf = (values: string[], prefix: "P:" | "W:") =>
  values.filter((v) => v.startsWith(prefix)).map((v) => v.slice(prefix.length));

interface GstFilters {
  /** yyyy-mm-dd */
  fromDate: string;
  toDate: string;
  /** "P:<id>" / "W:<id>". Empty: the navbar's pharmacy or warehouse. */
  locations: string[];
  transactionType: GstTransactionType;
  gstin: string;
  gstClassification: GstClassification;
  gstPercentages: string[];
}

/** 1 April of the financial year today falls in, to today. */
const defaultFilters = (): GstFilters => {
  const today = new Date();
  const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    fromDate: toDateInputValue(new Date(fyStartYear, 3, 1)),
    toDate: toDateInputValue(today),
    locations: [],
    transactionType: "ALL",
    gstin: "",
    gstClassification: "ALL",
    gstPercentages: [],
  };
};

/** Ledger figures: "911,011", "45,034.74"; zero as "--", like the design. */
const formatAmount = (value: number | null | undefined, zero = "--") =>
  value ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : zero;

/** "5%", "5% and 18%", "5%, 12% and 18%". */
const listRates = (rates: number[]) => {
  const labels = rates.map((r) => `${r}%`);
  return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
};

/** The GST rates and classifications a ledger actually has transactions in. */
const ledgerStats = (ledger: GstLedger | null) => {
  const sections = ledger?.sections.filter((s) => s.rateGroups.length > 0) ?? [];
  const rates = [...new Set(sections.flatMap((s) => s.rateGroups.map((g) => Number(g.gstRate))))].sort(
    (a, b) => a - b,
  );
  const classes = sections.map((s) => (s.classification === "LOCAL" ? "Local" : "Central"));
  return { rates, classes: [...new Set(classes)].join(" + ") };
};

// ---------------------------------------------------------------- tables

const HEAD =
  "h-15 border-b border-r border-pneutral-200 bg-secondary-600 px-3 py-2 text-label-l3 font-semibold text-pneutral-50 uppercase last:border-r-0";
const CELL = "h-12 border-b border-r border-pneutral-200 px-3 py-2 text-p3 last:border-r-0";
const NUMBER_COLUMNS = ["netAmount", "netTax", "amount", "taxAmount", "crDrNote", "taxReturn", "taxRefund"] as const;

type LedgerLine =
  | { kind: "section"; key: string; label: string }
  | { kind: "label"; key: string; label: string }
  | { kind: "empty"; key: string }
  | { kind: "month" | "subtotal" | "total"; key: string; row: GstLedgerRow };

/** The ledger flattened into table lines: section, rate title, months, subtotal … then the total. */
const ledgerLines = (ledger: GstLedger): LedgerLine[] => [
  ...ledger.sections.flatMap((section): LedgerLine[] => [
    { kind: "section", key: section.title, label: section.title },
    ...(section.rateGroups.length === 0
      ? [{ kind: "empty", key: `${section.title}-empty` } as const]
      : section.rateGroups.flatMap((group): LedgerLine[] => [
          { kind: "label", key: group.title, label: group.title },
          ...group.months.map((row) => ({ kind: "month", key: `${group.title}-${row.month}`, row }) as const),
          { kind: "subtotal", key: `${group.title}-subtotal`, row: group.subtotal },
        ])),
  ]),
  { kind: "total", key: "total", row: ledger.total },
];

function LedgerTable({ ledger, headers }: { ledger: GstLedger; headers: string[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
      <table className="w-full min-w-[1000px] border-collapse">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={header} className={clsx(HEAD, i === 0 ? "w-[30%] text-left" : "text-right")}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ledgerLines(ledger).map((line) => {
            const tint =
              line.kind === "section"
                ? "bg-pneutral-50 text-pneutral-900"
                : line.kind === "subtotal"
                  ? "bg-primary-100 font-semibold text-primary-900"
                  : line.kind === "total"
                    ? "bg-secondary-100 font-semibold text-primary-900"
                    : "bg-white text-pneutral-900";
            return (
              <tr key={line.key} className={clsx(tint, "[&:last-child>td]:border-b-0")}>
                <td
                  className={clsx(
                    CELL,
                    "whitespace-nowrap",
                    line.kind === "month" || line.kind === "empty" ? "pl-8" : "font-semibold",
                  )}
                >
                  {"row" in line
                    ? line.row.label
                    : line.kind === "empty"
                      ? <span className="text-pneutral-500">No transactions in this period</span>
                      : line.label}
                </td>
                {NUMBER_COLUMNS.map((column) => (
                  <td key={column} className={clsx(CELL, "text-right whitespace-nowrap")}>
                    {"row" in line ? formatAmount(line.row[column]) : line.kind === "empty" ? "--" : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GstSummaryTable({ summary }: { summary: GstSummary }) {
  const SUMMARY_HEAD = clsx(HEAD, "h-14");
  const SUMMARY_CELL = clsx(CELL, "h-13 whitespace-nowrap");
  const netClass = (value: number) => (value < 0 ? "text-warning-600" : undefined);

  return (
    <div className="w-180 max-w-full overflow-x-auto rounded-lg border border-pneutral-200">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={clsx(SUMMARY_HEAD, "w-[28%] text-left")}>Month</th>
            <th className={clsx(SUMMARY_HEAD, "text-right")}>Output GST (₹)</th>
            <th className={clsx(SUMMARY_HEAD, "text-right")}>Input GST (₹)</th>
            <th className={clsx(SUMMARY_HEAD, "text-right")}>Net GST (₹)</th>
          </tr>
        </thead>
        <tbody>
          {summary.months.map((row) => (
            <tr key={row.month ?? row.label} className="bg-white text-pneutral-900">
              <td className={clsx(SUMMARY_CELL, "pl-8")}>{row.label}</td>
              <td className={clsx(SUMMARY_CELL, "text-right")}>{formatAmount(row.outputGst, "—")}</td>
              <td className={clsx(SUMMARY_CELL, "text-right")}>{formatAmount(row.inputGst, "—")}</td>
              <td className={clsx(SUMMARY_CELL, "text-right", netClass(row.netGst))}>
                {formatAmount(row.netGst, "0")}
              </td>
            </tr>
          ))}
          <tr className="bg-secondary-100 font-semibold text-primary-900 [&>td]:border-b-0">
            <td className={SUMMARY_CELL}>{summary.grandTotal.label}</td>
            <td className={clsx(SUMMARY_CELL, "text-right")}>{formatAmount(summary.grandTotal.outputGst, "—")}</td>
            <td className={clsx(SUMMARY_CELL, "text-right")}>{formatAmount(summary.grandTotal.inputGst, "—")}</td>
            <td className={clsx(SUMMARY_CELL, "text-right")}>{formatAmount(summary.grandTotal.netGst, "0")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function GstSalesAndPurchaseSummaryReportPage() {
  const { pharmacies, selectedPharmacy } = usePharmacyStore();
  const { warehouses, selectedWarehouse, actingAsWarehouse } = useWarehouseStore();

  const locationOptions: DropdownOption[] = useMemo(
    () => [
      ...pharmacies.map((p) => ({ label: p.pharmacyName, value: pharmacyValue(p.pharmacyId) })),
      ...warehouses.map((w) => ({ label: warehouseLabel(w), value: warehouseValue(w.warehouseId) })),
    ],
    [pharmacies, warehouses],
  );
  // The navbar's location: what an empty selection means, as on the backend.
  const defaultLocation = actingAsWarehouse
    ? selectedWarehouse && warehouseValue(selectedWarehouse.warehouseId)
    : selectedPharmacy && pharmacyValue(selectedPharmacy.pharmacyId);
  const withDefault = (locations: string[]) =>
    locations.length ? locations : defaultLocation ? [defaultLocation] : [];
  const locationLabel = (value: string) => optionLabel(locationOptions, value);

  const [draft, setDraft] = useState<GstFilters>(defaultFilters);
  const [applied, setApplied] = useState<GstFilters>(draft);
  const [searchCount, setSearchCount] = useState(0);
  const setDraftField = <K extends keyof GstFilters>(key: K, value: GstFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const appliedLocations = withDefault(applied.locations);
  const params: FinancialReportParams = {
    fromDate: applied.fromDate || undefined,
    toDate: applied.toDate || undefined,
    pharmacyIds: idsOf(appliedLocations, "P:"),
    warehouseIds: idsOf(appliedLocations, "W:"),
    transactionType: applied.transactionType,
    gstin: applied.gstin || undefined,
    gstClassification: applied.gstClassification,
    gstPercentages: applied.gstPercentages,
  };

  // Loading is derived: until the response for this exact request lands.
  const requestKey = JSON.stringify([params, searchCount]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [report, setReport] = useState<GstSalesPurchaseSummaryResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const isLoading = loadedKey !== requestKey;

  useEffect(() => {
    let active = true;
    getGstSalesPurchaseSummary(params)
      .then((data) => {
        if (!active) return;
        setReport(data);
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch the GST sales & purchase summary:", err);
        const message = err?.message || "Failed to fetch the GST sales & purchase summary.";
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
    // requestKey is built from params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // GSTIN options follow the locations being edited, not the applied ones.
  const draftLocations = withDefault(draft.locations);
  const draftLocationKey = draftLocations.join(",");
  const [gstinOptions, setGstinOptions] = useState<DropdownOption[]>([]);
  const [gstinKey, setGstinKey] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const values = draftLocationKey ? draftLocationKey.split(",") : [];
    getGstRegistrations({ pharmacyIds: idsOf(values, "P:"), warehouseIds: idsOf(values, "W:") })
      .then((registrations) => {
        if (!active) return;
        setGstinOptions(
          registrations
            .filter((r): r is typeof r & { gstin: string } => !!r.gstin)
            .map((r) => ({ label: r.dealerName ? `${r.gstin} – ${r.dealerName}` : r.gstin, value: r.gstin })),
        );
      })
      .catch((err) => {
        // The filter just stays empty; the report itself still loads.
        console.error("Failed to fetch GSTINs:", err);
        if (active) setGstinOptions([]);
      })
      .finally(() => {
        if (active) setGstinKey(draftLocationKey);
      });
    return () => {
      active = false;
    };
  }, [draftLocationKey]);

  const search = () => {
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      showToast.error("From Date must be on or before To Date.");
      return;
    }
    setApplied(draft);
    setSearchCount((n) => n + 1);
  };

  const reset = () => {
    const filters = defaultFilters();
    setDraft(filters);
    setApplied(filters);
    setSearchCount((n) => n + 1);
  };

  const clearField = <K extends keyof GstFilters>(key: K) => {
    const empty = defaultFilters()[key];
    setDraft((prev) => ({ ...prev, [key]: empty }));
    setApplied((prev) => ({ ...prev, [key]: empty }));
  };

  const chips: AppliedFilterChip[] = [
    { key: "fromDate", label: `From Date: ${formatReportDate(applied.fromDate)}` },
    { key: "toDate", label: `To Date: ${formatReportDate(applied.toDate)}` },
    ...(appliedLocations.length
      ? [{
          key: "locations",
          label: `Pharmacy / Warehouse: ${appliedLocations.map(locationLabel).join(", ")}`,
          onRemove: applied.locations.length ? () => clearField("locations") : undefined,
        }]
      : []),
    ...(applied.transactionType !== "ALL"
      ? [{
          key: "transactionType",
          label: `Transaction Type: ${optionLabel(TRANSACTION_TYPE_OPTIONS, applied.transactionType)}`,
          onRemove: () => clearField("transactionType"),
        }]
      : []),
    ...(applied.gstin
      ? [{ key: "gstin", label: `GSTIN: ${applied.gstin}`, onRemove: () => clearField("gstin") }]
      : []),
    ...(applied.gstClassification !== "ALL"
      ? [{
          key: "gstClassification",
          label: `GST Classification: ${optionLabel(CLASSIFICATION_OPTIONS, applied.gstClassification)}`,
          onRemove: () => clearField("gstClassification"),
        }]
      : []),
    ...(applied.gstPercentages.length
      ? [{
          key: "gstPercentages",
          label: `GST %: ${applied.gstPercentages.map((r) => `${r}%`).join(", ")}`,
          onRemove: () => clearField("gstPercentages"),
        }]
      : []),
  ];

  // ---- print / download: the whole report is on screen already (not paged).
  const printId = useId();
  const [busy, setBusy] = useState<ReportAction | null>(null);
  const fileStem = `${EXPORT_KEY}_${applied.fromDate}_to_${applied.toDate}`;

  const print = () => {
    const root = document.getElementById(printId);
    if (!report || !root) return;
    printElement(root, fileStem, REPORT_PRINT_CSS);
  };

  const download = async (format: ReportExportFormat) => {
    if (busy) return;
    setBusy(format);
    try {
      await downloadReportExport(EXPORT_KEY, format, params);
    } catch (err) {
      console.error("Failed to download the report:", err);
      showToast.error((err as Error)?.message || "Failed to download the report.");
    } finally {
      setBusy(null);
    }
  };

  // ---- KPI cards: a card per figure the selected transaction type has.
  const kpi = report?.kpi;
  const sales = ledgerStats(report?.salesLedger ?? null);
  const purchases = ledgerStats(report?.purchaseLedger ?? null);
  const kpiCards = [
    kpi?.netSale != null && (
      <ReportKpiCard
        key="netSale"
        label="Net Sale"
        value={formatRupees(kpi.netSale, 0)}
        icon="/Reports/Banknotes.svg"
        tone="primary"
        highlight={`${sales.rates.length} GST ${sales.rates.length === 1 ? "rate" : "rates"}`}
        caption={listRates(sales.rates)}
      />
    ),
    kpi?.outputGst != null && (
      <ReportKpiCard
        key="outputGst"
        label="Output GST (Net Tax on Sales)"
        value={formatRupees(kpi.outputGst, 0)}
        icon="/Reports/CheckCircleSolid.svg"
        tone="success"
        highlight={formatPercent(kpi.outputGst, kpi.netSale ?? 0)}
        caption="of net sale"
      />
    ),
    kpi?.netPurchase != null && (
      <ReportKpiCard
        key="netPurchase"
        label="Net Purchase"
        value={formatRupees(kpi.netPurchase, 0)}
        icon="/Reports/CubeBlue.svg"
        tone="info"
        highlight={purchases.classes || "No purchases"}
        caption={listRates(purchases.rates)}
      />
    ),
    kpi?.inputGst != null && (
      <ReportKpiCard
        key="inputGst"
        label="Input GST (Net Tax on Purchases)"
        value={formatRupees(kpi.inputGst, 0)}
        icon="/Reports/ScaleYellow.svg"
        tone="danger"
        highlight={formatPercent(kpi.inputGst, kpi.netPurchase ?? 0)}
        caption="of net purchase"
      />
    ),
  ].filter(Boolean);

  const header = report?.header;

  return (
    <div id={printId} className="@container flex flex-col gap-4">
      <ReportHeader
        title={TITLE}
        description="A consolidated view of sales, purchases, GST amounts, returns and adjustments for a selected reporting period."
        icon="/Reports/ScalePurple.svg"
        onPrint={print}
        onDownload={download}
        busy={busy}
      />

      <ReportFilterToolbar
        dateFields={
          <>
            <DateField
              label="From Date"
              value={draft.fromDate}
              max={draft.toDate || undefined}
              onChange={(value) => setDraftField("fromDate", value)}
            />
            <DateField
              label="To Date"
              value={draft.toDate}
              min={draft.fromDate || undefined}
              onChange={(value) => setDraftField("toDate", value)}
            />
          </>
        }
        chips={chips}
        onReset={reset}
        onSearch={search}
        searching={isLoading}
        moreFilterCount={3}
        moreFilters={
          <>
            <Dropdown
              label="GSTIN"
              labelClassName="px-1"
              options={gstinOptions}
              value={draft.gstin || undefined}
              onChange={(value: string) => setDraftField("gstin", value ?? "")}
              placeholder="All GSTINs"
              isLoading={gstinKey !== draftLocationKey}
              clearable
            />
            <Dropdown
              label="GST Classification"
              labelClassName="px-1"
              options={CLASSIFICATION_OPTIONS}
              value={draft.gstClassification}
              onChange={(value: GstClassification) => setDraftField("gstClassification", value)}
            />
            <Dropdown
              label="GST %"
              labelClassName="px-1"
              options={GST_OPTIONS}
              value={draft.gstPercentages}
              onChange={(value: string[]) => setDraftField("gstPercentages", value)}
              placeholder="All rates"
              multiple
            />
          </>
        }
      >
        <Dropdown
          label="Pharmacy / Warehouse"
          labelClassName="px-1"
          options={locationOptions}
          value={draftLocations}
          onChange={(value: string[]) => setDraftField("locations", value)}
          placeholder="Select"
          searchable
          multiple
        />
        <Dropdown
          label="Transaction Type"
          labelClassName="px-1"
          options={TRANSACTION_TYPE_OPTIONS}
          value={draft.transactionType}
          onChange={(value: GstTransactionType) => setDraftField("transactionType", value)}
        />
      </ReportFilterToolbar>

      {isLoading ? (
        <ReportLoadingState kpiCount={4} />
      ) : !report || !header ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {loadError}
        </div>
      ) : (
        <>
          <div
            className={clsx(
              "grid grid-cols-1 gap-4 @xl:grid-cols-2",
              kpiCards.length > 2 && "@4xl:grid-cols-4",
            )}
          >
            {kpiCards}
          </div>

          <div className={clsx("flex w-full flex-col gap-4 rounded-2xl bg-white p-4", CARD_SHADOW)}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-label-l5 font-semibold text-pneutral-900">GST Sales &amp; Purchase Summary</h2>
                {header.registrations.map((registration, i) => (
                  <Fragment key={registration.gstin ?? `no-gstin-${i}`}>
                    <p className="text-p3 text-pneutral-500">GSTIN: {registration.gstin ?? "—"}</p>
                    <p className="text-p3 text-pneutral-500">Dealer Name: {registration.dealerName ?? "—"}</p>
                    <p className="text-p3 text-pneutral-500">Address: {registration.address ?? "—"}</p>
                  </Fragment>
                ))}
                <p className="text-p3 text-pneutral-500">Report Name: {header.reportName}</p>
                <p className="text-p3 text-pneutral-500">
                  Reporting Period: {formatReportDate(header.fromDate)} to {formatReportDate(header.toDate)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right text-p3 text-pneutral-500">
                <p>Generated on: {formatGeneratedOn(report.generatedOn)}</p>
                <p>Generated by: {report.generatedBy}</p>
              </div>
            </div>

            {report.salesLedger && (
              <>
                <h3 className="text-label-l4 font-semibold text-pneutral-900">Sales Ledger</h3>
                <LedgerTable
                  ledger={report.salesLedger}
                  headers={["Sales Ledger", "Net Sale", "Net Tax", "Sale Amount", "Tax Amount", "CR/DR Note", "Tax Return", "Tax Refund"]}
                />
              </>
            )}

            {report.purchaseLedger && (
              <>
                <h3 className="text-label-l4 font-semibold text-pneutral-900">Purchase Ledger</h3>
                <LedgerTable
                  ledger={report.purchaseLedger}
                  headers={["Purchase Ledger", "Net Purchase", "Net Tax", "Purchase Amount", "Tax Amount", "DR/CR Note", "Tax Return", "Tax Refund"]}
                />
              </>
            )}

            {report.gstSummary && (
              <>
                <h3 className="text-label-l4 font-semibold text-pneutral-900">GST Summary</h3>
                <GstSummaryTable summary={report.gstSummary} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
