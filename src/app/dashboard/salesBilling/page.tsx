"use client";

/**
 * Sales & Billing landing page — the list of bills plus the entry point into
 * the POS flow. "+ Billing" walks through three screens in order:
 * Billing (cart) → BillingPayment → BillingPaymentInvoice.
 *
 * The step state lives here so going back from payment to the cart keeps
 * everything the cashier already typed.
 */

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import SearchInput from "@/app/components/common/SearchInput";
import DataTable from "@/app/components/common/table/DataTable";
import Billing from "./components/Billing";
import BillingPayment from "./components/BillingPayment";
import PaymentSummary from "./components/PaymentSummary";
import {
  BillLine,
  BillRecord,
  BillStatus,
  BillingRecord,
  CustomerInfo,
  PaymentDetails,
  PaymentMode,
} from "@/types/BillingData";
import {
  calculateBillTotals,
  formatAmount,
  type DiscountType,
} from "@/utils/billingTotals";
import {
  buildBillingPayload,
  createBilling,
  getAllBillings,
  getBillingById,
} from "@/services/BillingService";

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

/** A saved bill as the list needs it. */
const toBillRecord = (bill: BillingRecord): BillRecord => {
  const payment = bill.billingPayments?.[0];
  return {
    billId: bill.billingId,
    invoiceNo: bill.billNo,
    billDate: bill.createdAt?.split("T")[0] ?? "—",
    customerName: bill.customerName || "Walk-in Customer",
    mobileNo: bill.customerPhoneNo || "—",
    totalItems: bill.billingDetails?.length ?? 0,
    paymentMode: payment?.paymentMode ?? "CASH",
    status: payment?.paymentType === "PENDING" ? "Pending" : "Paid",
    netAmount: bill.totalNetAmount ?? 0,
  };
};

/**
 * Rebuilds cart lines from a saved bill. The API stores amounts rather than
 * unit prices, so rate and GST rate are derived back out of them.
 */
const toBillLines = (bill: BillingRecord): BillLine[] =>
  (bill.billingDetails ?? []).map((detail) => {
    const quantity = detail.billQuantity || 0;
    const rate = quantity > 0 ? detail.grossAmount / quantity : 0;
    const taxable = detail.grossAmount - detail.discountAmount;
    const gstPercentage = taxable > 0 ? (detail.gstAmount / taxable) * 100 : 0;

    return {
      lineId: String(detail.billingDetailsId),
      productId: detail.productId,
      productName: detail.productName,
      batchId: detail.batchId,
      batchNumber: detail.batchNumber,
      unit: detail.unit,
      // Not carried on a saved bill.
      expiryDate: "",
      quantity,
      freeQuantity: 0,
      mrpPerUnit: rate,
      sellingPricePerUnit: rate,
      discountPercentage: detail.discountPercentage || 0,
      gstPercentage,
      availableQuantity: 0,
    };
  });

/** What the POS flow has collected so far. */
interface BillDraft {
  customer?: CustomerInfo;
  lines: BillLine[];
  /** The bill level discount as typed, with the unit it was typed in. */
  billDiscountValue: number;
  discountType: DiscountType;
  payment?: PaymentDetails;
  invoiceNo?: string;
  billDate?: string;
}

const EMPTY_DRAFT: BillDraft = {
  lines: [],
  billDiscountValue: 0,
  discountType: "PERCENTAGE",
};

