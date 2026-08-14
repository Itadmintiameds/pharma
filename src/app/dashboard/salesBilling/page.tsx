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
import { showToast } from "@/app/components/common/Toast";
import SearchInput from "@/app/components/common/SearchInput";
import DataTable from "@/app/components/common/table/DataTable";
import Billing from "./components/Billing";
import BillingPayment from "./components/BillingPayment";
import PaymentSummary from "./components/PaymentSummary";
import {
  BillLine,
  BillRecord,
  BillStatus,
  BillTotals,
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
import { formatDate } from "@/utils/formatDate";
import {
  buildBillingPayload,
  createBilling,
  getAllBillings,
  getBillingById,
  settleBillingPayment,
  uploadPrescription,
} from "@/services/BillingService";
import { ProductService } from "@/services/ProductService";

type Step = "list" | "billing" | "payment" | "invoice" | "settle";

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
    // The bill carries the settled flag; the payments only carry balances.
    // Anything not fully PAID is still owed, so it reads as pending.
    status: bill.paymentType === "PAID" ? "Paid" : "Pending",
    netAmount: bill.totalNetAmount ?? 0,
  };
};

/**
 * What is still owed on a saved bill. Each payment records the balance left
 * after it, so the latest one is authoritative; summing what was received is
 * only a fallback for older rows that predate the field.
 */
const pendingOf = (bill: BillingRecord) => {
  const payments = bill.billingPayments ?? [];
  const latest = payments[payments.length - 1];

  if (latest && typeof latest.pendingAmount === "number") {
    return Math.max(0, latest.pendingAmount);
  }

  const received = payments.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
  return Math.max(0, (bill.totalNetAmount ?? 0) - received);
};

/**
 * Rebuilds cart lines from a saved bill. billing/{id} carries the line whole —
 * amounts, GST rate and HSN — so the only thing derived here is the per-unit
 * MRP, because the API stores the line total rather than the unit price.
 */
const toBillLines = (bill: BillingRecord): BillLine[] =>
  (bill.billingDetails ?? []).map((detail) => {
    const quantity = detail.billQuantity || 0;
    // Bills saved before totalMrpAmountPerUnit existed reach the same figure
    // from netAmount + discountAmount, which is what the total is.
    const lineTotal =
      detail.totalMrpAmountPerUnit ?? detail.netAmount + detail.discountAmount;
    const rate = quantity > 0 ? lineTotal / quantity : 0;

    return {
      lineId: String(detail.billingDetailsId),
      productId: detail.productId,
      productName: detail.productName,
      batchId: detail.batchId,
      batchNumber: detail.batchNumber,
      unit: detail.unit,
      hsnCode: detail.hsnNo ?? "",
      // The one field the bill does not store — read off the batch afterwards.
      expiryDate: detail.expiryDate ?? "",
      quantity,
      freeQuantity: 0,
      mrpPerUnit: rate,
      sellingPricePerUnit: rate,
      discountPercentage: detail.discountPercentage || 0,
      // Stored on the line. Older bills fall back to the rate implied by the
      // GST sitting inside the taxable value.
      gstPercentage:
        detail.gstPercentage ??
        (detail.grossAmount > 0
          ? (detail.gstAmount / detail.grossAmount) * 100
          : 0),
      availableQuantity: 0,
    };
  });

/**
 * Fills in the batch expiry, the one field a saved bill does not store — every
 * other value on the line comes straight from billing/{id}. One request per
 * distinct batch, and only for lines actually missing an expiry, so a bill of
 * five lines over two batches costs two calls. Best effort: a lookup that fails
 * leaves the cell empty rather than holding up the invoice.
 *
 * Add expiryDate to billingDetails and this whole step goes away — delete it
 * and pass toBillLines(bill) straight through.
 */
