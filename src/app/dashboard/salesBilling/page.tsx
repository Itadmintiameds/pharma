"use client";

/**
 * Sales & Billing landing page — the list of bills plus the entry point into
 * the POS flow. "+ Billing" walks through three screens in order:
 * Billing (cart) → BillingPayment → BillingPaymentInvoice.
 *
 * The step state lives here so going back from payment to the cart keeps
 * everything the cashier already typed.
 */

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Plus } from "lucide-react";
import SearchInput from "@/app/components/common/SearchInput";
import DataTable from "@/app/components/common/table/DataTable";
import Billing from "./components/Billing";
import BillingPayment from "./components/BillingPayment";
import BillingPaymentInvoice from "./components/BillingPaymentInvoice";
import {
  BillLine,
  BillRecord,
  BillStatus,
  CustomerInfo,
  PaymentDetails,
  PaymentMode,
} from "@/types/BillingData";
import { calculateBillTotals, formatAmount } from "@/utils/billingTotals";

type Step = "list" | "billing" | "payment" | "invoice";

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  CREDIT: "Credit",
};

const STATUS_STYLES: Record<BillStatus, string> = {
  Paid: "border-success-600 bg-success-50 text-success-800",
  Pending: "border-warning-600 bg-warning-50 text-warning-600",
  Cancelled: "border-pneutral-300 bg-pneutral-100 text-pneutral-600",
};

/** Placeholder rows until the bills endpoint is available. */
const MOCK_BILLS: BillRecord[] = [
  {
    billId: 1,
    invoiceNo: "INV-2608/05-001",
    billDate: "2026-08-05",
    customerName: "Ramesh Kumar",
    mobileNo: "9845012345",
    totalItems: 3,
    paymentMode: "CASH",
    status: "Paid",
    netAmount: 486,
  },
  {
    billId: 2,
    invoiceNo: "INV-2608/05-002",
    billDate: "2026-08-05",
    customerName: "Sunita Desai",
    mobileNo: "9900112233",
    totalItems: 5,
    paymentMode: "UPI",
    status: "Paid",
    netAmount: 1250,
  },
  {
    billId: 3,
    invoiceNo: "INV-2608/04-014",
    billDate: "2026-08-04",
    customerName: "Ajay Prasad",
    mobileNo: "9611098765",
    totalItems: 2,
    paymentMode: "CREDIT",
    status: "Pending",
    netAmount: 320.5,
  },
  {
    billId: 4,
    invoiceNo: "INV-2608/04-013",
    billDate: "2026-08-04",
    customerName: "Walk-in Customer",
    mobileNo: "—",
    totalItems: 1,
    paymentMode: "CARD",
    status: "Cancelled",
    netAmount: 128,
  },
];

/** What the POS flow has collected so far. */
interface BillDraft {
  customer?: CustomerInfo;
  lines: BillLine[];
  billDiscountPercentage: number;
  payment?: PaymentDetails;
  invoiceNo?: string;
  billDate?: string;
}

const EMPTY_DRAFT: BillDraft = { lines: [], billDiscountPercentage: 0 };

