"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Box, Check, FileText, Printer } from "lucide-react";
import Button from "@/app/components/common/Button";
import DataTable from "@/app/components/common/table/DataTable";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import { getBillingById } from "@/services/BillingService";
import { getSalesReturnById } from "@/services/SalesReturnService";
import { BillingRecord } from "@/types/BillingData";
import { SalesReturnData } from "@/types/SalesReturnData";

// Figma "boxShadowCard" — same three-layer shadow as the other sales return cards
const CARD_SHADOW =
  "shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]";

interface ReturnedProduct {
  id: number;
  productName: string;
  batchNo: string;
  expiry: string;
  returnQty: number;
  reason: string;
  taxableValue: number;
  gst: number;
  returnAmount: number;
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
const formatDate = (value?: string | null) => {
  const [year, month, day] = (value ?? "").split("T")[0].split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

/** ISO date-time from the API → "dd-mm-yyyy, hh:mm AM". */
const formatDateTime = (value?: string | null) => {
  const [, time = ""] = (value ?? "").split("T");
  const [hours, minutes] = time.split(":").map(Number);
  if (!value || Number.isNaN(hours) || Number.isNaN(minutes)) return formatDate(value);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = String(hours % 12 || 12).padStart(2, "0");
  return `${formatDate(value)}, ${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
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

/** Each mode used on the bill, listed once — "Cash, UPI". */
const paymentModesOf = (bill: BillingRecord | null) =>
  Array.from(
    new Set((bill?.billingPayments ?? []).map((payment) => payment.paymentMode))
  )
    .map((mode) => PAYMENT_MODE_LABEL[mode] ?? mode)
    .join(", ") || "—";

const toReturnedProducts = (
  salesReturn: SalesReturnData,
  bill: BillingRecord | null
): ReturnedProduct[] =>
  (salesReturn.salesReturnDetails ?? []).map((detail, index) => {
    // The return line carries no expiry; the bill line for the same batch does.
    const billLine = bill?.billingDetails?.find(
      (line) => line.productId === detail.productId && line.batchId === detail.batchId
    );
    return {
      id: detail.salesReturnDetailId ?? index,
      productName: detail.productName ?? "—",
      batchNo: detail.batchNumber ?? "—",
      expiry: formatExpiry(billLine?.expiryDate),
      returnQty: Number(detail.salesReturnQuantity) || 0,
      reason: detail.salesReturnReason || "—",
      taxableValue: Number(detail.grossAmount) || 0,
      gst: Number(detail.gstAmount) || 0,
      returnAmount: Number(detail.netAmount) || 0,
    };
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

const RETURNED_PRODUCT_COLUMNS: ColumnDef<ReturnedProduct>[] = [
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
    header: "RETURN REASON",
    cell: ({ row }) => <TextCell>{row.original.reason}</TextCell>,
  },
  {
    accessorKey: "taxableValue",
    header: "TAXABLE VALUE",
    cell: ({ row }) => (
      <TextCell>{formatRupees(row.original.taxableValue)}</TextCell>
    ),
  },
  {
    accessorKey: "gst",
    header: "GST",
    cell: ({ row }) => <TextCell>{formatRupees(row.original.gst)}</TextCell>,
  },
  {
    accessorKey: "returnAmount",
    header: "RETURN AMOUNT",
    cell: ({ row }) => (
      <TextCell strong accent>
        {formatRupees(row.original.returnAmount)}
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
          : "text-p3 font-regular text-pneutral-600"
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
const BillDetail = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-600">{label}</p>
    <p className="wrap-break-word text-label-l4 font-semibold text-pneutral-900">
      {value}
    </p>
  </div>
);

// Shared look of the footer buttons — Figma 48px high, 8px corners, 16/24 medium label
const FOOTER_BUTTON =
  "h-12! max-h-13 min-h-12 min-w-27 shrink-0 gap-xsm rounded-lg! px-md text-label-l4! font-medium!";

const SalesReturnDetails = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by the success modal's "View Sales Return" and the list's view action
  const salesReturnId = searchParams.get("salesReturnId") ?? "";
  const [salesReturn, setSalesReturn] = useState<SalesReturnData | null>(null);
  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(salesReturnId));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!salesReturnId) return;

    let active = true;

    getSalesReturnById(salesReturnId)
      .then(async (data) => {
        if (!active) return;
        setSalesReturn(data);
        setLoadError("");
        // The bill fills in what the return does not carry: bill date, payment
        // mode, patient / IP numbers, bill amount and batch expiry dates.
        try {
          const bill = await getBillingById(data.billingId);
          if (active) setBilling(bill);
        } catch (err) {
          console.error("Failed to fetch the original bill:", err);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch the sales return:", err);
        setLoadError(err?.message || "Failed to fetch the sales return.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [salesReturnId]);

  const returnNo = salesReturn?.salesReturnNo ?? searchParams.get("returnNo") ?? "";
  const returnDate = formatDate(salesReturn?.salesReturnDate);
  const customerType = salesReturn?.customerType ?? billing?.customerType ?? null;
  const customerPhoneNo = salesReturn?.customerPhoneNo ?? billing?.customerPhoneNo;
  const bill = {
    billNo: salesReturn?.billNo ?? billing?.billNo ?? "—",
    billDate: formatDate(billing?.createdAt),
    customerType: customerType ? CUSTOMER_TYPE_LABEL[customerType] : "—",
    // Null for an anonymous walk-in bill.
    customerName: salesReturn
      ? salesReturn.customerName || "Walk-in Customer"
      : "—",
    patientNumber: billing?.patientNumber || "—",
    ipNumber: billing?.opIpNumber || "—",
    mobileNumber: customerPhoneNo ? formatMobile(customerPhoneNo) : "—",
    paymentMode: paymentModesOf(billing),
    billAmount: billing
      ? formatRupees(Number(billing.totalNetAmountAfterRoundOff ?? billing.totalNetAmount) || 0)
      : "—",
  };
  const isIpPatient = customerType === "IP_PATIENT";
  const products = salesReturn ? toReturnedProducts(salesReturn, billing) : [];

  // Return Value Summary — totals of the returned products above
  const sumOf = (pick: (product: ReturnedProduct) => number) =>
    products.reduce((sum, product) => sum + pick(product), 0);
  const totalReturnAmount = sumOf((p) => p.returnAmount);

  // IP Account Settlement — for IP patients the return cleared what they owed
  // on their IP account first and only the remainder was refunded. Everyone
  // else (Walk-in, OP, …) was refunded the full return amount.
  // TODO: the return does not store the IP account balance it settled against.
  // Until it does, this is what is still owed on the bill — the pending amount
  // after its latest payment — the same figure Review & Confirm used.
  const ipOutstandingBefore = isIpPatient
    ? Number(billing?.billingPayments?.at(-1)?.pendingAmount) || 0
    : 0;
  const outstandingAdjustment = Math.min(totalReturnAmount, ipOutstandingBefore);
  const refundAmount = totalReturnAmount - outstandingAdjustment;
  const ipOutstandingAfter = ipOutstandingBefore - outstandingAdjustment;
  const summaryItems = [
    { label: "Products Returned", value: String(products.length), accent: false },
    {
      label: "Total Return Qty",
      value: String(sumOf((p) => p.returnQty)),
      accent: false,
    },
    {
      label: "Total Taxable Value",
      value: formatRupees(sumOf((p) => p.taxableValue)),
      accent: false,
    },
    {
      label: "Total Return Amount",
      value: formatRupees(totalReturnAmount),
      accent: true,
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex min-w-0 flex-col gap-xxsm">
        {/* VSR Title Row — Figma node 4023:55339 */}
        <div className="flex flex-wrap items-center gap-sm">
          <p className="text-h5 font-semibold text-pneutral-900">
            Sales Return Details
          </p>
          <span className="inline-flex items-center justify-center gap-xxsm whitespace-nowrap rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium text-success-800">
            {salesReturn?.salesReturnStatus ?? "—"}
          </span>
        </div>

        {/* Sub Row — Figma node 4023:55342 */}
        <div className="flex flex-wrap items-center gap-x-sm">
          <p className="text-label-l4 font-semibold text-primary-800">
            {returnNo}
          </p>
          <span aria-hidden className="text-p3 font-regular text-pneutral-600">
            •
          </span>
          <p className="text-p3 font-regular text-pneutral-600">
            Returned on {returnDate}
          </p>
        </div>
      </div>

      {/* Original Bill Customer Card — Figma node 4023:55346 */}
      <div
        className={`flex w-full flex-col gap-sm rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <div className="flex w-full flex-wrap items-center gap-sm">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Original Bill &amp; Customer Details
          </p>
          <span className="inline-flex items-center justify-center gap-xsm whitespace-nowrap rounded-lg bg-primary-100 px-xsm py-xxsm text-p4 font-medium text-primary-800">
            {bill.customerType}
          </span>
          <button
            type="button"
            // Reuses the Sales & Billing invoice view; its Back returns here
            onClick={() => {
              const backHere = `/dashboard/salesReturn?view=details&salesReturnId=${salesReturnId}`;
              router.push(
                `/dashboard/salesBilling?billingId=${salesReturn?.billingId}&returnTo=${encodeURIComponent(backHere)}`
              );
            }}
            disabled={!salesReturn?.billingId}
            className="ml-auto flex h-9 min-w-27 shrink-0 items-center justify-center gap-xsm rounded-lg px-sm text-label-l3 font-medium text-primary-800 sm:w-45"
          >
            <FileText size={16} className="shrink-0" />
            View Original Bill
          </button>
        </div>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <BillDetail label="Bill No." value={bill.billNo} />
          <BillDetail label="Bill Date" value={bill.billDate} />
          <BillDetail
            label={isIpPatient ? "Patient Name" : "Customer Name"}
            value={bill.customerName}
          />
          {isIpPatient && (
            <>
              <BillDetail label="Patient Number" value={bill.patientNumber ?? ""} />
              <BillDetail label="IP Number" value={bill.ipNumber ?? ""} />
            </>
          )}
        </div>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <BillDetail label="Mobile Number" value={bill.mobileNumber} />
          <BillDetail label="Payment Mode" value={bill.paymentMode} />
          <BillDetail label="Bill Amount" value={bill.billAmount} />
        </div>
      </div>

      {/* Returned Products Table — Figma node 4023:55379. Shared grid DataTable
          with Figma's sizing applied from outside: 56px header with 12/18
          labels, 60px rows, 8px cell padding, 8px corners. Cells wrap so every
          column fits without horizontal scrolling. */}
      <div className="w-full [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-14 [&_th]:border-pneutral-200 [&_th]:p-xsm [&_th]:text-label-l2 [&_th]:font-semibold [&_tbody_tr]:h-15 [&_td]:p-xsm [&_td]:wrap-break-word">
        <DataTable
          columns={RETURNED_PRODUCT_COLUMNS}
          data={products}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              {!salesReturnId
                ? "No sales return selected."
                : isLoading
                  ? "Loading sales return..."
                  : loadError || "No products on this sales return."}
            </div>
          }
        />
      </div>

      {/* Return Value Summary Card — Figma node 4023:55425 */}
      <div className="grid w-full grid-cols-1 gap-md rounded-2xl border border-info-300 bg-info-50 p-md sm:grid-cols-2 lg:flex lg:items-start">
        {summaryItems.map(({ label, value, accent }) => (
          <div
            key={label}
            className="flex min-w-0 flex-1 flex-col items-start gap-xxsm"
          >
            <p className="text-p3 font-regular text-pneutral-600">{label}</p>
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

      {/* IP Account Settlement Card — Figma node 4023:55438 (IP patients only) */}
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

          <SettlementRow
            label="Return Amount"
            value={formatRupees(totalReturnAmount)}
          />
          <SettlementRow
            label="IP Outstanding Before Return"
            value={formatRupees(ipOutstandingBefore)}
          />
          <SettlementRow
            label="Outstanding Adjustment"
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

      {/* Refund Details Banner — Figma node 4023:55458 */}
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
            {formatRupees(refundAmount)} was refunded to the customer in{" "}
            {bill.paymentMode} on {returnDate}.
          </p>
        </div>
      </div>

      {/* Inventory Impact Card — Figma node 4023:55463. One line per returned
          product: what went back into saleable stock. */}
      <div
        className={`flex w-full flex-col gap-sm rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Inventory Impact
        </p>
        {products.map((product) => (
          <div key={product.id} className="flex w-full items-center gap-sm">
            {/* cube/mini — solid purple cube */}
            <Box
              size={20}
              aria-hidden
              fill="currentColor"
              stroke="white"
              className="shrink-0 text-primary-800"
            />
            <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-900">
              {product.returnQty === 1
                ? `1 unit of ${product.productName} (Batch ${product.batchNo}) was added back to Pharmacy saleable stock.`
                : `${product.returnQty} units of ${product.productName} (Batch ${product.batchNo}) were added back to Pharmacy saleable stock.`}
            </p>
          </div>
        ))}
      </div>

      {/* Audit Info Card — Figma node 4023:55468 */}
      <div className="flex w-full flex-wrap items-start gap-x-md gap-y-xxsm px-md py-sm text-p3 font-regular">
        <p className="flex gap-xxsm">
          <span className="text-pneutral-600">Created By:</span>
          <span className="text-pneutral-900">{salesReturn?.createdBy || "—"}</span>
        </p>
        <p className="flex gap-xxsm">
          <span className="text-pneutral-600">Created On:</span>
          <span className="text-pneutral-900">
            {formatDateTime(salesReturn?.createdAt)}
          </span>
        </p>
      </div>

      {/* View Sales Return Footer Row — Figma node 4023:55475 */}
      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-start sm:justify-between print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/salesReturn")}
          className={`${FOOTER_BUTTON} w-full! whitespace-nowrap border-secondary-700! text-secondary-700! sm:w-auto! sm:min-w-65`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back to Sales Return List
        </Button>

        <Button
          type="button"
          variant="primary"
          // Browser print of this page; swap for a formatted return slip if one is designed
          onClick={() => window.print()}
          className={`${FOOTER_BUTTON} w-full! bg-primary-800! text-pneutral-50! sm:w-55!`}
        >
          <Printer size={20} className="shrink-0" />
          Print Sales Return
        </Button>
      </div>
    </div>
  );
};

export default SalesReturnDetails;
