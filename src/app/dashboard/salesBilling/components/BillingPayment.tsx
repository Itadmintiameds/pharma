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
}) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [amountReceived, setAmountReceived] = useState(String(totals.netAmount));
  const [referenceNo, setReferenceNo] = useState("");
  const [creditDays, setCreditDays] = useState("");

  const received = Number(amountReceived) || 0;

  // Credit bills are handed over unpaid, so nothing is due back and the balance is the whole bill.
  const changeDue = useMemo(
    () => (paymentMode === "CREDIT" ? 0 : Math.max(0, received - totals.netAmount)),
    [paymentMode, received, totals.netAmount]
  );

  const shortfall =
    paymentMode === "CREDIT" ? 0 : Math.max(0, totals.netAmount - received);

  const canGenerate =
    paymentMode === "CREDIT" ? Boolean(creditDays) : shortfall === 0;

  return (
    <div className="flex flex-col justify-between gap-6 text-pneutral-900 min-h-[700px] pb-12 w-full">
      <div className="flex flex-col gap-5">
        {/* Top Title */}
        <div className="text-[24px] font-semibold tracking-normal text-[#1E1E1D]">
          Billing POS
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
              {PAYMENT_MODES.map((mode) => {
                const isSelected = paymentMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.value);
                      if (mode.value === "CREDIT") {
                        setAmountReceived("0");
                      } else if (!amountReceived || Number(amountReceived) === 0) {
                        setAmountReceived(String(totals.netAmount));
                      }
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
                <label className="text-[15px] font-medium text-[#1E1E1D]">
                  {paymentMode === "CREDIT" ? "Credit Days" : "Received Amount"}
                </label>
                <div className="h-[48px] w-full rounded-[8px] border border-[#D5D5D4] bg-white px-4 flex items-center shadow-2xs focus-within:border-[#7D32FC] transition-colors">
                  <input
                    type="number"
                    value={paymentMode === "CREDIT" ? creditDays : amountReceived}
                    onChange={(e) => {
                      if (paymentMode === "CREDIT") setCreditDays(e.target.value);
                      else setAmountReceived(e.target.value);
                    }}
                    placeholder={
                      paymentMode === "CREDIT"
                        ? "e.g., 30"
                        : String(totals.netAmount)
                    }
                    className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none placeholder:text-pneutral-400"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-medium text-[#1E1E1D]">
                  UPI Reference/Transaction ID
                </label>
                <div className="h-[48px] w-full rounded-[8px] border border-[#D5D5D4] bg-white px-4 flex items-center shadow-2xs focus-within:border-[#7D32FC] transition-colors">
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UTR123456789012"
                    disabled={paymentMode === "CASH"}
                    className="w-full font-normal text-[15px] text-[#000000] bg-transparent outline-none disabled:text-pneutral-400 disabled:cursor-not-allowed placeholder:text-pneutral-400"
                  />
                </div>
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
                <span>
                  GST ({lines.length > 0 ? `${lines[0].gstPercentage}%` : "12%"})
                </span>
                <div className="flex items-center">
                  <span className="w-12 text-center text-[#5A5B57]">(+)</span>
                  <span className="min-w-[85px] text-right font-semibold text-[#1E1E1D]">
                    ₹ {formatAmount(totals.gstAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 mb-4">
                <span className="text-[20px] font-bold text-[#7D32FC]">
                  Net Amount
                </span>
                <span className="text-[22px] font-bold text-[#7D32FC]">
                  ₹ {formatAmount(totals.netAmount)}
                </span>
              </div>
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
          disabled={!canGenerate}
          onClick={() =>
            onGenerateInvoice({
              paymentMode,
              amountReceived:
                paymentMode === "CREDIT" ? 0 : received || totals.netAmount,
              referenceNo,
              remarks: "",
              changeDue,
              creditDays: creditDays ? Number(creditDays) : undefined,
            })
          }
          className="h-[48px] px-8 rounded-[10px] bg-[#7D32FC] hover:bg-[#6823df] text-white font-semibold text-[16px] shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          Generate Invoice
        </button>
      </div>
    </div>
  );
};

export default BillingPayment;
