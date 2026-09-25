"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRightLeft, CircleCheck, Info } from "lucide-react";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";

interface OriginalInvoice {
  supplier: string;
  invoiceNo: string;
  grnNo: string;
  paymentType: string;
  amount: number;
}

interface ReturnedItem {
  id: string;
  productName: string;
  batchNo: string;
  expiry: string;
  /** Quantities saved on the current revision — the "Existing" column. */
  existingPurchaseQty: number;
  existingFreeQty: number;
  returnPurchaseQty: number;
  returnFreeQty: number;
}

/** The return's money figures, one set per revision. */
interface ReturnFinancials {
  taxableValue: number;
  gst: number;
  totalReturnAmount: number;
  adjustedAgainstPayable: number;
  payableAfterReturn: number;
  amountDueFromSupplier: number;
}

interface PurchaseReturnEditProps {
  returnNo?: string;
  /** Revision the saved return is on; the edit will be saved as `revision + 1`. */
  revision?: number;
  status?: string;
  invoice?: OriginalInvoice;
  items?: ReturnedItem[];
  existingFinancials?: ReturnFinancials;
  revisedFinancials?: ReturnFinancials;
  onBack?: () => void;
  onConfirm?: (edit: { editReason: string; items: ReturnedItem[] }) => void;
}

const DEFAULT_INVOICE: OriginalInvoice = {
  supplier: "HealthCare Pharma",
  invoiceNo: "INV-2234",
  grnNo: "GRN-2026-00005",
  paymentType: "Credit",
  amount: 10500,
};

const DEFAULT_ITEMS: ReturnedItem[] = [
  {
    id: "BCH001",
    productName: "Crocin 500 mg Tablet",
    batchNo: "BCH001",
    expiry: "Dec 2027",
    existingPurchaseQty: 10,
    existingFreeQty: 0,
    returnPurchaseQty: 8,
    returnFreeQty: 2,
  },
];

const DEFAULT_EXISTING_FINANCIALS: ReturnFinancials = {
  taxableValue: 500,
  gst: 25,
  totalReturnAmount: 945,
  adjustedAgainstPayable: 945,
  payableAfterReturn: 5055,
  amountDueFromSupplier: 0,
};

const DEFAULT_REVISED_FINANCIALS: ReturnFinancials = {
  taxableValue: 400,
  gst: 20,
  totalReturnAmount: 840,
  adjustedAgainstPayable: 840,
  payableAfterReturn: 5160,
  amountDueFromSupplier: 0,
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ComparisonRow {
  field: string;
  existing: string;
  revised: string;
}

const EDIT_REASON_OPTIONS = [
  { label: "Wrong Return Quantity", value: "WRONG_RETURN_QUANTITY" },
  { label: "Wrong Batch Selected", value: "WRONG_BATCH_SELECTED" },
  { label: "Wrong Product Selected", value: "WRONG_PRODUCT_SELECTED" },
  { label: "Pricing Correction", value: "PRICING_CORRECTION" },
];

/** A blank field reads as 0; anything else is floored to a whole, non-negative unit. */
const toQty = (raw: string) => Math.max(0, Math.floor(Number(raw) || 0));

/** Figma's ".Input-Size" at 36px: 14/20 Medium label flush on the field, 12/18
 *  text with 12px side padding (4px wrapper + the input's own 8px). */
const QtyField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <Input
    label={label}
    type="number"
    min={0}
    sizeVariant="sm"
    value={value}
    onChange={(e) => onChange(toQty(e.target.value))}
    labelClassName="mb-0! px-xxsm text-label-l3!"
    className="px-xxsm [&_input]:text-p2"
    containerClassName="md:w-51 md:shrink-0"
  />
);

const InvoiceField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
    <p className="text-p3 font-regular text-pneutral-500">{label}</p>
    <p className="text-label-l4 font-semibold break-words text-pneutral-900">
      {value}
    </p>
  </div>
);

/** Header row — Figma node 3589:7189; correction banner — node 3589:7196;
 *  original invoice card — node 3589:7201; returned items card — node 3589:7219;
 *  edit reason card — node 3589:7233; existing vs revised card — node 3589:7241;
 *  review footer row — node 3589:7366. */