const withBatchExpiry = async (lines: BillLine[]): Promise<BillLine[]> => {
  const missing = Array.from(
    new Set(lines.filter((l) => l.batchId && !l.expiryDate).map((l) => l.batchId))
  );
  if (missing.length === 0) return lines;

  const expiries = new Map<string, string>();
  await Promise.all(
    missing.map(async (batchId) => {
      try {
        const expiry = (await ProductService.getBatchById(batchId))?.data
          ?.expiryDate;
        if (expiry) expiries.set(batchId, expiry);
      } catch (err) {
        console.error(`Failed to read the expiry for batch ${batchId}`, err);
      }
    })
  );

  return lines.map((line) =>
    line.expiryDate
      ? line
      : { ...line, expiryDate: expiries.get(line.batchId) ?? "" }
  );
};

/**
 * The totals exactly as the bill was saved. billing/{id} returns every one of
 * them, so a bill that is being viewed shows the figures it was created with
 * rather than a fresh recompute — nothing drifts if the pricing rules change
 * later, and no arithmetic is repeated here.
 */
const savedTotals = (bill: BillingRecord, lines: BillLine[]): BillTotals => ({
  totalItems: lines.length,
  totalQuantity: lines.reduce(
    (sum, line) => sum + line.quantity + (line.freeQuantity || 0),
    0
  ),
  // Bills saved before the column reach the same figure either way, since the
  // MRP total is only ever net plus the discount.
  grossAmount:
    bill.totalMrpAmount ??
    (bill.totalNetAmount || 0) + (bill.totalDiscountAmount || 0),
  // One stored figure already covers the per-line and bill level discounts
  // together, and each saved line carries its own share — so it goes here whole
  // and billDiscount stays zero rather than being counted twice.
  itemDiscount: bill.totalDiscountAmount || 0,
  billDiscount: 0,
  billDiscountPercentage: 0,
  taxableAmount: bill.totalGrossAmount || 0,
  gstAmount: bill.totalGstAmount || 0,
  roundOff: 0,
  netAmount: bill.totalNetAmount || 0,
});

/** What the POS flow has collected so far. */
interface BillDraft {
  customer?: CustomerInfo;
  lines: BillLine[];
  /** The bill level discount as typed, with the unit it was typed in. */
  billDiscountValue: number;
  discountType: DiscountType;
  payment?: PaymentDetails;
  /** Uploaded once the bill has an id. */
  prescriptionFile?: File | null;
  invoiceNo?: string;
  billDate?: string;
  /** Set only for a saved bill: the totals it was stored with, used as they are
   *  instead of recomputing them from the lines. */
  savedTotals?: BillTotals;
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
  /** The bill being settled, with what it still owes. */
  const [settling, setSettling] = useState<{
    bill: BillingRecord;
    pendingAmount: number;
  } | null>(null);
  const [summaryMode, setSummaryMode] = useState<"create" | "view" | "download">("create");

