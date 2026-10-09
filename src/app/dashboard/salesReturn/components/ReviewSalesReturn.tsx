"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Check } from "lucide-react";
import Button from "@/app/components/common/Button";
import ConfirmSalesReturn from "./ConfirmSalesReturn";
import DataTable from "@/app/components/common/table/DataTable";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import { getBillingById } from "@/services/BillingService";
import { createSalesReturn } from "@/services/SalesReturnService";
import { BillingRecord } from "@/types/BillingData";
import { SalesReturnData } from "@/types/SalesReturnData";
import { pendingAfterReturns } from "@/utils/salesReturnAmounts";
import {
  clearSalesReturnDraft,
  loadSalesReturnDraft,
  SalesReturnDraftLine,
} from "./salesReturnDraft";

// Figma "boxShadowCard" — same three-layer shadow as the other sales return cards
const CARD_SHADOW =
  "shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]";

interface ReviewBill {
  billDate: string;
  customerType: string;
  customerName: string;
  /** IP patients only */
  patientNumber?: string;
  /** IP patients only */
  ipNumber?: string;
  mobileNumber: string;
  paymentMode: string;
  billAmount: string;
  billStatus: string;
}

interface ReviewItem {
  id: number;
  productId: string;
  batchId: string;
  productName: string;
  batchNo: string;
  expiry: string;
  soldQty: number;
  previouslyReturnedQty: number;
  returnableQty: number;
  returnQty: number;
  reason: string;
  amount: number;
  taxable: number;
  gst: number;
  lineReturnAmount: number;
}

const formatRupees = (amount: number) =>
  amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2027-12-31" → "Dec 2027". */
const formatExpiry = (value?: string | null) => {
  const [year, month] = (value ?? "").split("-");
  const name = MONTHS[Number(month) - 1];
  return year && name ? `${name} ${year}` : "—";
};

