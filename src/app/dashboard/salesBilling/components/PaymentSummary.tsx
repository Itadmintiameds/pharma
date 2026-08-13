"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { showToast } from "@/app/components/common/Toast";
import OffscreenPortal from "@/app/components/common/OffscreenPortal";
import BillingSuccessModal from "./BillingSuccessModal";
import { downloadElementAsPdf } from "@/utils/downloadPdf";
import { formatDateTime, formatMonthYear } from "@/utils/formatDate";
import { printElement } from "@/utils/printElement";
import { BACK_BUTTON, PRIMARY_BUTTON } from "./billingButtons";
import { BILL_PRINT_CSS } from "./billPrintStyles";
import {
  BillLine,
  BillTotals,
  CustomerInfo,
  PaymentDetails,
} from "@/types/BillingData";
import {
  amountInWords,
  formatAmount,
  lineBreakdown,
} from "@/utils/billingTotals";
import {
  getCurrentPharmacy,
  type CurrentPharmacy,
} from "@/services/PharmacyService";

interface PaymentSummaryProps {
  invoiceNo: string;
  billDate: string;
  customer: CustomerInfo;
  lines: BillLine[];
  totals: BillTotals;
  payment: PaymentDetails;
  mode?: "create" | "view" | "download";
  onBack?: () => void;
  onDone?: () => void;
  onNewBill?: () => void;
  /**
   * Saves the bill (and any prescription) and returns what the success popup
   * should show. Returning null leaves the screen as it is.
   */
  onSave?: () => Promise<{ billNo: string } | null>;
  /**
   * The pharmacy printed in the bill header. When given (e.g. pre-fetched so a
   * PDF capture has it before render) the component skips its own fetch.
   */
  pharmacy?: CurrentPharmacy | null;
}

/** Label for the licence line, picked from the document type the pharmacy
 *  actually holds. */
const DOC_TYPE_LABELS: Record<string, string> = {
  DRUG_LICENSE: "DL No",
  CLINICAL_ESTABLISHMENT_CERTIFICATE: "CEC No",
  MEDICAL_REGISTRATION_CERTIFICATE: "MRC No",
};

/** The bill header: the pharmacy's logo on the left, its name and address in
 *  the middle, and its statutory details on the right. Prints as it looks. */
