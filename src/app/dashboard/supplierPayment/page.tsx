"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock,
  Plus,
  ReceiptText,
  Search,
} from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { PaginationControl } from "@/app/components/common/table/Pagination";
import CreateSupplierPayment, {
  SupplierPaymentDraft,
} from "./components/CreateSupplierPayment";
import ReviewSupplierPayment from "./components/ReviewSupplierPayment";
import SupplierPaymentSuccessModal from "./components/SupplierPaymentSuccessModal";
import ViewSupplierPayment, {
  SupplierPaymentRecord,
} from "./components/ViewSupplierPayment";
import {
  getAllSupplierPayments,
  getSupplierPaymentKpis,
} from "@/services/SupplierPaymentService";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import {
  SupplierPaymentData,
  SupplierPaymentKpiResponse,
} from "@/types/SupplierPaymentData";
import { PurchaseData } from "@/types/PurchaseData";
import {
  formatRecordedAt,
  getInvoiceAmount,
  isoDatePart,
  sumPaidForPurchase,
  toEligibleInvoice,
} from "./components/supplierPaymentUtils";

interface SupplierPaymentRow {
  id: number;
  paymentNo: string;
  /** yyyy-mm-dd, compared against the date filter inputs. */
  paymentDateIso: string;
  supplierName: string;
  invoiceNo: string;
  grnNo: string;
  invoiceAmount: number;
  paymentAmount: number;
  paymentMode: string;
  /** What "View" shows beyond the list columns. */
  details: Pick<
    SupplierPaymentRecord,
    "referenceNo" | "remarks" | "invoice" | "recordedBy" | "recordedAt"
  >;
}

const toPaymentRecord = (row: SupplierPaymentRow): SupplierPaymentRecord => ({
  paymentNo: row.paymentNo,
  paymentDateIso: row.paymentDateIso,
  paymentAmount: row.paymentAmount,
  paymentMode: row.paymentMode,
  ...row.details,
});

/**
 * The payment API only carries supplierId / purchaseId, so the supplier,
 * invoice and GRN shown per payment come from the purchase it was made against.
 * Newest payment first.
 */
const toSupplierPaymentRows = (
  payments: SupplierPaymentData[],
  purchases: PurchaseData[]
): SupplierPaymentRow[] => {
  const purchaseById = new Map(purchases.map((p) => [p.purchaseId, p]));

  return [...payments]
    .sort((a, b) => (b.supplierPaymentId ?? 0) - (a.supplierPaymentId ?? 0))
    .map((payment) => {
      const id = payment.supplierPaymentId ?? 0;
      const purchase = purchaseById.get(payment.purchaseId);
      const invoiceAmount = getInvoiceAmount(purchase);
      // What had been paid on the same purchase before this payment, so View
      // shows the invoice as it stood just before it.
      const totalPaidBefore = sumPaidForPurchase(
        payments.filter((other) => (other.supplierPaymentId ?? 0) < id),
        payment.purchaseId
      );
      const createdAt = payment.createdAt ? new Date(payment.createdAt) : null;

      return {
        id,
        paymentNo: payment.supplierPaymentNo ?? "—",
        paymentDateIso: isoDatePart(payment.supplierPaymentDate),
        supplierName: purchase?.supplierName ?? "—",
        invoiceNo: purchase?.invoiceNo ?? "—",
        grnNo: purchase?.grnNo ?? "—",
        invoiceAmount,
        paymentAmount: payment.paymentAmount ?? 0,
        paymentMode: payment.paymentMode ?? "—",
        details: {
          referenceNo: payment.transactionNo ?? "",
          remarks: payment.remarks ?? "",
          // createdBy is the recording user's id
          recordedBy: payment.createdBy ?? "",
          recordedAt:
            createdAt && !Number.isNaN(createdAt.getTime())
              ? formatRecordedAt(createdAt)
              : "",
          invoice: toEligibleInvoice(purchase, payment.purchaseId, totalPaidBefore),
        },
      };
    });
};

