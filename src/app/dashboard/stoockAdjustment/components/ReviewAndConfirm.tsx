"use client";

import { ArrowLeft, Check } from "lucide-react";
import Button from "@/app/components/common/Button";
import StepIndicator from "./StepIndicator";
import {
  CARD_SHADOW,
  FOOTER_BUTTON,
  StockAdjustmentDraft,
  adjustmentQty,
  adjustmentType,
  formatQtyWithUnit,
  formatRupees,
  formatSigned,
  formatSignedRupees,
  signedTextClass,
  singularUnit,
} from "./stockAdjustmentDraft";

/** Grey caption over its bold value — the read-only detail cells. */
const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="wrap-break-word text-label-l4 font-semibold text-pneutral-900">{value}</p>
  </div>
);

/** Grey caption on the left, value on the right — the calculation rows. */
const SummaryRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex w-full items-center gap-sm">
    <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">{label}</p>
    {children}
  </div>
);

const SummaryValue = ({
  children,
  className = "text-pneutral-900",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p className={`shrink-0 whitespace-nowrap text-label-l4 font-semibold ${className}`}>
    {children}
  </p>
);

const Card = ({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) => (
  <div className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW} ${className}`}>
    <p className="text-label-l5 font-semibold text-pneutral-900">{title}</p>
    {children}
  </div>
);

interface ReviewAndConfirmProps {
  draft: StockAdjustmentDraft;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

/** SA Review screen — Figma node 4191:43373. */
const ReviewAndConfirm = ({ draft, onBack, onConfirm, isSubmitting = false }: ReviewAndConfirmProps) => {
  const { batch, actualStock, reason, remarks, location } = draft;
  const unit = batch.purchaseUnit;
  const qty = adjustmentQty(draft);
  const currentValue = batch.currentStock * batch.purchasePrice;
  const adjustmentValue = qty * batch.purchasePrice;
  const isDecrease = qty < 0;

  return (
    <div className="flex flex-col gap-md">
      {/* SA Review Header Row */}
      <div className="flex flex-col gap-md lg:flex-row lg:items-center">
        <p className="min-w-0 flex-1 text-h5 font-semibold text-pneutral-900">
          Review &amp; Confirm Stock Adjustment
        </p>
        <StepIndicator currentStep={2} />
      </div>

      {/* Product Batch Details Card */}
      <Card title="Product & Batch Details">
        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <Detail label="Product Name" value={batch.productName} />
          <Detail label="Batch No." value={batch.batchNo} />
          <Detail label="Brand Name" value={batch.brandName} />
          <Detail label="Expiry Date" value={batch.expiry} />
          <Detail label="Purchase Unit" value={unit || "—"} />
          <Detail label="Current Location" value={location} />
        </div>
      </Card>

      {/* SA Review Calculation Row */}
      <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
        <Card title="Quantity Adjustment" className="lg:flex-1">
          <SummaryRow label="System Stock Before Adjustment">
            <SummaryValue>{formatQtyWithUnit(batch.currentStock, unit)}</SummaryValue>
          </SummaryRow>
          <SummaryRow label="Actual Stock">
            <SummaryValue>{formatQtyWithUnit(actualStock, unit)}</SummaryValue>
          </SummaryRow>
          <SummaryRow label="Adjustment Quantity">
            <SummaryValue className={signedTextClass(qty)}>{formatSigned(qty, String)}</SummaryValue>
          </SummaryRow>
          <SummaryRow label="Adjustment Type">
            {/* Figma "Tag" */}
            <span
              className={`shrink-0 whitespace-nowrap rounded-lg px-xsm py-xxsm text-p4 font-medium ${
                isDecrease ? "bg-warning-50 text-warning-600" : "bg-success-50 text-success-800"
              }`}
            >
              {adjustmentType(qty)}
            </span>
          </SummaryRow>
        </Card>

        <Card title="Stock Value Impact" className="lg:flex-1">
          <SummaryRow label="Purchase Price">
            <SummaryValue>
              {formatRupees(batch.purchasePrice)}
              {unit ? ` / ${singularUnit(unit)}` : ""}
            </SummaryValue>
          </SummaryRow>
          <SummaryRow label="Current Stock Value">
            <SummaryValue>{formatRupees(currentValue)}</SummaryValue>
          </SummaryRow>
          <SummaryRow label="Adjustment Value">
            <SummaryValue className={signedTextClass(qty)}>
              {formatSignedRupees(adjustmentValue)}
            </SummaryValue>
          </SummaryRow>
          <div className="h-px w-full bg-pneutral-200" />
          <div className="flex w-full items-center gap-sm font-semibold text-pneutral-900">
            <p className="min-w-0 flex-1 text-label-l4">Stock Value After Adjustment</p>
            <p className="shrink-0 whitespace-nowrap text-label-l5">
              {formatRupees(currentValue + adjustmentValue)}
            </p>
          </div>
        </Card>
      </div>

      {/* Reason And Remarks Card */}
      <Card title="Reason & Remarks">
        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <div className="sm:w-75 sm:shrink-0">
            <Detail label="Reason" value={reason} />
          </div>
          <Detail label="Remarks" value={remarks || "—"} />
        </div>
      </Card>

      {/* SA Review Footer Row */}
      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className={`${FOOTER_BUTTON} w-full! border-0! bg-transparent! text-primary-800! sm:w-35.25!`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          loading={isSubmitting}
          className={`${FOOTER_BUTTON} w-full! bg-primary-800! text-pneutral-50! sm:w-59.75!`}
        >
          Confirm Adjustment
          <Check size={20} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
};

export default ReviewAndConfirm;