  /** Re-reads the list; also used after a bill is created. */
  const loadBills = async () => {
    try {
      const data = await getAllBillings();
      setBills(data.map(toBillRecord));
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : "Failed to fetch bills.");
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
        showToast.error(err instanceof Error ? err.message : "Failed to fetch bills.");
      } finally {
        if (active) setIsLoadingBills(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  /** Opens the payment screen against a pending bill's outstanding balance. */
  const openSettlePayment = async (billingId: number) => {
    try {
      const bill = await getBillingById(billingId);
      const pending = pendingOf(bill);

      // Nothing to collect — opening the screen would only offer an amount of
      // zero, which no payment can clear.
      if (pending <= 0) {
        showToast.info("This bill has no pending amount.");
        loadBills();
        return;
      }

      setSettling({ bill, pendingAmount: pending });
      setStep("settle");
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : "Failed to fetch the bill."
      );
    }
  };

  /** Pulls a saved bill and hands it to the invoice screen. */
  const openSavedBill = async (
    billingId: number,
    mode: "view" | "download"
  ) => {
    try {
      const bill = await getBillingById(billingId);
      const payment = bill.billingPayments?.[0];
      const lines = await withBatchExpiry(toBillLines(bill));

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
        lines,
        // The response carries every total, so the invoice shows what was
        // stored rather than a recompute of it.
        savedTotals: savedTotals(bill, lines),
        payment: {
          paymentMode: payment?.paymentMode ?? "CASH",
          amountReceived: payment?.receivedAmount ?? bill.totalNetAmount,
          referenceNo: payment?.transactionId || "",
          remarks: "",
          changeDue: 0,
          pendingAmount: pendingOf(bill),
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
      showToast.error(err instanceof Error ? err.message : "Failed to fetch the bill.");
    }
  };

  // A saved bill shows the totals it was stored with; a bill being built is
  // costed from its lines.
  const totals = useMemo(
    () =>
      draft.savedTotals ??
      calculateBillTotals(
        draft.lines,
        draft.billDiscountValue,
        draft.discountType
      ),
    [draft.savedTotals, draft.lines, draft.billDiscountValue, draft.discountType]
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
      cell: ({ row }) => formatDate(row.original.billDate),
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
      cell: ({ row }) => {
        const isPending = row.original.status === "Pending";
        return (
          <button
            type="button"
            // A pending bill opens the payment screen to settle the balance.
            disabled={!isPending}
            title={isPending ? "Settle this bill" : undefined}
            onClick={() => openSettlePayment(row.original.billId)}
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-label-l3 font-medium ${
              STATUS_STYLES[row.original.status]
            } ${isPending ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"}`}
          >
            {row.original.status}
          </button>
        );
      },
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
        onProceedToPayment={({
          customer,
          lines,
          billDiscountValue,
          discountType,
          prescriptionFile,
        }) => {
          setDraft((prev) => ({
            ...prev,
            customer,
            lines,
            billDiscountValue,
            discountType,
            prescriptionFile,
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
          // Nothing is saved yet — the invoice screen previews the bill and
          // saves it from there.
          setDraft((prev) => ({
            ...prev,
            payment,
            billDate: new Date().toISOString().split("T")[0],
          }));
          setSummaryMode("create");
          setStep("invoice");
        }}
      />
    );
  }

  if (step === "settle" && settling) {
    const bill = settling.bill;
    // Same as the invoice: the saved bill's own totals, not a recompute.
    const settleLines = toBillLines(bill);
    return (
      <BillingPayment
        mode="settle"
        billNo={bill.billNo}
        pendingAmount={settling.pendingAmount}
        customer={{
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
        }}
        lines={settleLines}
        totals={savedTotals(bill, settleLines)}
        onBack={() => {
          setSettling(null);
          setStep("list");
        }}
        onGenerateInvoice={async (payment) => {
          try {
            await settleBillingPayment(bill.billingId, {
              paymentMode: payment.paymentMode,
              transactionId: payment.referenceNo || null,
              receivedAmount: payment.amountReceived,
            });
            showToast.success("Payment recorded.");
          } catch (err) {
            showToast.error(
              err instanceof Error ? err.message : "Failed to record the payment."
            );
            return;
          }

          setSettling(null);
          loadBills();
          setStep("list");
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
        onSave={async () => {
          if (!draft.customer || !draft.payment) return null;

          try {
            const created: BillingRecord = await createBilling(
              buildBillingPayload({
                customer: draft.customer,
                lines: draft.lines,
                payment: draft.payment,
                billDiscountValue: draft.billDiscountValue,
                discountType: draft.discountType,
              })
            );

            // The prescription needs the bill's id, so it goes up afterwards.
            // A failed upload must not lose the bill that was just saved.
            if (draft.prescriptionFile && created?.billingId) {
              try {
                await uploadPrescription(
                  created.billingId,
                  draft.prescriptionFile
                );
              } catch (err) {
                showToast.error(
                  err instanceof Error
                    ? err.message
                    : "Bill saved, but the prescription upload failed."
                );
              }
            }

            setDraft((prev) => ({
              ...prev,
              invoiceNo: created?.billNo ?? prev.invoiceNo,
              billDate: created?.createdAt?.split("T")[0] ?? prev.billDate,
            }));

            // Re-read the list so it shows what the server actually saved.
            loadBills();

            return { billNo: created?.billNo ?? "" };
          } catch (err) {
            showToast.error(
              err instanceof Error ? err.message : "Failed to create the bill."
            );
            return null;
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