const PAYMENT_MODES = ["Cash", "UPI", "Cheque", "Bank Transfer"];

const PAYMENT_MODE_OPTIONS = [
  { label: "Payment Mode: All", value: "" },
  // Figma shows the chosen mode as "Payment Mode: Cheque", not the bare mode.
  ...PAYMENT_MODES.map((mode) => ({ label: `Payment Mode: ${mode}`, value: mode })),
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface SupplierPaymentFilters {
  search: string;
  fromDate: string;
  toDate: string;
  supplier: string;
  paymentMode: string;
}

const EMPTY_FILTERS: SupplierPaymentFilters = {
  search: "",
  fromDate: "",
  toDate: "",
  supplier: "",
  paymentMode: "",
};

const formatRupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/** yyyy-mm-dd → "dd-mm-yyyy". */
const formatPaymentDate = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

// Figma: Total Supplier Payable / Overdue Payable / Supplier Credit, from
// GET /supplier-payments/kpi. "—" until they load, or if they fail to.
const buildKpiCards = (kpis: SupplierPaymentKpiResponse | null) => {
  const show = (value?: number) => (kpis ? formatRupees(value ?? 0) : "—");

  return [
    {
      key: "payable",
      label: "Total Supplier Payable",
      value: show(kpis?.totalSupplierPayable),
      cardBg: "bg-primary-100",
      icon: <Banknote size={24} strokeWidth={1.5} className="text-primary-800" />,
    },
    {
      key: "overdue",
      label: "Overdue Payable",
      value: show(kpis?.overduePayable),
      cardBg: "bg-warning-50",
      icon: <Clock size={24} strokeWidth={1.5} className="text-warning-600" />,
    },
    {
      key: "credit",
      label: "Supplier Credit",
      value: show(kpis?.supplierCredit),
      cardBg: "bg-success-50",
      icon: <ReceiptText size={24} strokeWidth={1.5} className="text-success-800" />,
    },
  ];
};

/**
 * Date field that shows its placeholder ("From Date") until focused, since a
 * native date input can't render placeholder text.
 */
const DateFilterField = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <Input
      type={focused || value ? "date" : "text"}
      placeholder={placeholder}
      value={value}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      rightIcon={<CalendarDays size={20} className="text-pneutral-900" />}
      className="rounded-lg! [&_input]:text-p4 [&_input]:font-regular [&_input]:placeholder:text-pneutral-500"
      containerClassName="w-full sm:w-42.5 sm:shrink-0"
    />
  );
};

const buildSupplierPaymentColumns = (
  rowOffset: number,
  onView: (row: SupplierPaymentRow) => void
): ColumnDef<SupplierPaymentRow>[] => [
  {
    header: "SL. NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {rowOffset + row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: "paymentNo",
    header: "SUPPLIER PAYMENT NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-primary-800">
        {row.original.paymentNo}
      </span>
    ),
  },
  {
    accessorKey: "paymentDateIso",
    header: "PAYMENT DATE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {formatPaymentDate(row.original.paymentDateIso)}
      </span>
    ),
  },
  {
    accessorKey: "supplierName",
    header: "SUPPLIER NAME",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.supplierName}
      </span>
    ),
  },
  {
    accessorKey: "invoiceNo",
    header: "INVOICE NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.invoiceNo}
      </span>
    ),
  },
  {
    accessorKey: "grnNo",
    header: "GRN NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.grnNo}
      </span>
    ),
  },
  {
    accessorKey: "invoiceAmount",
    header: "INVOICE AMOUNT",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {formatRupees(row.original.invoiceAmount)}
      </span>
    ),
  },
  {
    accessorKey: "paymentAmount",
    header: "PAYMENT AMOUNT",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {formatRupees(row.original.paymentAmount)}
      </span>
    ),
  },
  {
    accessorKey: "paymentMode",
    header: "PAYMENT MODE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.paymentMode}
      </span>
    ),
  },
  {
    header: "ACTION",
    cell: ({ row }) => (
      <button
        type="button"
        aria-label={`View ${row.original.paymentNo}`}
        onClick={() => onView(row.original)}
      >
        <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
      </button>
    ),
  },
];