const PurchaseReturnEdit = ({
  returnNo = "PR-2026-00004",
  revision = 1,
  status = "Confirmed",
  invoice = DEFAULT_INVOICE,
  items = DEFAULT_ITEMS,
  existingFinancials = DEFAULT_EXISTING_FINANCIALS,
  revisedFinancials = DEFAULT_REVISED_FINANCIALS,
  onBack,
  onConfirm,
}: PurchaseReturnEditProps) => {
  const [returnItems, setReturnItems] = useState<ReturnedItem[]>(items);
  const [editReason, setEditReason] = useState<string>("");

  // Figma labels rows by the product's first word: "Crocin 500 mg Tablet" → "Crocin".
  const shortName = (item?: ReturnedItem) => item?.productName.split(" ")[0] ?? "";

  // Quantity rows follow the fields above as they're edited; money rows come
  // from the financial figures passed in for each revision.
  const comparisonRows: ComparisonRow[] = [
    ...returnItems.flatMap((item) => {
      const name = shortName(item);
      return [
        {
          field: `Return Purchase Qty (${name})`,
          existing: String(item.existingPurchaseQty),
          revised: String(item.returnPurchaseQty),
        },
        {
          field: `Return Free Qty (${name})`,
          existing: String(item.existingFreeQty),
          revised: String(item.returnFreeQty),
        },
      ];
    }),
    ...(
      [
        [`Taxable Value (${shortName(returnItems[0])}) (₹)`, "taxableValue"],
        [`GST (${shortName(returnItems[0])}) (₹)`, "gst"],
        ["Total Purchase Return Amount (₹)", "totalReturnAmount"],
        ["Adjusted Against Supplier Payable (₹)", "adjustedAgainstPayable"],
        ["Supplier Payable After Return (₹)", "payableAfterReturn"],
        ["Amount Due from Supplier (₹)", "amountDueFromSupplier"],
      ] as const
    ).map(([field, key]) => ({
      field,
      existing: formatAmount(existingFinancials[key]),
      revised: formatAmount(revisedFinancials[key]),
    })),
  ];

  const updateItem = (id: string, patch: Partial<ReturnedItem>) =>
    setReturnItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full items-center gap-md">
        <div className="flex min-w-0 flex-1 flex-col gap-xsm">
          <div className="flex flex-wrap items-center gap-sm">
            <p className="text-h5 font-semibold text-pneutral-900">
              Edit Purchase Return
            </p>
            {/* The project's "danger" tokens are this Figma file's yellow scale. */}
            <span className="inline-flex shrink-0 items-center justify-center gap-xxsm rounded-lg border border-danger-600 bg-danger-50 px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap text-danger-600">
              Revision {revision} → {revision + 1}
            </span>
            <span className="inline-flex shrink-0 items-center justify-center gap-xxsm rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap text-success-800">
              {status}
            </span>
          </div>
          <p className="text-label-l4 font-regular text-pneutral-500">
            {returnNo} — This Purchase Return has already been confirmed. Changes
            will be recorded as a new revision.
          </p>
        </div>
      </div>

      {/* Controlled Correction Banner — Figma node 3589:7196 */}
      <div className="flex w-full items-start gap-sm rounded-2xl bg-secondary-100 p-md text-secondary-700">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-xxsm">
          <p className="text-label-l4 font-semibold">
            This is a controlled correction, not a direct overwrite.
          </p>
          <p className="text-p3 font-regular">
            Confirming your changes will create Revision {revision + 1} of this
            Purchase Return. The original Revision {revision} remains available in
            Audit History for reference.
          </p>
        </div>
      </div>

      {/* Selected Invoice Card — Figma node 3589:7201 */}
      <div className="flex w-full flex-col gap-sm rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">
          Original Purchase Invoice (Read Only)
        </p>

        <div className="grid w-full grid-cols-2 gap-md sm:grid-cols-3 lg:flex lg:items-start">
          <InvoiceField label="Supplier" value={invoice.supplier} />
          <InvoiceField label="Invoice No." value={invoice.invoiceNo} />
          <InvoiceField label="GRN No." value={invoice.grnNo} />
          <InvoiceField label="Payment Type" value={invoice.paymentType} />
          <InvoiceField
            label="Original Invoice Amount (₹)"
            value={invoice.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          />
        </div>
      </div>

      {/* Editable Return Items Card — Figma node 3589:7219 */}
      <div className="flex w-full flex-col gap-md rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">Returned Items</p>

        {returnItems.map((item) => (
          <div
            key={item.id}
            className="flex w-full flex-col gap-md md:flex-row md:items-center"
          >
            <div className="flex flex-col justify-center gap-xxsm md:w-50 md:shrink-0 md:self-stretch">
              <p className="text-p3 font-semibold text-pneutral-900">{item.productName}</p>
              <p className="text-label-l2 font-regular text-pneutral-500">
                Batch {item.batchNo} · Exp {item.expiry}
              </p>
            </div>

            <div className="flex w-full flex-col gap-md sm:flex-row md:w-auto">
              <QtyField
                label="Return Purchase Qty"
                value={item.returnPurchaseQty}
                onChange={(value) => updateItem(item.id, { returnPurchaseQty: value })}
              />
              <QtyField
                label="Return Free Qty"
                value={item.returnFreeQty}
                onChange={(value) => updateItem(item.id, { returnFreeQty: value })}
              />
            </div>

            <span className="inline-flex shrink-0 items-center justify-center gap-xxsm self-start rounded-lg border border-success-600 bg-success-50 px-sm py-0.5 text-label-l3 font-medium whitespace-nowrap text-success-800 md:ml-auto md:self-center">
              Eligible
            </span>
          </div>
        ))}
      </div>

      {/* Edit Reason Card — Figma node 3589:7233 */}
      <div className="flex w-full flex-col gap-sm rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <p className="text-label-l5 font-semibold text-pneutral-900">Edit Reason</p>

        {/* Figma's field: label flush on an 8px-radius box, 4px-padded label with
            a 14/20 Open Sans asterisk 4px after it. */}
        <Dropdown
          label="Reason for Edit"
          required
          options={EDIT_REASON_OPTIONS}
          value={editReason}
          onChange={setEditReason}
          placeholder="Select reason for edit"
          className="[&>div:first-child]:mb-0 [&_[role=combobox]]:rounded-lg"
          labelClassName="px-xxsm [&>span]:ml-1 [&>span]:font-open-sans [&>span]:text-[14px] [&>span]:leading-5"
        />
      </div>

      {/* Existing vs Revised Card — Figma node 3589:7241 */}
      <div className="flex w-full flex-col gap-md rounded-2xl bg-white p-md shadow-[0px_0px_12px_4px_#c0c1be33,-4px_-4px_12px_0px_#d5d5d433,4px_4px_12px_-2px_#d5d5d433]">
        <div className="flex items-center gap-sm">
          <p className="text-label-l5 font-semibold text-pneutral-900">
            Existing vs. Revised Values
          </p>
          <ArrowRightLeft size={16} className="shrink-0 text-warning-600" />
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-pneutral-200">
          <table className="w-full min-w-140 border-collapse">
            <thead>
              <tr className="bg-pneutral-100 text-label-l3 font-semibold text-pneutral-700">
                <th className="w-1/2 p-sm text-left">FIELD</th>
                <th className="w-1/2 p-sm text-center whitespace-nowrap">
                  EXISTING (REVISION {revision})
                </th>
                <th className="bg-secondary-100 p-sm text-left whitespace-nowrap text-secondary-700">
                  REVISED (REVISION {revision + 1})
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => {
                const changed = row.revised !== row.existing;
                return (
                  <tr
                    key={row.field}
                    className="h-11 border-b border-pneutral-200 text-p3 last:border-b-0"
                  >
                    <td className="px-sm font-regular text-pneutral-900">{row.field}</td>
                    <td className="px-sm text-center font-regular whitespace-nowrap text-pneutral-700">
                      {row.existing}
                    </td>
                    <td
                      className={`px-sm text-center whitespace-nowrap ${
                        changed
                          ? "font-semibold text-secondary-700"
                          : "font-regular text-pneutral-900"
                      }`}
                    >
                      {row.revised}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Footer Row — Figma node 3589:7366 */}
      <div className="flex w-full flex-col-reverse gap-sm sm:flex-row sm:items-start sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full! gap-xsm border-secondary-700! px-md font-medium! text-secondary-700! sm:w-35.25!"
        >
          <ArrowLeft size={20} className="shrink-0" />
          Back
        </Button>

        {/* Stays disabled until the required edit reason is picked. */}
        <Button
          type="button"
          variant="primary"
          disabled={!editReason}
          onClick={() => onConfirm?.({ editReason, items: returnItems })}
          className="w-full min-w-27 gap-xsm bg-primary-800! px-md font-medium! text-pneutral-50! sm:w-auto"
        >
          Confirm Purchase Return
          <CircleCheck size={20} className="shrink-0 fill-pneutral-50 text-primary-800" />
        </Button>
      </div>
    </div>
  );
};

export default PurchaseReturnEdit;
