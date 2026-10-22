import { PurchaseData } from "@/types/PurchaseData";
import { SupplierPaymentData } from "@/types/SupplierPaymentData";
import type { EligibleInvoice } from "./CreateSupplierPayment";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** A date as "dd-mm-yyyy hh:mm AM", the Recorded On of a payment. */
export const formatRecordedAt = (date: Date) => {
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()} ${time}`;
};

/** A local date as yyyy-mm-dd. */
export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** The yyyy-mm-dd part of a LocalDate / LocalDateTime string from the API. */
export const isoDatePart = (value?: string) => (value ?? "").split("T")[0];

/** Invoice date + credit days as yyyy-mm-dd, or "" for a cash purchase. */
export const getDueDateIso = (purchase?: PurchaseData) => {
  const invoiceDate = isoDatePart(purchase?.invoiceDate);
  if (!invoiceDate || !purchase?.creditDays) return "";
  const due = new Date(`${invoiceDate}T00:00:00`);
  due.setDate(due.getDate() + purchase.creditDays);
  return toIsoDate(due);
};

/** What the supplier is owed for a purchase: its net amount. */
export const getInvoiceAmount = (purchase?: PurchaseData) =>
  purchase?.totalNetAmount ?? 0;

/** "CREDIT" → "Credit". */
const toTitleCase = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "—";

/** A credit purchase the supplier hasn't been paid for yet. */
export const isUnpaidCreditPurchase = (purchase: PurchaseData) =>
  purchase.paymentType?.toUpperCase() === "CREDIT" &&
  purchase.supplierPaymentStatus?.toUpperCase() !== "PAID";

/** Sum of the given payments made against one purchase. */
export const sumPaidForPurchase = (
  payments: SupplierPaymentData[],
  purchaseId: number | undefined
) =>
  payments
    .filter((payment) => payment.purchaseId === purchaseId)
    .reduce((sum, payment) => sum + (payment.paymentAmount ?? 0), 0);

/** A purchase as the invoice a supplier payment is made against. */
export const toEligibleInvoice = (
  purchase: PurchaseData | undefined,
  purchaseId: number,
  totalPaidAmount: number
): EligibleInvoice => {
  const invoiceAmount = getInvoiceAmount(purchase);

  return {
    id: purchaseId,
    supplierId: purchase?.supplierId ?? 0,
    invoiceDateIso: isoDatePart(purchase?.invoiceDate),
    supplierName: purchase?.supplierName ?? "—",
    invoiceNo: purchase?.invoiceNo ?? "—",
    grnNo: purchase?.grnNo ?? "—",
    paymentType: toTitleCase(purchase?.paymentType),
    invoiceAmount,
    totalPaidAmount,
    // No purchase return figure on the purchase API yet
    purchaseReturnAdjusted: 0,
    currentOutstanding: invoiceAmount - totalPaidAmount,
    paymentDueDateIso: getDueDateIso(purchase),
  };
};