const applySupplierPaymentFilters = (
  rows: SupplierPaymentRow[],
  { search, fromDate, toDate, supplier, paymentMode }: SupplierPaymentFilters
) => {
  const query = search.trim().toLowerCase();

  return rows.filter(
    (row) =>
      (!query ||
        [row.paymentNo, row.invoiceNo, row.grnNo, row.supplierName].some(
          (value) => value.toLowerCase().includes(query)
        )) &&
      (!fromDate || row.paymentDateIso >= fromDate) &&
      (!toDate || row.paymentDateIso <= toDate) &&
      (!supplier || row.supplierName === supplier) &&
      (!paymentMode || row.paymentMode === paymentMode)
  );
};

/** Centered icon + message block that replaces the table — Figma "SP Empty State". */
const SupplierPaymentEmptyState = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) => (
  <div className="flex w-full flex-col items-center justify-center gap-sm py-hg">
    <div className="flex size-18 shrink-0 items-center justify-center rounded-full bg-primary-100">
      {icon}
    </div>
    <p className="text-center text-label-l5 font-semibold text-pneutral-900">
      {title}
    </p>
    {description && (
      <p className="text-center text-p3 font-regular text-pneutral-500">
        {description}
      </p>
    )}
  </div>
);

const SupplierPayment = () => {
  const [payments, setPayments] = useState<SupplierPaymentRow[]>([]);
  const [kpis, setKpis] = useState<SupplierPaymentKpiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  // Draft values in the filter row vs. the ones last applied with "Search".
  const [filters, setFilters] = useState<SupplierPaymentFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<SupplierPaymentFilters>(EMPTY_FILTERS);
  // The create flow runs in place of the list.
  const [view, setView] = useState<"list" | "create" | "review" | "view">("list");
  const [viewingId, setViewingId] = useState<number | null>(null);
  // The payment carried from the create form to the review and back.
  const [draft, setDraft] = useState<SupplierPaymentDraft | null>(null);
  // What the success modal shows for the payment just confirmed.
  const [confirmed, setConfirmed] = useState<{
    id: number;
    paymentNo: string;
    paymentAmount: number;
    updatedOutstanding: number;
  } | null>(null);
  // Bumped after a payment is saved so the list, KPIs and View reload.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([getAllSupplierPayments(), getAllPurchases()])
      .then(([paymentData, purchaseData]) => {
        if (!active) return;
        setPayments(toSupplierPaymentRows(paymentData, purchaseData));
        setLoadError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch supplier payments:", err);
        setLoadError(err?.message || "Failed to fetch supplier payments.");
        setPayments([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    // The KPI cards load on their own so a KPI failure doesn't hide the list.
    getSupplierPaymentKpis()
      .then((data) => {
        if (active) setKpis(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to fetch supplier payment KPIs:", err);
        setKpis(null);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const supplierOptions = [
    { label: "All Suppliers", value: "" },
    ...Array.from(new Set(payments.map((row) => row.supplierName))).map(
      (name) => ({ label: name, value: name })
    ),
  ];

  const updateFilters = (patch: Partial<SupplierPaymentFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const applyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const backToList = () => {
    setConfirmed(null);
    setDraft(null);
    setViewingId(null);
    setView("list");
  };

  const openView = (id: number) => {
    setConfirmed(null);
    setDraft(null);
    setViewingId(id);
    setView("view");
  };

  const viewingPayment = payments.find((row) => row.id === viewingId);
  if (view === "view" && viewingPayment) {
    return (
      <ViewSupplierPayment
        payment={toPaymentRecord(viewingPayment)}
        onBack={backToList}
      />
    );
  }

  // Opened from the success modal while the list is still reloading.
  if (view === "view" && isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
        Loading supplier payment...
      </div>
    );
  }

  if (view === "create") {
    return (
      <CreateSupplierPayment
        initialDraft={draft}
        onCancel={backToList}
        onContinue={(next) => {
          setDraft(next);
          setView("review");
        }}
      />
    );
  }

  // ReviewSupplierPayment has already saved it; reload so the new payment is
  // in the list (and in View) behind the success modal.
  const confirmPayment = (saved: SupplierPaymentData) => {
    if (!draft) return;
    setIsLoading(true);
    setReloadKey((key) => key + 1);
    setConfirmed({
      id: saved.supplierPaymentId ?? 0,
      paymentNo: saved.supplierPaymentNo ?? "—",
      paymentAmount: saved.paymentAmount ?? draft.paymentAmount,
      updatedOutstanding:
        draft.invoice.currentOutstanding - (saved.paymentAmount ?? draft.paymentAmount),
    });
  };

  if (view === "review" && draft) {
    return (
      <>
        <ReviewSupplierPayment
          draft={draft}
          onBack={() => setView("create")}
          onCancel={backToList}
          onConfirm={confirmPayment}
        />
        <SupplierPaymentSuccessModal
          isOpen={confirmed !== null}
          onClose={backToList}
          onViewSupplierPayment={() => confirmed && openView(confirmed.id)}
          paymentNo={confirmed?.paymentNo ?? ""}
          paymentAmount={confirmed?.paymentAmount ?? 0}
          updatedOutstanding={confirmed?.updatedOutstanding ?? 0}
        />
      </>
    );
  }

  const filteredPayments = applySupplierPaymentFilters(payments, appliedFilters);
  const rowOffset = (currentPage - 1) * pageSize;

  return (
    <div className="flex flex-col gap-md">
      {/* SP Header Row */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-h5 font-semibold text-pneutral-900">
          Supplier Payment
        </p>

        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setDraft(null);
            setView("create");
          }}
          className="h-12! max-h-13 min-h-12 w-full! min-w-27 shrink-0 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-69.75!"
        >
          <Plus size={20} className="shrink-0" />
          Record Supplier Payment
        </Button>
      </div>

      {/* SP KPI Row */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-start">
        {buildKpiCards(kpis).map((card) => (
          <div
            key={card.key}
            className={`flex h-38 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-xl p-5 ${card.cardBg}`}
          >
            <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5">
              <div className="flex w-full items-center gap-0.5">
                <p className="min-w-0 flex-1 text-label-l4 font-medium text-pneutral-900">
                  {card.label}
                </p>
                <div className="flex size-13 shrink-0 items-center justify-center rounded-sm bg-white">
                  {card.icon}
                </div>
              </div>
              <p className="truncate text-h3 font-medium text-pneutral-900">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* SP Filters */}
      <div className="flex w-full flex-col gap-sm">
        <Input
          placeholder="Search by Payment No., Invoice No., GRN No., Supplier..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg! border-[1.5px]! border-sneutral-100! [&_input]:pl-2 [&_input]:text-label-l3 [&_input]:font-regular [&_input]:text-ellipsis [&_input]:placeholder:text-pneutral-300"
          containerClassName="w-full min-w-0"
        />

        <div className="flex w-full flex-col gap-sm sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
          <DateFilterField
            placeholder="From Date"
            value={filters.fromDate}
            onChange={(fromDate) => updateFilters({ fromDate })}
          />

          <DateFilterField
            placeholder="To Date"
            value={filters.toDate}
            onChange={(toDate) => updateFilters({ toDate })}
          />

          <Dropdown
            options={supplierOptions}
            value={filters.supplier}
            onChange={(supplier) => updateFilters({ supplier: String(supplier) })}
            placeholder="All Suppliers"
            className="w-full sm:w-55 sm:shrink-0"
          />

          <Dropdown
            options={PAYMENT_MODE_OPTIONS}
            value={filters.paymentMode}
            onChange={(paymentMode) =>
              updateFilters({ paymentMode: String(paymentMode) })
            }
            placeholder="Payment Mode: All"
            className="w-full sm:w-60 sm:shrink-0"
          />

          {/* Filter Spacer */}
          <div className="hidden min-w-0 flex-1 lg:block" />

          <div className="flex w-full gap-sm sm:w-auto sm:shrink-0">
            <Button
              type="button"
              variant="primary"
              onClick={applyFilters}
              className="min-w-27 flex-1 rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-28.5 sm:flex-none"
            >
              Search
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="min-w-27 flex-1 rounded-lg! border-2! border-secondary-700! px-md text-label-l4! font-medium! text-secondary-700! sm:w-27 sm:flex-none"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* SP Table Card */}
      <div className="flex w-full flex-col gap-md rounded-2xl border border-pneutral-200 bg-white p-md">
        {isLoading || loadError ? (
          <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
            {isLoading ? "Loading supplier payments..." : loadError}
          </div>
        ) : payments.length === 0 ? (
          /* SP Empty State — Figma node 4312:52335 */
          <SupplierPaymentEmptyState
            icon={<Banknote size={32} strokeWidth={1.5} className="text-primary-800" />}
            title="No Supplier Payments Found."
            description="Recorded supplier payments will appear here."
          />
        ) : filteredPayments.length === 0 ? (
          /* SP No-Match State — Figma node 4312:52374 */
          <SupplierPaymentEmptyState
            icon={<Search size={32} strokeWidth={1.5} className="text-primary-800" />}
            title="No Matching Supplier Payments Found."
          />
        ) : (
          <>
            {/* Shared grid DataTable, with Figma's header/row sizing applied from
                outside so the common component stays untouched. Scrolls sideways
                below the width Figma's columns need. */}
            <div className="w-full [&>div]:overflow-x-auto [&>div]:rounded-lg [&>div]:shadow-none [&_table]:min-w-238 [&_thead_tr]:h-16 [&_th]:border-pneutral-200 [&_th]:px-sm [&_th]:py-xsm [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_th]:text-pneutral-50 [&_tbody_tr]:h-17 [&_td]:px-sm [&_td]:py-xsm [&_td]:wrap-break-word">
              <DataTable
                columns={buildSupplierPaymentColumns(rowOffset, (row) => openView(row.id))}
                data={filteredPayments.slice(rowOffset, rowOffset + pageSize)}
              />
            </div>

            {/* SP Pagination Row */}
            <div className="flex w-full flex-col gap-sm lg:flex-row lg:items-center">
              <p className="min-w-0 flex-1 text-p3 font-regular text-pneutral-500">
                Showing {filteredPayments.length === 0 ? 0 : rowOffset + 1} to{" "}
                {Math.min(rowOffset + pageSize, filteredPayments.length)} of{" "}
                {filteredPayments.length} records
              </p>

              <div className="flex flex-wrap items-center gap-sm lg:gap-xlg">
                {/* Records Per Page */}
                <div className="flex items-center gap-sm">
                  <label
                    htmlFor="supplier-payment-page-size"
                    className="whitespace-nowrap text-p3 font-regular text-pneutral-500"
                  >
                    Records per page
                  </label>
                  <div className="relative w-21">
                    <select
                      id="supplier-payment-page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 w-full appearance-none rounded-sm border border-pneutral-300 bg-white py-xsm pl-sm pr-8 text-p2 font-regular text-pneutral-500 focus:outline-none"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-pneutral-900"
                    />
                  </div>
                </div>

                {/* Pages Row */}
                <div className="[&_button]:rounded-lg [&_button]:text-label-l3 [&_button[aria-label]]:bg-secondary-300">
                  <PaginationControl
                    page={currentPage}
                    pageSize={pageSize}
                    totalItems={filteredPayments.length}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierPayment;
