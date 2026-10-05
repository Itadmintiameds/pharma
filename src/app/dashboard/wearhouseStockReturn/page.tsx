"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Clipboard, Info, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import Button from "@/app/components/common/Button";
import Input from "@/app/components/common/Input";
import Dropdown from "@/app/components/common/Dropdown";
import DataTable from "@/app/components/common/table/DataTable";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import StockReturnType, { type StockReturnSource } from "./components/StockReturnType";
import CreateStockReturn from "./components/CreateStockReturn";
import StockReturnReview from "./components/StockReturnReview";
import CreateDamagedStockReturn from "./components/CreateDamagedStockReturn";
import DamagedStockReturnReview from "./components/DamagedStockReturnReview";
import type { StockReturnDraft } from "./stockReturnDraft";

const LIST_PATH = "/dashboard/wearhouseStockReturn";

/** One row of the stock-return list — Figma node 3658:42265 ("SRL Table Card"). */
interface StockReturnRow {
  id: string;
  returnNo: string;
  returnType: StockReturnType;
  to: string;
  products: number;
  /** Purchase units, as the column header in the design says. */
  returnQty: number;
  /** Already formatted for display (dd-mm-yyyy). */
  returnDate: string;
  /** `yyyy-mm-dd`, kept for the date-range filter. */
  returnDateIso: string;
  status: StockReturnStatus;
}

type StockReturnType = "Pharmacy Inventory" | "Damaged – Inter-Store Transfer";

type StockReturnStatus = "Draft" | "Pending Receipt" | "Completed";

const RETURN_TYPES: StockReturnType[] = [
  "Pharmacy Inventory",
  "Damaged – Inter-Store Transfer",
];

const RETURN_STATUSES: StockReturnStatus[] = ["Draft", "Pending Receipt", "Completed"];

const STATUS_STYLES: Record<StockReturnStatus, string> = {
  // The project's "danger" tokens are this Figma file's yellow scale — matched
  // by hex, not by name.
  Draft: "bg-danger-50 border-danger-600 text-danger-600",
  "Pending Receipt": "bg-success-50 border-success-600 text-success-800",
  Completed: "bg-success-50 border-success-600 text-success-800",
};

// TODO: replace with the stock-return list endpoint once the backend has one.
const SAMPLE_RETURNS: StockReturnRow[] = [
  {
    id: "8",
    returnNo: "STR-2026-00008",
    returnType: "Pharmacy Inventory",
    to: "Central Warehouse",
    products: 3,
    returnQty: 95,
    returnDate: "08-09-2026",
    returnDateIso: "2026-09-08",
    status: "Draft",
  },
  {
    id: "7",
    returnNo: "STR-2026-00007",
    returnType: "Damaged – Inter-Store Transfer",
    to: "Central Warehouse",
    products: 1,
    returnQty: 15,
    returnDate: "05-09-2026",
    returnDateIso: "2026-09-05",
    status: "Pending Receipt",
  },
  {
    id: "6",
    returnNo: "STR-2026-00006",
    returnType: "Pharmacy Inventory",
    to: "Central Warehouse",
    products: 2,
    returnQty: 40,
    returnDate: "28-08-2026",
    returnDateIso: "2026-08-28",
    status: "Completed",
  },
  {
    id: "5",
    returnNo: "STR-2026-00005",
    returnType: "Pharmacy Inventory",
    to: "Central Warehouse",
    products: 1,
    returnQty: 10,
    returnDate: "20-08-2026",
    returnDateIso: "2026-08-20",
    status: "Completed",
  },
];

const StatusBadge = ({ status }: { status: StockReturnStatus }) => (
  <span
    className={`inline-flex items-center justify-center rounded-lg border px-sm py-1 text-label-l4 font-medium whitespace-nowrap ${STATUS_STYLES[status]}`}
  >
    {status}
  </span>
);

