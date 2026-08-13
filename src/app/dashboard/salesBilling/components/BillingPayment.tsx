"use client";

/**
 * Step 2 of the POS flow — collect the payment against the cart built in
 * Billing, then hand the finished bill to BillingPaymentInvoice.
 * Designed according to the high-fidelity Payment POS specifications.
 */

import React, { useMemo, useState } from "react";
import {
  BillLine,
  BillTotals,
  CustomerInfo,
  PaymentDetails,
  PaymentMode,
} from "@/types/BillingData";
import { formatAmount } from "@/utils/billingTotals";
import {
  TRANSACTION_ID_MAX,
  firstError,
  receivedAmountSchema,
  sanitizeNumber,
  sanitizeTransactionId,
  toPaise,
  transactionIdSchema,
} from "@/app/schema/BillingSchema";
import { showToast } from "@/app/components/common/Toast";
import { BACK_BUTTON, PRIMARY_BUTTON } from "./billingButtons";

interface BillingPaymentProps {
  customer: CustomerInfo;
  lines: BillLine[];
  totals: BillTotals;
  /** Back to the cart with everything intact. */
  onBack: () => void;
  onGenerateInvoice: (payment: PaymentDetails) => void;
  /**
   * "settle" collects what is still owed on a saved bill instead of billing a
   * new cart — the amount due is `pendingAmount` rather than the whole net.
   */
  mode?: "create" | "settle";
  pendingAmount?: number;
  billNo?: string;
}

/**
 * Only an admitted patient may leave a balance on the bill — in part through
 * any mode, or in full by billing it to credit. Everyone else pays up front.
 */
const PARTIAL_PAYMENT_CUSTOMER_TYPES = ["IP_PATIENT"];

/** Cash and credit carry no transaction reference of their own. */
const REFERENCE_MODES: PaymentMode[] = ["UPI", "CARD"];

const PAYMENT_MODES: {
  label: string;
  value: PaymentMode;
  iconPath: string;
}[] = [
  { label: "Cash", value: "CASH", iconPath: "/Billing/Cash.svg" },
  { label: "UPI", value: "UPI", iconPath: "/Billing/UPI.svg" },
  { label: "Card", value: "CARD", iconPath: "/Billing/CARD.svg" },
  { label: "Credit", value: "CREDIT", iconPath: "/Billing/CARD.svg" },
];

