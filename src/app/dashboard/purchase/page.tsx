"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GoodsReceipt from "./components/GoodsReceipt";
import PurchaseSuccessModal from "@/app/components/common/PurchaseSuccessModal";
import SearchInput from "@/app/components/common/SearchInput";
import Image from "next/image";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Download } from "lucide-react";
import DataTable from "@/app/components/common/table/DataTable";
import { PurchaseData } from "@/types/PurchaseData";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { getSupplierById } from "@/services/SupplierService";
import { getProductDetails } from "@/services/InventoryService";
import type { ProductDetails } from "@/types/ProductData";
import InvoiceSummary from "./components/InvoiceSummary";
import {
  getCurrentPharmacy,
  type CurrentPharmacy,
} from "@/services/PharmacyService";
import { usePurchaseStore } from "@/store/usePurchaseStore";
import OffscreenPortal from "@/app/components/common/OffscreenPortal";
import { downloadElementAsPdf } from "@/utils/downloadPdf";
import toast from "react-hot-toast";

/** One row of the tax-invoice table. */
interface InvoiceLine {
  id: number;
  brand: string;
  qty: number;
  free: number;
  variant: string;
  name: string;
  hsn: string;
  batch: string;
  expiry: string;
  /** What the supplier charges per purchase unit. */
  purchaseAmt: number;
  value: number;
  dis: number;
  gst: number;
  amount: number;
}

/** "2026-08-03T00:00:00" / "2026-08-03" -> "03-08-2026"; unparseable -> "—". */
const formatInvoiceDate = (value: string | null | undefined): string => {
  const [year, month, day] = (value?.split("T")[0] ?? "").split("-");
  return year && month && day ? `${day}-${month}-${year}` : "—";
};

/**
 * The purchase API returns only ids and amounts per line, so brand / variant /
 * HSN / expiry / price are pulled from each product's details. One call per
 * distinct product, and any failure just leaves those cells blank.
 */
const buildInvoiceLines = async (purchase: PurchaseData): Promise<InvoiceLine[]> => {
  const lines = purchase.purchaseDetails ?? [];
  const productIds = Array.from(
    new Set(lines.map((line) => line.productId).filter(Boolean))
  );

  const products = new Map<string, ProductDetails>();
  await Promise.all(
    productIds.map(async (productId) => {
      try {
        products.set(productId, await getProductDetails(productId));
      } catch (err) {
        console.error(`Could not load product ${productId} for the invoice`, err);
      }
    })
  );

  return lines.map((line, index) => {
    const product = products.get(line.productId);
    const batches = [
      ...(product?.packages?.flatMap((pkg) => pkg.batches ?? []) ?? []),
      ...(product?.unassignedBatches ?? []),
    ];
    const batch = batches.find((b) => b.batchId === line.batchId);
    const pkg = product?.packages?.find(
      (p) => p.packagingId === batch?.packagingId
    );

    return {
      id: index + 1,
      brand: product?.brandName || "—",
      qty: Number(line.purchaseQuantity || 0),
      free: Number(line.freeQuantity || 0),
      variant: pkg ? `1x${pkg.purchaseUnitContains} ${pkg.smallestUnit}` : "—",
      // The purchase API returns productName / batchNumber as null, so the
      // fetched product and batch are the real source; the ids are last resort.
      name: product?.productName || line.productName || line.productId,
      hsn: product?.hsnNo || "—",
      batch: batch?.batchNumber || line.batchNumber || line.batchId,
      expiry: batch?.expiryDate || "—",
      // Per purchase unit, matching the quantity the line is billed in.
      purchaseAmt: Number(batch?.purchasePrice ?? 0),
      value: Number(batch?.purchasePrice ?? 0) * Number(line.purchaseQuantity || 0),
      dis: 0,
      gst: Number(line.gst || 0),
      amount: Number(line.netAmount || 0),
    };
  });
};

/**
 * Built as a factory so the Action cell can reach the page's view / download
 * handlers.
 */