/** ISO date-time from the API → "dd-mm-yyyy". */
const formatBillDate = (value?: string) => {
  const [year, month, day] = (value ?? "").split("T")[0].split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

/** "9538481985" → "+91 95384 81985". */
const formatMobile = (digits: string) =>
  digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits;

const PAYMENT_MODE_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  CREDIT: "Credit",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  PAID: "Paid",
  PARTIAL: "Partially Paid",
  UNPAID: "Unpaid",
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const toReviewBill = (bill: BillingRecord): ReviewBill => {
  // A bill can be paid across several modes, so list each one once.
  const paymentModes = Array.from(
    new Set((bill.billingPayments ?? []).map((payment) => payment.paymentMode))
  ).map((mode) => PAYMENT_MODE_LABEL[mode] ?? mode);

  return {
    billDate: formatBillDate(bill.createdAt),
    customerType: bill.customerType ? CUSTOMER_TYPE_LABEL[bill.customerType] : "—",
    // Null for an anonymous walk-in bill.
    customerName: bill.customerName || "Walk-in Customer",
    patientNumber: bill.patientNumber || "—",
    ipNumber: bill.opIpNumber || "—",
    mobileNumber: bill.customerPhoneNo ? formatMobile(bill.customerPhoneNo) : "—",
    paymentMode: paymentModes.join(", ") || "—",
    billAmount: formatRupees(Number(bill.totalNetAmountAfterRoundOff ?? bill.totalNetAmount) || 0),
    billStatus: (bill.paymentType && PAYMENT_TYPE_LABEL[bill.paymentType]) || "—",
  };
};

/** The picked lines, priced pro rata from what the bill line charged. */
const toReviewItems = (
  bill: BillingRecord,
  draft: SalesReturnDraftLine[]
): ReviewItem[] =>
  draft.flatMap((picked) => {
    const detail = bill.billingDetails?.find(
      (line) => line.billingDetailsId === picked.billingDetailsId
    );
    if (!detail) return [];

    const soldQty = Number(detail.billQuantity) || 0;
    const previouslyReturnedQty = Number(detail.returnedQuantity) || 0;
    const share = soldQty ? picked.returnQty / soldQty : 0;
    const net = round2((Number(detail.netAmount) || 0) * share);

    return [
      {
        id: detail.billingDetailsId,
        productId: detail.productId,
        batchId: detail.batchId,
        productName: detail.productName,
        batchNo: detail.batchNumber,
        expiry: formatExpiry(detail.expiryDate),
        soldQty,
        previouslyReturnedQty,
        returnableQty: Math.max(soldQty - previouslyReturnedQty, 0),
        returnQty: picked.returnQty,
        reason:
          picked.reason === "Other" && picked.remarks
            ? `Other – ${picked.remarks}`
            : picked.reason,
        amount: net,
        taxable: round2((Number(detail.grossAmount) || 0) * share),
        gst: round2((Number(detail.gstAmount) || 0) * share),
        lineReturnAmount: net,
      },
    ];
  });

/** Plain 14/20 text cell; `strong` = semibold, `accent` = brand purple. */
const TextCell = ({
  children,
  strong = false,
  accent = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
  accent?: boolean;
}) => (
  <span
    className={`text-p3 ${strong ? "font-semibold" : "font-regular"} ${
      accent ? "text-primary-800" : "text-pneutral-900"
    }`}
  >
    {children}
  </span>
);

const REVIEW_ITEM_COLUMNS: ColumnDef<ReviewItem>[] = [
  {
    header: "#",
    cell: ({ row }) => <TextCell>{row.index + 1}</TextCell>,
  },
  {
    accessorKey: "productName",
    header: "PRODUCT",
    cell: ({ row }) => <TextCell strong>{row.original.productName}</TextCell>,
  },
  {
    accessorKey: "batchNo",
    header: "BATCH",
    cell: ({ row }) => <TextCell>{row.original.batchNo}</TextCell>,
  },
  {
    accessorKey: "expiry",
    header: "EXPIRY",
    cell: ({ row }) => <TextCell>{row.original.expiry}</TextCell>,
  },
  {
    accessorKey: "soldQty",
    header: "SOLD",
    cell: ({ row }) => <TextCell strong>{row.original.soldQty}</TextCell>,
  },
  {
    accessorKey: "previouslyReturnedQty",
    header: "PREV. RETURNED",
    cell: ({ row }) => (
      <TextCell>{row.original.previouslyReturnedQty}</TextCell>
    ),
  },
  {
    accessorKey: "returnableQty",
    header: "RETURNABLE",
    cell: ({ row }) => <TextCell>{row.original.returnableQty}</TextCell>,
  },
  {
    accessorKey: "returnQty",
    header: "RET. QTY",
    cell: ({ row }) => (
      <TextCell strong accent>
        {row.original.returnQty}
      </TextCell>
    ),
  },
  {
    accessorKey: "reason",
    header: "REASON",
    cell: ({ row }) => <TextCell>{row.original.reason}</TextCell>,
  },
  {
    accessorKey: "amount",
    header: "AMOUNT",
    cell: ({ row }) => <TextCell>{formatRupees(row.original.amount)}</TextCell>,
  },
  {
    accessorKey: "taxable",
    header: "TAXABLE",
    cell: ({ row }) => (
      <TextCell>{formatRupees(row.original.taxable)}</TextCell>
    ),
  },
  {
    accessorKey: "gst",
    header: "GST",
    cell: ({ row }) => <TextCell>{formatRupees(row.original.gst)}</TextCell>,
  },
  {
    accessorKey: "lineReturnAmount",
    header: "LINE RETURN AMT",
    cell: ({ row }) => (
      <TextCell strong accent>
        {formatRupees(row.original.lineReturnAmount)}
      </TextCell>
    ),
  },
];

/** One label / amount line of the IP Account Settlement card. */
const SettlementRow = ({
  label,
  value,
  emphasis = false,
  valueClassName = "text-pneutral-900",
}: {
  label: string;
  value: string;
  /** Bold 16/24 label — the result rows under the divider */
  emphasis?: boolean;
  valueClassName?: string;
}) => (
  <div className="flex w-full items-start gap-sm">
    <p
      className={`min-w-0 flex-1 ${
        emphasis
          ? "text-label-l4 font-semibold text-pneutral-900"
          : "text-p3 font-regular text-pneutral-500"
      }`}
    >
      {label}
    </p>
    <p
      className={`shrink-0 whitespace-nowrap text-label-l4 font-semibold ${valueClassName}`}
    >
      {value}
    </p>
  </div>
);

/** Grey caption over a bold value — one cell of the bill details grid. */
const BillDetail = ({
  label,
  value,
  captionClassName,
}: {
  label: string;
  value: string;
  captionClassName: string;
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm">
    <p className={`text-p3 font-regular ${captionClassName}`}>{label}</p>
    <p className="wrap-break-word text-label-l4 font-semibold text-pneutral-900">
      {value}
    </p>
  </div>
);

// Shared look of the footer buttons — Figma 48px high, 8px corners, 16/24 medium label
const FOOTER_BUTTON =
  "h-12! max-h-13 min-h-12 min-w-27 shrink-0 gap-xsm rounded-lg! px-md text-label-l4! font-medium!";

const ReviewSalesReturn = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Carried over from Create Sales Return ("Review and Confirm")
  const billingId = searchParams.get("billingId") ?? "";
  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(billingId));
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Set once the API has saved the return — opens the success modal
  const [savedReturn, setSavedReturn] = useState<SalesReturnData | null>(null);

  useEffect(() => {
    if (!billingId) return;

    let active = true;

    getBillingById(billingId)
      .then((data) => {
        if (!active) return;
        setBilling(data);
        setItems(toReviewItems(data, loadSalesReturnDraft(billingId)));
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch the original bill:", err);
        setLoadError(err?.message || "Failed to fetch the original bill.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [billingId]);

  const billNo = billing?.billNo ?? searchParams.get("billNo") ?? "";
  const bill: ReviewBill = billing
    ? toReviewBill(billing)
    : {
        billDate: "—",
        customerType: "—",
        customerName: "—",
        patientNumber: "—",
        ipNumber: "—",
        mobileNumber: "—",
        paymentMode: "—",
        billAmount: "—",
        billStatus: "—",
      };

  const returnAmount = items.reduce(
    (sum, item) => sum + item.lineReturnAmount,
    0,
  );

  // IP Account Settlement — for IP patients the return first clears what they
  // owe on their IP account and only the remainder is refunded. Everyone else
  // (Walk-in, OP, …) is refunded the full return amount.
  const isIpPatient = billing?.customerType === "IP_PATIENT";
  // TODO: read the patient's live IP account outstanding once an API exists.
  // Until then it is what is still owed on the bill — the pending amount after
  // its latest payment — less what earlier returns already took off it (the
  // same figure the Settle Payment screen collects).
  const pendingAmount = Number(billing?.billingPayments?.at(-1)?.pendingAmount) || 0;
  const ipOutstandingBefore =
    isIpPatient && billing ? pendingAfterReturns(pendingAmount, billing) : 0;
  const outstandingAdjustment = Math.min(returnAmount, ipOutstandingBefore);
  const refundAmount = returnAmount - outstandingAdjustment;
  const ipOutstandingAfter = ipOutstandingBefore - outstandingAdjustment;

  // The two Figma variants use slightly different greys for secondary text
  const subtitleColor = isIpPatient ? "text-pneutral-500" : "text-pneutral-600";
  const captionColor = isIpPatient ? "text-pneutral-500" : "text-pneutral-600";
  const summaryCaptionColor = isIpPatient
    ? "text-pneutral-700"
    : "text-pneutral-600";

  const confirmSalesReturn = async () => {
    if (!billing || items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const saved = await createSalesReturn({
        billingId: billing.billingId,
        totalGrossAmount: round2(items.reduce((sum, item) => sum + item.taxable, 0)),
        totalGstAmount: round2(items.reduce((sum, item) => sum + item.gst, 0)),
        totalNetAmount: round2(returnAmount),
        salesReturnDetails: items.map((item) => ({
          productId: item.productId,
          batchId: item.batchId,
          salesReturnQuantity: item.returnQty,
          salesReturnReason: item.reason,
          grossAmount: item.taxable,
          gstAmount: item.gst,
          netAmount: item.lineReturnAmount,
        })),
      });
      clearSalesReturnDraft(billingId);
      setSavedReturn(saved);
    } catch (err) {
      console.error("Failed to create the sales return:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create the sales return."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Return Summary — totals of the items listed above
  const summaryItems = [
    { label: "Items Selected", value: String(items.length), accent: false },
    {
      label: "Total Return Qty",
      value: String(items.reduce((sum, item) => sum + item.returnQty, 0)),
      accent: false,
    },
    {
      label: "Return Amount",
      value: formatRupees(returnAmount),
      accent: true,
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-md">
      {/* Title Col — Figma node 4023:54700 */}
      <div className="flex min-w-0 flex-col gap-xxsm">
        <p className="text-h5 font-semibold text-pneutral-900">
          Review &amp; Confirm Sales Return
        </p>
        <p className={`text-p3 font-regular ${subtitleColor}`}>
          Review the return details and settlement before final confirmation.
        </p>
      </div>

      {/* Original Bill Customer Card — Figma node 4023:54703 (IP) /
          4023:55157 (Walk-in, OP) */}
      <div
        className={`flex w-full flex-col gap-sm rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <div className="flex w-full flex-wrap items-center gap-sm">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Original Bill (Read Only)
          </p>
          <span className="inline-flex items-center justify-center gap-xsm whitespace-nowrap rounded-lg bg-primary-100 px-xsm py-xxsm text-p4 font-medium text-primary-800">
            {bill.customerType}
          </span>
        </div>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <BillDetail
            label="Bill No."
            value={billNo}
            captionClassName={captionColor}
          />
          <BillDetail
            label="Bill Date"
            value={bill.billDate}
            captionClassName={captionColor}
          />
          <BillDetail
            label={isIpPatient ? "Patient Name" : "Customer Name"}
            value={bill.customerName}
            captionClassName={captionColor}
          />
          {isIpPatient && (
            <>
              <BillDetail
                label="Patient Number"
                value={bill.patientNumber ?? ""}
                captionClassName={captionColor}
              />
              <BillDetail
                label="IP Number"
                value={bill.ipNumber ?? ""}
                captionClassName={captionColor}
              />
            </>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:flex lg:items-start">
          <BillDetail
            label="Mobile Number"
            value={bill.mobileNumber}
            captionClassName={captionColor}
          />
          <BillDetail
            label="Payment Mode"
            value={bill.paymentMode}
            captionClassName={captionColor}
          />
          <BillDetail
            label="Bill Amount"
            value={bill.billAmount}
            captionClassName={captionColor}
          />
          <BillDetail
            label="Bill Status"
            value={bill.billStatus}
            captionClassName={captionColor}
          />
        </div>
      </div>

      {/* Selected Return Items — Figma node 4023:54736 */}
      <p className="text-label-l5 font-semibold text-pneutral-900">
        Selected Return Items
      </p>

      {/* Review Items Table — Figma node 4023:54737. Shared grid DataTable with
          Figma's sizing applied from outside: 66px header with 12/18 labels,
          64px rows, 8px cell padding, 8px corners. Headers and cells wrap so
          all 13 columns fit without horizontal scrolling. */}
      <div className="w-full [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-16.5 [&_th]:border-pneutral-200 [&_th]:p-xsm [&_th]:text-label-l2 [&_th]:font-semibold [&_tbody_tr]:h-16 [&_td]:p-xsm [&_td]:wrap-break-word">
        <DataTable
          columns={REVIEW_ITEM_COLUMNS}
          data={items}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              {!billingId
                ? "No bill selected. Go back and find the original bill."
                : isLoading
                  ? "Loading return items..."
                  : loadError ||
                    "No return items selected. Go back and pick the products to return."}
            </div>
          }
        />
      </div>

      {/* Return Summary Card — Figma node 4023:54803 */}
      <div className="grid w-full grid-cols-1 gap-md rounded-2xl border border-info-300 bg-info-50 p-md sm:flex sm:items-start">
        {summaryItems.map(({ label, value, accent }) => (
          <div
            key={label}
            className="flex min-w-0 flex-1 flex-col items-start gap-xxsm"
          >
            <p className={`text-p3 font-regular ${summaryCaptionColor}`}>
              {label}
            </p>
            <p
              className={`wrap-break-word text-h5 font-semibold ${
                accent ? "text-primary-800" : "text-pneutral-900"
              }`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* IP Account Settlement Card — Figma node 4023:54813 (IP patients only) */}
      {isIpPatient && (
        <div
          className={`flex w-full flex-col gap-sm rounded-2xl bg-white p-md ${CARD_SHADOW}`}
        >
          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-label-l5 font-semibold text-pneutral-900">
              IP Account Settlement
            </p>
            <span className="inline-flex items-center justify-center gap-xsm whitespace-nowrap rounded-lg bg-primary-100 px-xsm py-xxsm text-p2 leading-6 font-medium text-primary-800">
              {bill.ipNumber}
            </span>
          </div>

          <p className="text-p3 font-regular text-pneutral-500">
            Retrieved live from the patient&apos;s IP account at the time of
            this review.
          </p>

          <SettlementRow
            label="Return Amount"
            value={formatRupees(returnAmount)}
          />
          <SettlementRow
            label="IP Outstanding Before Return"
            value={formatRupees(ipOutstandingBefore)}
          />
          <SettlementRow
            label="Outstanding Adjustment (MIN of Return Amount, Outstanding)"
            value={`− ${formatRupees(outstandingAdjustment)}`}
            valueClassName="text-success-600"
          />

          <div className="h-px w-full bg-pneutral-200" />

          <SettlementRow
            emphasis
            label="Refund Amount"
            value={formatRupees(refundAmount)}
            valueClassName="text-primary-800"
          />
          <SettlementRow
            emphasis
            label="IP Outstanding After Return"
            value={formatRupees(ipOutstandingAfter)}
          />
        </div>
      )}

      {/* Refund Details Banner — Figma node 4023:54834 (IP) / 4023:55261 (Walk-in, OP) */}
      <div
        role="status"
        className="flex w-full items-center gap-sm rounded-2xl bg-success-50 p-md"
      >
        {/* check-circle/solid */}
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-600"
        >
          <Check size={14} strokeWidth={3} className="text-white" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm text-success-800">
          <p className="text-label-l4 font-semibold">Refund Details</p>
          <p className="text-p3 font-regular">
            {isIpPatient
              ? `${formatRupees(refundAmount)} shall be refunded to the customer after adjusting the return value against the IP outstanding.`
              : `${formatRupees(refundAmount)} shall be refunded to the customer via the original payment mode (${bill.paymentMode}).`}
          </p>
        </div>
      </div>

      {submitError && (
        <p
          role="alert"
          className="w-full rounded-lg bg-warning-50 p-md text-label-l4 font-medium text-warning-600"
        >
          {submitError}
        </p>
      )}

      {/* Review Confirm Footer Row — Figma node 4023:54839 */}
      <div className="mt-auto flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-end sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(
              `/dashboard/salesReturn?view=create&billingId=${billingId}&billNo=${encodeURIComponent(billNo)}`,
            )
          }
          className={`${FOOTER_BUTTON} w-full! border-secondary-700! text-secondary-700! sm:w-71.25!`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back / Modify Return Items
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={confirmSalesReturn}
          disabled={!billing || items.length === 0 || isSubmitting}
          className={`${FOOTER_BUTTON} w-full! bg-primary-800! text-pneutral-50! disabled:cursor-not-allowed disabled:opacity-50 sm:w-57.5!`}
        >
          {isSubmitting ? "Confirming..." : "Confirm Sales Return"}
          {/* check-circle/solid */}
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-pneutral-50"
          >
            <Check size={12} strokeWidth={3} className="text-primary-800" />
          </span>
        </Button>
      </div>

      {/* Success Modal — Figma node 4023:55055 */}
      <ConfirmSalesReturn
        isOpen={savedReturn !== null}
        // The return is saved, so closing goes back to the list rather than
        // leaving a Confirm button that would raise it a second time.
        onClose={() => router.push("/dashboard/salesReturn")}
        onBackToList={() => router.push("/dashboard/salesReturn")}
        onViewSalesReturn={() =>
          router.push(
            `/dashboard/salesReturn?view=details&salesReturnId=${savedReturn?.salesReturnId ?? ""}&returnNo=${encodeURIComponent(savedReturn?.salesReturnNo ?? "")}&billNo=${encodeURIComponent(billNo)}`
          )
        }
        returnNo={savedReturn?.salesReturnNo ?? ""}
        billNo={billNo}
        returnAmount={formatRupees(returnAmount)}
        outstandingAdjustment={formatRupees(outstandingAdjustment)}
        refundAmount={formatRupees(refundAmount)}
        status={savedReturn?.salesReturnStatus ?? "Completed"}
      />
    </div>
  );
};

export default ReviewSalesReturn;