const BillingPayment: React.FC<BillingPaymentProps> = ({
  customer,
  lines,
  totals,
  onBack,
  onGenerateInvoice,
  mode = "create",
  pendingAmount,
  billNo,
}) => {
  const isSettling = mode === "settle";
  /** Settling clears the outstanding balance; billing clears the whole net. */
  const amountDue = isSettling ? pendingAmount ?? 0 : totals.netAmount;

  // Walk-ins and outpatients pay in full; an admitted patient may pay in part
  // through any mode, and the balance is carried as the pending amount.
  const canPayPartially = PARTIAL_PAYMENT_CUSTOMER_TYPES.includes(
    customer.customerType
  );
  // Credit is billing with nothing collected, so it has nothing to offer a
  // screen whose whole purpose is collecting an outstanding balance.
  const canPayOnCredit = canPayPartially && !isSettling;

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  // Left blank on purpose — the cashier types what was handed over.
  const [amountReceived, setAmountReceived] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Credit means nothing was handed over — the whole bill stays pending.
  const isCredit = paymentMode === "CREDIT";
  const needsReference = REFERENCE_MODES.includes(paymentMode);

  const received = isCredit ? 0 : Number(amountReceived) || 0;

  // Compared in paise throughout: 91.6100 against 91.61 is not a shortfall.
  const changeDue = useMemo(
    () => Math.max(0, toPaise(received) - toPaise(amountDue)) / 100,
    [received, amountDue]
  );

  /** What is still owed after this payment. */
  const shortfall = Math.max(0, toPaise(amountDue) - toPaise(received)) / 100;

  /**
   * The summary rows above Net Amount. Taxable and GST are the tax split of
   * what is being paid — MRP is tax-inclusive, so the GST was extracted out of
   * the net rather than added to it, hence no sign against it. Total is the MRP
   * value of the lines before any discount, so the card reads as
   * Total - Discount = Net Amount. GST is an amount only, since lines can sit
   * on different slabs.
   */
  const SUMMARY_ROWS = [
    { label: "Taxable", sign: "", value: totals.taxableAmount },
    { label: "GST", sign: "", value: totals.gstAmount },
    // Sum of the lines' totals (MRP x qty), so Total - Discount = Net Amount.
    // A display row only.
    { label: "Total", sign: "", value: totals.grossAmount },
    {
      label: "Discount",
      sign: "(-)",
      value: totals.itemDiscount + totals.billDiscount,
    },
  ];

  /**
   * Messages sit under their own field. Only UPI and card carry a reference.
   * An in-patient may pay in part or not at all through any mode; everyone
   * else has to clear the bill. Credit is fixed at nothing received.
   */
  const validate = () => {
    const next = {
      amount: isCredit
        ? ""
        : firstError(
            receivedAmountSchema(amountDue, canPayPartially),
            amountReceived
          ),
      referenceNo: firstError(transactionIdSchema(needsReference), referenceNo),
    };

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleGenerate = () => {
    if (!validate()) {
      showToast.error("Please correct the highlighted fields.");
      return;
    }

    onGenerateInvoice({
      paymentMode,
      amountReceived: received,
      referenceNo: needsReference ? referenceNo : "",
      remarks: "",
      changeDue,
      pendingAmount: shortfall,
    });
  };

  return (
    <div className="flex flex-col justify-between gap-6 text-pneutral-900 min-h-[700px] pb-12 w-full">
      <div className="flex flex-col gap-5">
        {/* Top Title */}
        <div className="text-[24px] font-semibold tracking-normal text-[#1E1E1D]">
          {isSettling ? `Settle Payment${billNo ? ` — ${billNo}` : ""}` : "Billing POS"}
        </div>

        {/* Main Columns - items-stretch guarantees equal height for both cards */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
          {/* Left Card: Payment Mode & Details */}
          <div className="flex-1 w-full rounded-[16px] border border-[#D5D5D4] bg-white p-[20px] shadow-sm flex flex-col gap-[20px] h-auto">
            {/* Heading */}
            <div className="text-[18px] font-semibold text-[#1E1E1D]">
              Payment Mode
            </div>

            {/* Payment Mode Selection Boxes */}
            <div className="flex items-center gap-[16px] flex-wrap sm:flex-nowrap">
              {PAYMENT_MODES.filter(
                (mode) => mode.value !== "CREDIT" || canPayOnCredit
              ).map((mode) => {
                const isSelected = paymentMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.value);
                      setErrors({});
                      // Credit collects nothing; cash and credit carry no
                      // reference, so neither field keeps a stale value.
                      if (mode.value === "CREDIT") setAmountReceived("0");
                      else if (paymentMode === "CREDIT") setAmountReceived("");
                      if (!REFERENCE_MODES.includes(mode.value))
                        setReferenceNo("");
                    }}
                    className={`w-[98px] h-[102px] rounded-[12px] p-[12px] flex flex-col items-center justify-center gap-[8px] border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#378200] bg-[#DCF7CB] shadow-2xs"
                        : "border-[#D5D5D4] bg-white hover:bg-pneutral-50"
                    }`}
                  >
                    <img
                      src={mode.iconPath}
                      alt={mode.label}
                      className="h-[34px] w-auto object-contain"
                    />
                    <span
                      className={`text-[14px] leading-none ${
                        isSelected
                          ? "font-bold text-[#378200]"
                          : "font-semibold text-[#1E1E1D]"
                      }`}
                    >
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Input Fields */}
            <div className="flex flex-col gap-[16px] pt-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[15px] font-medium text-[#1E1E1D]">
                    Received Amount
                  </label>
                  <span className="text-[13px] font-medium text-[#5A5B57]">
                    {isSettling ? "Pending" : "Amount due"}: ₹{" "}
                    {formatAmount(amountDue)}
                  </span>
                </div>
                <div
                  className={`h-[48px] w-full rounded-[8px] border bg-white px-4 flex items-center shadow-2xs transition-colors ${
                    errors.amount
                      ? "border-warning-500"
                      : "border-[#D5D5D4] focus-within:border-[#7D32FC]"
                  }`}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountReceived}
                    onChange={(e) => {
                      setAmountReceived(sanitizeNumber(e.target.value));
                      setErrors((prev) => ({ ...prev, amount: "" }));
                    }}
                    placeholder="0.00"
                    disabled={isCredit}
                    className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none disabled:text-pneutral-400 disabled:cursor-not-allowed placeholder:text-pneutral-400"
                  />
                </div>
                {errors.amount ? (
                  <span className="text-p2 text-warning-500">{errors.amount}</span>
                ) : (
                  isCredit && (
                    <span className="text-p2 text-[#5A5B57]">
                      Nothing is collected on credit — the whole bill stays
                      pending.
                    </span>
                  )
                )}
              </div>

              {/* An in-patient may settle the rest later, so what is left over
                  is captured against the bill. Everyone else pays in full and
                  never sees this. */}
              {canPayPartially && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[15px] font-medium text-[#1E1E1D]">
                    Pending Amount{" "}
                    <span className="text-[13px] font-normal text-[#5A5B57]">
                      (optional)
                    </span>
                  </label>
                  <div className="h-[48px] w-full rounded-[8px] border border-[#D5D5D4] bg-[#F5F5F5] px-4 flex items-center shadow-2xs">
                    <input
                      type="text"
                      value={formatAmount(shortfall)}
                      readOnly
                      className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none cursor-default"
                    />
                  </div>
                  <span className="text-p2 text-[#5A5B57]">
                    {shortfall > 0
                      ? `₹ ${formatAmount(shortfall)} will remain pending on this bill`
                      : "Bill is fully paid — nothing pending"}
                  </span>
                </div>
              )}

              {/* Cash and credit have no reference of their own. */}
              {needsReference && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[15px] font-medium text-[#1E1E1D]">
                    UPI Reference/Transaction ID
                  </label>
                  <div
                    className={`h-[48px] w-full rounded-[8px] border bg-white px-4 flex items-center shadow-2xs transition-colors ${
                      errors.referenceNo
                        ? "border-warning-500"
                        : "border-[#D5D5D4] focus-within:border-[#7D32FC]"
                    }`}
                  >
                    <input
                      type="text"
                      value={referenceNo}
                      maxLength={TRANSACTION_ID_MAX}
                      onChange={(e) => {
                        setReferenceNo(sanitizeTransactionId(e.target.value));
                        setErrors((prev) => ({ ...prev, referenceNo: "" }));
                      }}
                      placeholder="UTR123456789012"
                      className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none placeholder:text-pneutral-400"
                    />
                  </div>
                  {errors.referenceNo && (
                    <span className="text-p2 text-warning-500">
                      {errors.referenceNo}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Card: Billing Summary — 321.25 x 258 at 16px padding, and
              self-start so it keeps that height however tall the payment mode
              card beside it grows. Settling adds two rows, so only the create
              flow is pinned to the exact height. */}
          <div
            className={`w-full lg:w-[321.25px] self-start shrink-0 rounded-[16px] border border-[#D5D5D4] bg-white p-4 shadow-sm flex flex-col gap-2 ${
              isSettling ? "h-auto" : "lg:h-[258px]"
            }`}
          >
            <div className="h-6 font-body text-p5 font-bold leading-8 text-pneutral-800">
              Billing Summary
            </div>

            {SUMMARY_ROWS.map((row) => (
              <div key={row.label} className="flex h-8 items-center gap-3">
                <span className="w-[108px] shrink-0 font-body text-p4 font-normal leading-8 text-pneutral-800">
                  {row.label}
                </span>
                {/* The sign sits centred between the two columns. */}
                <span className="flex-1 text-center font-body text-p4 font-normal leading-8 text-pneutral-800">
                  {row.sign}
                </span>
                <span className="min-w-[73px] shrink-0 text-right font-body text-p4 font-normal leading-8 text-pneutral-800">
                  ₹ {formatAmount(row.value)}
                </span>
              </div>
            ))}

            {/* No rule above it — the weight and colour carry the emphasis. */}
            <div className="flex h-8 items-center gap-3">
              <span className="w-[142px] shrink-0 font-heading text-h5 font-semibold text-secondary-700">
                Net Amount
              </span>
              <span className="min-w-[118px] flex-1 text-right font-heading text-h5 font-semibold text-secondary-700">
                ₹ {formatAmount(totals.netAmount)}
              </span>
            </div>

            {/* Settling shows what has already been collected and what the
                customer still owes — the balance this screen clears. */}
            {isSettling && (
              <>
                <div className="flex h-8 items-center gap-3">
                  <span className="w-[108px] shrink-0 font-body text-p4 font-normal leading-8 text-pneutral-800">
                    Already Paid
                  </span>
                  <span className="min-w-[73px] flex-1 text-right font-body text-p4 font-normal leading-8 text-pneutral-800">
                    ₹ {formatAmount(Math.max(0, totals.netAmount - amountDue))}
                  </span>
                </div>

                <div className="flex h-8 items-center gap-3">
                  <span className="w-[142px] shrink-0 font-heading text-h5 font-semibold text-secondary-700">
                    Pending Amount
                  </span>
                  <span className="min-w-[118px] flex-1 text-right font-heading text-h5 font-semibold text-secondary-700">
                    ₹ {formatAmount(amountDue)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex h-14 items-center justify-between w-full pt-8 mt-auto">
        <button
          type="button"
          onClick={onBack}
          className={`${BACK_BUTTON} w-[108px] shrink-0`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className={`${PRIMARY_BUTTON} w-[219px] shrink-0`}
        >
          {isSettling ? "Record Payment" : "Generate Invoice"}
        </button>
      </div>
    </div>
  );
};

export default BillingPayment;
