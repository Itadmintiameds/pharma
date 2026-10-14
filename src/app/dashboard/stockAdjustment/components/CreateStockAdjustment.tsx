"use client";

import { useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, ArrowRight, CircleAlert, Info, Search } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { ProductService } from "@/services/ProductService";
import { usePharmacyStore } from "@/store/pharmacyStore";
import StepIndicator from "./StepIndicator";
import {
  AdjustableBatch,
  CARD_SHADOW,
  FOOTER_BUTTON,
  OTHER_REASON,
  REASON_OPTIONS,
  StockAdjustmentDraft,
  BatchApiRow,
  adjustmentQty,
  adjustmentType,
  formatQtyWithUnit,
  formatRupees,
  formatSigned,
  formatSignedRupees,
  signedTextClass,
  singularUnit,
  toAdjustableBatch,
} from "./stockAdjustmentDraft";

const buildBatchColumns = (
  onSelect: (batch: AdjustableBatch) => void
): ColumnDef<AdjustableBatch>[] => [
  {
    accessorKey: "productName",
    header: "PRODUCT NAME",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">{row.original.productName}</span>
    ),
  },
  {
    accessorKey: "batchNo",
    header: "BATCH NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">{row.original.batchNo}</span>
    ),
  },
  {
    accessorKey: "brandName",
    header: "BRAND NAME",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">{row.original.brandName}</span>
    ),
  },
  {
    accessorKey: "expiry",
    header: "EXPIRY DATE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">{row.original.expiry}</span>
    ),
  },
  {
    accessorKey: "currentStock",
    header: "CURRENT STOCK",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">{row.original.currentStock}</span>
    ),
  },
  {
    accessorKey: "purchaseUnit",
    header: "PURCHASE UNIT",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.purchaseUnit || "—"}
      </span>
    ),
  },
  {
    id: "action",
    header: "ACTION",
    cell: ({ row }) => (
      <Button
        type="button"
        variant="outline"
        onClick={() => onSelect(row.original)}
        aria-label={`Select ${row.original.productName} batch ${row.original.batchNo}`}
        className="h-9! min-w-27 w-29.75! rounded-lg! border-[1.5px]! border-secondary-700! px-sm text-label-l3! font-medium! text-secondary-700!"
      >
        Select
      </Button>
    ),
  },
];

// Figma ".Input-Size" field: 16/24 label sitting 4px in, 8px corners on the control
const FIELD_LABEL = "mb-0! px-xxsm";
const FIELD = "rounded-lg!";

