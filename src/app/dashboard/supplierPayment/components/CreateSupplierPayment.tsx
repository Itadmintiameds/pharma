"use client";

import { useEffect, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, CalendarDays, CircleAlert, FileText, Search } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { getAllSupplierPayments } from "@/services/SupplierPaymentService";
import { PurchaseData } from "@/types/PurchaseData";
import {
  isUnpaidCreditPurchase,
  sumPaidForPurchase,
  toEligibleInvoice,
} from "./supplierPaymentUtils";

export interface EligibleInvoice {
  /** The purchase id. */
  id: number;
  supplierId: number;
  /** yyyy-mm-dd */
  invoiceDateIso: string;
  supplierName: string;
  invoiceNo: string;
  grnNo: string;
  paymentType: string;
  invoiceAmount: number;
  totalPaidAmount: number;
  purchaseReturnAdjusted: number;
  currentOutstanding: number;
  /** yyyy-mm-dd */
  paymentDueDateIso: string;
}

export interface SupplierPaymentDraft {
  invoice: EligibleInvoice;
  /** yyyy-mm-dd */
  paymentDate: string;
  paymentAmount: number;
  paymentMode: string;
  referenceNo: string;
  remarks: string;
}

const PAYMENT_MODE_OPTIONS = ["Cash", "UPI", "Cheque", "Bank Transfer"].map(
  (mode) => ({ label: mode, value: mode })
);

export const CARD_CLASS =
  "flex w-full flex-col gap-md rounded-2xl bg-white p-md shadow-[4px_4px_12px_-2px_#d5d5d433,-4px_-4px_12px_0px_#d5d5d433,0px_0px_12px_4px_#c0c1be33]";

export const formatRupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/** yyyy-mm-dd → "dd-mm-yyyy". */
export const formatDate = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

const regularCell = (value: string) => (
  <span className="text-p3 font-regular text-pneutral-900">{value}</span>
);

const semiboldCell = (value: string) => (
  <span className="text-p3 font-semibold text-pneutral-900">{value}</span>
);

const buildEligibleInvoiceColumns = (
  onSelect: (invoice: EligibleInvoice) => void
): ColumnDef<EligibleInvoice>[] => [
  {
    header: "SL. NO.",
    cell: ({ row }) => regularCell(String(row.index + 1)),
  },
  {
    accessorKey: "invoiceDateIso",
    header: "INVOICE DATE",
    cell: ({ row }) => regularCell(formatDate(row.original.invoiceDateIso)),
  },
  {
    accessorKey: "supplierName",
    header: "SUPPLIER NAME",
    cell: ({ row }) => semiboldCell(row.original.supplierName),
  },
  {
    accessorKey: "invoiceNo",
    header: "INVOICE NO.",
    cell: ({ row }) => regularCell(row.original.invoiceNo),
  },
  {
    accessorKey: "grnNo",
    header: "GRN NO.",
    cell: ({ row }) => regularCell(row.original.grnNo),
  },
  {
    accessorKey: "invoiceAmount",
    header: "INVOICE AMOUNT",
    cell: ({ row }) => regularCell(formatRupees(row.original.invoiceAmount)),
  },
  {
    accessorKey: "totalPaidAmount",
    header: "TOTAL PAID AMOUNT",
    cell: ({ row }) => regularCell(formatRupees(row.original.totalPaidAmount)),
  },
  {
    accessorKey: "purchaseReturnAdjusted",
    header: "PURCHASE RETURN ADJUSTED",
    cell: ({ row }) =>
      regularCell(formatRupees(row.original.purchaseReturnAdjusted)),
  },
  {
    accessorKey: "currentOutstanding",
    header: "CURRENT OUTSTANDING AMOUNT",
    cell: ({ row }) => semiboldCell(formatRupees(row.original.currentOutstanding)),
  },
  {
    accessorKey: "paymentDueDateIso",
    header: "PAYMENT DUE DATE",
    cell: ({ row }) => regularCell(formatDate(row.original.paymentDueDateIso)),
  },
  {
    header: "ACTION",
    cell: ({ row }) => (
      <Button
        type="button"
        variant="outline"
        onClick={() => onSelect(row.original)}
        className="h-9! max-h-11 min-h-9 w-27! min-w-27 rounded-lg! border-[1.5px]! border-secondary-700! bg-white! px-sm text-label-l3! font-medium! text-secondary-700!"
      >
        Select
      </Button>
    ),
  },
];