const BillHeader: React.FC<{
  pharmacy: CurrentPharmacy | null;
}> = ({ pharmacy }) => {
  const name = pharmacy?.pharmacyName || "—";
  // Single line built from whichever address parts the pharmacy has.
  const address =
    (pharmacy
      ? [
          pharmacy.pharmacyBuildingNo,
          pharmacy.pharmacyStreet,
          pharmacy.pharmacyLandmark,
          pharmacy.pharmacyCity || pharmacy.pharmacyBranch,
          pharmacy.pharmacyState,
        ]
          .filter((part) => part && String(part).trim())
          .join(", ") + (pharmacy.pharmacyPincode ? ` - ${pharmacy.pharmacyPincode}` : "")
      : "") || "—";

  // Statutory details for the right column. Every row is rendered even when
  // empty, so the header keeps its height and nothing looks omitted.
  const licence = pharmacy?.documents?.[0];
  const IDENTITY_ROWS = [
    { label: "GSTIN", value: pharmacy?.gstNumber || "—" },
    {
      label: DOC_TYPE_LABELS[licence?.documentType ?? ""] ?? "Licence No",
      value: licence?.documentNo || "—",
    },
    {
      label: "Phone",
      value: pharmacy?.pharmacyPhone ? String(pharmacy.pharmacyPhone) : "—",
    },
  ];

  return (
    // White card inside a purple ring; the name plate's own 2px outline is what
    // separates it from the card. The side columns share a fixed width, which
    // is what keeps the plate optically centred and both outer edges flush
    // with the card.
    <div
      data-print="header"
      className="w-full rounded-xl border border-secondary-200 bg-white p-4"
    >
      {/* The side tracks size to their content rather than a fixed 200px, which
          left a dead gap between the logo and the name plate. minmax(0,1fr) for
          the middle: a plain 1fr floors at the name's min-content width, so a
          long name would push the details column off the card. */}
      <div
        data-print="header-grid"
        className="grid grid-cols-1 items-center gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto]"
      >
        {/* Logo — the bare image, no tile or border around it. Height is
            capped and the width follows, so a square mark and a wide wordmark
            both sit right. Until /getCurrentPharmacy returns a URL this shows
            the Tiameds logo as a stand-in.
            Plain <img>: the URL is whatever the API returns, so it cannot go
            through next/image's configured remote patterns. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-print="header-logo"
          src={pharmacy?.pharmacyLogo || "/TiamedsLogo.svg"}
          alt={pharmacy?.pharmacyLogo ? name : "Tiameds"}
          crossOrigin="anonymous"
          className="h-[52px] w-auto max-w-[150px] shrink-0 object-contain object-left justify-self-center md:justify-self-start"
        />

        {/* Name plate — the purple outline is the header's anchor. */}
        <div
          data-print="header-plate"
          className="flex min-w-0 flex-col items-center gap-1 rounded-lg border-2 border-secondary-600 bg-white px-4 py-3 text-center"
        >
          {/* h2, not h1: the title bar below already carries the page's h1. */}
          <h2 className="max-w-full truncate font-heading text-h5 font-semibold uppercase tracking-wide text-pneutral-900">
            {name}
          </h2>
          <p className="font-body text-p3 font-normal leading-snug text-pneutral-700">
            {address}
          </p>
        </div>

        {/* Statutory details — label flush left, value flush right, so both
            edges of the column line up. */}
        <div
          data-print="header-facts"
          className="flex flex-col gap-1.5 md:min-w-[196px] md:items-stretch"
        >
          {IDENTITY_ROWS.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="shrink-0 font-body text-p3 font-normal uppercase tracking-wide text-pneutral-600">
                {row.label}
              </span>
              <span className="truncate text-right font-body text-p3 font-semibold text-pneutral-900">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Closes every bill — Tiameds' own mark, not the pharmacy's. */
const BillFooter: React.FC = () => (
  <div
    data-print="footer"
    className="w-full flex items-center justify-center gap-2 border-t border-pneutral-200 pt-3"
  >
    <span className="font-body text-p3 font-normal text-pneutral-600">
      Powered by
    </span>
    {/* priority, so it is not lazy: the print iframe is 0x0, and a lazy image
        never enters a viewport there — the mark simply never loaded on paper. */}
    <Image
      src="/TiamedsLogo.svg"
      alt="Tiameds"
      width={96}
      height={26}
      priority
      className="shrink-0"
    />
    <span className="font-body text-p3 font-normal text-pneutral-600">
      Tiameds Technologies Pvt Ltd.
    </span>
  </div>
);

/** Every column of the invoice grid is centred, so both ends share a cell. */
const Centered: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span className={`block w-full text-center ${className ?? ""}`}>
    {children}
  </span>
);

/** One `Label : Value` line of the bill details card — 24px tall, 124px
 *  label, 5px colon, the value taking the rest. */
const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex h-6 items-center gap-3">
    <span className="w-[124px] shrink-0 font-body text-p4 font-normal text-pneutral-800">
      {label}
    </span>
    <span className="w-[5px] shrink-0 font-body text-p4 font-normal text-pneutral-800">
      :
    </span>
    <span className="flex-1 truncate font-body text-p4 font-medium text-pneutral-900">
      {value}
    </span>
  </div>
);

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  invoiceNo,
  billDate,
  customer,
  lines,
  totals,
  payment,
  mode = "create",
  onBack,
  onDone,
  onSave,
  pharmacy: pharmacyProp,
}) => {
  const [currentMode] = useState<"create" | "view" | "download">(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedBillNo, setSavedBillNo] = useState<string | null>(null);
  // Mounts the off-screen copy the PDF is captured from.
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);

  // The header pharmacy: the pre-fetched prop when the caller has it, else
  // loaded here on mount.
  const [pharmacyFetched, setPharmacyFetched] =
    useState<CurrentPharmacy | null>(null);
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

  /** Saves through the page, then opens the success popup. */
  const handleSave = async () => {
    if (currentMode === "download") {
      handleDownloadPdf();
      return;
    }

    if (!onSave) {
      if (onDone) onDone();
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await onSave();
      if (saved) setSavedBillNo(saved.billNo);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** No send-bill endpoint yet, so the button only says so. */
  const handleSendToWhatsapp = () => {
    showToast.info("Feature coming soon.");
  };

  /** Hands the invoice to the browser's print dialog — a real printer, not a
   *  silent PDF download. */
  const handlePrint = () => {
    if (!printRef.current) return;
    try {
      // The print sheet is its own design — compressed and monochrome. Only the
      // iframe sees this CSS, so the screen and the PDF stay as they are.
      printElement(printRef.current, `Invoice ${invoiceNo}`, BILL_PRINT_CSS);
    } catch (err) {
      console.error("Failed to open the print view", err);
      showToast.error("Could not open the print dialog.");
    }
  };

  /** Mounts the off-screen copy; the capture itself runs in onReady below. */
  const handleDownloadPdf = () => {
    if (isCapturing) return;
    setIsSubmitting(true);
    setIsCapturing(true);
  };

  /**
   * Fired by OffscreenPortal once the copy is laid out and painted. The ref
   * guards against a second capture if the callback identity changes while one
   * is still running.
   */
  const handleCaptureReady = useCallback(
    async (node: HTMLElement) => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      try {
        await downloadElementAsPdf(
          node,
          `invoice-${invoiceNo.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`
        );
        showToast.success("Invoice downloaded successfully!");
      } catch (err) {
        console.error("Failed to generate the invoice PDF", err);
        showToast.error("Could not generate the PDF.");
      } finally {
        isCapturingRef.current = false;
        setIsCapturing(false);
        setIsSubmitting(false);
      }
    },
    [invoiceNo]
  );

  /**
   * A row costed out on its own terms — the discount typed against that
   * product, and nothing else. The bill level discount is deliberately left
   * out: it belongs to the bill, not to any one line, so it appears once in the
   * summary's Discount row. The grid therefore reads exactly as it did on the
   * billing screen, row by row: Total - Discount = Net Amount.
   *
   * The trade-off is that with a bill level discount the Net Amount column sums
   * to more than NET PAYABLE; the summary accounts for the difference.
   */
  const rowBreakdown = (line: BillLine) => lineBreakdown(line, 0);

  const columns: ColumnDef<BillLine>[] = [
    {
      id: "slNo",
      header: () => <Centered>Sl. No.</Centered>,
      cell: ({ row }) => <Centered>{row.index + 1}</Centered>,
    },
    {
      accessorKey: "productName",
      header: () => <Centered>Product Name</Centered>,
      cell: ({ row }) => (
        <Centered className="font-semibold text-pneutral-900">
          {row.original.productName || "—"}
        </Centered>
      ),
    },
    {
      accessorKey: "hsnCode",
      header: () => <Centered>HSN</Centered>,
      cell: ({ row }) => <Centered>{row.original.hsnCode || "—"}</Centered>,
    },
    {
      accessorKey: "batchNumber",
      header: () => <Centered>Batch</Centered>,
      cell: ({ row }) => <Centered>{row.original.batchNumber || "—"}</Centered>,
    },
    {
      accessorKey: "expiryDate",
      header: () => <Centered>Exp</Centered>,
      cell: ({ row }) => (
        <Centered>{formatMonthYear(row.original.expiryDate)}</Centered>
      ),
    },
    {
      accessorKey: "quantity",
      // Stock is counted in smallest units, so this is what was billed of them.
      header: () => <Centered>Purchase QTY</Centered>,
      cell: ({ row }) => <Centered>{row.original.quantity}</Centered>,
    },
    {
      accessorKey: "discountPercentage",
      // The discount typed against this product. Any bill level discount is
      // shown once in the summary instead of being spread over the rows.
      header: () => <Centered>Discount (%)</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(rowBreakdown(row.original).discountPercentage)}</Centered>
      ),
    },
    {
      id: "mrp",
      // MRP, not the selling price: the bill is raised at the printed price,
      // which already includes GST.
      header: () => <Centered>MRP (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(row.original.mrpPerUnit ?? 0)}</Centered>
      ),
    },
    {
      accessorKey: "gstPercentage",
      header: () => <Centered>GST%</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(row.original.gstPercentage ?? 0)}</Centered>
      ),
    },
    {
      id: "total",
      // MRP x qty, before the discount — so the row reads as
      // Total - Discount = Net Amount, same as the cart grid.
      header: () => <Centered>Total (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(rowBreakdown(row.original).grossAmount)}</Centered>
      ),
    },
    {
      id: "netAmount",
      // Total less this row's own discount. GST is inside it, never added.
      header: () => <Centered>Net Amount (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(rowBreakdown(row.original).netAmount)}</Centered>
      ),
    },
  ];

  /** The three invoice facts on the left of the bill details card. */
  const BILL_FACTS = [
    { label: "Bill No", value: invoiceNo || "—" },
    { label: "Bill Date & Time", value: formatDateTime(billDate) },
    { label: "Payment Mode", value: payment.paymentMode || "CASH" },
  ];

  /**
   * The lines above NET PAYABLE.
   *
   * Taxable and GST are the tax split of what is actually being paid — the GST
   * shown was extracted out of the net, not added to it.
   *
   * `Total` is the sum of the rows' own totals (MRP x qty), so the card reads as
   * arithmetic the customer can follow: Total - Discount = NET PAYABLE. It is a
   * display row only and is never sent anywhere.
   *
   * Every row renders whether or not it applies, so the card keeps its height.
   */
  const AMOUNT_ROWS = [
    { label: "Taxable Amt", value: totals.taxableAmount || 0 },
    // Amount only — lines can sit on different GST slabs.
    { label: "GST", value: totals.gstAmount || 0 },
    { label: "Total", value: totals.grossAmount || 0 },
    {
      // Every rupee taken off: the per-row discounts and the bill level one.
      label: "Discount",
      value: (totals.itemDiscount || 0) + (totals.billDiscount || 0),
    },
  ];

  /** The two customer facts on the right. */
  const CUSTOMER_FACTS = [
    { label: "Customer", value: customer?.customerName || "Walk-in Customer" },
    { label: "Mobile", value: customer?.mobileNo || "—" },
  ];

  /**
   * The bill itself — one definition, rendered twice: in place (holding
   * printRef, which the print path clones) and, while a download runs, into the
   * off-screen copy below. Same markup, so screen, print and PDF cannot drift.
   */
  const renderBill = (ref?: React.Ref<HTMLDivElement>) => (
    <div
      ref={ref}
      data-print-root
      // Transparent, not white: a fill here reads as a card wrapping the whole
      // bill. The white ground for a capture comes from OffscreenPortal, and
      // for print from the iframe's own body.
      className="flex flex-col gap-4 w-full bg-transparent"
    >
      <BillHeader pharmacy={pharmacy} />

      {/* Title bar — 70px tall, 16px padding, with the light rule on top */}
      <div
        data-print="title"
        className="w-full h-[70px] p-4 flex items-center rounded-xl border border-secondary-600 border-t-secondary-50 bg-secondary-600"
      >
        <h1 className="font-heading text-h4 font-semibold text-secondary-50">
          {currentMode === "view"
            ? "View Payment Invoice"
            : currentMode === "download"
            ? "Download Payment Invoice"
            : "Payment Invoice"}
        </h1>
      </div>

      {/* Bill details — the invoice facts and the customer, side by side.
          Each column is a stack of 24px lines at a 10px rhythm. */}
      <div
        data-print="facts"
        className="w-full rounded-xl border border-pneutral-200 bg-white px-4 py-3 flex flex-col md:flex-row items-start gap-6"
      >
        <div className="flex-1 w-full flex flex-col gap-2.5">
          {BILL_FACTS.map((fact) => (
            <Fact key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>

        <div className="flex-1 w-full flex flex-col gap-2.5">
          {CUSTOMER_FACTS.map((fact) => (
            <Fact key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      </div>

      {/* Invoice grid — DataTable brings its own rounded border, so it is not
          boxed a second time. Height follows the number of lines: a fixed
          minimum would leave dead space under a short bill. */}
      <div className="w-full">
        <DataTable columns={columns} data={lines} />
      </div>

      {/* Amount in words beside the totals — 184px tall, 16px apart */}
      <div
        data-print="summary"
        className="w-full flex flex-col lg:flex-row items-stretch gap-4"
      >
        <div
          data-print="words"
          className="flex-1 lg:min-h-[184px] rounded-lg border border-pneutral-200 bg-white p-4 flex flex-col gap-4"
        >
          <span className="font-body text-p4 font-normal text-pneutral-800">
            Amount in words
          </span>
          <span className="font-body text-p4 font-semibold text-pneutral-900 capitalize">
            {amountInWords(Math.round(totals.netAmount || 0))}
          </span>
        </div>

        {/* Amount summary — four 24px lines at an 8px rhythm, then NET
            PAYABLE on its own 32px line above a hairline. */}
        <div
          data-print="totals"
          className="w-full lg:w-[364px] shrink-0 lg:h-[184px] rounded-lg border border-pneutral-200 bg-white p-3 flex flex-col gap-2"
        >
          {AMOUNT_ROWS.map((row) => (
            <div
              key={row.label}
              className="flex h-6 items-center justify-between"
            >
              <span className="font-body text-p4 font-normal text-pneutral-800">
                {row.label}
              </span>
              <span className="font-body text-p4 font-semibold text-pneutral-900">
                ₹ {formatAmount(row.value)}
              </span>
            </div>
          ))}

          <div
            data-print="net"
            className="flex h-8 items-center justify-between border-t border-pneutral-200 pt-2"
          >
            {/* Purple: the one figure the customer and the counter both look
                for. Total less the discount. */}
            <span className="font-body text-p5 font-semibold text-secondary-700">
              NET PAYABLE
            </span>
            <span className="font-body text-p5 font-bold text-secondary-700">
              ₹ {formatAmount(totals.netAmount || 0)}
            </span>
          </div>
        </div>
      </div>

      <BillFooter />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full bg-transparent pb-12">
      {renderBill(printRef)}

      {/* Action Buttons Footer */}
      <div className="w-full h-14 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            if (onBack) {
              onBack();
            } else if (onDone) {
              onDone();
            } else {
              window.location.href = "/dashboard/salesBilling";
            }
          }}
          disabled={isSubmitting}
          className={`${BACK_BUTTON} w-[108px] shrink-0`}
        >
          Back
        </button>

        {/* Viewing a saved bill prints it; the create flow saves it. */}
        <button
          type="button"
          onClick={currentMode === "view" ? handlePrint : handleSave}
          disabled={isSubmitting}
          className={`${PRIMARY_BUTTON} ${
            currentMode === "view" ? "w-[128px]" : "w-[108px]"
          } shrink-0`}
        >
          {currentMode === "view"
            ? "Print"
            : isSubmitting
            ? currentMode === "download"
              ? "Preparing..."
              : "Saving..."
            : currentMode === "download"
            ? "Download"
            : "Save"}
        </button>
      </div>

      {/* The PDF is rasterised from this copy, not from the node on screen.
          On screen the bill inherits whatever width the dashboard shell gives
          it — and that shell nests pages in overflow-hidden containers, which
          clip a capture. Rendered here at a fixed width, just over A4
          landscape's 1123px at 96dpi, it always carries the full desktop design
          and scales down to the page nearly 1:1. A WhatsApp send would go
          through this same path. */}
      {isCapturing && (
        <OffscreenPortal width={1240} onReady={handleCaptureReady}>
          {renderBill()}
        </OffscreenPortal>
      )}

      <BillingSuccessModal
        isOpen={!!savedBillNo}
        billNo={savedBillNo ?? invoiceNo}
        totalItems={lines.length}
        netAmount={totals.netAmount}
        onSendToWhatsapp={handleSendToWhatsapp}
        onPrint={handlePrint}
        onBackToDashboard={() => {
          setSavedBillNo(null);
          if (onDone) onDone();
        }}
      />
    </div>
  );
};

export default PaymentSummary;
