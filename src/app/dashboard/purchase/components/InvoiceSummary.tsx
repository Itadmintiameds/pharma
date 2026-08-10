"use client";

import React, { useEffect, useMemo, useState } from "react";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import ConfirmationPopup from "@/app/components/common/ConfirmationPopup";
import { usePurchaseStore } from "@/store/usePurchaseStore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PurchaseData } from "@/types/PurchaseData";
import {
  getCurrentPharmacy,
  type CurrentPharmacy,
} from "@/services/PharmacyService";

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
  const [discount, setDiscount] = useState<number>(0);
  const [discountError, setDiscountError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const store = usePurchaseStore();
  const router = useRouter();

  // A saved purchase is read-only: its own stored totals and discount win.
  const isSaved = !!purchase;
  const grossAmt = Number(purchase?.totalGrossAmount ?? store.totalGrossAmount) || 0;
  const gstAmt = Number(purchase?.totalGst ?? store.totalGst) || 0;
  const appliedDiscount = isSaved ? Number(purchase?.totalDiscount || 0) : discount;
  const netAmt = isSaved
    ? Number(purchase?.totalNetAmount || 0)
    : (grossAmt - discount) + gstAmt;

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
    grnNo: purchase?.grnNo ?? store.grnNo,
    paymentType: purchase?.paymentType ?? store.paymentType,
    creditDays: purchase?.creditDays ?? store.creditDays,
    status: purchase?.supplierPaymentStatus ?? store.supplierPaymentStatus,
  };

  // "Bill To" is the pharmacy we're operating under. Use the pre-fetched prop
  // when given (so a PDF download has it before capture); otherwise fetch it.
  const [pharmacyFetched, setPharmacyFetched] = useState<CurrentPharmacy | null>(null);
  const pharmacy = pharmacyProp ?? pharmacyFetched;

  useEffect(() => {
    if (pharmacyProp) return;
    let active = true;
    getCurrentPharmacy()
      .then((data) => {
        if (active) setPharmacyFetched(data);
      })
      .catch((err) => {
        console.error("Unable to fetch current pharmacy", err);
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

  const handleSaveTaxInvoice = async () => {
    const error = validateDiscount(discount);
    if (error) {
      setDiscountError(error);
      toast.error(error);
      return;
    }

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

  // Memoised so the `?? []` fallback doesn't hand useMemo a new array each render.
  const savedLines = useMemo(() => purchase?.purchaseDetails ?? [], [purchase]);

  const totalItemsCount = isSaved ? savedLines.length : store.purchaseDetails.length || 0;
  const totalQtyCount = isSaved
    ? savedLines.reduce((acc, i) => acc + Number(i.purchaseQuantity || 0), 0)
    : store.purchaseDetails.reduce((acc, i) => acc + i.purchaseQuantity, 0);

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
      return store.purchaseDetails.map((item, idx) => ({
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
        value: Number(item.purchasePrice || 0) * Number(item.purchaseQuantity || 0),
        dis: 0,
        gst: item.gst,
        amount: item.netAmount
      }));
    }
    return [];
  }, [data, savedLines, store.purchaseDetails]);

  const columns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: 'id', header: '#' },
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
      <div className="w-full h-[70px] p-4 flex items-center bg-secondary-600 border-t border-secondary-50 rounded-xl shadow-sm">
        <h1 className="text-white font-semibold text-[24px] leading-[32px]">
          {currentMode === 'view' ? "View Invoice Summary" : "Invoice Summary"}
        </h1>
      </div>

      {/* Supplier Info Wrapper */}
      <div className="w-full h-[166px] p-4 bg-white border border-pneutral-200 rounded-xl">
        {/* Inner Box */}
        <div className="w-full h-full px-4 py-3 bg-secondary-50 border border-pneutral-200 rounded-lg flex items-start">
          <div className="flex-1 flex flex-col gap-3 text-[14px]">
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Supplier</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.supplierName || (header.supplierId ? `Supplier #${header.supplierId}` : '-')}</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Invoice No</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.invoiceNo || "-"}</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Invoice Date</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.invoiceDate || "-"}</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">GRN</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.grnNo || "-"}</span></div>
          </div>
          <div className="flex-1 flex flex-col gap-3 text-[14px]">
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Payment Type</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.paymentType || "-"}</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Credit Days</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.creditDays ? `${header.creditDays} Days` : "-"}</span></div>
            <div className="flex items-center"><span className="w-[120px] text-pneutral-600">Status</span><span className="w-4">:</span><span className="font-medium text-pneutral-900">{header.status || "PENDING"}</span></div>
          </div>
        </div>
      </div>

      {/* Bill To Info Wrapper */}
      <div className="w-full h-[188px] p-4 bg-white border border-pneutral-200 rounded-xl">
        {/* Inner Box */}
        <div className="w-full h-full p-4 bg-secondary-50 border border-pneutral-200 rounded-lg flex flex-col gap-3 text-[14px]">
          <div className="font-bold text-pneutral-900">Bill To</div>
          <div className="font-bold text-pneutral-900 mt-1">{pharmacy?.pharmacyName || "—"}</div>
          <div className="text-pneutral-700 mt-1">{billToAddress || "—"}</div>
          <div className="flex gap-8 text-pneutral-700 mt-2">
            <div>GSTIN: {pharmacy?.gstNumber || "—"}</div>
            <div>{billToDocumentLabel}: {billToDocumentNo || "—"}</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={tableData} />

      {/* Bottom Section */}
      <div className={`flex gap-4 w-full items-start ${currentMode === 'create' ? 'bg-white border border-pneutral-200 rounded-xl p-4' : ''}`}>
        
        {/* Left Side: Tax and Bank Details */}
        <div className="flex-[2.5] p-4 flex flex-col justify-between gap-[16px] bg-secondary-50 border border-pneutral-200 rounded-xl">
          
          {/* Tax Breakdown */}
          <div className="w-full bg-white border border-pneutral-200 rounded-lg p-3 flex gap-4 text-[13px] items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">Taxable</span>
              <span className="font-semibold text-pneutral-900">₹ {(grossAmt - appliedDiscount).toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">CGST Amt</span>
              <span className="font-semibold text-pneutral-900">₹ {(gstAmt / 2).toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">SGST Amt</span>
              <span className="font-semibold text-pneutral-900">₹ {(gstAmt / 2).toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">Exempted</span>
              <span className="font-semibold text-pneutral-900">₹ 0.00</span>
            </div>
            {/* Free GST — hidden for now.
            <div className="flex flex-col gap-1">
              <span className="text-pneutral-600">Free GST</span>
              <span className="font-semibold text-pneutral-900">₹ 0.00</span>
            </div>
            */}
          </div>

          {/* Bank Details — hidden for now; no data source wired up yet.
          <div className="w-full bg-white border border-pneutral-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] items-center">
            <div className="flex items-center"><span className="w-24 text-pneutral-600">Bank Name</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
            <div className="flex items-center"><span className="w-24 text-pneutral-600">Branch</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
            <div className="flex items-center"><span className="w-24 text-pneutral-600">A/C No</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
            <div className="flex items-center"><span className="w-24 text-pneutral-600">IFSC</span><span className="w-2">:</span><span className="font-medium text-pneutral-900"></span></div>
          </div>
          */}

        </div>

        {/* Middle: Items/Qty Summary */}
        <div className="flex-1 p-4 flex flex-col gap-[16px] bg-secondary-50 border border-pneutral-200 rounded-xl text-[14px]">
          <div className="w-full h-[40px] bg-white border border-pneutral-200 rounded-lg px-4 flex justify-between items-center">
            <span className="text-pneutral-600">Items</span><span className="w-2">:</span>
            <span className="font-bold text-pneutral-900 text-right flex-1">{totalItemsCount}</span>
          </div>
          <div className="w-full h-[40px] bg-white border border-pneutral-200 rounded-lg px-4 flex justify-between items-center">
            <span className="text-pneutral-600">QTY</span><span className="w-2">:</span>
            <span className="font-bold text-pneutral-900 text-right flex-1">{totalQtyCount}</span>
          </div>
          <div className="w-full h-[40px] bg-white border border-pneutral-200 rounded-lg px-4 flex justify-between items-center text-[13px]">
            <span className="text-pneutral-600 leading-tight">CR/DB<br/>Round</span><span className="w-2 ml-1">:</span>
            <span className="font-bold text-pneutral-900 text-right flex-1">₹ 0.00</span>
          </div>
        </div>

        {/* Right Side: Totals Block */}
        <div className="flex-[1.5] p-5 flex flex-col justify-between bg-secondary-50 border border-pneutral-200 rounded-xl text-[14px]">
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">Gross AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ {grossAmt.toFixed(2)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-pneutral-600 text-[14px]">DIS.AMT</span>
              {currentMode === 'create' ? (
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
                  className={`w-20 h-7 border rounded bg-white text-right px-2 text-pneutral-900 text-[12px] outline-none ${
                    discountError
                      ? "border-warning-500"
                      : "border-pneutral-200 focus:border-primary-500"
                  }`}
                  placeholder="0.00"
                />
              ) : (
                <span className="font-medium text-[14px] text-pneutral-900">₹ {appliedDiscount.toFixed(2)}</span>
              )}
            </div>
            {discountError && (
              <span className="self-end text-[11px] text-warning-500">{discountError}</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">Taxable Amt</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ {(grossAmt - appliedDiscount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">SGST AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ {(gstAmt / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pneutral-600 text-[14px]">CGST AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ {(gstAmt / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-pneutral-600 text-[14px]">IGST AMT</span>
            <span className="font-semibold text-[14px] text-pneutral-900">₹ 0.00</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-pneutral-200">
            <span className="font-semibold text-[18px] text-pneutral-900 leading-[24px]">NET PAYABLE</span>
            <span className="font-semibold text-[18px] text-pneutral-900 leading-[24px]">₹ {netAmt.toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* Amount in words */}
      <div className="w-full bg-white border border-pneutral-200 rounded-xl p-4 flex items-center text-[14px]">
        <span className="text-pneutral-600 mr-2">Amount in words</span><span className="mr-2">:</span>
        <span className="font-bold text-pneutral-900">Rupees {Math.round(netAmt)} Only</span>
      </div>

      {/* Bottom Actions based on mode */}
      {currentMode !== 'download' && (
        <div className="flex justify-between items-center w-full mt-4 pb-8">
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
            className="w-[120px] h-[44px] border border-pneutral-200 bg-white rounded-lg text-[16px] font-medium text-pneutral-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {currentMode === 'view' ? "Cancel" : "Back"}
          </button>
          
          {currentMode === 'create' && (
            <button 
              onClick={handleSaveTaxInvoice} 
              disabled={isSubmitting}
              className="w-[180px] h-[44px] bg-secondary-700 hover:bg-secondary-800 text-white rounded-lg text-[16px] font-medium transition-colors shadow-sm disabled:opacity-50"
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
    </div>
  );
};

export default InvoiceSummary;