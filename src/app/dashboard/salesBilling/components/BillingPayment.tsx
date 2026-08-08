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

/** Credit is only extended to admitted patients. */
const CREDIT_CUSTOMER_TYPES = ["IP_PATIENT", "DAYCARE"];

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

  // Walk-ins and outpatients pay in full; only admitted patients get credit —
  // when billing and again when settling, so a balance can be cleared in parts.
  const canPayOnCredit = CREDIT_CUSTOMER_TYPES.includes(customer.customerType);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  // Left blank on purpose — the cashier types what was handed over.
  const [amountReceived, setAmountReceived] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const received = Number(amountReceived) || 0;

  // Compared in paise throughout: 91.6100 against 91.61 is not a shortfall.
  const changeDue = useMemo(
    () => Math.max(0, toPaise(received) - toPaise(amountDue)) / 100,
    [received, amountDue]
  );

  /** What is still owed after this payment. */
  const shortfall = Math.max(0, toPaise(amountDue) - toPaise(received)) / 100;

  /**
   * Messages sit under their own field. Cash needs no reference; every other
   * mode does. Credit may be part paid, everything else must clear the bill.
   */
  const validate = () => {
    const next = {
      amount: firstError(
        receivedAmountSchema(amountDue, paymentMode !== "CREDIT"),
        amountReceived
      ),
      referenceNo: firstError(
        transactionIdSchema(paymentMode !== "CASH"),
        referenceNo
      ),
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
      referenceNo,
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
                    className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none placeholder:text-pneutral-400"
                  />
                </div>
                {errors.amount ? (
                  <span className="text-p2 text-warning-500">{errors.amount}</span>
                ) : (
                  received > 0 &&
                  shortfall > 0 && (
                    <span className="text-p2 text-[#5A5B57]">
                      ₹ {formatAmount(shortfall)} will remain pending
                    </span>
                  )
                )}
              </div>

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
                    disabled={paymentMode === "CASH"}
                    className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none disabled:text-pneutral-400 disabled:cursor-not-allowed placeholder:text-pneutral-400"
                  />
                </div>
                {errors.referenceNo && (
                  <span className="text-p2 text-warning-500">
                    {errors.referenceNo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Card: Billing Summary */}
          <div className="w-full lg:w-[340px] rounded-[16px] border border-[#D5D5D4] bg-white p-[20px] shadow-sm flex flex-col justify-start gap-4 shrink-0 h-auto">
            <div className="text-[20px] font-bold text-[#1E1E1D]">
              Billing Summary
            </div>

            <div className="flex flex-col gap-4 pt-1">
              <div className="flex items-center justify-between text-[15px] text-[#5A5B57]">
                <span>Gross Amount</span>
                <div className="flex items-center">
                  <span className="w-12 text-center text-transparent">()</span>
                  <span className="min-w-[85px] text-right font-semibold text-[#1E1E1D]">
                    ₹ {formatAmount(totals.grossAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[15px] text-[#5A5B57]">
                <span>Discount</span>
                <div className="flex items-center">
                  <span className="w-12 text-center text-[#5A5B57]">(-)</span>
                  <span className="min-w-[85px] text-right font-semibold text-[#1E1E1D]">
                    ₹ {formatAmount(totals.itemDiscount + totals.billDiscount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[15px] text-[#5A5B57]">
                <span>Taxable</span>
                <div className="flex items-center">
                  <span className="w-12 text-center text-transparent">()</span>
                  <span className="min-w-[85px] text-right font-semibold text-[#1E1E1D]">
                    ₹ {formatAmount(totals.taxableAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[15px] text-[#5A5B57] pb-4 border-b border-[#EAEAE9]">
                {/* Amount only — lines can sit on different GST slabs */}
                <span>GST</span>
                <div className="flex items-center">
                  <span className="w-12 text-center text-[#5A5B57]">(+)</span>
                  <span className="min-w-[85px] text-right font-semibold text-[#1E1E1D]">
                    ₹ {formatAmount(totals.gstAmount)}
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center justify-between pt-1 ${
                  isSettling ? "" : "mb-4"
                }`}
              >
                <span
                  className={`font-bold ${
                    isSettling
                      ? "text-[16px] text-[#5A5B57]"
                      : "text-[20px] text-[#7D32FC]"
                  }`}
                >
                  Net Amount
                </span>
                <span
                  className={`font-bold ${
                    isSettling
                      ? "text-[16px] text-[#1E1E1D]"
                      : "text-[22px] text-[#7D32FC]"
                  }`}
                >
                  ₹ {formatAmount(totals.netAmount)}
                </span>
              </div>

              {/* Settling shows what has already been collected and what the
                  customer still owes — the balance this screen clears. */}
              {isSettling && (
                <>
                  <div className="flex items-center justify-between text-[15px] text-[#5A5B57] pb-4 border-b border-[#EAEAE9]">
                    <span>Already Paid</span>
                    <span className="min-w-[85px] text-right font-semibold text-[#1E1E1D]">
                      ₹ {formatAmount(Math.max(0, totals.netAmount - amountDue))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 mb-4">
                    <span className="text-[20px] font-bold text-[#7D32FC]">
                      Pending Amount
                    </span>
                    <span className="text-[22px] font-bold text-[#7D32FC]">
                      ₹ {formatAmount(amountDue)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-between w-full pt-8 mt-auto">
        <button
          type="button"
          onClick={onBack}
          className="w-[110px] h-[48px] rounded-[10px] border-[1.5px] border-[#1E1E1D] bg-[#F5F5F5] hover:bg-[#EAEAE9] text-[#1E1E1D] font-semibold text-[16px] transition-all shadow-xs cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="h-[48px] px-8 rounded-[10px] bg-[#7D32FC] hover:bg-[#6823df] text-white font-semibold text-[16px] shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {isSettling ? "Record Payment" : "Generate Invoice"}
        </button>
      </div>
    </div>
  );
};

export default BillingPayment;