const buildColumns = (
  rowOffset: number,
  onView: (id: string) => void
): ColumnDef<StockReturnRow>[] => [
  {
    id: "slNo",
    header: "SL. NO.",
    cell: ({ row }) => rowOffset + row.index + 1,
  },
  {
    accessorKey: "returnNo",
    header: "STOCK RETURN NO.",
    cell: ({ row }) => (
      <span className="font-semibold text-primary-800 whitespace-nowrap">
        {row.original.returnNo}
      </span>
    ),
  },
  {
    accessorKey: "returnType",
    header: "STOCK RETURN TYPE",
  },
  {
    accessorKey: "to",
    header: "TO",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.to}</span>,
  },
  {
    accessorKey: "products",
    header: "PRODUCTS",
    cell: ({ row }) => <span className="font-semibold">{row.original.products}</span>,
  },
  {
    accessorKey: "returnQty",
    header: "RETURN QTY (PURCHASE UNITS)",
    cell: ({ row }) => <span className="font-semibold">{row.original.returnQty}</span>,
  },
  {
    accessorKey: "returnDate",
    header: "DATE",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.returnDate}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "ACTION",
    cell: ({ row }) => (
      <button
        type="button"
        aria-label={`View ${row.original.returnNo}`}
        onClick={() => onView(row.original.id)}
        className="flex items-center"
      >
        <Image src="/Supplier/EyeIcon.svg" alt="" width={24} height={24} />
      </button>
    ),
  },
];

import { 
  getAllWarehouseReturns, 
  createWarehouseReturn, 
  submitWarehouseReturn, 
  getWarehouseReturnById 
} from "@/services/WarehouseStockReturnService";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { ProductService } from "@/services/ProductService";

const PAGE_SIZE = 10;

const WarehouseStockReturnContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const editId = searchParams.get("id");
  const { canCreate } = useModulePermissions("WAREHOUSE_STOCK_RETURN");

  const [search, setSearchValue] = useState("");
  const [returnType, setReturnTypeValue] = useState<string | number>("");
  const [status, setStatusValue] = useState<string | number>("");
  const [dateFrom, setDateFromValue] = useState("");
  const [dateTo, setDateToValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [returnsData, setReturnsData] = useState<StockReturnRow[]>([]);

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        const data = await getAllWarehouseReturns();
        const mapped: StockReturnRow[] = data.map((item: any) => {
          const date = item.stockReturnDate ? new Date(item.stockReturnDate) : new Date();
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          const isoDate = `${year}-${month}-${day}`;
          const formattedDate = `${day}-${month}-${year}`;
          
          let returnType: StockReturnType = "Pharmacy Inventory";
          if (item.stockReturnType === "DAMAGED") {
            returnType = "Damaged – Inter-Store Transfer";
          }
          
          let status: StockReturnStatus = "Draft";
          if (
            item.stockReturnStatus === "Pending Receipt" ||
            item.stockReturnStatus === "PENDING_RECEIPT"
          ) {
            status = "Pending Receipt";
          }
          if (
            item.stockReturnStatus === "Complete" ||
            item.stockReturnStatus === "Completed" ||
            item.stockReturnStatus === "COMPLETED"
          ) {
            status = "Completed";
          }

          return {
            id: String(item.warehouseReturnId),
            returnNo: item.stockReturnNo || "N/A",
            returnType: returnType,
            to: item.toWarehouseName || "Central Warehouse",
            products: item.totalReturnProducts || 0,
            returnQty: item.totalReturnQuantity || 0,
            returnDate: formattedDate,
            returnDateIso: isoDate,
            status: status,
          };
        });
        setReturnsData(mapped);
      } catch (err) {
        console.error("Failed to fetch warehouse returns", err);
      }
    };
    fetchReturns();
  }, []);

  // The return being built. Null until a return type is picked; kept while
  // moving between Create and Review so going back loses nothing.
  const [draft, setDraft] = useState<StockReturnDraft | null>(null);
  const [step, setStep] = useState<"items" | "review">("items");

  // Effect to load details for view or edit
  useEffect(() => {
    if ((view === "edit" || view === "view") && editId && !draft) {
      const fetchDetails = async () => {
        try {
          const data: any = await getWarehouseReturnById(editId);
          let allBatches: any[] = [];
          try {
            const batchesResponse = await ProductService.getAllBatches();
            // API returns { data: [...], count, message }
            allBatches = batchesResponse?.data || batchesResponse || [];
          } catch (err) {
            console.error("Failed to fetch all batches", err);
          }
          
          const lines = (data.warehouseReturnDetails || []).map((d: any) => {
            let expiryDate = "";
            let availableBase = 0;
            let purchaseUnit = "";
            let smallestUnit = "";
            let packagingId = "";
            
            if (d.batchId && allBatches.length > 0) {
              const batchInfo = allBatches.find((b: any) => String(b.batchId) === String(d.batchId));
              if (batchInfo) {
                expiryDate = batchInfo.expiryDate || "";
                purchaseUnit = batchInfo.purchaseUnit || "";
                smallestUnit = batchInfo.purchaseSmallestUnitName || "";
                packagingId = batchInfo.packagingId || "";
                availableBase = batchInfo.purchaseUnitContains
                  ? Math.floor(batchInfo.totalStock / batchInfo.purchaseUnitContains)
                  : batchInfo.totalStock || 0;
              }
            }

            return {
              id: String(d.warehouseReturnDetailId || Math.random()),
              productId: String(d.productId),
              productName: d.productName || "",
              batchId: String(d.batchId),
              batchNo: d.batchNumber || "",
              packagingId,
              expiryDate,
              purchaseUnit,
              smallestUnit,
              unitContains: 1,
              availableBase,
              returnQty: String(d.returnQuantity || 0),
              reason: d.returnReason || "",
            };
          });

          setDraft({
            source: data.stockReturnType === "DAMAGED" ? "DAMAGED_INTER_STORE" : "PHARMACY_INVENTORY",
            lines,
          });
          setStep(view === "view" ? "review" : "items");
        } catch (err) {
          console.error("Failed to fetch warehouse return details", err);
        }
      };
      fetchDetails();
    }
  }, [view, editId, draft]);

  // Narrowing the list can leave the viewer on a page that no longer exists,
  // so every filter change goes back to the first one.
  const resettingPage =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setCurrentPage(1);
    };
  const setSearch = resettingPage(setSearchValue);
  const setReturnType = resettingPage(setReturnTypeValue);
  const setStatus = resettingPage(setStatusValue);
  const setDateFrom = resettingPage(setDateFromValue);
  const setDateTo = resettingPage(setDateToValue);

  const returns = returnsData;

  const typeOptions = useMemo(
    () => RETURN_TYPES.map((type) => ({ label: type, value: type })),
    []
  );

  const statusOptions = useMemo(
    () => RETURN_STATUSES.map((value) => ({ label: value, value })),
    []
  );

  const filteredReturns = useMemo(() => {
    const query = search.trim().toLowerCase();

    return returns.filter((row) => {
      if (query && !row.returnNo.toLowerCase().includes(query)) return false;
      if (returnType !== "" && row.returnType !== returnType) return false;
      if (status !== "" && row.status !== status) return false;
      if (dateFrom && row.returnDateIso < dateFrom) return false;
      if (dateTo && row.returnDateIso > dateTo) return false;
      return true;
    });
  }, [returns, search, returnType, status, dateFrom, dateTo]);

  const rowOffset = (currentPage - 1) * PAGE_SIZE;

  // Every Create starts fresh, whatever a previous visit left behind.
  const handleCreate = () => {
    setDraft(null);
    router.push(`${LIST_PATH}?view=add`);
  };
  // TODO: wire to the view screen once it exists.
  const handleView = (id: string) => {
    const returnRow = returnsData.find(r => r.id === id);
    if (!returnRow) return;
    if (returnRow.status === "Draft") {
      router.push(`${LIST_PATH}?view=edit&id=${id}`);
    } else {
      router.push(`${LIST_PATH}?view=view&id=${id}`);
    }
  };

  const handleSelectSource = (source: StockReturnSource) => {
    setDraft({ source, lines: [] });
    setStep("items");
  };

  const buildPayload = (status: "DRAFT" | "PENDING_RECEIPT") => {
    if (!draft) return null;
    const pharmacy = usePharmacyStore.getState().selectedPharmacy;
    
    let totalReturnQuantity = 0;
    const details = draft.lines.map((line) => {
      const rq = Number(line.returnQty) || 0;
      totalReturnQuantity += rq;
      return {
        productId: line.productId,
        productName: line.productName,
        batchId: line.batchId,
        batchNumber: line.batchNo,
        returnQuantity: rq,
        dispatchQuantity: 0,
        receivedQuantity: 0,
        notReceivedQuantity: 0,
        returnReason: line.reason,
      };
    });

    return {
      fromPharmacyId: pharmacy?.pharmacyId || "",
      toWarehouseId: "MARMAWH0001", // Defaulted warehouse ID
      stockReturnType: draft.source === "DAMAGED_INTER_STORE" ? "Damaged – Inter-Store Transfer" : "Pharmacy Inventory",
      stockReturnStatus: status,
      totalReturnProducts: draft.lines.length,
      totalReturnQuantity: totalReturnQuantity,
      totalReceivedQuantity: 0,
      totalNotReceivedQuantity: 0,
      isDelete: false,
      warehouseReturnDetails: details,
    };
  };

  const handleSaveDraft = async () => {
    if (view === "edit" && editId && draft) {
      const payload = {
        stockReturnStatus: "DRAFT",
        warehouseReturnDetails: draft.lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          batchId: line.batchId,
          batchNumber: line.batchNo,
          returnQuantity: Number(line.returnQty) || 0,
          returnReason: line.reason,
        })),
        totalReturnProducts: draft.lines.length,
        totalReturnQuantity: draft.lines.reduce((sum, line) => sum + (Number(line.returnQty) || 0), 0),
      };
      try {
        await submitWarehouseReturn(editId, payload);
        setDraft(null);
        router.push(LIST_PATH);
      } catch (err) {
        console.error("Failed to update draft", err);
      }
    } else {
      const payload = buildPayload("DRAFT");
      if (!payload) return;
      try {
        await createWarehouseReturn(payload as any);
        setDraft(null);
        router.push(LIST_PATH);
      } catch (err) {
        console.error("Failed to save draft", err);
      }
    }
  };

  const handleConfirm = async () => {
    if (view === "edit" && editId && draft) {
      const payload = {
        stockReturnStatus: "PENDING_RECEIPT",
        warehouseReturnDetails: draft.lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          batchId: line.batchId,
          batchNumber: line.batchNo,
          returnQuantity: Number(line.returnQty) || 0,
          returnReason: line.reason,
        })),
        totalReturnProducts: draft.lines.length,
        totalReturnQuantity: draft.lines.reduce((sum, line) => sum + (Number(line.returnQty) || 0), 0),
      };
      try {
        await submitWarehouseReturn(editId, payload);
        setDraft(null);
        router.push(LIST_PATH);
      } catch (err) {
        console.error("Failed to submit", err);
      }
    } else {
      const payload = buildPayload("PENDING_RECEIPT");
      if (!payload) return;
      try {
        await createWarehouseReturn(payload as any);
        setDraft(null);
        router.push(LIST_PATH);
      } catch (err) {
        console.error("Failed to confirm", err);
      }
    }
  };

  if (view === "add" || view === "edit" || view === "view") {
    if (!draft) {
      // If we are in view or edit mode but the effect hasn't loaded the draft yet, show nothing or a loader
      if (view !== "add") return null;

      return (
        <StockReturnType
          onSelect={handleSelectSource}
          onBack={() => router.push(LIST_PATH)}
        />
      );
    }

    // Each return type has its own pair of screens; they share the draft.
    const isDamaged = draft.source === "DAMAGED_INTER_STORE";
    const Review = isDamaged ? DamagedStockReturnReview : StockReturnReview;
    const Create = isDamaged ? CreateDamagedStockReturn : CreateStockReturn;

    // View mode (Pending Receipt / Completed) — read-only, no actions
    if (view === "view") {
      return (
        <Review
          draft={draft}
          onBack={() => {}}
          onSaveDraft={() => {}}
          onConfirm={() => {}}
          readOnly={true}
          onCancel={() => { setDraft(null); router.push(LIST_PATH); }}
        />
      );
    }

    if (step === "review") {
      return (
        <Review
          draft={draft}
          onBack={() => setStep("items")}
          onSaveDraft={handleSaveDraft}
          onConfirm={handleConfirm}
        />
      );
    }

    return (
      <Create
        draft={draft}
        onChange={(lines) => setDraft({ ...draft, lines })}
        onBack={() => setDraft(null)}
        onSaveDraft={handleSaveDraft}
        onReview={() => setStep("review")}
        onCancel={view === "edit" ? () => { setDraft(null); router.push(LIST_PATH); } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-h5 font-semibold text-pneutral-900">Stock Return</p>
          <p className="text-label-l4 font-regular text-pneutral-500">
            View and manage stock returned from this Pharmacy/Store to the Central
            Warehouse.
          </p>
        </div>

        {canCreate && (
          <Button
            type="button"
            variant="primary"
            onClick={handleCreate}
            className="h-12! w-full! min-w-27 shrink-0 gap-2 rounded-lg bg-primary-800! px-4 text-label-l4! font-medium! text-pneutral-50! sm:w-auto!"
          >
            <Clipboard size={20} className="shrink-0" />
            Create Stock Return
          </Button>
        )}
      </div>

      <div className="flex w-full flex-col gap-sm sm:flex-row sm:items-start">
        <Input
          placeholder="Search by Stock Return No..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={20} className="text-pneutral-500" />}
          className="rounded-lg border-[1.5px]! border-sneutral-100!"
          containerClassName="flex-1"
        />

        <Dropdown
          options={typeOptions}
          value={returnType}
          onChange={setReturnType}
          placeholder="All Types"
          clearable
          className="w-full sm:w-40"
        />

        <Dropdown
          options={statusOptions}
          value={status}
          onChange={setStatus}
          placeholder="All Status"
          clearable
          className="w-full sm:w-40"
        />

        <div className="flex h-12 w-full shrink-0 items-center gap-sm rounded-lg border border-pneutral-300 bg-base-white px-sm sm:w-auto">
          <CalendarDays size={16} className="shrink-0 text-pneutral-500" />
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none sm:w-auto"
          />
          <span className="shrink-0 text-label-l4 text-pneutral-500">–</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="w-full min-w-0 flex-1 bg-transparent text-label-l4 font-regular text-pneutral-900 outline-none sm:w-auto"
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-md overflow-x-auto rounded-2xl border border-pneutral-200 bg-base-white p-md">
        <DataTable
          columns={buildColumns(rowOffset, handleView)}
          data={filteredReturns.slice(rowOffset, rowOffset + PAGE_SIZE)}
          emptyState={
            <div className="flex h-40 items-center justify-center text-label-l4 text-pneutral-500">
              No stock returns found.
            </div>
          }
          pagination={{
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: filteredReturns.length,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      <div className="flex w-full items-start gap-sm rounded-2xl bg-secondary-100 p-md text-secondary-700">
        <Info size={18} className="mt-1 shrink-0" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-label-l5 font-semibold">Note</p>
          <p className="text-p3 font-regular">
            • Stock is returned from this Pharmacy/Store to its Central Warehouse.
          </p>
          <p className="text-p3 font-regular">
            • A return stays Pending Receipt until the warehouse confirms it has
            received the stock.
          </p>
          <p className="text-p3 font-regular">
            • Click the eye icon to view the full details of a stock return.
          </p>
        </div>
      </div>
    </div>
  );
};

const WarehouseStockReturnPage = () => (
  <Suspense fallback={null}>
    <WarehouseStockReturnContent />
  </Suspense>
);

export default WarehouseStockReturnPage;