const Page = () => {
  const [step, setStep] = useState<Step>("list");
  const [search, setSearch] = useState("");
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(true);
  const [draft, setDraft] = useState<BillDraft>(EMPTY_DRAFT);
  const [summaryMode, setSummaryMode] = useState<"create" | "view" | "download">("create");

  /** Re-reads the list; also used after a bill is created. */
  const loadBills = async () => {
    try {
      const data = await getAllBillings();
      setBills(data.map(toBillRecord));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch bills.");
    } finally {
      setIsLoadingBills(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getAllBillings();
        if (active) setBills(data.map(toBillRecord));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to fetch bills.");
      } finally {
        if (active) setIsLoadingBills(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  /** Pulls a saved bill and hands it to the invoice screen. */
  const openSavedBill = async (
    billingId: number,
    mode: "view" | "download"
  ) => {
    try {
      const bill = await getBillingById(billingId);
      const payment = bill.billingPayments?.[0];

      setDraft({
        customer: {
          customerType: bill.customerType || "WALK_IN",
          customerId: bill.customerId,
          customerName: bill.customerName || "Walk-in Customer",
          mobileNo: bill.customerPhoneNo || "",
          age: "",
          gender: "",
          doctorName: bill.doctorName || "",
          referredBy: bill.doctorName || "",
          doctorId: bill.doctorId,
          address: bill.customerAddress || "",
        },
        lines: toBillLines(bill),
        payment: {
          paymentMode: payment?.paymentMode ?? "CASH",
          amountReceived: payment?.receivedAmount ?? bill.totalNetAmount,
          referenceNo: payment?.transactionId || "",
          remarks: "",
          changeDue: 0,
        },
        invoiceNo: bill.billNo,
        billDate: bill.createdAt?.split("T")[0] ?? "",
        // Saved lines already carry their share of the bill level discount.
        billDiscountValue: 0,
        discountType: "PERCENTAGE",
      });

      setSummaryMode(mode);
      setStep("invoice");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch the bill.");
    }
  };

  const totals = useMemo(
    () =>
      calculateBillTotals(
        draft.lines,
        draft.billDiscountValue,
        draft.discountType
      ),
    [draft.lines, draft.billDiscountValue, draft.discountType]
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
            onClick={() => openSavedBill(row.original.billId, "view")}
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
            onClick={() => openSavedBill(row.original.billId, "download")}
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
    setSummaryMode("create");
    setStep("billing");
  };

  if (step === "billing") {
    return (
      <Billing
        initialCustomer={draft.customer}
        initialLines={draft.lines}
        initialBillDiscount={draft.billDiscountValue}
        initialDiscountType={draft.discountType}
        onCancel={() => {
          setDraft(EMPTY_DRAFT);
          setStep("list");
        }}
        onProceedToPayment={({ customer, lines, billDiscountValue, discountType }) => {
          setDraft((prev) => ({
            ...prev,
            customer,
            lines,
            billDiscountValue,
            discountType,
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
        onGenerateInvoice={async (payment) => {
          if (!draft.customer) return;

          let invoiceNo = "";
          let billDate = new Date().toISOString().split("T")[0];

          try {
            const created: BillingRecord = await createBilling(
              buildBillingPayload({
                customer: draft.customer,
                lines: draft.lines,
                payment,
                billDiscountValue: draft.billDiscountValue,
                discountType: draft.discountType,
              })
            );
            invoiceNo = created?.billNo ?? "";
            if (created?.createdAt) billDate = created.createdAt.split("T")[0];
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to create the bill."
            );
            return;
          }

          setDraft((prev) => ({ ...prev, payment, invoiceNo, billDate }));

          // Re-read the list so it shows what the server actually saved.
          loadBills();

          setSummaryMode("create");
          setStep("invoice");
        }}
      />
    );
  }

  if (step === "invoice" && draft.customer && draft.payment) {
    return (
      <PaymentSummary
        invoiceNo={draft.invoiceNo ?? "—"}
        billDate={draft.billDate ?? "—"}
        customer={draft.customer}
        lines={draft.lines}
        totals={totals}
        payment={draft.payment}
        mode={summaryMode}
        onBack={() => {
          if (summaryMode === "view" || summaryMode === "download") {
            setDraft(EMPTY_DRAFT);
            setStep("list");
          } else {
            setStep("payment");
          }
        }}
        onDone={() => {
          setDraft(EMPTY_DRAFT);
          setStep("list");
        }}
        onNewBill={startNewBill}
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

      <DataTable
        columns={columns}
        data={filteredBills}
        emptyState={
          <div className="py-16 text-center text-label-l4 text-pneutral-500">
            {isLoadingBills ? "Loading bills…" : "No bills yet."}
          </div>
        }
      />
    </div>
  );
};

export default Page;