const Page = () => {
  const [step, setStep] = useState<Step>("list");
  const [search, setSearch] = useState("");
  const [bills, setBills] = useState<BillRecord[]>(MOCK_BILLS);
  const [draft, setDraft] = useState<BillDraft>(EMPTY_DRAFT);

  const totals = useMemo(
    () => calculateBillTotals(draft.lines, draft.billDiscountPercentage),
    [draft.lines, draft.billDiscountPercentage]
  );

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter(
      (bill) =>
        bill.invoiceNo.toLowerCase().includes(query) ||
        bill.customerName.toLowerCase().includes(query) ||
        bill.mobileNo.includes(query)
    );
  }, [bills, search]);

  const columns: ColumnDef<BillRecord>[] = [
    { header: "#", cell: ({ row }) => row.index + 1 },
    {
      accessorKey: "billDate",
      header: "Bill Date",
      cell: ({ row }) => row.original.billDate?.split("T")[0] ?? "—",
    },
    { accessorKey: "invoiceNo", header: "Invoice No" },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col text-left">
          <span className="text-label-l3 font-medium text-pneutral-900">
            {row.original.customerName}
          </span>
          <span className="text-p2 font-normal font-noto-sans text-pneutral-500">
            {row.original.mobileNo}
          </span>
        </div>
      ),
    },
    { accessorKey: "totalItems", header: "Items" },
    {
      accessorKey: "paymentMode",
      header: "Payment Mode",
      cell: ({ row }) => PAYMENT_MODE_LABELS[row.original.paymentMode],
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div
          className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-label-l3 font-medium ${
            STATUS_STYLES[row.original.status]
          }`}
        >
          {row.original.status}
        </div>
      ),
    },
    {
      accessorKey: "netAmount",
      header: "Amount (₹)",
      cell: ({ row }) => formatAmount(row.original.netAmount),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <div className="flex justify-center gap-5">
          <button
            type="button"
            aria-label={`View invoice ${row.original.invoiceNo}`}
            title="View invoice"
            onClick={() => console.log("View bill", row.original.billId)}
          >
            <Image
              src="/Purchase/ViewIcon.svg"
              alt="View"
              width={25}
              height={19}
              className="shrink-0"
            />
          </button>

          <button
            type="button"
            aria-label={`Download invoice ${row.original.invoiceNo}`}
            title="Download invoice"
            onClick={() => console.log("Download bill", row.original.billId)}
          >
            <Image
              src="/Purchase/DownloadIcon.svg"
              alt="Download"
              width={25}
              height={19}
              className="shrink-0"
            />
          </button>
        </div>
      ),
    },
  ];

  const startNewBill = () => {
    setDraft(EMPTY_DRAFT);
    setStep("billing");
  };

  /**
   * Stands in for the invoice number the billing API will return, so the
   * invoice screen has something to print in the meantime.
   */
  const nextInvoiceNo = () => {
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    return `INV-${stamp}-${String(bills.length + 1).padStart(3, "0")}`;
  };

  if (step === "billing") {
    return (
      <Billing
        initialCustomer={draft.customer}
        initialLines={draft.lines}
        initialBillDiscount={draft.billDiscountPercentage}
        onCancel={() => {
          setDraft(EMPTY_DRAFT);
          setStep("list");
        }}
        onProceedToPayment={({ customer, lines, billDiscountPercentage }) => {
          setDraft((prev) => ({
            ...prev,
            customer,
            lines,
            billDiscountPercentage,
          }));
          setStep("payment");
        }}
      />
    );
  }

  if (step === "payment" && draft.customer) {
    return (
      <BillingPayment
        customer={draft.customer}
        lines={draft.lines}
        totals={totals}
        onBack={() => setStep("billing")}
        onGenerateInvoice={(payment) => {
          const invoiceNo = nextInvoiceNo();
          const billDate = new Date().toISOString().split("T")[0];

          setDraft((prev) => ({ ...prev, payment, invoiceNo, billDate }));

          // Optimistic row so the list reflects the new bill until the billing
          // API is wired in.
          setBills((prev) => [
            {
              billId: prev.length + 1,
              invoiceNo,
              billDate,
              customerName: draft.customer?.customerName || "Walk-in Customer",
              mobileNo: draft.customer?.mobileNo || "—",
              totalItems: totals.totalItems,
              paymentMode: payment.paymentMode,
              status: payment.paymentMode === "CREDIT" ? "Pending" : "Paid",
              netAmount: totals.netAmount,
            },
            ...prev,
          ]);

          setStep("invoice");
        }}
      />
    );
  }

  if (step === "invoice" && draft.customer && draft.payment) {
    return (
      <BillingPaymentInvoice
        invoiceNo={draft.invoiceNo ?? "—"}
        billDate={draft.billDate ?? "—"}
        customer={draft.customer}
        lines={draft.lines}
        totals={totals}
        payment={draft.payment}
        onNewBill={startNewBill}
        onDone={() => {
          setDraft(EMPTY_DRAFT);
          setStep("list");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-pneutral-900">
        <div className="text-h4 font-semibold">Sales / Billing</div>
        <div className="text-p3 font-normal font-noto-sans">
          All bills raised at the counter
        </div>
      </div>

      <div className="w-full flex gap-2 items-center">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search bill by invoice no, customer name, mobile..."
            onQRCodeClick={() => console.log("Open QR Scanner")}
          />
        </div>

        <button
          type="button"
          onClick={startNewBill}
          className="w-52 h-12 flex items-center justify-center gap-2 rounded-lg bg-primary-800 text-label-l4 font-medium text-pneutral-50"
        >
          <Plus size={18} />
          Billing
        </button>
      </div>

      <DataTable columns={columns} data={filteredBills} />
    </div>
  );
};

export default Page;
