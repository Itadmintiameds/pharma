"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowRightLeft, CircleX, Search, TriangleAlert } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { CUSTOMER_TYPE_LABEL } from "@/app/dashboard/dashboardComponents/salesOverview/aggregations";
import {
  getAllBillings,
  getAllBillingsByPhoneNumber,
  getBillingById,
} from "@/services/BillingService";
import { BillingRecord } from "@/types/BillingData";
import { formatAmount } from "@/utils/billingTotals";

// Page background (#f8f5ff) and 24px padding of Figma "Content" (node 4023:56043)
// come from the dashboard layout's <main>.

// Figma "boxShadowCard" — same three-layer shadow the purchase return cards use
const CARD_SHADOW =
  "shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]";

type SearchMethod = "bill" | "mobile";

const SEARCH_METHODS: {
  value: SearchMethod;
  label: string;
  placeholder: string;
}[] = [
  {
    value: "bill",
    label: "Bill Number",
    placeholder: "Enter Bill Number (e.g., BILL-2026-00004)",
  },
  {
    value: "mobile",
    label: "Mobile Number",
    placeholder: "Enter Mobile Number",
  },
];

// Only these customer types can raise a sales return
const CUSTOMER_TYPE_OPTIONS = (
  ["OP_PATIENT", "IP_PATIENT", "WALK_IN", "DAYCARE"] as const
).map((value) => ({ label: CUSTOMER_TYPE_LABEL[value], value }));

interface OriginalBill {
  billingId: number;
  billNo: string;
  billDate: string;
  customerName: string;
  customerType: string;
  mobileNumber: string;
  totalAmount: string;
  paymentMode: string;
  /** Every line already returned in full — nothing left to return */
  fullyReturned: boolean;
}

interface MatchingBill extends OriginalBill {
  products: number;
  status: string;
}

/** "9538481985" → "+91 95384 81985", the format the bill details card shows. */
const formatMobile = (digits: string) =>
  digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : digits;

/** ISO date-time from the API → "dd-mm-yyyy". */
const formatBillDate = (value?: string) => {
  const [year, month, day] = (value ?? "").split("T")[0].split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  CREDIT: "Credit",
};

const toOriginalBill = (bill: BillingRecord): OriginalBill => {
  // A bill can be paid across several modes, so list each one once.
  const paymentModes = Array.from(
    new Set((bill.billingPayments ?? []).map((payment) => payment.paymentMode))
  ).map((mode) => PAYMENT_MODE_LABEL[mode] ?? mode);

  return {
    billingId: bill.billingId,
    billNo: bill.billNo,
    billDate: formatBillDate(bill.createdAt),
    // Null for an anonymous walk-in bill.
    customerName: bill.customerName || "Walk-in Customer",
    customerType: bill.customerType ? CUSTOMER_TYPE_LABEL[bill.customerType] : "—",
    mobileNumber: bill.customerPhoneNo ? formatMobile(bill.customerPhoneNo) : "—",
    totalAmount: `₹${formatAmount(bill.totalNetAmountAfterRoundOff ?? bill.totalNetAmount)}`,
    paymentMode: paymentModes.join(", ") || "—",
    // The bill's own status, or — where a line carries returnedQuantity — every
    // line returned up to what was sold.
    fullyReturned:
      bill.salesReturnStatus === "Returned" ||
      ((bill.billingDetails?.length ?? 0) > 0 &&
        bill.billingDetails.every(
          (line) =>
            (Number(line.returnedQuantity) || 0) >= (Number(line.billQuantity) || 0)
        )),
  };
};

const toMatchingBill = (bill: BillingRecord): MatchingBill => ({
  ...toOriginalBill(bill),
  products: bill.billingDetails?.length ?? 0,
  status: bill.salesReturnStatus ?? "Not Returned",
});

