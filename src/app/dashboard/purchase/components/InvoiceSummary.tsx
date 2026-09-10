"use client";

import React, { useEffect, useMemo, useState } from "react";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import ConfirmationPopup from "@/app/components/common/ConfirmationPopup";
import ConfirmDialog from "@/app/components/common/ConfirmDialog";
import { usePurchaseStore } from "@/store/usePurchaseStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PurchaseData } from "@/types/PurchaseData";
import {
  getCurrentBillTo,
  type CurrentPharmacy,
} from "@/services/PharmacyService";
// Shared with the bill, so both invoices spell an amount the same way.
import { amountInWords } from "@/utils/billingTotals";
// One costing for the screen and the payload, so what is shown is what is saved.
import { calculatePurchaseTotals } from "@/utils/purchaseTotals";
import { parseGstPercentage, isGstExempted } from "@/utils/gst";

/**
 * One 24px-tall key : value line. The key column is fixed so every value in a
 * card starts on the same x, and the colon sits in its own 5px slot.
 */
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="w-full h-6 flex items-center gap-3 text-[16px] leading-6">
    <span className="w-[130px] shrink-0 truncate font-normal text-pneutral-800" title={label}>{label}</span>
    <span className="w-[5px] shrink-0 font-normal text-pneutral-800">:</span>
    <span className="flex-1 truncate font-medium text-pneutral-900">{value}</span>
  </div>
);

/** One 32px total line in the payable card. */
const TotalRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="w-full h-8 py-1 flex items-center justify-between">
    <span className="h-6 text-[16px] leading-6 font-normal text-pneutral-800">{label}</span>
    <span className="h-6 text-[16px] leading-6 font-semibold text-pneutral-900">{value}</span>
  </div>
);

interface InvoiceSummaryProps {
  onCancel?: () => void;
  onSubmit?: (discount: number) => Promise<boolean | void> | boolean | void;
  onSuccessGoToPurchase?: () => void;
  mode?: 'create' | 'view' | 'download';
  data?: any; // Pre-built table rows; wins over anything derived here.
  /**
   * A purchase already saved on the server. When given, the header and totals
   * come from it instead of the in-progress purchase store, so the same layout
   * renders for view / download from the purchase list.
   */
  purchase?: PurchaseData;
  /**
   * The "Bill To" pharmacy. When provided (e.g. pre-fetched for a PDF
   * download so it's present before capture), the component skips its own
   * fetch; otherwise it loads it on mount.
   */
  pharmacy?: CurrentPharmacy | null;
}

