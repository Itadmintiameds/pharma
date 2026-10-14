"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Button from "@/app/components/common/Button";
import { ProductService } from "@/services/ProductService";
import { getStockAdjustmentById } from "@/services/StockAdjustmentService";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { StockAdjustmentData } from "@/types/StockAdjustmentData";
import {
  AdjustableBatch,
  BatchApiRow,
  CARD_SHADOW,
  FOOTER_BUTTON,
  formatAdjustedAt,
  formatQtyWithUnit,
  formatRupees,
  formatSigned,
  formatSignedRupees,
  signedTextClass,
  singularUnit,
  toAdjustableBatch,
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
  stockAdjustmentId: number;
  onBack: () => void;
}

/** View Stock Adjustment — Figma node 4191:43511. */
const StockAdjustmentView = ({ stockAdjustmentId, onBack }: StockAdjustmentViewProps) => {
  const { selectedPharmacy, pharmacies } = usePharmacyStore();
  const location =
    selectedPharmacy?.pharmacyName?.trim() || pharmacies[0]?.pharmacyName?.trim() || "—";

  const [adjustment, setAdjustment] = useState<StockAdjustmentData | null>(null);
  // Brand, expiry, purchase unit, pack size and price aren't on the adjustment
  // itself, so they come from the batch. Null if that lookup fails.
  const [batch, setBatch] = useState<AdjustableBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getStockAdjustmentById(stockAdjustmentId);
        if (!active) return;
        setAdjustment(data);

        try {
          const res = await ProductService.getBatchById(data.batchId);
          if (active) setBatch(toAdjustableBatch((res?.data ?? {}) as BatchApiRow));
        } catch (err) {
          console.error("Failed to fetch the adjusted batch:", err);
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to fetch the stock adjustment:", err);
        setLoadError(
          err instanceof Error ? err.message : "Failed to fetch the stock adjustment."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [stockAdjustmentId]);

  const backButton = (
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
  );

  if (isLoading || !adjustment) {
    return (
      <div className="flex flex-col gap-md">
        <p className="text-h5 font-semibold text-pneutral-900">View Stock Adjustment</p>
        <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-label-l4 text-pneutral-500">
          {isLoading ? "Loading stock adjustment..." : loadError || "Stock adjustment not found."}
        </div>
        {backButton}
      </div>
    );
  }

  // The backend stores quantities in smallest units; show them in purchase units
  // when the batch's pack size is known.
  const unitContains = batch?.unitContains ?? 1;
  const unit = batch?.purchaseUnit ?? "";
  const toPurchaseUnits = (value: number) => Number((value / unitContains).toFixed(2));

  const isDecrease = adjustment.adjustmentType === "DECREASE";
  const stockAfter = toPurchaseUnits(adjustment.actualStockQty ?? 0);
  const qty = (isDecrease ? -1 : 1) * toPurchaseUnits(Math.abs(adjustment.adjustmentQty ?? 0));
  const stockBefore = Number((stockAfter - qty).toFixed(2));

  const price = batch?.purchasePrice ?? 0;
  const currentValue = stockBefore * price;
  // Saved signed (negative for DECREASE); fall back to the batch price if missing
  const adjustmentValue = adjustment.adjustmentValue ?? qty * price;

  return (
    <div className="flex flex-col gap-md">
      {/* SA View Header Row */}
      <p className="text-h5 font-semibold text-pneutral-900">View Stock Adjustment</p>

      {/* Transaction Information Card */}
      <Card title="Transaction Information">
        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:flex lg:items-start">
          <Detail label="Stock Adjustment No.">
            <p className="wrap-break-word text-label-l4 font-semibold text-primary-800">
              {adjustment.stockAdjustmentNo ?? "—"}
            </p>
          </Detail>
          <Detail label="Adjustment Date & Time">
            {formatAdjustedAt(adjustment.stockAdjustmentDate)}
          </Detail>
          <Detail label="Location">{location}</Detail>
          <Detail label="Status">
            {/* Figma "Badge" — green, small. Adjustments are applied on create. */}
            <span className="rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-center text-label-l3 font-medium text-success-800">
              Completed
            </span>
          </Detail>
        </div>
      </Card>

      {/* Product Batch Details Card */}
      <Card title="Product & Batch Details">
        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <Detail label="Product Name">{adjustment.productName ?? "—"}</Detail>
          <Detail label="Batch No.">{adjustment.batchNumber ?? "—"}</Detail>
          <Detail label="Brand Name">{batch?.brandName ?? "—"}</Detail>
          <Detail label="Expiry Date">{batch?.expiry ?? "—"}</Detail>
          <Detail label="Purchase Unit">{unit || "—"}</Detail>
        </div>
      </Card>

      {/* SA Review Calculation Row */}
      <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
        <Card title="Quantity Adjustment" className="lg:flex-1">
          <SummaryRow
            label="System Stock Before Adjustment"
            value={formatQtyWithUnit(stockBefore, unit)}
          />
          <SummaryRow label="Stock After Adjustment" value={formatQtyWithUnit(stockAfter, unit)} />
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
                isDecrease ? "bg-warning-50 text-warning-600" : "bg-success-50 text-success-800"
              }`}
            >
              {isDecrease ? "Decrease" : "Increase"}
            </span>
          </div>
        </Card>

        <Card title="Stock Value Impact" className="lg:flex-1">
          <SummaryRow
            label="Purchase Price"
            value={
              batch
                ? `${formatRupees(price)}${unit ? ` / ${singularUnit(unit)}` : ""}`
                : "—"
            }
          />
          <SummaryRow
            label="Stock Value Before Adjustment"
            value={batch ? formatRupees(currentValue) : "—"}
          />
          <SummaryRow
            label="Adjustment Value"
            value={formatSignedRupees(adjustmentValue)}
            valueClassName={signedTextClass(adjustmentValue)}
          />
          <div className="h-px w-full bg-pneutral-200" />
          <div className="flex w-full items-center gap-sm font-semibold text-pneutral-900">
            <p className="min-w-0 flex-1 text-label-l4">Stock Value After Adjustment</p>
            <p className="shrink-0 whitespace-nowrap text-label-l5">
              {batch ? formatRupees(currentValue + adjustmentValue) : "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Reason And Remarks Card */}
      <Card title="Reason & Remarks">
        <div className="flex w-full flex-col gap-md sm:flex-row sm:items-start">
          <div className="sm:w-75 sm:shrink-0">
            <Detail label="Reason">{adjustment.stockAdjustmentReason || "—"}</Detail>
          </div>
          <Detail label="Remarks">{adjustment.stockAdjustmentRemarks || "—"}</Detail>
        </div>
      </Card>

      {/* SA View Footer Row */}
      {backButton}
    </div>
  );
};

export default StockAdjustmentView;