const buildMatchingBillColumns = (
  onSelect: (bill: MatchingBill) => void
): ColumnDef<MatchingBill>[] => [
  {
    accessorKey: "billNo",
    header: "BILL NO.",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-primary-800">
        {row.original.billNo}
      </span>
    ),
  },
  {
    accessorKey: "billDate",
    header: "BILL DATE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.billDate}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "CUSTOMER / PATIENT",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.customerName}
      </span>
    ),
  },
  {
    accessorKey: "customerType",
    header: "TYPE",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-500">
        {row.original.customerType}
      </span>
    ),
  },
  {
    accessorKey: "products",
    header: "PRODUCTS",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.products}
      </span>
    ),
  },
  {
    accessorKey: "paymentMode",
    header: "PAYMENT",
    cell: ({ row }) => (
      <span className="text-p3 font-regular text-pneutral-900">
        {row.original.paymentMode}
      </span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "AMOUNT",
    cell: ({ row }) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {row.original.totalAmount}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <span className="inline-flex items-center justify-center gap-xxsm whitespace-nowrap rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium text-success-800">
        {row.original.status}
      </span>
    ),
  },
  {
    header: "ACTION",
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onSelect(row.original)}
        // A bill already returned in full has nothing left to return
        disabled={row.original.fullyReturned}
        title={
          row.original.fullyReturned
            ? "All products on this bill have already been returned"
            : undefined
        }
        className="flex h-9 w-full max-w-29.75 min-w-27 items-center justify-center rounded-lg border-[1.5px] border-secondary-700 px-sm text-label-l3 font-medium text-secondary-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Select
      </button>
    ),
  },
];

/** Grey caption over a bold value — one cell of the bill details grid. */
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

