"use client";

/**
 * Step 2 of the POS flow — collect the payment against the cart built in
 * Billing, then hand the finished bill to BillingPaymentInvoice.
 */

import React, { useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Smartphone,
  CalendarClock,
  ArrowLeft,
} from "lucide-react";
import Input from "@/app/components/common/Input";
import {
  BillLine,
  BillTotals,
  CustomerInfo,
  PaymentDetails,
  PaymentMode,
} from "@/types/BillingData";
import { formatAmount } from "@/utils/billingTotals";

interface BillingPaymentProps {
  customer: CustomerInfo;
  lines: BillLine[];
  totals: BillTotals;
  /** Back to the cart with everything intact. */
  onBack: () => void;
  onGenerateInvoice: (payment: PaymentDetails) => void;
}

const PAYMENT_MODES: {
  label: string;
  value: PaymentMode;
  icon: React.ReactNode;
  hint: string;
}[] = [
  { label: "Cash", value: "CASH", icon: <Banknote size={22} />, hint: "Counter cash" },
  { label: "Card", value: "CARD", icon: <CreditCard size={22} />, hint: "Debit / credit" },
  { label: "UPI", value: "UPI", icon: <Smartphone size={22} />, hint: "GPay, PhonePe" },
  {
    label: "Credit",
    value: "CREDIT",
    icon: <CalendarClock size={22} />,
    hint: "Pay later",
  },
];