/** Label over value — one field of the Invoice Details card. */
export const DetailField = ({
  label,
  value,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex min-w-0 flex-col gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className={`wrap-break-word text-label-l4 font-semibold ${valueClassName}`}>
      {value}
    </p>
  </div>
);

/** Error line under a field — Figma "Input error message": text, then a small alert icon. */
const FieldError = ({ message }: { message: string }) => (
  <p className="mt-1 flex items-center gap-xxsm px-xxsm text-label-l3 font-regular text-warning-500">
    {message}
    <CircleAlert size={14} strokeWidth={1.75} className="shrink-0" />
  </p>
);

/** Label on the left, amount on the right — one row of the Payment Impact card. */
export const ImpactRow = ({
  label,
  value,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="flex w-full items-center gap-xsm">
    <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">{label}</p>
    <p className={`shrink-0 text-label-l4 font-semibold ${valueClassName}`}>{value}</p>
  </div>
);

/** Centered icon + message that replaces the table — Figma "No Eligible Invoice State". */
const NoEligibleInvoiceState = ({ reason }: { reason?: string }) => (
  <div className="flex w-full flex-col items-center justify-center gap-sm py-hg">
    <div className="flex size-18 shrink-0 items-center justify-center rounded-full bg-primary-100">
      <FileText size={32} strokeWidth={1.5} className="text-primary-800" />
    </div>
    <p className="text-center text-label-l5 font-semibold text-pneutral-900">
      No eligible outstanding Credit Purchase Invoice is available.
    </p>
    {reason && (
      <p className="text-center text-p3 font-regular text-pneutral-500">{reason}</p>
    )}
  </div>
);

interface EligibleInvoiceSearch {
  invoices: EligibleInvoice[];
  /** Why the purchases matching the search can't be paid, when none can. */
  ineligibleReason?: string;
}

/** Why a purchase isn't offered for payment, or "" when it is. */
const getIneligibleReason = (purchase: PurchaseData, invoice: EligibleInvoice) => {
  if (purchase.paymentType?.toUpperCase() !== "CREDIT")
    return `${invoice.invoiceNo} is a ${invoice.paymentType} purchase; only Credit purchases are paid here.`;
  if (!isUnpaidCreditPurchase(purchase))
    return `${invoice.invoiceNo} has already been paid.`;
  if (invoice.currentOutstanding <= 0)
    return `${invoice.invoiceNo} has no outstanding amount (invoice amount ${formatRupees(invoice.invoiceAmount)}, paid ${formatRupees(invoice.totalPaidAmount)}).`;
  return "";
};

/**
 * Eligible invoices are the unpaid credit purchases of the current warehouse
 * or pharmacy, less what has already been paid against each, matching the
 * search on supplier name, invoice no. or GRN no. Fetched on every search so
 * the outstanding amounts are current.
 */
const fetchEligibleInvoices = async (text: string): Promise<EligibleInvoiceSearch> => {
  const query = text.trim().toLowerCase();
  const [purchases, payments] = await Promise.all([
    getAllPurchases(),
    getAllSupplierPayments(),
  ]);

  const matches = purchases
    .filter((purchase) => purchase.purchaseId !== undefined)
    .map((purchase) => {
      const invoice = toEligibleInvoice(
        purchase,
        purchase.purchaseId as number,
        sumPaidForPurchase(payments, purchase.purchaseId)
      );
      return { invoice, reason: getIneligibleReason(purchase, invoice) };
    })
    .filter(
      ({ invoice }) =>
        !query ||
        [invoice.supplierName, invoice.invoiceNo, invoice.grnNo].some((value) =>
          value.toLowerCase().includes(query)
        )
    );

  const invoices = matches.filter((match) => !match.reason).map((match) => match.invoice);
  if (invoices.length > 0 || !query) return { invoices };

  return {
    invoices,
    ineligibleReason:
      matches[0]?.reason ??
      `No purchase matching "${text.trim()}" was found for the current pharmacy / warehouse.`,
  };
};

interface CreateSupplierPaymentProps {
  onCancel: () => void;
  /** Reopens the form filled in, e.g. on "Back to Edit" from the review. */
  initialDraft?: SupplierPaymentDraft | null;
  /** Called with the filled-in payment when "Continue to Review" is pressed. */
  onContinue?: (draft: SupplierPaymentDraft) => void;
}

const CreateSupplierPayment = ({
  onCancel,
  initialDraft = null,
  onContinue = () => {},
}: CreateSupplierPaymentProps) => {
  // Nothing loads until "Search": null means no search has run yet. Coming
  // back from the review, the chosen invoice is searched again on mount.
  const [results, setResults] = useState<EligibleInvoice[] | null>(null);
  const [ineligibleReason, setIneligibleReason] = useState("");
  const [isSearching, setIsSearching] = useState(Boolean(initialDraft));
  const [searchError, setSearchError] = useState("");
  const [search, setSearch] = useState(initialDraft?.invoice.invoiceNo ?? "");
  // Ignores the answer to an older search that lands after a newer one.
  const latestSearchRef = useRef(0);

  const fetchAndShow = (text: string) => {
    const searchId = ++latestSearchRef.current;
    fetchEligibleInvoices(text)
      .then(({ invoices, ineligibleReason: reason }) => {
        if (searchId !== latestSearchRef.current) return;
        setResults(invoices);
        setIneligibleReason(reason ?? "");
      })
      .catch((err) => {
        if (searchId !== latestSearchRef.current) return;
        console.error("Failed to fetch eligible invoices:", err);
        setSearchError(err?.message || "Failed to fetch purchase invoices.");
        setResults(null);
      })
      .finally(() => {
        if (searchId === latestSearchRef.current) setIsSearching(false);
      });
  };

  const runSearch = (text: string) => {
    setIsSearching(true);
    setSearchError("");
    fetchAndShow(text);
  };

  useEffect(() => {
    if (initialDraft) fetchAndShow(initialDraft.invoice.invoiceNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedInvoice, setSelectedInvoice] = useState<EligibleInvoice | null>(
    initialDraft?.invoice ?? null
  );
  const [paymentDate, setPaymentDate] = useState(initialDraft?.paymentDate ?? "");
  // A native date input can't show a placeholder, so it is a text input
  // reading "Select date" until focused or filled.
  const [paymentDateFocused, setPaymentDateFocused] = useState(false);
  // Required-field errors only show once "Continue to Review" has been tried.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  /** Digits only; formatted with ₹ and commas for display. */
  const [paymentAmount, setPaymentAmount] = useState(
    initialDraft ? String(initialDraft.paymentAmount) : ""
  );
  const [paymentMode, setPaymentMode] = useState(initialDraft?.paymentMode ?? "");
  const [referenceNo, setReferenceNo] = useState(initialDraft?.referenceNo ?? "");
  const [remarks, setRemarks] = useState(initialDraft?.remarks ?? "");
  const paymentDateRef = useRef<HTMLInputElement>(null);

  // Picking another invoice starts its payment over: an amount entered
  // against one invoice's outstanding means nothing against another's.
  const selectInvoice = (invoice: EligibleInvoice) => {
    if (invoice.id === selectedInvoice?.id) return;
    setSelectedInvoice(invoice);
    setPaymentDate("");
    setPaymentAmount("");
    setSubmitAttempted(false);
    setPaymentMode("");
    setReferenceNo("");
    setRemarks("");
  };

  const amount = Number(paymentAmount) || 0;
  const outstandingAfterPayment = selectedInvoice
    ? selectedInvoice.currentOutstanding - amount
    : 0;
  const exceedsOutstanding = outstandingAfterPayment < 0;
  const paymentDateError =
    submitAttempted && !paymentDate ? "Payment Date is mandatory." : "";
  const paymentAmountError =
    submitAttempted && amount <= 0 ? "Payment Amount is mandatory." : "";
  const paymentModeError =
    submitAttempted && !paymentMode ? "Payment Mode is mandatory." : "";

  const continueToReview = () => {
    setSubmitAttempted(true);
    if (
      !selectedInvoice ||
      !paymentDate ||
      amount <= 0 ||
      !paymentMode ||
      exceedsOutstanding
    )
      return;
    onContinue({
      invoice: selectedInvoice,
      paymentDate,
      paymentAmount: amount,
      paymentMode,
      referenceNo: referenceNo.trim(),
      remarks: remarks.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-md">
      {/* SP Create Header Row */}
      <p className="text-h5 font-semibold text-pneutral-900">
        Create Supplier Payment
      </p>

      {/* Select Purchase Invoice Card */}
      <div className={CARD_CLASS}>
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Select Purchase Invoice
        </p>

        {/* Invoice Search Row */}
        <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-center">
          <Input
            placeholder="Search by Supplier Name, Invoice No., GRN No."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(search);
            }}
            leftIcon={<Search size={20} className="text-pneutral-500" />}
            className="rounded-lg! border-[1.5px]! border-sneutral-100! [&_input]:pl-2 [&_input]:text-label-l3 [&_input]:font-regular [&_input]:text-ellipsis [&_input]:placeholder:text-pneutral-300"
            containerClassName="w-full min-w-0 sm:flex-1"
          />

          <Button
            type="button"
            variant="primary"
            onClick={() => runSearch(search)}
            disabled={isSearching}
            className="w-full! min-w-27 shrink-0 rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-28.5!"
          >
            Search
          </Button>
        </div>

        {isSearching || searchError ? (
          <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
            {isSearching ? "Loading purchase invoices..." : searchError}
          </div>
        ) : results === null ? null : results.length === 0 ? (
          /* No Eligible Invoice State — Figma node 4312:53364 */
          <NoEligibleInvoiceState reason={ineligibleReason} />
        ) : (
          <>
            {/* Eligible Invoices Table — shared grid DataTable, with Figma's
                header/row sizing applied from outside so the common component
                stays untouched. Scrolls sideways below the width the columns need. */}
            <div className="w-full [&>div]:overflow-x-auto [&>div]:rounded-lg [&>div]:shadow-none [&_table]:min-w-238 [&_thead_tr]:h-20 [&_th]:border-pneutral-200 [&_th]:px-sm [&_th]:py-xsm [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_th]:text-pneutral-50 [&_tbody_tr]:h-17 [&_td]:px-sm [&_td]:py-xsm [&_td]:wrap-break-word">
              <DataTable
                columns={buildEligibleInvoiceColumns(selectInvoice)}
                data={results}
                rowClassName={(invoice) =>
                  invoice.id === selectedInvoice?.id ? "bg-primary-100" : ""
                }
              />
            </div>
          </>
        )}
      </div>

      {selectedInvoice && (
        <>
          {/* Invoice Details Card */}
          <div className={CARD_CLASS}>
            <p className="text-label-l5 font-semibold text-pneutral-900">
              Invoice Details
            </p>

            <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <DetailField label="Supplier Name" value={selectedInvoice.supplierName} />
              <DetailField label="Invoice No." value={selectedInvoice.invoiceNo} />
              <DetailField label="GRN No." value={selectedInvoice.grnNo} />
              <DetailField
                label="Invoice Date"
                value={formatDate(selectedInvoice.invoiceDateIso)}
              />
              <DetailField label="Payment Type" value={selectedInvoice.paymentType} />
              <DetailField
                label="Payment Due Date"
                value={formatDate(selectedInvoice.paymentDueDateIso)}
              />
              <DetailField
                label="Invoice Amount"
                value={formatRupees(selectedInvoice.invoiceAmount)}
              />
              <DetailField
                label="Total Paid Amount"
                value={formatRupees(selectedInvoice.totalPaidAmount)}
              />
              <DetailField
                label="Purchase Return Adjusted"
                value={formatRupees(selectedInvoice.purchaseReturnAdjusted)}
              />
              <DetailField
                label="Current Outstanding"
                value={formatRupees(selectedInvoice.currentOutstanding)}
                valueClassName="text-primary-800"
              />
            </div>
          </div>

          {/* SP Payment Row */}
          <div className="flex w-full flex-col gap-md lg:flex-row lg:items-stretch">
            {/* Payment Details Card */}
            <div className={`${CARD_CLASS} min-w-0 lg:flex-1`}>
              <p className="text-label-l5 font-semibold text-pneutral-900">
                Payment Details
              </p>

              {exceedsOutstanding && (
                /* Outstanding Updated Message — Figma node 4312:53822 */
                <div
                  role="alert"
                  className="flex w-full items-center gap-sm rounded-2xl bg-warning-50 p-md"
                >
                  <CircleAlert
                    size={24}
                    strokeWidth={1.5}
                    className="shrink-0 text-warning-600"
                  />
                  <p className="min-w-0 flex-1 text-p3 font-semibold text-warning-600">
                    Current Outstanding has been updated to{" "}
                    {formatRupees(selectedInvoice.currentOutstanding)}. Payment Amount
                    cannot exceed the latest outstanding amount.
                  </p>
                </div>
              )}

              <div className="flex w-full flex-col gap-md md:flex-row md:items-start">
                {/* The shared Input/Dropdown `error` prop gives the red border;
                    its own 12px message is hidden in favour of Figma's 14px
                    FieldError with the trailing icon. */}
                <div className="min-w-0 md:flex-1">
                  <Input
                    label="Payment Date"
                    required
                    type={paymentDateFocused || paymentDate ? "date" : "text"}
                    ref={paymentDateRef}
                    placeholder="Select date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    onFocus={() => setPaymentDateFocused(true)}
                    onBlur={() => setPaymentDateFocused(false)}
                    onClick={() => paymentDateRef.current?.showPicker?.()}
                    error={paymentDateError || undefined}
                    rightIcon={<CalendarDays size={20} className="text-pneutral-900" />}
                    className="cursor-pointer rounded-lg! [&_input]:text-p4 [&_input]:font-regular [&_input]:placeholder:text-pneutral-500 [&_input::-webkit-calendar-picker-indicator]:hidden"
                    containerClassName="[&>p]:hidden"
                  />
                  {paymentDateError && <FieldError message={paymentDateError} />}
                </div>

                <div className="min-w-0 md:flex-1">
                  <Input
                    label="Payment Amount"
                    required
                    inputMode="numeric"
                    placeholder="Enter amount"
                    value={paymentAmount ? formatRupees(Number(paymentAmount)) : ""}
                    onChange={(e) =>
                      setPaymentAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))
                    }
                    // Over the outstanding: red border only — the banner above
                    // carries the message.
                    error={paymentAmountError || (exceedsOutstanding ? " " : undefined)}
                    className="rounded-lg! [&_input]:text-p4 [&_input]:font-regular [&_input]:placeholder:text-pneutral-500"
                    containerClassName="[&>p]:hidden"
                  />
                  {paymentAmountError && <FieldError message={paymentAmountError} />}
                </div>

                <div className="min-w-0 md:flex-1">
                  <Dropdown
                    label="Payment Mode"
                    required
                    options={PAYMENT_MODE_OPTIONS}
                    value={paymentMode}
                    onChange={(value) => setPaymentMode(String(value))}
                    placeholder="Select payment mode"
                    error={paymentModeError || undefined}
                    className="[&>p]:hidden"
                  />
                  {paymentModeError && <FieldError message={paymentModeError} />}
                </div>
              </div>

              <div className="flex w-full flex-col gap-md md:flex-row md:items-start">
                <Input
                  label="Reference / Transaction No."
                  placeholder="Enter reference / transaction no."
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="rounded-lg! [&_input]:text-p4 [&_input]:font-regular"
                  containerClassName="min-w-0 md:flex-1"
                />

                {/* Remarks Textarea */}
                <label className="flex min-w-0 flex-col md:flex-1">
                  <span className="px-xxsm text-label-l4 font-medium text-pneutral-800">
                    Remarks
                  </span>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks"
                    className="min-h-25 w-full resize-y rounded-lg border border-pneutral-300 bg-white p-sm text-p4 font-regular text-pneutral-900 outline-none placeholder:text-pneutral-500 focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300"
                  />
                </label>
              </div>
            </div>

            {/* Payment Impact Card */}
            <div className={`${CARD_CLASS} lg:w-90 lg:shrink-0`}>
              <p className="text-label-l5 font-semibold text-pneutral-900">
                Payment Impact
              </p>

              <ImpactRow
                label="Current Outstanding"
                value={formatRupees(selectedInvoice.currentOutstanding)}
              />
              <ImpactRow
                label="Payment Amount"
                value={amount > 0 ? formatRupees(amount) : "—"}
              />

              <div className="h-px w-full bg-pneutral-200" />

              <div className="flex w-full items-center gap-xsm">
                <p className="min-w-0 flex-1 text-label-l4 font-semibold text-pneutral-900">
                  Outstanding After Payment
                </p>
                <p className="shrink-0 text-label-l5 font-semibold text-primary-800">
                  {amount <= 0 || exceedsOutstanding
                    ? "—"
                    : formatRupees(outstandingAfterPayment)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SP Create Footer Row */}
      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full! min-w-27 rounded-lg! border-2! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:w-28.5!"
        >
          Cancel
        </Button>

        {selectedInvoice && (
          <Button
            type="button"
            variant="primary"
            onClick={continueToReview}
            className="w-full! min-w-27 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-58.25!"
          >
            Continue to Review
            <ArrowRight size={20} className="shrink-0" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateSupplierPayment;
