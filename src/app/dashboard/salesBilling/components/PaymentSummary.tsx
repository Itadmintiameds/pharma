"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import DataTable from "@/app/components/common/table/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { showToast } from "@/app/components/common/Toast";
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
  lineNet,
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
      <div
        data-print="header-grid"
        className="grid grid-cols-1 items-center gap-4 md:grid-cols-[200px_1fr_200px]"
      >
        {/* Logo — the API has no URL yet, so the name's initial stands in for
            it and the slot keeps its size either way. */}
        <div className="flex justify-center md:justify-start">
          <div
            data-print="header-logo"
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary-200 bg-secondary-50"
          >
            {pharmacy?.pharmacyLogo ? (
              // Plain <img>: the URL is whatever the API returns, so it cannot
              // go through next/image's configured remote patterns.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pharmacy.pharmacyLogo}
                alt={name}
                crossOrigin="anonymous"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="font-heading text-h4 font-semibold text-secondary-600">
                {name.trim().charAt(0).toUpperCase() || "P"}
              </span>
            )}
          </div>
        </div>

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
          className="flex flex-col gap-1.5 md:items-stretch"
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
    <Image
      src="/TiamedsLogo.svg"
      alt="Tiameds"
      width={96}
      height={26}
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

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsSubmitting(true);
    try {
      await downloadElementAsPdf(
        printRef.current,
        `invoice-${invoiceNo.replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`
      );
      showToast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate the invoice PDF", err);
      showToast.error("Could not generate the PDF.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      header: () => <Centered>Discount (%)</Centered>,
      cell: ({ row }) => <Centered>{row.original.discountPercentage || 0}</Centered>,
    },
    {
      id: "rate",
      header: () => <Centered>Rate (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>
          {formatAmount(
            row.original.sellingPricePerUnit ?? row.original.mrpPerUnit ?? 0
          )}
        </Centered>
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
      id: "netAmount",
      header: () => <Centered>Net Amount (₹)</Centered>,
      cell: ({ row }) => (
        <Centered>{formatAmount(lineNet(row.original))}</Centered>
      ),
    },
  ];

  /** The three invoice facts on the left of the bill details card. */
  const BILL_FACTS = [
    { label: "Bill No", value: invoiceNo || "—" },
    { label: "Bill Date & Time", value: formatDateTime(billDate) },
    { label: "Payment Mode", value: payment.paymentMode || "CASH" },
  ];

  /** The four lines above NET PAYABLE. Discount holds whether or not one was
   *  given, so the card keeps its 184px height either way. */
  const AMOUNT_ROWS = [
    { label: "Gross Amount", value: totals.grossAmount || 0 },
    {
      label: "Discount",
      value: (totals.itemDiscount || 0) + (totals.billDiscount || 0),
    },
    { label: "Taxable Amt", value: totals.taxableAmount || 0 },
    // Amount only — lines can sit on different GST slabs.
    { label: "GST", value: totals.gstAmount || 0 },
  ];

  /** The two customer facts on the right. */
  const CUSTOMER_FACTS = [
    { label: "Customer", value: customer?.customerName || "Walk-in Customer" },
    { label: "Mobile", value: customer?.mobileNo || "—" },
  ];

  return (
    <div className="flex flex-col gap-4 w-full bg-transparent pb-12">
      {/* Printable Ref Wrapper */}
      <div
        ref={printRef}
        data-print-root
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
              <span className="font-body text-p5 font-semibold text-pneutral-900">
                NET PAYABLE
              </span>
              <span className="font-body text-p5 font-semibold text-pneutral-900">
                ₹ {formatAmount(totals.netAmount || 0)}
              </span>
            </div>
          </div>
        </div>

        <BillFooter />
      </div>

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
            ? "Saving..."
            : currentMode === "download"
            ? "Download"
            : "Save"}
        </button>
      </div>

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
