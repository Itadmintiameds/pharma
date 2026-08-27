import { BillingRecord, CustomerType } from "@/types/BillingData";
import { DailySeriesPoint, lastNDays, toDateKey } from "../dailySeries";

/**
 * There is no backend sales-summary endpoint yet, so these charts are
 * aggregated client-side from the full list returned by getAllBillings().
 * Fine at current data volumes; if that list grows large this should move to
 * a backend KPI endpoint instead (matching the pattern of
 * getUserPharmacyKPIs / getBatchExpiryKpi).
 */

/** The amount a bill was actually settled at (matches salesBilling/page.tsx's payableOf). */
const payableOf = (bill: BillingRecord) =>
  bill.totalNetAmountAfterRoundOff ?? bill.totalNetAmount ?? 0;

/** Daily revenue for the last `days` days, oldest first. */
export const getRevenueByDay = (
  bills: BillingRecord[],
  days = 30
): DailySeriesPoint[] => {
  const series = lastNDays(days);
  const byDate = new Map(series.map((point) => [point.date, point]));

  for (const bill of bills) {
    if (!bill.createdAt) continue;
    const key = toDateKey(new Date(bill.createdAt));
    const point = byDate.get(key);
    if (point) point.value += payableOf(bill);
  }

  return series;
};

export interface PaymentStatusSlice {
  status: "PAID" | "PARTIAL" | "UNPAID";
  /** Display label, e.g. "Paid" — the raw status is upper-case, this isn't. */
  label: string;
  count: number;
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatusSlice["status"], string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UNPAID: "Unpaid",
};

/** How many bills fall into each payment status. */
export const getPaymentStatusBreakdown = (
  bills: BillingRecord[]
): PaymentStatusSlice[] => {
  const counts: Record<PaymentStatusSlice["status"], number> = {
    PAID: 0,
    PARTIAL: 0,
    UNPAID: 0,
  };

  for (const bill of bills) {
    if (bill.paymentType && bill.paymentType in counts) {
      counts[bill.paymentType]++;
    }
  }

  return (Object.keys(counts) as PaymentStatusSlice["status"][]).map((status) => ({
    status,
    label: PAYMENT_STATUS_LABEL[status],
    count: counts[status],
  }));
};

/** Human-readable, capitalized label for each customer/patient type. */
export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  WALK_IN: "Walk-in",
  REGISTERED: "Registered",
  OP_PATIENT: "OP Patient",
  IP_PATIENT: "IP Patient",
  DAYCARE: "Daycare",
  CORPORATE: "Corporate",
  BUSINESS: "Business",
  INSURANCE: "Insurance",
};

export interface CustomerTypeSlice {
  customerType: CustomerType;
  label: string;
  count: number;
}

/**
 * How many bills (visits) were recorded against each patient/customer type,
 * busiest first. Bills with no customer type set are excluded rather than
 * bucketed as "unspecified" — there aren't enough of them in practice to earn
 * their own slice.
 */
export const getPatientVisitBreakdown = (bills: BillingRecord[]): CustomerTypeSlice[] => {
  const counts = new Map<CustomerType, number>();

  for (const bill of bills) {
    if (!bill.customerType) continue;
    counts.set(bill.customerType, (counts.get(bill.customerType) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([customerType, count]) => ({
      customerType,
      label: CUSTOMER_TYPE_LABEL[customerType],
      count,
    }))
    .sort((a, b) => b.count - a.count);
};
