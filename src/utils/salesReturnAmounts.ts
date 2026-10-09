import { BillingRecord } from "@/types/BillingData";

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * What sales returns have already taken off a bill: each line's net amount for
 * the units returned so far (`returnedQuantity`, filled by the bill endpoints),
 * priced pro rata the same way a return line is priced on Review & Confirm.
 */
export const returnedAmountOf = (bill: BillingRecord) =>
  round2(
    (bill.billingDetails ?? []).reduce((sum, line) => {
      const soldQty = Number(line.billQuantity) || 0;
      const returnedQty = Number(line.returnedQuantity) || 0;
      return soldQty
        ? sum + ((Number(line.netAmount) || 0) * returnedQty) / soldQty
        : sum;
    }, 0)
  );

/**
 * What is still owed once returns are counted: the pending amount on the bill
 * less what has been returned, never below zero. Each return clears
 * min(its amount, the outstanding at the time), and those add up to this.
 * e.g. ₹7,500 bill, ₹500 paid → ₹7,000 pending; ₹6,000 returned → ₹1,000.
 */
export const pendingAfterReturns = (pendingAmount: number, bill: BillingRecord) =>
  Math.max(round2(pendingAmount - returnedAmountOf(bill)), 0);
