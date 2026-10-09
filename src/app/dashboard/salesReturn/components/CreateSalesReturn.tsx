"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, ArrowRightLeft, Check } from "lucide-react";
import Button from "@/app/components/common/Button";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import { getBillingById } from "@/services/BillingService";
import { BillingRecord } from "@/types/BillingData";
import { formatAmount } from "@/utils/billingTotals";
import { loadSalesReturnDraft, saveSalesReturnDraft } from "./salesReturnDraft";

// Figma "boxShadowCard" — same three-layer shadow as the Find Original Bill cards
const CARD_SHADOW =
  "shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]";

interface BillProduct {
  id: number;
  productId: string;
  batchId: string;
  productName: string;
  batchNo: string;
  expiry: string;
  soldQty: number;
  previouslyReturnedQty: number;
  returnableQty: number;
  /** Per-unit selling price on the bill — drives the return amount */
  unitPrice: number;
}

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

const toBillProducts = (bill: BillingRecord): BillProduct[] =>
  (bill.billingDetails ?? []).map((detail) => {
    const soldQty = Number(detail.billQuantity) || 0;
    const previouslyReturnedQty = Number(detail.returnedQuantity) || 0;
    return {
      id: detail.billingDetailsId,
      productId: detail.productId,
      batchId: detail.batchId,
      productName: detail.productName,
      batchNo: detail.batchNumber,
      expiry: formatExpiry(detail.expiryDate),
      soldQty,
      previouslyReturnedQty,
      returnableQty: Math.max(soldQty - previouslyReturnedQty, 0),
      // What the customer paid per unit on this line
      unitPrice: soldQty ? (Number(detail.netAmount) || 0) / soldQty : 0,
    };
  });

const RETURN_REASONS = [
  "Prescription Changed",
  "Excess Quantity",
  "Wrong Product Issued",
  "Damaged Product",
  "Quality Issue",
  "Billing Error",
  "Other",
];
const RETURN_REASON_OPTIONS = RETURN_REASONS.map((reason) => ({
  label: reason,
  value: reason,
}));

// Shrinks the common Dropdown's 48px control to the ".Input-Size" small field
// the other cells use: 36px high, 8px side padding, 4px corners, 12/18 text.
const SMALL_DROPDOWN =
  "[&_[role=combobox]]:h-9 [&_[role=combobox]]:rounded-sm [&_[role=combobox]]:px-sm [&_[role=combobox]>span]:text-p2";
// Picking this reason asks for remarks underneath the dropdown
const OTHER_REASON = "Other";

interface ReturnLine {
  selected: boolean;
  returnQty: string;
  reason: string;
  remarks: string;
}

const EMPTY_LINE: ReturnLine = {
  selected: false,
  returnQty: "",
  reason: "",
  remarks: "",
};

// Figma ".Input-Size" small field: 36px high, 12px/8px padding, 4px corners, 12/18 text
const SMALL_FIELD =
  "h-9 w-full rounded-sm border border-pneutral-300 bg-white px-sm py-xsm text-p2 font-regular text-pneutral-900 outline-none focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300 disabled:cursor-not-allowed";

/** Every cell's content sits in a 60px band, so normal 76px rows centre it
 *  while the taller "Other" row keeps its other cells at the top, as in Figma. */
const CellBand = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-15 items-center">{children}</div>
);

// The editable cells read the return lines from context rather than from the
// column definitions: TanStack renders each `cell` function as a component, so
// columns rebuilt on every keystroke would remount the inputs and drop focus.
const ReturnLinesContext = createContext<{
  lines: Record<number, ReturnLine>;
  updateLine: (id: number, patch: Partial<ReturnLine>) => void;
}>({ lines: {}, updateLine: () => {} });

const useReturnLine = (id: number) => {
  const { lines, updateLine } = useContext(ReturnLinesContext);
  return {
    line: lines[id] ?? EMPTY_LINE,
    update: (patch: Partial<ReturnLine>) => updateLine(id, patch),
  };
};