/** White card with an 18px title — every section of the create screen. */
const SectionCard = ({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW} ${className}`}>
    <p className="text-label-l5 font-semibold text-pneutral-900">{title}</p>
    {children}
  </div>
);

/** Grey caption on the left, bold value on the right — Stock Value Impact rows. */
const ImpactRow = ({
  label,
  value,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex w-full items-center gap-sm">
    <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">{label}</p>
    <p className={`shrink-0 whitespace-nowrap text-label-l4 font-semibold ${valueClassName}`}>
      {value}
    </p>
  </div>
);

/** Figma "Input error message" — red 14/20 text with a trailing alert icon. */
const FieldError = ({ message }: { message: string }) => (
  <p className="flex items-center gap-xxsm px-xxsm text-label-l3 font-regular text-warning-500">
    {message}
    <CircleAlert size={14} className="shrink-0" />
  </p>
);

const ERROR_FIELD = "border-warning-500! focus-within:ring-warning-500!";

interface CreateStockAdjustmentProps {
  /** Set when coming back from Review — the earlier entries are put back. */
  initialDraft: StockAdjustmentDraft | null;
  onCancel: () => void;
  onReview: (draft: StockAdjustmentDraft) => void;
}

const CreateStockAdjustment = ({ initialDraft, onCancel, onReview }: CreateStockAdjustmentProps) => {
  const { selectedPharmacy, pharmacies } = usePharmacyStore();
  const location =
    selectedPharmacy?.pharmacyName?.trim() || pharmacies[0]?.pharmacyName?.trim() || "—";

  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState("");
  // Bumped on every search so a slower, older response can't overwrite a newer one
  const searchIdRef = useRef(0);

  const [batchQuery, setBatchQuery] = useState(initialDraft?.batch.batchNo ?? "");
  // null until the first search; then the batches that matched it
  const [matches, setMatches] = useState<AdjustableBatch[] | null>(null);
  const [selected, setSelected] = useState<AdjustableBatch | null>(initialDraft?.batch ?? null);
  const [actualStock, setActualStock] = useState(
    initialDraft ? String(initialDraft.actualStock) : ""
  );
  const [reason, setReason] = useState(initialDraft?.reason ?? "");
  const [remarks, setRemarks] = useState(initialDraft?.remarks ?? "");
  // Remarks only shows its error once the user has left it empty
  const [remarksTouched, setRemarksTouched] = useState(false);

  // The backend matches the batch no. (partial, case-insensitive) at the current location
  const searchBatches = async () => {
    const query = batchQuery.trim();
    if (!query) return;

    const searchId = ++searchIdRef.current;
    // A new search starts the adjustment over
    setSelected(null);
    setActualStock("");
    setReason("");
    setRemarks("");
    setRemarksTouched(false);
    setIsSearching(true);
    setLoadError("");

    try {
      const res = await ProductService.searchBatchesByBatchNumber(query);
      if (searchId !== searchIdRef.current) return;
      const seen = new Set<string>();
      setMatches(
        ((res?.data || []) as BatchApiRow[])
          .map(toAdjustableBatch)
          .filter((batch): batch is AdjustableBatch => {
            if (!batch || seen.has(batch.id)) return false;
            seen.add(batch.id);
            return true;
          })
      );
    } catch (err) {
      if (searchId !== searchIdRef.current) return;
      console.error("Failed to fetch pharmacy batches:", err);
      setLoadError("Could not load inventory batches.");
      setMatches(null);
    } finally {
      if (searchId === searchIdRef.current) setIsSearching(false);
    }
  };

  const selectBatch = (batch: AdjustableBatch) => {
    setSelected(batch);
    setActualStock("");
  };

  const isNegative = Number(actualStock) < 0;
  const hasActual =
    actualStock.trim() !== "" && !Number.isNaN(Number(actualStock)) && !isNegative;
  const remarksRequired = reason === OTHER_REASON;
  const remarksError =
    remarksRequired && remarksTouched && !remarks.trim()
      ? "Remarks is mandatory when Reason = Other."
      : "";
  const qty = selected && hasActual ? adjustmentQty({ batch: selected, actualStock: Number(actualStock) }) : 0;
  const noAdjustmentNeeded = Boolean(selected) && hasActual && qty === 0;
  const canReview = Boolean(selected) && hasActual && qty !== 0 && reason !== "" && (!remarksRequired || remarks.trim() !== "");

  // Tints the read-only adjustment fields red for a decrease, green for an increase
  const signedInputClass =
    qty < 0 ? "[&_input]:text-warning-600" : qty > 0 ? "[&_input]:text-success-800" : "";

  const unit = selected?.purchaseUnit ?? "";
  const price = selected?.purchasePrice ?? 0;
  const currentValue = (selected?.currentStock ?? 0) * price;
  const adjustmentValue = qty * price;

  const openReview = () => {
    if (!selected || !canReview) return;
    onReview({
      location,
      batch: selected,
      actualStock: Number(actualStock),
      reason,
      remarks: remarks.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-md">
      {/* SA Create Header Row — Figma node 4191:43237 */}
      <div className="flex flex-col gap-md lg:flex-row lg:items-center">
        <p className="min-w-0 flex-1 text-h5 font-semibold text-pneutral-900">
          Create Stock Adjustment
        </p>
        <StepIndicator currentStep={1} />
      </div>

      {/* Find Batch Card — Figma node 4191:43241 */}
      <SectionCard title="Find Batch">
        <div className="flex w-full flex-col gap-sm md:flex-row md:items-end">
          <Input
            label="Current Location"
            value={location}
            readOnly
            labelClassName={FIELD_LABEL}
            className={FIELD}
            containerClassName="md:w-70 md:shrink-0"
          />
          <Input
            label="Batch No."
            required
            value={batchQuery}
            placeholder="Enter batch no."
            onChange={(e) => setBatchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") searchBatches();
            }}
            labelClassName={FIELD_LABEL}
            className={FIELD}
            containerClassName="min-w-0 md:flex-1"
          />
          <Button
            type="button"
            variant="primary"
            onClick={searchBatches}
            loading={isSearching}
            disabled={!batchQuery.trim()}
            className={`${FOOTER_BUTTON} w-full! bg-pneutral-900! text-pneutral-50! md:w-35.25!`}
          >
            <Search size={20} className="shrink-0" />
            Search
          </Button>
        </div>
        {loadError && <p className="text-p2 text-warning-500">{loadError}</p>}
      </SectionCard>

      {/* Matching Batches Card — Figma node 4191:43247; no-match state 4191:44257 */}
      {!selected && matches !== null && (
        <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}>
          {matches.length === 0 ? (
            <div className="flex w-full flex-col items-center justify-center gap-sm py-hg">
              <div className="flex size-18 shrink-0 items-center justify-center rounded-full bg-primary-100">
                <Search size={32} strokeWidth={1.5} className="text-primary-800" />
              </div>
              <p className="text-center text-label-l5 font-semibold text-pneutral-900">
                No matching Batch found.
              </p>
            </div>
          ) : (
            <>
              <p className="text-label-l5 font-semibold text-pneutral-900">
                Matching Batches ({matches.length})
              </p>
              {/* Shared grid DataTable with Figma's sizing applied from outside:
                  60px header, 68px rows, 12px side padding, 8px corners. */}
              <div className="w-full [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-15 [&_th]:border-pneutral-200 [&_th]:px-sm [&_th]:py-xsm [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_tbody_tr]:h-17 [&_td]:px-sm [&_td]:py-xsm [&_td]:wrap-break-word">
                <DataTable columns={buildBatchColumns(selectBatch)} data={matches} />
              </div>
            </>
          )}
        </div>
      )}

      {selected && (
        <>
          {/* Selected Batch Card — Figma node 4191:44346 */}
          <SectionCard title="Selected Product + Batch">
            <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Product Name", value: selected.productName },
                { label: "Batch No.", value: selected.batchNo },
                { label: "Brand Name", value: selected.brandName },
                { label: "Expiry Date", value: selected.expiry },
                { label: "Purchase Unit", value: selected.purchaseUnit || "—" },
              ].map(({ label, value }) => (
                <Input
                  key={label}
                  label={label}
                  value={value}
                  readOnly
                  labelClassName={FIELD_LABEL}
                  className={FIELD}
                />
              ))}
            </div>
          </SectionCard>

          {/* SA Calculation Row — Figma node 4191:44354 */}
          <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
            {/* Stock Count Card */}
            <SectionCard title="Stock Count" className="lg:flex-1">
              <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2">
                <Input
                  label="Current System Stock"
                  value={formatQtyWithUnit(selected.currentStock, unit)}
                  readOnly
                  labelClassName={FIELD_LABEL}
                  className={FIELD}
                />
                {/* Text input so a typed minus sign reaches the field and can be
                    flagged — Figma error state 4191:44729 */}
                <div className="flex flex-col">
                  <Input
                    label="Actual Stock Quantity"
                    required
                    inputMode="decimal"
                    value={actualStock}
                    placeholder="Enter counted quantity"
                    onChange={(e) => {
                      if (/^-?\d*\.?\d*$/.test(e.target.value)) setActualStock(e.target.value);
                    }}
                    aria-invalid={isNegative}
                    labelClassName={FIELD_LABEL}
                    className={`${FIELD} ${isNegative ? ERROR_FIELD : ""}`}
                  />
                  {isNegative && <FieldError message="Cannot be negative." />}
                </div>
                <Input
                  label="Adjustment Quantity"
                  value={hasActual ? (qty === 0 ? "0" : formatSigned(qty, String)) : ""}
                  readOnly
                  labelClassName={FIELD_LABEL}
                  className={`${FIELD} ${signedInputClass}`}
                />
                <Input
                  label="Adjustment Type"
                  value={hasActual ? adjustmentType(qty) : ""}
                  readOnly
                  labelClassName={FIELD_LABEL}
                  className={`${FIELD} ${signedInputClass}`}
                />
              </div>
            </SectionCard>

            {/* Stock Value Impact Card */}
            <SectionCard title="Stock Value Impact" className="lg:flex-1">
              <ImpactRow
                label="Purchase Price"
                value={`${formatRupees(price)}${unit ? ` / ${singularUnit(unit)}` : ""}`}
              />
              <ImpactRow label="Current Stock Value" value={formatRupees(currentValue)} />
              <ImpactRow
                label="Adjustment Value"
                value={qty === 0 ? formatRupees(0) : formatSignedRupees(adjustmentValue)}
                valueClassName={qty === 0 ? "text-pneutral-900" : signedTextClass(qty)}
              />
              <div className="h-px w-full bg-pneutral-200" />
              <div className="flex w-full items-center gap-sm font-semibold text-pneutral-900">
                <p className="min-w-0 flex-1 text-label-l4">Stock Value After Adjustment</p>
                <p className="shrink-0 whitespace-nowrap text-label-l5">
                  {formatRupees(currentValue + adjustmentValue)}
                </p>
              </div>
            </SectionCard>
          </div>

          {/* No Adjustment Required Banner — Figma node 4191:44622 */}
          {noAdjustmentNeeded && (
            <div className="flex w-full items-center gap-sm rounded-2xl bg-info-50 p-md">
              <Info size={24} strokeWidth={1.5} className="shrink-0 text-info-500" />
              <p className="min-w-0 flex-1 text-label-l4 font-semibold text-info-500">
                No adjustment is required because Actual Stock equals System Stock.
              </p>
            </div>
          )}

          {/* Reason And Remarks Card — Figma node 4191:44378 */}
          <SectionCard title="Reason & Remarks">
            <div className="flex w-full flex-col gap-md md:flex-row md:items-start">
              <div className="w-full md:w-90 md:shrink-0">
                <Dropdown
                  label="Reason"
                  required
                  options={REASON_OPTIONS}
                  value={reason}
                  onChange={(value) => setReason(String(value))}
                  placeholder="Select reason"
                />
              </div>
              {/* Remarks Textarea — Figma node 4191:44504 */}
              <label className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-xxsm px-xxsm text-label-l4 font-medium text-pneutral-800">
                  Remarks
                  {remarksRequired && (
                    <span className="text-label-l2 font-semibold text-warning-500">*</span>
                  )}
                </span>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  onBlur={() => setRemarksTouched(true)}
                  required={remarksRequired}
                  aria-invalid={Boolean(remarksError)}
                  placeholder="Enter remarks"
                  className={`min-h-25 w-full resize-y rounded-lg border bg-white p-sm text-p4 font-regular text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:ring-1 ${
                    remarksError
                      ? "border-warning-500 focus:ring-warning-500"
                      : "border-pneutral-300 focus:border-secondary-300 focus:ring-secondary-300"
                  }`}
                />
                {remarksError && <FieldError message={remarksError} />}
              </label>
            </div>
          </SectionCard>
        </>
      )}

      {/* SA Create Footer Row — Figma node 4191:43299 (disabled state 4191:44261) */}
      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className={`${FOOTER_BUTTON} w-full! border-0! bg-transparent! text-primary-800! sm:w-35.25!`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back
        </Button>

        <div className="hidden flex-1 sm:block" />

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className={`${FOOTER_BUTTON} w-full! border-2! border-secondary-700! text-secondary-700! sm:w-35.25!`}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={openReview}
          disabled={!canReview}
          title={
            canReview
              ? undefined
              : "Select a batch, enter an actual stock that differs from system stock, and pick a reason (with remarks for Other)"
          }
          className={`${FOOTER_BUTTON} w-full! bg-primary-800! text-pneutral-50! disabled:bg-primary-200! disabled:text-sneutral-300! disabled:opacity-100! sm:w-57.75!`}
        >
          Review Adjustment
          <ArrowRight size={20} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
};

export default CreateStockAdjustment;