const BillingPayment: React.FC<BillingPaymentProps> = ({
  customer,
  lines,
  totals,
  onBack,
  onGenerateInvoice,
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [creditDays, setCreditDays] = useState("");

  const received = Number(amountReceived) || 0;

  // Credit bills are handed over unpaid, so nothing is due back and the balance
  // is the whole bill.
  const changeDue = useMemo(
    () =>
      paymentMode === "CREDIT" ? 0 : Math.max(0, received - totals.netAmount),
    [paymentMode, received, totals.netAmount]
  );

  const shortfall =
    paymentMode === "CREDIT" ? 0 : Math.max(0, totals.netAmount - received);

  const canGenerate =
    paymentMode === "CREDIT" ? Boolean(creditDays) : shortfall === 0;

  const summaryRows = [
    { label: "Sub Total", value: `₹ ${formatAmount(totals.grossAmount)}` },
    { label: "Item Discount", value: `- ₹ ${formatAmount(totals.itemDiscount)}` },
    { label: "Bill Discount", value: `- ₹ ${formatAmount(totals.billDiscount)}` },
    { label: "Taxable Amount", value: `₹ ${formatAmount(totals.taxableAmount)}` },
    { label: "GST", value: `₹ ${formatAmount(totals.gstAmount)}` },
    { label: "Round Off", value: `₹ ${formatAmount(totals.roundOff)}` },
  ];

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 text-pneutral-900">
          <div className="text-h4 font-semibold">Payment</div>
          <div className="text-p3 font-normal font-noto-sans">
            Collect payment and generate the invoice
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="h-9 px-4 flex items-center gap-2 rounded-lg border border-pneutral-300 text-label-l3 font-medium text-pneutral-700"
        >
          <ArrowLeft size={16} />
          Back to Cart
        </button>
      </div>

      <div className="grid grid-cols-[1fr_400px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {/* Payment mode */}
          <div className="bg-white p-4 border border-pneutral-100 rounded-xl flex flex-col gap-4">
            <div className="text-label-l4 font-semibold text-pneutral-900">
              Payment Mode
              <span className="ml-2 text-warning-500 font-semibold text-label-l2">
                *
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {PAYMENT_MODES.map((mode) => {
                const isSelected = paymentMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    className={`h-24 flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-secondary-600 bg-secondary-50 text-secondary-800"
                        : "border-pneutral-200 bg-white text-pneutral-700"
                    }`}
                  >
                    {mode.icon}
                    <span className="text-label-l3 font-medium">{mode.label}</span>
                    <span className="text-p2 font-noto-sans text-pneutral-500">
                      {mode.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment capture */}
          <div className="bg-white p-4 border border-pneutral-100 rounded-xl flex flex-col gap-4">
            <div className="text-label-l4 font-semibold text-pneutral-900">
              Payment Details
            </div>

            <div className="grid grid-cols-2 gap-4 items-start">
              {paymentMode === "CREDIT" ? (
                <Input
                  label="Credit Days"
                  type="number"
                  placeholder="30 Days"
                  required
                  value={creditDays}
                  onChange={(e) => setCreditDays(e.target.value)}
                />
              ) : (
                <Input
                  label="Amount Received (₹)"
                  type="number"
                  placeholder={formatAmount(totals.netAmount)}
                  required
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                />
              )}

              <Input
                label={paymentMode === "UPI" ? "UPI Ref. No." : "Reference No."}
                placeholder="Transaction / approval reference"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                disabled={paymentMode === "CASH"}
              />
            </div>

            {paymentMode !== "CREDIT" && (
              <div className="flex flex-wrap gap-2">
                {[totals.netAmount, 500, 1000, 2000].map((preset, index) => (
                  <button
                    key={`${preset}-${index}`}
                    type="button"
                    onClick={() => setAmountReceived(String(preset))}
                    className="h-9 px-4 rounded-lg border border-pneutral-300 text-p3 font-medium text-pneutral-700"
                  >
                    {index === 0 ? "Exact" : `₹ ${preset}`}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="mb-1 block text-label-l4 font-medium text-pneutral-900">
                Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any note to print on the invoice"
                className="w-full rounded-md border border-pneutral-300 bg-white px-3 py-2 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500"
              />
            </div>

            {paymentMode !== "CREDIT" && received > 0 && (
              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-p3 font-noto-sans ${
                  shortfall > 0
                    ? "bg-warning-50 text-warning-600"
                    : "bg-success-50 text-success-800"
                }`}
              >
                <span>{shortfall > 0 ? "Balance to collect" : "Change to return"}</span>
                <span className="text-label-l3 font-semibold">
                  ₹ {formatAmount(shortfall > 0 ? shortfall : changeDue)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bill summary */}
        <div className="bg-white p-4 border border-pneutral-100 rounded-xl flex flex-col gap-3">
          <div className="text-label-l4 font-semibold text-pneutral-900">
            Billing Summary
          </div>

          <div className="flex flex-col gap-1 border-b border-pneutral-100 pb-3 text-p2 font-noto-sans text-pneutral-500">
            <span>{customer.customerName || "Walk-in Customer"}</span>
            <span>{customer.mobileNo || "No mobile number"}</span>
            <span>
              {totals.totalItems} items · {totals.totalQuantity} qty
            </span>
          </div>

          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-p3 font-noto-sans text-pneutral-700"
            >
              <span>{row.label}</span>
              <span className="font-medium text-pneutral-900">{row.value}</span>
            </div>
          ))}

          <div className="mt-1 flex items-center justify-between rounded-lg bg-primary-100 px-3 py-3">
            <span className="text-label-l4 font-semibold text-primary-900">
              Net Amount
            </span>
            <span className="text-h6 font-semibold text-primary-800">
              ₹ {formatAmount(totals.netAmount)}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pt-1">
            {lines.map((line) => (
              <div
                key={line.lineId}
                className="flex items-start justify-between gap-2 text-p2 font-noto-sans"
              >
                <span className="text-pneutral-700 truncate">
                  {line.productName}
                  <span className="text-pneutral-400"> × {line.quantity}</span>
                </span>
                <span className="text-pneutral-900 shrink-0">
                  ₹ {formatAmount(line.quantity * line.mrpPerUnit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-pneutral-100 bg-white px-6 py-3">
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-27 h-9 rounded-lg bg-white border border-pneutral-50 shadow-[0_4px_12px_rgba(0,0,0,0.12)] text-label-l3 font-medium text-pneutral-900"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() =>
              onGenerateInvoice({
                paymentMode,
                amountReceived:
                  paymentMode === "CREDIT" ? 0 : received || totals.netAmount,
                referenceNo,
                remarks,
                changeDue,
                creditDays: creditDays ? Number(creditDays) : undefined,
              })
            }
            className="h-9 px-5 rounded-lg bg-primary-800 text-label-l3 font-medium text-pneutral-50 disabled:opacity-50"
          >
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPayment;