const FindOriginalBill = () => {
  const router = useRouter();
  const [searchMethod, setSearchMethod] = useState<SearchMethod>("bill");
  const [searchValue, setSearchValue] = useState("");
  // Mobile search only — narrows a number shared across patient types
  const [customerType, setCustomerType] = useState("");
  const [originalBill, setOriginalBill] = useState<OriginalBill | null>(null);

  // Mobile search can match several bills; the user picks one with "Select"
  const [matchingBills, setMatchingBills] = useState<MatchingBill[] | null>(
    null
  );

  // Set when the last search came back empty — shows the "No matching Bill
  // found." block inside the search card
  const [notFound, setNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchBill = async () => {
    const query = searchValue.trim();
    if (!query || isSearching) return;

    if (searchMethod === "mobile" && !customerType) {
      setSearchError("Select a Customer Type to search by mobile number.");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setOriginalBill(null);
    setMatchingBills(null);
    setNotFound(false);

    try {
      if (searchMethod === "mobile") {
        // The endpoint matches on phone number only, so the customer type
        // narrows the result here.
        const bills = (await getAllBillingsByPhoneNumber(query))
          .filter((bill) => bill.customerType === customerType)
          .map(toMatchingBill);

        setMatchingBills(bills.length ? bills : null);
        setNotFound(bills.length === 0);
        return;
      }

      // /billing/{id} takes the numeric billingId, not the bill number typed
      // here, so resolve the number to its id from the bill list first.
      const match = (await getAllBillings()).find(
        (bill) => bill.billNo?.toLowerCase() === query.toLowerCase()
      );

      if (!match) {
        setNotFound(true);
        return;
      }

      setOriginalBill(toOriginalBill(await getBillingById(match.billingId)));
    } catch (err) {
      console.error("Failed to look up the original bill:", err);
      setSearchError(
        err instanceof Error ? err.message : "Failed to look up the bill."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // The bill number rides along in the URL so the create step can load it.
  const openCreateSalesReturn = (bill: OriginalBill) =>
    router.push(
      `/dashboard/salesReturn?view=create&billingId=${bill.billingId}&billNo=${encodeURIComponent(bill.billNo)}`
    );

  const activeMethod = SEARCH_METHODS.find((m) => m.value === searchMethod)!;

  return (
    <div className="flex flex-col gap-md">
      {/* Title Col — Figma node 4023:56044 */}
      <div className="flex min-w-0 flex-col gap-xxsm">
        <p className="text-h5 font-semibold text-pneutral-900">
          Find Original Bill
        </p>
        <p className="text-p3 font-regular text-pneutral-500">
          Search for the original sale bill to create a Sales Return against it.
        </p>
      </div>

      {/* Find Bill Search Card — Figma node 4023:56047 */}
      <div
        className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
      >
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Search Method
        </p>

        {/* Search Method Radio Row */}
        <div
          role="radiogroup"
          aria-label="Search Method"
          className="flex flex-wrap items-center gap-md"
        >
          {SEARCH_METHODS.map((method) => {
            const checked = searchMethod === method.value;
            return (
              <label
                key={method.value}
                className="flex cursor-pointer items-center gap-sm"
              >
                <input
                  type="radio"
                  name="salesReturnSearchMethod"
                  value={method.value}
                  checked={checked}
                  onChange={() => {
                    setSearchMethod(method.value);
                    setSearchValue("");
                    setCustomerType("");
                    setNotFound(false);
                    setSearchError("");
                    setMatchingBills(null);
                    setOriginalBill(null);
                  }}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-secondary-300 ${
                    checked ? "border-primary-900" : "border-pneutral-300"
                  }`}
                >
                  {checked && <span className="size-3 rounded-full bg-primary-900" />}
                </span>
                <span className="whitespace-nowrap text-label-l4 font-medium text-pneutral-900">
                  {method.label}
                </span>
              </label>
            );
          })}
        </div>

        {/* Bill Search Input Row / Mobile Search Input Row (Figma node 4023:54404) */}
        <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-end">
          {searchMethod === "mobile" && (
            <Dropdown
              label="Customer Type"
              required
              options={CUSTOMER_TYPE_OPTIONS}
              value={customerType}
              onChange={(value) => setCustomerType(String(value))}
              placeholder="IP Patient"
              labelClassName="px-xxsm"
              className="sm:w-45 sm:shrink-0 [&_[role=combobox]]:rounded-lg"
            />
          )}

          <Input
            label={activeMethod.label}
            required
            type={searchMethod === "mobile" ? "tel" : "text"}
            inputMode={searchMethod === "mobile" ? "numeric" : undefined}
            maxLength={searchMethod === "mobile" ? 10 : undefined}
            placeholder={activeMethod.placeholder}
            value={searchValue}
            onChange={(e) =>
              setSearchValue(
                searchMethod === "mobile"
                  ? e.target.value.replace(/\D/g, "")
                  : e.target.value
              )
            }
            labelClassName="px-xxsm"
            className="rounded-lg!"
            containerClassName="min-w-0 flex-1"
          />

          <Button
            type="button"
            variant="primary"
            onClick={searchBill}
            disabled={isSearching}
            className="h-12! max-h-13 min-h-12 w-full! min-w-27 shrink-0 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-35.25!"
          >
            <Search size={20} className="shrink-0" />
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {searchError && (
          <p role="alert" className="text-p3 font-regular text-warning-600">
            {searchError}
          </p>
        )}

        {/* No Matching Bill Found State — Figma node 4023:54559 */}
        {notFound && (
          <div
            role="status"
            className="flex w-full flex-col items-center justify-center gap-xsm py-8"
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <CircleX size={28} strokeWidth={1.5} className="text-primary-800" />
            </div>
            <p className="text-center text-label-l4 leading-8 font-semibold text-pneutral-900">
              No matching Bill found.
            </p>
            <p className="text-center text-p3 font-regular text-pneutral-500">
              Please check the entered {activeMethod.label} and try again.
            </p>
          </div>
        )}
      </div>

      {/* Matching Bills Results Card — Figma node 4023:54410 */}
      {searchMethod === "mobile" && matchingBills && (
        <div
          className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
        >
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Matching Bills ({matchingBills.length})
          </p>

          {/* Shared grid DataTable with Figma's sizing applied from outside:
              60px header, 64px rows, 8px cell padding, 8px corners. Cells wrap
              so all columns fit without horizontal scrolling. */}
          <div className="w-full [&>div]:rounded-lg [&>div]:shadow-none [&_thead_tr]:h-15 [&_th]:border-pneutral-200 [&_th]:p-xsm [&_th]:font-work-sans [&_th]:text-label-l3 [&_th]:font-semibold [&_tbody_tr]:h-16 [&_td]:p-xsm [&_td]:wrap-break-word">
            <DataTable
              columns={buildMatchingBillColumns(openCreateSalesReturn)}
              data={matchingBills}
              emptyState={
                <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
                  No bills found for this mobile number.
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* Selected Bill Details Card — Figma node 4023:56057 */}
      {originalBill && (
        <div
          className={`flex w-full flex-col gap-md rounded-2xl bg-white p-md ${CARD_SHADOW}`}
        >
          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-label-l5 font-semibold text-pneutral-900">
              Original Bill Found
            </p>
            <span className="inline-flex items-center justify-center gap-xxsm whitespace-nowrap rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium text-success-800">
              Eligible for Return
            </span>
          </div>

          <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:flex lg:items-start">
            <BillDetail label="Bill No.">
              <BillDetailValue>{originalBill.billNo}</BillDetailValue>
            </BillDetail>
            <BillDetail label="Bill Date">
              <BillDetailValue>{originalBill.billDate}</BillDetailValue>
            </BillDetail>
            <BillDetail label="Customer / Patient">
              <BillDetailValue>{originalBill.customerName}</BillDetailValue>
            </BillDetail>
            <BillDetail label="Customer Type">
              {/* The fully returned variant (Figma 4023:55547) shows plain text */}
              {originalBill.fullyReturned ? (
                <BillDetailValue>{originalBill.customerType}</BillDetailValue>
              ) : (
                <span className="inline-flex items-center justify-center gap-xsm rounded-lg bg-primary-100 px-xsm py-xxsm text-p4 font-medium whitespace-nowrap text-primary-800">
                  {originalBill.customerType}
                </span>
              )}
            </BillDetail>
          </div>

          <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-2 lg:flex lg:items-start">
            <BillDetail label="Mobile Number">
              <BillDetailValue>{originalBill.mobileNumber}</BillDetailValue>
            </BillDetail>
            <BillDetail label="Total Bill Amount">
              <BillDetailValue>{originalBill.totalAmount}</BillDetailValue>
            </BillDetail>
            <BillDetail label="Payment Mode">
              <BillDetailValue>{originalBill.paymentMode}</BillDetailValue>
            </BillDetail>
          </div>
        </div>
      )}

      {/* No Items Available Banner — Figma node 4023:55589. Replaces the
          footer: a bill with nothing left to return cannot start a return. */}
      {originalBill?.fullyReturned && (
        <div
          role="status"
          className="flex w-full items-center gap-sm rounded-2xl bg-warning-50 p-md"
        >
          {/* exclamation-triangle/micro — solid red triangle */}
          <TriangleAlert
            size={24}
            aria-hidden
            fill="currentColor"
            stroke="white"
            className="shrink-0 text-warning-600"
          />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-xxsm text-warning-600">
            <p className="w-full text-label-l4 font-semibold">
              No items are available for return against this Bill.
            </p>
            <p className="w-full text-p3 font-regular">
              All products on this bill have already been fully returned or are
              not eligible for return.
            </p>
          </div>
        </div>
      )}

      {/* Find Bill Footer Row — Figma node 4023:56084 */}
      {originalBill && !originalBill.fullyReturned && (
        <div className="flex w-full justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={() => openCreateSalesReturn(originalBill)}
            className="h-12! max-h-13 min-h-12 w-full! min-w-27 gap-xsm rounded-lg! bg-primary-800! px-md text-label-l4! font-medium! text-pneutral-50! sm:w-71.75!"
          >
            Continue to Create Return
            <ArrowRightLeft size={20} className="shrink-0" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FindOriginalBill;