const SelectCell = ({ product }: { product: BillProduct }) => {
  const { id, productName, returnableQty } = product;
  const { line, update } = useReturnLine(id);
  const checked = line.selected;
  // A line already returned in full has nothing left to return
  const disabled = returnableQty === 0;
  return (
    <CellBand>
      <label
        className={`relative flex size-6 items-center justify-center ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => update({ selected: e.target.checked })}
          aria-label={`Return ${productName}`}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`flex size-6 items-center justify-center rounded-sm border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-secondary-300 ${
            checked
              ? "border-secondary-300 bg-secondary-300"
              : "border-pneutral-200 bg-white"
          }`}
        >
          {checked && <Check size={16} strokeWidth={3} className="text-white" />}
        </span>
      </label>
    </CellBand>
  );
};

const ReturnQtyCell = ({ product }: { product: BillProduct }) => {
  const { id, productName, returnableQty } = product;
  const { line, update } = useReturnLine(id);
  return (
    <CellBand>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={returnableQty}
        disabled={!line.selected}
        value={line.returnQty}
        aria-label={`Return quantity for ${productName}`}
        onKeyDown={(e) => {
          if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          // Never more than can still be returned against this bill
          const qty = raw === "" ? "" : String(Math.min(Number(raw), returnableQty));
          update({ returnQty: qty });
        }}
        className={`${SMALL_FIELD} ${line.selected ? "" : "opacity-50"}`}
      />
    </CellBand>
  );
};

const ReasonCell = ({ product }: { product: BillProduct }) => {
  const { id, productName } = product;
  const { line, update } = useReturnLine(id);
  return (
    <div className={`flex flex-col gap-1.5 ${line.selected ? "" : "opacity-50"}`}>
      <CellBand>
        <div className="w-full" aria-label={`Return reason for ${productName}`}>
          <Dropdown
            options={RETURN_REASON_OPTIONS}
            value={line.reason}
            onChange={(reason) => update({ reason: String(reason) })}
            placeholder="—"
            disabled={!line.selected}
            className={SMALL_DROPDOWN}
          />
        </div>
      </CellBand>

      {line.selected && line.reason === OTHER_REASON && (
        <label className="flex w-full flex-col">
          <span className="flex items-center gap-xxsm px-xxsm text-label-l3 font-medium text-pneutral-900">
            Remarks
            <span className="text-label-l2 font-semibold text-warning-500">*</span>
          </span>
          <input
            type="text"
            required
            value={line.remarks}
            onChange={(e) => update({ remarks: e.target.value })}
            className={SMALL_FIELD}
          />
        </label>
      )}
    </div>
  );
};

const PRODUCT_COLUMNS: ColumnDef<BillProduct>[] = [
  {
    id: "select",
    header: () => <span className="sr-only">Select</span>,
    cell: ({ row }) => <SelectCell product={row.original} />,
  },
  {
    accessorKey: "productName",
    header: "PRODUCT NAME",
    cell: ({ row }) => (
      <CellBand>
        <span className="text-p3 font-semibold text-pneutral-900">
          {row.original.productName}
        </span>
      </CellBand>
    ),
  },
  {
    accessorKey: "batchNo",
    header: "BATCH NO.",
    cell: ({ row }) => (
      <CellBand>
        <span className="text-p3 font-regular text-pneutral-900">
          {row.original.batchNo}
        </span>
      </CellBand>
    ),
  },
  {
    accessorKey: "expiry",
    header: "EXPIRY DATE",
    cell: ({ row }) => (
      <CellBand>
        <span className="text-p3 font-regular text-pneutral-900">
          {row.original.expiry}
        </span>
      </CellBand>
    ),
  },
  {
    accessorKey: "soldQty",
    header: "SOLD QTY",
    cell: ({ row }) => (
      <CellBand>
        <span className="text-p3 font-semibold text-pneutral-900">
          {row.original.soldQty}
        </span>
      </CellBand>
    ),
  },
  {
    accessorKey: "previouslyReturnedQty",
    header: "PREVIOUSLY RETURNED QTY",
    cell: ({ row }) => (
      <CellBand>
        <span className="text-p3 font-regular text-pneutral-900">
          {row.original.previouslyReturnedQty}
        </span>
      </CellBand>
    ),
  },
  {
    accessorKey: "returnableQty",
    header: "RETURNABLE QTY",
    cell: ({ row }) => (
      <CellBand>
        <span className="text-p3 font-semibold text-success-600">
          {row.original.returnableQty}
        </span>
      </CellBand>
    ),
  },
  {
    id: "returnQty",
    header: "RETURN QTY",
    cell: ({ row }) => <ReturnQtyCell product={row.original} />,
  },
  {
    id: "reason",
    header: "RETURN REASON",
    cell: ({ row }) => <ReasonCell product={row.original} />,
  },
];

const formatRupees = (amount: number) =>
  amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

/** Grey caption over its value — one cell of the bill reference row. */
const BillDetail = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    {children}
  </div>
);

const BillDetailValue = ({ children }: { children: React.ReactNode }) => (
  <p className="wrap-break-word text-label-l4 font-semibold text-pneutral-900">
    {children}
  </p>
);

// Shared look of the footer buttons — Figma 48px high, 8px corners, 16/24 medium label
const FOOTER_BUTTON =
  "h-12! max-h-13 min-h-12 min-w-27 shrink-0 gap-xsm rounded-lg! px-md text-label-l4! font-medium!";

const CreateSalesReturn = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by Find Original Bill ("Select" / "Continue to Create Return")
  const billingId = searchParams.get("billingId") ?? "";
  const [bill, setBill] = useState<BillingRecord | null>(null);
  const [products, setProducts] = useState<BillProduct[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(billingId));
  const [loadError, setLoadError] = useState("");
  const [returnLines, setReturnLines] = useState<Record<number, ReturnLine>>({});

  useEffect(() => {
    if (!billingId) return;

    let active = true;

    getBillingById(billingId)
      .then((data) => {
        if (!active) return;
        setBill(data);
        setProducts(toBillProducts(data));
        // Coming back from Review: put the earlier picks back in place
        setReturnLines(
          Object.fromEntries(
            loadSalesReturnDraft(billingId).map((line) => [
              line.billingDetailsId,
              {
                selected: true,
                returnQty: String(line.returnQty),
                reason: line.reason,
                remarks: line.remarks,
              },
            ])
          )
        );
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

  const billNo = bill?.billNo ?? searchParams.get("billNo") ?? "";
  const billDetails = bill
    ? {
        billDate: formatBillDate(bill.createdAt),
        // Null for an anonymous walk-in bill.
        customerName: bill.customerName || "Walk-in Customer",
        customerType: bill.customerType ? CUSTOMER_TYPE_LABEL[bill.customerType] : "—",
        totalAmount: `₹${formatAmount(bill.totalNetAmountAfterRoundOff ?? bill.totalNetAmount)}`,
      }
    : { billDate: "—", customerName: "—", customerType: "—", totalAmount: "—" };

  const updateLine = (id: number, patch: Partial<ReturnLine>) =>
    setReturnLines((prev) => ({
      ...prev,
      [id]: { ...EMPTY_LINE, ...prev[id], ...patch },
    }));

  // Return Summary — only ticked rows with a quantity above zero count
  const returningItems = products
    .map((product) => {
      const line = returnLines[product.id] ?? EMPTY_LINE;
      return { product, qty: line.selected ? Number(line.returnQty) || 0 : 0 };
    })
    .filter(({ qty }) => qty > 0);
  const totalReturnQty = returningItems.reduce((sum, { qty }) => sum + qty, 0);
  const totalReturnAmount = returningItems.reduce(
    (sum, { product, qty }) => sum + product.unitPrice * qty,
    0
  );
  // Review needs at least one line, and every ticked line needs a quantity, a
  // reason, and remarks when the reason is "Other".
  const canReview =
    returningItems.length > 0 &&
    products.every((product) => {
      const line = returnLines[product.id] ?? EMPTY_LINE;
      if (!line.selected) return true;
      return (
        Number(line.returnQty) > 0 &&
        line.reason !== "" &&
        (line.reason !== OTHER_REASON || line.remarks.trim() !== "")
      );
    });

  const openReview = () => {
    saveSalesReturnDraft(
      billingId,
      returningItems.map(({ product, qty }) => {
        const line = returnLines[product.id];
        return {
          billingDetailsId: product.id,
          returnQty: qty,
          reason: line.reason,
          remarks: line.reason === OTHER_REASON ? line.remarks.trim() : "",
        };
      })
    );
    router.push(
      `/dashboard/salesReturn?view=review&billingId=${billingId}&billNo=${encodeURIComponent(billNo)}`
    );
  };

  const summaryItems = [
    { label: "Total Products", value: String(returningItems.length) },
    { label: "Total Return Qty", value: String(totalReturnQty) },
    { label: "Total Return Amount", value: formatRupees(totalReturnAmount) },
  ];

  return (
    <div className="flex flex-col gap-md">
      {/* Title Col — Figma node 4023:56156 */}
      <div className="flex min-w-0 flex-col gap-xxsm">
        <p className="text-h5 font-semibold text-pneutral-900">
          Create Sales Return
        </p>
        <p className="text-p3 font-regular text-pneutral-500">
          Select products and quantities to return against Bill No. {billNo}.
        </p>
      </div>

      {/* Original Bill Reference Card — Figma node 4023:56159 */}
      <div
        className={`flex w-full flex-col gap-sm rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Original Bill (Read Only)
        </p>

        <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-start">
          <BillDetail label="Bill No.">
            <BillDetailValue>{billNo}</BillDetailValue>
          </BillDetail>
          <BillDetail label="Bill Date">
            <BillDetailValue>{billDetails.billDate}</BillDetailValue>
          </BillDetail>
          <BillDetail label="Customer / Patient">
            <BillDetailValue>{billDetails.customerName}</BillDetailValue>
          </BillDetail>
          <BillDetail label="Customer Type">
            <span className="inline-flex items-center justify-center gap-xsm whitespace-nowrap rounded-lg bg-primary-100 px-xsm py-xxsm text-p4 font-medium text-primary-800">
              {billDetails.customerType}
            </span>
          </BillDetail>
          <BillDetail label="Total Bill Amount">
            <BillDetailValue>{billDetails.totalAmount}</BillDetailValue>
          </BillDetail>
        </div>
      </div>

      {/* Products from this Bill — Figma node 4023:56177 */}
      <p className="text-label-l5 font-semibold text-pneutral-900">
        Products from this Bill
      </p>

      {/* CSLR Product Table — Figma node 4023:56178. Shared grid DataTable with
          Figma's sizing applied from outside: 60px header, 76px rows, 8px cell
          padding, 8px corners. Cells wrap so every column fits without
          horizontal scrolling. */}
      <div className="w-full [&>div]:overflow-visible [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-15 [&_th]:border-pneutral-200 [&_th]:p-xsm [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_tbody_tr]:h-19 [&_td]:p-xsm [&_td]:align-top [&_td]:wrap-break-word [&_td:first-child]:w-11.25">
        <ReturnLinesContext.Provider value={{ lines: returnLines, updateLine }}>
          <DataTable
            columns={PRODUCT_COLUMNS}
            data={products}
            emptyState={
              <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
                {!billingId
                  ? "No bill selected. Go back and find the original bill."
                  : isLoading
                    ? "Loading products..."
                    : loadError || "No products on this bill."}
              </div>
            }
          />
        </ReturnLinesContext.Provider>
      </div>

      {/* Return Summary Card — Figma node 4023:56279 */}
      <div className="grid w-full grid-cols-1 gap-md rounded-2xl bg-pneutral-50 p-md sm:flex sm:items-start">
        {summaryItems.map(({ label, value }) => (
          <div
            key={label}
            className="flex min-w-0 flex-1 flex-col items-start gap-xxsm"
          >
            <p className="text-p3 font-regular text-pneutral-500">{label}</p>
            <p className="wrap-break-word text-h5 font-semibold text-pneutral-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* CSLR Footer Row — Figma node 4023:56289 */}
      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-end sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/salesReturn?view=find-bill")}
          className={`${FOOTER_BUTTON} w-full! border-secondary-700! text-secondary-700! sm:w-auto!`}
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back to Find Bill
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={openReview}
          disabled={!canReview}
          title={
            canReview
              ? undefined
              : "Tick at least one product and give each ticked product a quantity and reason"
          }
          className={`${FOOTER_BUTTON} w-full! bg-primary-800! text-pneutral-50! disabled:cursor-not-allowed disabled:opacity-50 sm:w-57.5!`}
        >
          Review and Confirm
          <ArrowRightLeft size={20} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
};

export default CreateSalesReturn;
