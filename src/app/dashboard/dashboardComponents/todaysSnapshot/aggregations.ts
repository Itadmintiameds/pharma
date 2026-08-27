import { BillingRecord } from "@/types/BillingData";

const isToday = (isoDate: string) => {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

/** The amount a bill was actually settled at (matches salesBilling/page.tsx's payableOf). */
const payableOf = (bill: BillingRecord) =>
  bill.totalNetAmountAfterRoundOff ?? bill.totalNetAmount ?? 0;

export interface TodaysSalesSnapshot {
  billsToday: number;
  revenueToday: number;
  /** Bills still owed on, of any age — not just today's. */
  pendingPayments: number;
}

/** Today's bill count/revenue, plus the running count of unsettled bills overall. */
export const getTodaysSalesSnapshot = (bills: BillingRecord[]): TodaysSalesSnapshot => {
  let billsToday = 0;
  let revenueToday = 0;
  let pendingPayments = 0;

  for (const bill of bills) {
    if (bill.createdAt && isToday(bill.createdAt)) {
      billsToday += 1;
      revenueToday += payableOf(bill);
    }
    if (bill.paymentType === "PARTIAL" || bill.paymentType === "UNPAID") {
      pendingPayments += 1;
    }
  }

  return { billsToday, revenueToday, pendingPayments };
};