const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({ onCancel, onSubmit, onSuccessGoToPurchase, mode = 'create', data, purchase, pharmacy: pharmacyProp }) => {
  const [currentMode, setCurrentMode] = useState<'create' | 'view' | 'download'>(mode);
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Shown instead of saving outright when the entered Invoice Amount doesn't
  // match what the lines actually total to — the mismatch may be a typo on
  // either side, so it's a confirm rather than a hard block.
  const [showAmountMismatch, setShowAmountMismatch] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [discountError, setDiscountError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const store = usePurchaseStore();
  const router = useRouter();

  // A saved purchase is read-only: its own stored totals and discount win.
  const isSaved = !!purchase;

  // While the purchase is unsaved, every figure is costed from the lines at the
  // discount currently typed — the discount reaches each line as a share of its
  // gross, so GST is charged on the discounted value rather than the full one.
  // Recomputed here (not read off the store) because the discount arrives after
  // the lines were added.
  const live = useMemo(
    () => calculatePurchaseTotals(store.purchaseDetails, discount),
    [store.purchaseDetails, discount],
  );

  const grossAmt = isSaved
    ? Number(purchase?.totalGrossAmount || 0)
    : live.grossAmount;
  const gstAmt = isSaved ? Number(purchase?.totalGst || 0) : live.gstAmount;
  const appliedDiscount = isSaved
    ? Number(purchase?.totalDiscount || 0)
    : live.discountAmount;
  const netAmt = isSaved
    ? Number(purchase?.totalNetAmount || 0)
    : live.netAmount;
  const taxableAmt = grossAmt - appliedDiscount;

  // A saved purchase's own lines now carry the slab they were charged at
  // (gstPercentage — added alongside the plain gst amount), but a purchase
  // saved before that column existed has none of them, so it still has to
  // fall back to one blended rate for that older data.
  const savedPurchaseLines = purchase?.purchaseDetails ?? [];
  const hasPerLineGstData = savedPurchaseLines.some(
    (line) => line.gstPercentage != null,
  );

  const hasExemptedLine = isSaved
    ? savedPurchaseLines.some((line) => isGstExempted(line.gstPercentage))
    : store.purchaseDetails.some((line) => line.isGstExempted);

  // A blended rate backed out of the total — the fallback for a saved
  // purchase that predates the per-line gstPercentage column.
  const blendedGstRate = taxableAmt > 0 ? (gstAmt / taxableAmt) * 100 : 0;

  /**
   * One taxable/GST figure per slab actually on the invoice, so a cart mixing
   * 5% and 12% products shows both rather than one rate blended across them.
   */
  const gstGroups = useMemo(() => {
    if (isSaved) {
      if (!hasPerLineGstData) {
        return taxableAmt > 0 || gstAmt > 0
          ? [{ rate: blendedGstRate, amount: gstAmt }]
          : [];
      }
      const byRate = new Map<number, number>();
      savedPurchaseLines.forEach((line) => {
        const rate = parseGstPercentage(line.gstPercentage);
        if (rate <= 0) return;
        byRate.set(rate, (byRate.get(rate) ?? 0) + Number(line.gst || 0));
      });
      return Array.from(byRate, ([rate, amount]) => ({ rate, amount })).sort(
        (a, b) => a.rate - b.rate,
      );
    }
    const byRate = new Map<number, number>();
    live.lines.forEach((line) => {
      if (line.gstPercentage <= 0) return;
      byRate.set(
        line.gstPercentage,
        (byRate.get(line.gstPercentage) ?? 0) + line.gstAmount,
      );
    });
    return Array.from(byRate, ([rate, amount]) => ({ rate, amount })).sort(
      (a, b) => a.rate - b.rate,
    );
  }, [
    isSaved,
    hasPerLineGstData,
    savedPurchaseLines,
    live.lines,
    taxableAmt,
    gstAmt,
    blendedGstRate,
  ]);

  // Header fields: the saved record if we have one, otherwise the live store.
  const header = {
    supplierName:
      purchase?.supplierName ??
      store.supplierName ??
      "",
    supplierId: purchase?.supplierId ?? store.supplierId,
    invoiceNo: purchase?.invoiceNo ?? store.invoiceNo,
    // Saved dates arrive as "2026-08-03T00:00:00"; the time is noise here.
    invoiceDate: (purchase?.invoiceDate ?? store.invoiceDate)?.split("T")[0],
    invoiceAmount: purchase?.invoiceAmount ?? store.invoiceAmount,
    grnNo: purchase?.grnNo ?? store.grnNo,
    paymentType: purchase?.paymentType ?? store.paymentType,
    creditDays: purchase?.creditDays ?? store.creditDays,
    status: purchase?.supplierPaymentStatus ?? store.supplierPaymentStatus,
  } as {
    supplierName: string; supplierId?: number | string; invoiceNo?: string;
    invoiceDate?: string; invoiceAmount?: number; grnNo?: string; paymentType?: string;
    creditDays?: number | string; status?: string; dueDate?: string;
  };

  // Due date isn't stored — it's the invoice date pushed out by the credit days.
  if (header.invoiceDate && Number(header.creditDays) > 0) {
    const due = new Date(header.invoiceDate);
    due.setDate(due.getDate() + Number(header.creditDays));
    header.dueDate = due.toISOString().split("T")[0];
  }

  // "Bill To" is the pharmacy we're operating under. Use the pre-fetched prop
  // when given (so a PDF download has it before capture); otherwise fetch it.
  const [pharmacyFetched, setPharmacyFetched] = useState<CurrentPharmacy | null>(null);
  const pharmacy = pharmacyProp ?? pharmacyFetched;

  useEffect(() => {
    if (pharmacyProp) return;
    let active = true;
    getCurrentBillTo()
      .then((data) => {
        if (active) setPharmacyFetched(data);
      })
      .catch((err) => {
        console.error("Unable to fetch current bill-to", err);
      });
    return () => {
      active = false;
    };
  }, [pharmacyProp]);

  // Single-line address built from whichever parts are present.
  const billToAddress = pharmacy
    ? [
        pharmacy.pharmacyBuildingNo,
        pharmacy.pharmacyStreet,
        pharmacy.pharmacyCity || pharmacy.pharmacyBranch,
        pharmacy.pharmacyState,
      ]
        .filter((part) => part && String(part).trim())
        .join(", ") +
      (pharmacy.pharmacyPincode ? ` - ${pharmacy.pharmacyPincode}` : "")
    : "";

  const billToDocument = pharmacy?.documents?.[0];
  const billToDocumentNo = billToDocument?.documentNo ?? "";
  // Label the licence line by the actual document type on the pharmacy.
  const DOC_TYPE_LABELS: Record<string, string> = {
    DRUG_LICENSE: "Drug License No",
    CLINICAL_ESTABLISHMENT_CERTIFICATE: "Clinical Establishment Certificate No",
    MEDICAL_REGISTRATION_CERTIFICATE: "Medical Registration Certificate No",
  };
  const billToDocumentLabel =
    DOC_TYPE_LABELS[billToDocument?.documentType ?? ""] ?? "Document No";

  // A warehouse bill-to (a Warehouse Manager, or a Super Admin acting as one)
  // has no GST/PAN or licence documents — those belong to a pharmacy branch. So
  // the block is labelled "Warehouse" and drops the GSTIN and document lines
  // rather than printing empty dashes for fields the entity cannot have.
  const isWarehouseBillTo = pharmacy?.pharmacyType === "WAREHOUSE";

  // A negative discount would inflate the payable, and one above the gross
  // would make it negative — neither is a valid invoice.
  const validateDiscount = (value: number): string => {
    if (value < 0) return "Discount cannot be negative";
    if (value > grossAmt) return "Discount cannot exceed the gross amount";
    return "";
  };

  const handleDiscountChange = (raw: string) => {
    if (raw.trim() === "") {
      setDiscount(0);
      setDiscountError("");
      return;
    }

    const value = Number(raw);
    if (Number.isNaN(value)) return;

    // Clamp rather than store the negative, so the totals never show it.
    setDiscount(Math.max(0, value));
    setDiscountError(validateDiscount(value));
  };

  const submitPurchase = async () => {
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        const res = await onSubmit(discount);
        if (res !== false) {
          setShowConfirmation(true);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setShowConfirmation(true);
    }
  };

  const handleSaveTaxInvoice = async () => {
    const error = validateDiscount(discount);
    if (error) {
      setDiscountError(error);
      toast.error(error);
      return;
    }

    // The entered Invoice Amount is only a cross-check against what the
    // supplier printed — a mismatch may just be a typo on either side, so it
    // asks before saving rather than blocking outright. Skipped when nothing
    // was entered, since the field is optional.
    const enteredInvoiceAmount = Number(header.invoiceAmount || 0);
    if (
      enteredInvoiceAmount > 0 &&
      Math.abs(enteredInvoiceAmount - netAmt) > 0.01
    ) {
      setShowAmountMismatch(true);
      return;
    }

    await submitPurchase();
  };

  // Memoised so the `?? []` fallback doesn't hand useMemo a new array each render.
  const savedLines = useMemo(() => purchase?.purchaseDetails ?? [], [purchase]);

  const totalItemsCount = isSaved ? savedLines.length : live.totalItems;
  const totalQtyCount = isSaved
    ? savedLines.reduce((acc, i) => acc + Number(i.purchaseQuantity || 0), 0)
    : live.totalQuantity;

  const tableData = useMemo(() => {
    if (data && Array.isArray(data) && data.length > 0) return data;
    // A saved purchase carries only the line fields the purchase API returns;
    // the caller can pass richer rows via `data`.
    if (savedLines.length > 0) {
      return savedLines.map((item, idx) => ({
        id: idx + 1,
        brand: '—',
        qty: Number(item.purchaseQuantity || 0),
        free: Number(item.freeQuantity || 0),
        variant: item.packagingName || '—',
        name: item.productName || item.productId,
        hsn: '—',
        batch: item.batchNumber || item.batchId,
        expiry: '—',
        // The purchase API gives no per-unit price, so only the line total is
        // known here; `data` carries the richer rows when the caller has them.
        purchaseAmt: 0,
        value: Number(item.grossAmount || 0),
        dis: 0,
        gst: Number(item.gst || 0),
        amount: Number(item.netAmount || 0)
      }));
    }
    if (store.purchaseDetails && store.purchaseDetails.length > 0) {
      return store.purchaseDetails.map((item, idx) => {
        const row = live.lines[idx];
        return {
          id: idx + 1,
          brand: item.brandName || '-',
          qty: item.purchaseQuantity,
          free: Number(item.freeQty || 0),
          variant: item.variant || '-',
          name: item.productName || item.productId,
          hsn: item.hsnCode || '-',
          batch: item.batchNumber || item.batchId,
          expiry: item.expiryDate || '-',
          // Priced per purchase unit, so it multiplies straight by the quantity.
          purchaseAmt: Number(item.purchasePrice || 0),
          // The full gross — the line never shows its discounted value, only
          // the GST and amount below carry the invoice discount.
          value: row?.grossAmount ?? 0,
          dis: 0,
          gst: row?.gstAmount ?? 0,
          amount: row?.netAmount ?? 0
        };
      });
    }
    return [];
  }, [data, savedLines, store.purchaseDetails, live]);

  const columns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: 'id', header: 'Sl. No.' },
    { accessorKey: 'brand', header: 'Brand Name' },
    { accessorKey: 'qty', header: 'QTY' },
    { accessorKey: 'free', header: 'Free' },
    { accessorKey: 'variant', header: 'Variant' },
    { accessorKey: 'name', header: 'Product Name', cell: (info) => <span className="font-bold text-pneutral-900">{info.getValue() as string}</span> },
    { accessorKey: 'hsn', header: 'HSN' },
    { accessorKey: 'batch', header: 'Batch' },
    { accessorKey: 'expiry', header: 'Expiry' },
    { accessorKey: 'purchaseAmt', header: 'Purchase Amt', cell: (info) => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'value', header: 'VALUE', cell: (info) => Number(info.getValue()).toFixed(2) },
    // Per-product discount — hidden for now; nothing captures it per line yet.
    // { accessorKey: 'dis', header: 'DIS%' },
    { accessorKey: 'gst', header: 'GST Amt', cell: (info) => Number(info.getValue()).toFixed(2) },
    { accessorKey: 'amount', header: 'Amount (₹)', cell: (info) => Number(info.getValue()).toFixed(2) },
  ], []);

  // Deliberately no h-full on the root: inside the dashboard's fixed-height
  // <main> it would cap the invoice at one viewport, and flex-shrink would then
  // squeeze the table to nothing — the DataTable wrapper is overflow-hidden, so
  // the rows simply vanish. Sizing to content lets <main> scroll instead.
  return (
    <div className="flex flex-col gap-6 w-full bg-transparent">
      {/* Title Header */}
      <div className="w-full h-[70px] p-4 flex items-center gap-3 bg-secondary-600 border-t border-secondary-50 rounded-xl">
        <h1 className="h-9 flex items-center text-secondary-50 font-semibold text-[28px] leading-[36px]">
          {currentMode === 'view' ? "View Invoice Summary" : "Invoice Summary"}
        </h1>
      </div>

      {/* Supplier Details */}
      <div className="w-full h-[150px] px-4 py-3 bg-white border border-pneutral-200 rounded-xl flex gap-[10px]">
        <div className="flex-1 h-[126px] flex flex-col gap-[10px]">
          <InfoRow label="Supplier" value={header.supplierName || (header.supplierId ? `Supplier #${header.supplierId}` : '-')} />
          <InfoRow label="Invoice No" value={header.invoiceNo || "-"} />
          <InfoRow label="Invoice Date" value={header.invoiceDate || "-"} />
          <InfoRow label="Invoice Amount" value={header.invoiceAmount ? `₹ ${Number(header.invoiceAmount).toFixed(2)}` : "-"} />
        </div>
        <div className="flex-1 h-[126px] flex flex-col gap-[10px]">
          <InfoRow label="GRN" value={header.grnNo || "-"} />
          <InfoRow label="Payment Type" value={header.paymentType || "-"} />
          <InfoRow label="Credit Days" value={header.creditDays ? `${header.creditDays} Days` : "-"} />
          <InfoRow label="Due Date" value={header.dueDate || "-"} />
        </div>
      </div>

      {/* Bill-to Details */}
      <div
        className={`w-full ${
          isWarehouseBillTo ? "" : "h-[156px]"
        } p-4 bg-white border border-pneutral-200 rounded-xl flex flex-col gap-3`}
      >
        <InfoRow
          label={isWarehouseBillTo ? "Warehouse" : "Pharmacy"}
          value={pharmacy?.pharmacyName || "—"}
        />
        <InfoRow label="Address" value={billToAddress || "—"} />
        {!isWarehouseBillTo && (
          <>
            <InfoRow label="GSTIN" value={pharmacy?.gstNumber || "—"} />
            <InfoRow label={billToDocumentLabel} value={billToDocumentNo || "—"} />
          </>
        )}
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={tableData} />

      {/* Bottom Section */}
      <div className="w-full h-[300px] flex gap-3">

        {/* Left column: tax strip, then bank details beside the count card */}
        <div className="w-[60%] shrink-0 h-full flex flex-col gap-3">

          {/* Tax Breakdown — Taxable, a stacked GST column (one row per slab
              on the invoice, rather than a pair of columns per slab that would
              force the strip to scroll), then Exempted and Free GST. */}
          <div className="w-full h-[144px] bg-white border border-pneutral-200 rounded-lg flex overflow-hidden">
            <div className="flex-1 min-w-0 h-full px-1 py-4 flex flex-col items-center justify-between text-center border-r border-pneutral-200">
              <span className="h-6 text-[16px] leading-6 font-normal text-pneutral-800 whitespace-nowrap">Taxable</span>
              <span className="h-6 text-[16px] leading-6 font-semibold text-pneutral-900 whitespace-nowrap">₹ {taxableAmt.toFixed(2)}</span>
            </div>

            <div className="flex-[1.4] min-w-0 h-full px-1 py-4 flex flex-col items-center border-r border-pneutral-200">
              <span className="h-6 text-[16px] leading-6 font-normal text-pneutral-800 whitespace-nowrap">GST</span>
              <div className="flex-1 w-full flex flex-col items-center justify-center gap-1 overflow-y-auto">
                {gstGroups.length === 0 ? (
                  <span className="text-[16px] leading-6 font-semibold text-pneutral-900 whitespace-nowrap">₹ 0.00</span>
                ) : (
                  gstGroups.map((group) => (
                    <div key={group.rate} className="flex items-baseline gap-2 whitespace-nowrap">
                      <span className="text-[14px] leading-5 font-normal text-pneutral-700">{group.rate.toFixed(2)}%</span>
                      <span className="text-[14px] leading-5 font-semibold text-pneutral-900">₹ {group.amount.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 h-full px-1 py-4 flex flex-col items-center justify-between text-center border-r border-pneutral-200">
              <span className="h-6 text-[16px] leading-6 font-normal text-pneutral-800 whitespace-nowrap">Exempted</span>
              <span className="h-6 text-[16px] leading-6 font-semibold text-pneutral-900 whitespace-nowrap">{hasExemptedLine ? "Yes" : "No"}</span>
            </div>

            <div className="flex-1 min-w-0 h-full px-1 py-4 flex flex-col items-center justify-between text-center">
              <span className="h-6 text-[16px] leading-6 font-normal text-pneutral-800 whitespace-nowrap">Free GST</span>
              <span className="h-6 text-[16px] leading-6 font-semibold text-pneutral-900 whitespace-nowrap">₹ 0.00</span>
            </div>
          </div>

          <div className="w-full h-[144px] flex gap-3">

            {/* Bank Details removed for now: nothing on the purchase or
                pharmacy payload carries the account, so the card only ever
                rendered four empty rows (Bank Name / A/C No / Branch / IFSC).
                Restore it here once the API returns them. */}

            {/* Items / QTY / Rounding */}
            <div className="flex-[230] min-w-0 h-full bg-white border border-pneutral-200 rounded-lg flex flex-col justify-between overflow-hidden">
              {[
                { label: "Items", value: String(totalItemsCount) },
                { label: "QTY", value: String(totalQtyCount) },
                { label: "CR/DB Round", value: "₹ 0.00" },
              ].map((row) => (
                // No rule between the rows — the card's own border already
                // groups them, and three hairlines across a 230px box read as
                // a table of one column.
                <div
                  key={row.label}
                  className="w-full h-12 px-3 flex items-center gap-3"
                >
                  {/* Same fixed-label trick as the bank card: sized to
                      "CR/DB Round" so all three colons sit on one line, near
                      the middle of the card, instead of drifting with each
                      label's length. */}
                  <span className="h-5 w-[104px] shrink-0 text-[14px] leading-5 font-normal text-pneutral-800 whitespace-nowrap">{row.label}</span>
                  <span className="h-5 w-[5px] shrink-0 text-[14px] leading-5 font-normal text-pneutral-800">:</span>
                  <span className="h-5 flex-1 text-right text-[14px] leading-5 font-semibold text-pneutral-900 truncate">{row.value}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right: Totals */}
        <div className="flex-1 min-w-0 h-full p-3 flex flex-col gap-2 bg-white border border-pneutral-200 rounded-xl">
          <TotalRow label="Gross AMT" value={`₹ ${grossAmt.toFixed(2)}`} />

          {/* DIS.AMT is the one editable total while the purchase is unsaved. */}
          <div className="w-full h-8 py-1 flex items-center justify-between gap-3">
            <span className="h-6 text-[16px] leading-6 font-normal text-pneutral-800">DIS.AMT</span>
            {currentMode === 'create' ? (
              <div className="flex flex-col items-end gap-1">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount || ""}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  // The spinner and paste can still deliver "-", so block it here too.
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                  }}
                  className={`w-[96px] h-6 border rounded bg-white text-right px-2 text-pneutral-900 text-[14px] leading-5 outline-none ${
                    discountError
                      ? "border-warning-500"
                      : "border-pneutral-200 focus:border-primary-500"
                  }`}
                  placeholder="0.00"
                />
                {discountError && (
                  <span className="text-[11px] text-warning-500">{discountError}</span>
                )}
              </div>
            ) : (
              <span className="h-6 text-[16px] leading-6 font-semibold text-pneutral-900">₹ {appliedDiscount.toFixed(2)}</span>
            )}
          </div>

          <TotalRow label="Taxable Amt" value={`₹ ${taxableAmt.toFixed(2)}`} />
          <TotalRow label="SGST AMT" value={`₹ ${(gstAmt / 2).toFixed(2)}`} />
          <TotalRow label="CGST AMT" value={`₹ ${(gstAmt / 2).toFixed(2)}`} />
          <TotalRow label="IGST AMT" value="₹ 0.00" />

          <div className="w-full h-8 py-1 flex items-center justify-between border-t border-pneutral-200">
            <span className="h-6 text-[18px] leading-6 font-semibold text-pneutral-900">NET PAYABLE</span>
            <span className="h-6 text-[18px] leading-6 font-semibold text-pneutral-900">₹ {netAmt.toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* Amount in words — spelled out, paise included, in Indian grouping. It
          read "Rupees 302.4 Only" before, which is the figure, not the words. */}
      <div className="w-full h-[52px] p-4 flex items-center gap-4 bg-white border border-pneutral-200 rounded-lg text-[14px] leading-5">
        <span className="font-normal text-pneutral-800 whitespace-nowrap">Amount in words</span>
        <span className="font-normal text-pneutral-800">:</span>
        <span className="flex-1 min-w-0 truncate font-semibold text-pneutral-900 capitalize">{amountInWords(netAmt)}</span>
      </div>

      {/* Footer — part of the invoice, so it travels into the PDF capture and
          the print view. Deliberately plain text with no data-print hook: it
          reads once at the end of the document rather than on every page. */}
      <div className="w-full border-t border-pneutral-200 pt-3 text-center text-[13px] text-pneutral-600">
        Developed by Tiameds
      </div>

      {/* Bottom Actions based on mode */}
      {currentMode !== 'download' && (
        <div className="w-full h-9 flex justify-between items-center gap-4 mb-8">
          <button
            onClick={() => {
              if (currentMode === 'view') {
                usePurchaseStore.getState().resetPurchase();
                if (onSuccessGoToPurchase) {
                  onSuccessGoToPurchase();
                } else {
                  window.location.href = '/dashboard/purchase';
                }
              } else {
                if (onCancel) {
                  onCancel();
                } else {
                  window.location.href = '/dashboard/purchase';
                }
              }
            }} 
            disabled={isSubmitting}
            className="w-[120px] h-9 border border-pneutral-200 bg-white rounded-lg text-[16px] leading-6 font-medium text-pneutral-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {currentMode === 'view' ? "Cancel" : "Back"}
          </button>
          
          {currentMode === 'create' && (
            <button 
              onClick={handleSaveTaxInvoice} 
              disabled={isSubmitting}
              className="w-[180px] h-9 bg-secondary-700 hover:bg-secondary-800 text-white rounded-lg text-[16px] leading-6 font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save TAX Invoice"}
            </button>
          )}
        </div>
      )}

      {/* Confirmation Popup */}
      <ConfirmationPopup 
        isOpen={showConfirmation}
        invoiceNo={currentMode === 'create' || currentMode === 'view' ? store.invoiceNo : "201233"}
        grnNo={store.grnNo}
        onViewTaxInvoice={() => {
          setShowConfirmation(false);
          setCurrentMode('view');
        }}
        onGoToPurchase={() => {
          setShowConfirmation(false);
          usePurchaseStore.getState().resetPurchase();
          if (onSuccessGoToPurchase) {
            onSuccessGoToPurchase();
          } else if (onCancel) {
            onCancel();
          } else {
            window.location.href = '/dashboard/purchase';
          }
        }}
      />

      {/* Invoice Amount vs Net Payable mismatch */}
      <ConfirmDialog
        isOpen={showAmountMismatch}
        title="Invoice Amount Mismatch"
        message={`The entered Invoice Amount (₹ ${Number(header.invoiceAmount || 0).toFixed(2)}) does not match the Net Payable (₹ ${netAmt.toFixed(2)}). Do you want to save anyway?`}
        confirmLabel="Save"
        cancelLabel="Cancel"
        loading={isSubmitting}
        onConfirm={async () => {
          setShowAmountMismatch(false);
          await submitPurchase();
        }}
        onCancel={() => setShowAmountMismatch(false)}
      />
    </div>
  );
};

export default InvoiceSummary;