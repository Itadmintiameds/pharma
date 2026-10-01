import type { StockReturnSource } from "@/app/dashboard/wearhouseStockReturn/components/StockReturnType";

export type ReceiptStatus = "Pending Receipt" | "Completed";

/** One product line of a stock return arriving at the warehouse. Quantities are in purchase units. */
export interface ReceiptLine {
  id: string;
  productName: string;
  batchNo: string;
  /** yyyy-mm-dd. */
  expiryDate: string;
  /** e.g. "Strip (10)". */
  purchaseUnitLabel: string;
  dispatchedQty: number;
  /** Set once the warehouse has verified the line. */
  receivedQty?: number;
}

/** A stock return dispatched by a pharmacy to this warehouse. */
export interface IncomingStockReturn {
  id: string;
  returnNo: string;
  source: StockReturnSource;
  fromPharmacy: string;
  /** ISO date-times. */
  createdAt: string;
  dispatchedAt: string;
  receivedAt?: string;
  createdBy: string;
  receivedBy?: string;
  remarks?: string;
  status: ReceiptStatus;
  lines: ReceiptLine[];
}

export const RECEIPT_STATUSES: ReceiptStatus[] = ["Pending Receipt", "Completed"];

export const notReceivedQty = (line: ReceiptLine): number =>
  Math.max(0, line.dispatchedQty - (line.receivedQty ?? line.dispatchedQty));

export interface ReceiptTotals {
  products: number;
  dispatched: number;
  received: number;
  notReceived: number;
}

export const receiptTotals = (lines: ReceiptLine[]): ReceiptTotals =>
  lines.reduce(
    (totals, line) => ({
      products: totals.products + 1,
      dispatched: totals.dispatched + line.dispatchedQty,
      received: totals.received + (line.receivedQty ?? line.dispatchedQty),
      notReceived: totals.notReceived + notReceivedQty(line),
    }),
    { products: 0, dispatched: 0, received: 0, notReceived: 0 }
  );

/** ISO date-time → "08-09-2026 04:30 PM". */
export const formatDateTime = (iso?: string): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dd}-${mm}-${date.getFullYear()} ${time}`;
};

// TODO: replace with the incoming stock-return endpoint once the backend has one.
export const SAMPLE_INCOMING_RETURNS: IncomingStockReturn[] = [
  {
    id: "7",
    returnNo: "STR-2026-00007",
    source: "DAMAGED_INTER_STORE",
    fromPharmacy: "Sunrise Medicals",
    createdAt: "2026-09-05T10:00:00",
    dispatchedAt: "2026-09-05T14:15:00",
    createdBy: "Admin User",
    status: "Pending Receipt",
    lines: [
      {
        id: "7-1",
        productName: "Ibuprofen 400 mg",
        batchNo: "BCHY004",
        expiryDate: "2028-02-28",
        purchaseUnitLabel: "Strip (15)",
        dispatchedQty: 15,
      },
    ],
  },
  {
    id: "8",
    returnNo: "STR-2026-00008",
    source: "PHARMACY_INVENTORY",
    fromPharmacy: "Single Pharmacy",
    createdAt: "2026-09-05T10:00:00",
    dispatchedAt: "2026-09-08T16:30:00",
    createdBy: "Admin User",
    status: "Pending Receipt",
    lines: [
      {
        id: "8-1",
        productName: "Paracetamol 500 mg",
        batchNo: "BCHX010",
        expiryDate: "2027-12-31",
        purchaseUnitLabel: "Strip (10)",
        dispatchedQty: 50,
      },
      {
        id: "8-2",
        productName: "Ibuprofen 400 mg",
        batchNo: "BCHY004",
        expiryDate: "2028-02-28",
        purchaseUnitLabel: "Strip (15)",
        dispatchedQty: 30,
      },
      {
        id: "8-3",
        productName: "Cough Syrup 100ml",
        batchNo: "BCHZ022",
        expiryDate: "2027-01-31",
        purchaseUnitLabel: "Bottle",
        dispatchedQty: 15,
      },
    ],
  },
  {
    id: "4",
    returnNo: "STR-2026-00004",
    source: "PHARMACY_INVENTORY",
    fromPharmacy: "HealthCare Pharma",
    createdAt: "2026-09-04T09:30:00",
    dispatchedAt: "2026-09-05T14:15:00",
    receivedAt: "2026-09-06T11:15:00",
    createdBy: "Admin User",
    receivedBy: "Warehouse Admin",
    remarks: "All units received.",
    status: "Completed",
    lines: [
      {
        id: "4-1",
        productName: "Paracetamol 500 mg",
        batchNo: "BCHX010",
        expiryDate: "2027-12-31",
        purchaseUnitLabel: "Strip (10)",
        dispatchedQty: 20,
        receivedQty: 20,
      },
      {
        id: "4-2",
        productName: "Cough Syrup 100ml",
        batchNo: "BCHZ022",
        expiryDate: "2027-01-31",
        purchaseUnitLabel: "Bottle",
        dispatchedQty: 10,
        receivedQty: 10,
      },
    ],
  },
];