export const buildColumns = (
  onView: (purchase: PurchaseData) => void,
  onDownload: (purchase: PurchaseData) => void,
  busy = false
): ColumnDef<PurchaseData>[] => [
  {
    header: "Sl. No.",
    cell: ({ row }) => row.index + 1,
  },

  {
    accessorKey: "invoiceDate",
    header: "Invoice Date",

    // Stored as "2026-08-03T00:00:00" — show as dd-mm-yyyy.
    cell: ({ row }) => formatInvoiceDate(row.original.invoiceDate),
  },

  {
    accessorKey: "supplierName",
    header: "Supplier",

    cell: ({ row }) => row.original.supplierName ?? "—",
  },

  {
    accessorKey: "invoiceNo",
    header: "Invoice No",
  },

  {
    accessorKey: "paymentType",
    header: "Payment Type",

    cell: ({ row }) => {
      const type = row.original.paymentType;

      return (
        <div
          className={`inline-flex h-8 w-16.5 items-center rounded-full justify-center text-label-l3 font-medium
          ${
            type === "Credit"
              ? "border border-warning-600 bg-warning-50 text-warning-600"
              : "border border-success-600 bg-success-50 text-success-600"
          }`}
        >
          {type}
        </div>
      );
    },
  },

  {
    accessorKey: "creditDays",
    header: "Credit Days",

    cell: ({ row }) => {
      const creditDays = row.original.creditDays;
      return creditDays ? `${creditDays} Days` : "N/A";
    },
  },

  {
    accessorKey: "totalNetAmount",
    header: "Amount (₹)",

    cell: ({ row }) =>
      Number(row.original.totalNetAmount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      }),
  },

  {
    header: "Action",

    cell: ({ row }) => (
      <div className="flex justify-center gap-5">
        <button
          type="button"
          aria-label="View tax invoice"
          title="View tax invoice"
          onClick={() => onView(row.original)}
          disabled={busy}
          className={busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        >
          <Image
            src="/Purchase/ViewIcon.svg"
            alt="View"
            width={25}
            height={19}
            className="shrink-0"
          />
        </button>

        <button
          type="button"
          aria-label="Download tax invoice"
          title="Download tax invoice"
          onClick={() => onDownload(row.original)}
          disabled={busy}
          className={busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        >
          <Image
            src="/Purchase/DownloadIcon.svg"
            alt="Download"
            width={25}
            height={19}
            className="shrink-0"
          />
        </button>
      </div>
    ),
  },
];

/** What the invoice view/print is currently showing. */
interface OpenInvoice {
  purchase: PurchaseData;
  lines: InvoiceLine[];
  /** "Bill To" pharmacy, pre-fetched so a PDF download has it before capture. */
  pharmacy: CurrentPharmacy | null;
  /** True when opened for download — triggers the browser print dialog. */
  print: boolean;
}

const PurchaseContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The Add flow is tracked in the URL (?view=add) rather than local state, so
  // clicking "Purchase" in the navbar (which navigates to the bare route)
  // returns to the list instead of leaving a stale form on screen.
  const view = searchParams.get("view");
  const showGoodsReceipt = view === "add";
  const [search, setSearch] = useState("");
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<OpenInvoice | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  // Guards against a second view/download starting while one is still running
  // (a ref so rapid clicks can't slip through before a re-render).
  const isBusyRef = useRef(false);

  const openInvoice = async (purchase: PurchaseData, print: boolean) => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setIsPreparing(true);
    try {
      // Fetch the "Bill To" pharmacy alongside the lines so a PDF download
      // has it in hand before the off-screen copy is captured.
      const [lines, pharmacy] = await Promise.all([
        buildInvoiceLines(purchase),
        getCurrentPharmacy().catch((err) => {
          console.error("Unable to fetch current pharmacy for the invoice", err);
          return null;
        }),
      ]);

      // /purchase/allPurchase does not always nest the line items. Surface that
      // rather than silently rendering an invoice with an empty table.
      if (lines.length === 0) {
        console.warn(
          "No purchaseDetails on this purchase — the invoice table will be empty.",
          purchase
        );
        toast.error("Line items for this invoice could not be loaded.");
      }

      setInvoice({ purchase, lines, pharmacy, print });
      // For a download the indicator (and busy guard) stay up until the PDF has
      // been written — released in handleCaptureReady.
      if (!print) {
        setIsPreparing(false);
        isBusyRef.current = false;
        // Mark the open invoice in the URL so navigating away via the navbar
        // (which points at the bare route) closes it.
        router.push("/dashboard/purchase?view=invoice");
      }
    } catch (err) {
      console.error("Failed to build the tax invoice", err);
      toast.error("Could not open the tax invoice.");
      setIsPreparing(false);
      isBusyRef.current = false;
    }
  };

  /**
   * Called by OffscreenPortal once the invoice copy is laid out. Captures it to
   * a PDF, then tears the copy down. The ref guards against a second capture if
   * the callback identity changes while generation is still running.
   */
  const isCapturingRef = useRef(false);

  const handleCaptureReady = useCallback(
    async (node: HTMLElement) => {
      if (isCapturingRef.current || !invoice) return;
      isCapturingRef.current = true;

      const label = invoice.purchase.invoiceNo || invoice.purchase.grnNo || "invoice";
      const safeLabel = label.replace(/[^a-zA-Z0-9-_]+/g, "-");

      try {
        await downloadElementAsPdf(node, `tax-invoice-${safeLabel}.pdf`);
      } catch (err) {
        console.error("Failed to generate the invoice PDF", err);
        toast.error("Could not generate the PDF.");
      } finally {
        isCapturingRef.current = false;
        isBusyRef.current = false;
        setIsPreparing(false);
        setInvoice(null);
      }
    },
    [invoice]
  );

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllPurchases();

      const uniqueSupplierIds = Array.from(
        new Set(data.map((purchase) => purchase.supplierId).filter(Boolean))
      );

      const supplierEntries = await Promise.all(
        uniqueSupplierIds.map(async (supplierId) => {
          try {
            const supplier = await getSupplierById(supplierId);
            return [supplierId, supplier.supplierName] as const;
          } catch (err) {
            console.error(`Failed to fetch supplier ${supplierId}:`, err);
            return [supplierId, undefined] as const;
          }
        })
      );
      const supplierNameById = new Map(supplierEntries);

      const enrichedData = data.map((purchase) => ({
        ...purchase,
        supplierName:
          purchase.supplierName ?? supplierNameById.get(purchase.supplierId),
      }));

      setPurchases(enrichedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch purchases.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter the list by the search box. Matches the visible invoice fields
  // (supplier, invoice/GRN no, payment type, date) as well as the product and
  // batch numbers on each line, so a product search hits its purchases too.
  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return purchases;

    return purchases.filter((purchase) => {
      const fields = [
        purchase.supplierName,
        purchase.invoiceNo,
        purchase.grnNo,
        purchase.paymentType,
        formatInvoiceDate(purchase.invoiceDate),
        ...(purchase.purchaseDetails ?? []).flatMap((line) => [
          line.productName,
          line.batchNumber,
        ]),
      ];

      return fields.some(
        (field) => field && String(field).toLowerCase().includes(query)
      );
    });
  }, [purchases, search]);

  // Fetch on the list view — on first load and each time we return from the
  // Add flow — so a just-added purchase shows up.
  useEffect(() => {
    if (!showGoodsReceipt) fetchPurchases();
  }, [showGoodsReceipt, fetchPurchases]);

  // Close the (non-print) invoice view when the URL no longer marks it open,
  // e.g. after clicking "Purchase" in the navbar. The print copy is left alone.
  useEffect(() => {
    if (view !== "invoice") {
      setInvoice((current) => (current && !current.print ? null : current));
    }
  }, [view]);

  // Viewing takes over the page. Downloading leaves the list on screen and
  // renders an off-screen copy that only the printer sees.
  if (invoice && !invoice.print) {
    return (
      <InvoiceSummary
        mode="view"
        purchase={invoice.purchase}
        data={invoice.lines}
        pharmacy={invoice.pharmacy}
        onCancel={() => router.push("/dashboard/purchase")}
        onSuccessGoToPurchase={() => router.push("/dashboard/purchase")}
      />
    );
  }

  return (
    <>
      {invoice?.print && (
        <OffscreenPortal width={1440} onReady={handleCaptureReady}>
          <InvoiceSummary
            mode="download"
            purchase={invoice.purchase}
            data={invoice.lines}
            pharmacy={invoice.pharmacy}
          />
        </OffscreenPortal>
      )}

      {!showGoodsReceipt ? (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-h4 font-semibold">Goods Receipt</div>
              <div className="text-p3 font-normal font-noto-sans">
                Add product from supplier invoice
              </div>
            </div>

            <div className="w-full flex gap-2 items-center">
              <div className="flex-1">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search product by name, generic, code..."
                  onQRCodeClick={() => {
                    console.log("Open QR Scanner");
                  }}
                />
              </div>
              <div>
                <button
                  className="w-52 h-12 rounded-lg bg-primary-800 text-label-l4 font-medium text-pneutral-50"
                  onClick={() => {
                    // Start every Add flow from a clean slate — leaving via the
                    // navbar skips the Cancel button that used to reset this.
                    usePurchaseStore.getState().resetPurchase();
                    router.push("/dashboard/purchase?view=add");
                  }}
                >
                  Add New Purchase
                </button>
              </div>
            </div>

            {isPreparing && (
              <div className="text-p3 font-normal text-pneutral-500">
                Preparing tax invoice…
              </div>
            )}


            <div>
              {loading ? (
                <div className="text-p3 font-normal text-pneutral-500 py-8 text-center">
                  Loading purchases...
                </div>
              ) : error ? (
                <div className="text-p3 font-normal text-danger-600 py-8 text-center">
                  {error}
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-pneutral-200 bg-white text-label-l4 text-pneutral-500 shadow-sm">
                  No records found.
                </div>
              ) : (
                <DataTable
                  columns={buildColumns(
                    (purchase) => openInvoice(purchase, false),
                    (purchase) => openInvoice(purchase, true),
                    isPreparing
                  )}
                  data={filteredPurchases}
                />
              )}
            </div>
          </div>
          {/* <PurchaseSuccessModal
            isOpen={open}
            onClose={() => setOpen(false)}
            onAddProduct={() => console.log("Add Product")}
            onViewSummary={() => console.log("View Summary")}
          /> */}
        </>
      ) : (
        <GoodsReceipt onClose={() => router.push("/dashboard/purchase")} />
      )}
    </>
  );
};

const Page = () => (
  <Suspense
    fallback={
      <div className="text-p3 font-normal text-pneutral-500 py-8 text-center">
        Loading purchases...
      </div>
    }
  >
    <PurchaseContent />
  </Suspense>
);

export default Page;
