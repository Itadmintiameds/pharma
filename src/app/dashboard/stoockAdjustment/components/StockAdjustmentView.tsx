"use client";

import { ArrowLeft } from "lucide-react";
import Button from "@/app/components/common/Button";
import {
  CARD_SHADOW,
  FOOTER_BUTTON,
  StockAdjustmentRecord,
  adjustmentQty,
  adjustmentType,
  formatQtyWithUnit,
  formatRupees,
  formatSigned,
  formatSignedRupees,
  signedTextClass,
  singularUnit,
} from "./stockAdjustmentDraft";

/** White card with an 18px title. */
const Card = ({
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

/** Grey caption over its value. */
const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    {typeof children === "string" ? (
      <p className="wrap-break-word text-label-l4 font-semibold text-pneutral-900">{children}</p>
    ) : (
      children
    )}
  </div>
);

/** Grey caption on the left, bold value on the right. */
const SummaryRow = ({
  label,
  value,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) => (
  <div className="flex w-full items-center gap-sm">
    <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">{label}</p>
    <p className={`shrink-0 whitespace-nowrap text-label-l4 font-semibold ${valueClassName}`}>
      {value}
    </p>
  </div>
);

interface StockAdjustmentViewProps {
  record: StockAdjustmentRecord;
  onBack: () => void;
}

/** View Stock Adjustment — Figma node 4191:43511. */
const StockAdjustmentView = ({ record, onBack }: StockAdjustmentViewProps) => {
  const { batch, actualStock } = record;
  const unit = batch.purchaseUnit;
  const qty = adjustmentQty(record);
  const currentValue = batch.currentStock * batch.purchasePrice;
  const adjustmentValue = qty * batch.purchasePrice;

  return (
    <div className="flex flex-col gap-md">
      {/* SA View Header Row */}
      <p className="text-h5 font-semibold text-pneutral-900">View Stock Adjustment</p>

      {/* Transaction Information Card */}
      <Card title="Transaction Information">
        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:flex lg:items-start">
          <Detail label="Stock Adjustment No.">
            <p className="wrap-break-word text-label-l4 font-semibold text-primary-800">
              {record.adjustmentNo}
            </p>
          </Detail>
          <Detail label="Adjustment Date & Time">{record.adjustedAt}</Detail>
          <Detail label="Location">{record.location}</Detail>
          <Detail label="Status">
            {/* Figma "Badge" — green, small */}
            <span className="rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-center text-label-l3 font-medium text-success-800">
              {record.status}
            </span>
          </Detail>
        </div>
      </Card>

      {/* Product Batch Details Card */}
      <Card title="Product & Batch Details">
        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <Detail label="Product Name">{batch.productName}</Detail>
          <Detail label="Batch No.">{batch.batchNo}</Detail>
          <Detail label="Brand Name">{batch.brandName}</Detail>
          <Detail label="Expiry Date">{batch.expiry}</Detail>
          <Detail label="Purchase Unit">{unit || "—"}</Detail>
        </div>
      </Card>

      {/* SA Review Calculation Row */}
      <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
        <Card title="Quantity Adjustment" className="lg:flex-1">
          <SummaryRow
            label="System Stock Before Adjustment"
            value={formatQtyWithUnit(batch.currentStock, unit)}
          />
          <SummaryRow label="Stock After Adjustment" value={formatQtyWithUnit(actualStock, unit)} />
          <SummaryRow
            label="Adjustment Quantity"
            value={formatSigned(qty, String)}
            valueClassName={signedTextClass(qty)}
          />
          <div className="flex w-full items-center gap-sm">
            <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">Adjustment Type</p>
            {/* Figma "Adjustment Type Tag" — red Decrease (4191:43562), green Increase (4191:43709) */}
            <span
              className={`shrink-0 whitespace-nowrap rounded-lg px-xsm py-xxsm text-p4 font-medium ${
                qty < 0 ? "bg-warning-50 text-warning-600" : "bg-success-50 text-success-800"
              }`}
            >
              {adjustmentType(qty)}
            </span>
          </div>
        </Card>

        <Card title="Stock Value Impact" className="lg:flex-1">
          <SummaryRow
            label="Purchase Price"
            value={`${formatRupees(batch.purchasePrice)}${unit ? ` / ${singularUnit(unit)}` : ""}`}
          />
          <SummaryRow label="Stock Value Before Adjustment" value={formatRupees(currentValue)} />
          <SummaryRow
            label="Adjustment Value"
            value={formatSignedRupees(adjustmentValue)}
            valueClassName={signedTextClass(qty)}
          />
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
            <Detail label="Reason">{record.reason}</Detail>
          </div>
          <Detail label="Remarks">{record.remarks || "—"}</Detail>
        </div>
      </Card>

      {/* SA View Footer Row */}
      <div className="flex w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className={`${FOOTER_BUTTON} w-full! border-2! border-secondary-700! text-secondary-700! sm:w-71.25!`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back to Stock Adjustment
        </Button>
      </div>
    </div>
  );
};

export default StockAdjustmentView;
