"use client";

/**
 * Step 1 of the POS flow — capture the customer, pull medicines into the cart,
 * apply a bill level discount, then hand the cart to BillingPayment.
 * Designed according to the high-fidelity Billing POS specifications.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Trash2, 
  ShoppingCart, 
  Upload, 
  Search, 
  QrCode, 
  X, 
  Pencil, 
  User, 
  Stethoscope, 
  Bed, 
  Clock, 
  Building2, 
  Briefcase, 
  Shield 
} from "lucide-react";
import toast from "react-hot-toast";
import DataTable from "@/app/components/common/table/DataTable";
import Input from "@/app/components/common/Input";
import { ProductService } from "@/services/ProductService";
import {
  BillLine,
  BillableProduct,
  CustomerInfo,
  CustomerType,
} from "@/types/BillingData";
import {
  calculateBillTotals,
  formatAmount,
  lineGross,
  lineNet,
  lineRate,
} from "@/utils/billingTotals";

interface BillingProps {
  onCancel: () => void;
  onProceedToPayment: (bill: {
    customer: CustomerInfo;
    lines: BillLine[];
    billDiscountPercentage: number;
  }) => void;
  initialCustomer?: CustomerInfo;
  initialLines?: BillLine[];
  initialBillDiscount?: number;
}

const WalkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7z"/>
  </svg>
);

const CUSTOMER_TYPES: { label: string; value: CustomerType; icon: React.ReactNode }[] = [
  { label: "Walk-in", value: "WALK_IN", icon: <WalkIcon /> },
  { label: "Registered", value: "REGISTERED", icon: <User size={16} /> },
  { label: "OP Patient", value: "OP_PATIENT", icon: <Stethoscope size={16} /> },
  { label: "IP Patient", value: "IP_PATIENT", icon: <Bed size={16} /> },
  { label: "Daycare", value: "DAYCARE", icon: <Clock size={16} /> },
  { label: "Corporate", value: "CORPORATE", icon: <Building2 size={16} /> },
  { label: "Business", value: "BUSINESS", icon: <Briefcase size={16} /> },
  { label: "Insurance", value: "INSURANCE", icon: <Shield size={16} /> },
];

const EMPTY_CUSTOMER: CustomerInfo = {
  customerType: "WALK_IN",
  customerName: "",
  mobileNo: "",
  age: "",
  gender: "",
  doctorName: "",
  address: "",
};

interface PendingLine {
  product: BillableProduct;
  quantity: string;
  freeQuantity: string;
  discountPercentage: string;
  isEditing?: boolean;
  editLineId?: string;
}

const Billing: React.FC<BillingProps> = ({
  onCancel,
  onProceedToPayment,
  initialCustomer,
  initialLines,
  initialBillDiscount,
}) => {
  const [customer, setCustomer] = useState<CustomerInfo>(
    initialCustomer ?? EMPTY_CUSTOMER
  );
  const [lines, setLines] = useState<BillLine[]>(
    initialLines && initialLines.length > 0 ? initialLines : []
  );
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENTAGE">("AMOUNT");
  const [billDiscountInput, setBillDiscountInput] = useState(
    initialBillDiscount ? String(initialBillDiscount) : "0"
  );
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PendingLine | null>(null);
  const [prescriptionName, setPrescriptionName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batches fetched from server
  const [batchCatalog, setBatchCatalog] = useState<BillableProduct[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [loadingSelect, setLoadingSelect] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      setLoadingBatches(true);
      try {
        const res = await ProductService.getAllBatches();
        const data = res?.data || [];
        const mapped: BillableProduct[] = data.map((b: any) => ({
          productId: b.productId || "",
          productName: b.productName || "Unknown Product",
          brandName: b.brandName || "",
          batchId: b.batchId || "",
          batchNumber: b.batchNumber || "N/A",
          unit: b.purchaseSmallestUnitName || b.purchaseUnit || "Unit",
          expiryDate: b.expiryDate || "N/A",
          availableQuantity: Number(b.totalStock) || 0,
          mrpPerUnit: Number(b.mrpPerUnit) || Number(b.mrp) || 0,
          sellingPricePerUnit: Number(b.sellingPricePerUnit) || Number(b.sellingPrice) || Number(b.mrpPerUnit) || 0,
          gstPercentage: Number(b.gstPercentage) || 0,
          rackNo: b.rackLocation || "",
        }));
        setBatchCatalog(mapped);
      } catch (err) {
        console.error("Failed to fetch batches:", err);
        toast.error("Failed to load medicines from server.");
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, []);

  const setField = <K extends keyof CustomerInfo>(
    key: K,
    value: CustomerInfo[K]
  ) => setCustomer((prev) => ({ ...prev, [key]: value }));

  const totals = useMemo(
    () => calculateBillTotals(lines, Number(billDiscountInput) || 0, discountType),
    [lines, billDiscountInput, discountType]
  );

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 1) return [];
    return batchCatalog.filter(
      (product) =>
        product.productName.toLowerCase().includes(query) ||
        product.brandName?.toLowerCase().includes(query) ||
        product.batchNumber.toLowerCase().includes(query)
    );
  }, [search, batchCatalog]);

  const handleSelectBatch = async (batch: BillableProduct) => {
    try {
      setLoadingSelect(batch.batchId);
      const res = await ProductService.getBatchById(batch.batchId);
      const b = res?.data;
      let productToUse = batch;
      if (b) {
        productToUse = {
          productId: b.productId || batch.productId,
          productName: b.productName || batch.productName,
          brandName: b.brandName || batch.brandName,
          batchId: b.batchId || batch.batchId,
          batchNumber: b.batchNumber || batch.batchNumber,
          unit: b.purchaseSmallestUnitName || b.purchaseUnit || batch.unit || "Unit",
          expiryDate: b.expiryDate || batch.expiryDate,
          availableQuantity: Number(b.totalStock) ?? batch.availableQuantity,
          mrpPerUnit: Number(b.mrpPerUnit) || Number(b.mrp) || batch.mrpPerUnit,
          sellingPricePerUnit: Number(b.sellingPricePerUnit) || Number(b.sellingPrice) || batch.sellingPricePerUnit || batch.mrpPerUnit,
          gstPercentage: Number(b.gstPercentage) ?? batch.gstPercentage,
          rackNo: b.rackLocation || batch.rackNo,
        };
      }
      setSearch("");
      setPending({
        product: productToUse,
        quantity: "1",
        freeQuantity: "0",
        discountPercentage: "0",
      });
    } catch (err) {
      console.error("Failed to fetch batch details:", err);
      toast.error("Failed to load batch details.");
    } finally {
      setLoadingSelect(null);
    }
  };

  const addPendingLine = () => {
    if (!pending) return;
    const quantity = Number(pending.quantity) || 0;
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (pending.isEditing && pending.editLineId) {
      updateLine(pending.editLineId, {
        quantity,
        freeQuantity: Number(pending.freeQuantity) || 0,
        discountPercentage: Number(pending.discountPercentage) || 0,
        sellingPricePerUnit: pending.product.sellingPricePerUnit || pending.product.mrpPerUnit,
      });
      toast.success("Item updated");
    } else {
      setLines((prev) => [
        ...prev,
        {
          lineId: `${pending.product.productId}-${pending.product.batchId}-${prev.length}`,
          productId: pending.product.productId,
          productName: pending.product.productName,
          brandName: pending.product.brandName,
          batchId: pending.product.batchId,
          batchNumber: pending.product.batchNumber,
          unit: pending.product.unit || "Unit",
          expiryDate: pending.product.expiryDate,
          quantity,
          freeQuantity: Number(pending.freeQuantity) || 0,
          mrpPerUnit: pending.product.mrpPerUnit,
          sellingPricePerUnit: pending.product.sellingPricePerUnit || pending.product.mrpPerUnit,
          discountPercentage: Number(pending.discountPercentage) || 0,
          gstPercentage: pending.product.gstPercentage,
          availableQuantity: pending.product.availableQuantity,
        },
      ]);
      toast.success("Item added to bill");
    }

    setPending(null);
    setSearch("");
  };

  const updateLine = (lineId: string, patch: Partial<BillLine>) =>
    setLines((prev) =>
      prev.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line))
    );

  const removeLine = (lineId: string) => {
    setLines((prev) => prev.filter((line) => line.lineId !== lineId));
    toast.success("Item removed");
  };

  const cartColumns: ColumnDef<BillLine>[] = [
    { 
      header: "#", 
      cell: ({ row }) => <span className="font-medium text-pneutral-900">{row.index + 1}</span> 
    },
    {
      accessorKey: "productName",
      header: "Product Name",
      cell: ({ row }) => (
        <span className="font-bold text-pneutral-900">{row.original.productName}</span>
      ),
    },
    { 
      accessorKey: "batchNumber", 
      header: "Batch",
      cell: ({ row }) => <span>{row.original.batchNumber}</span>
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => <span>{String(row.original.unit || "Unit")}</span>
    },
    {
      accessorKey: "quantity",
      header: "QTY",
      cell: ({ row }) => <span className="font-semibold text-pneutral-900">{row.original.quantity}</span>,
    },
    {
      accessorKey: "sellingPricePerUnit",
      header: "Rate (₹)",
      cell: ({ row }) => <span>{formatAmount(lineRate(row.original))}</span>,
    },
    {
      header: "Gross (₹)",
      cell: ({ row }) => <span>{formatAmount(lineGross(row.original))}</span>,
    },
    {
      accessorKey: "discountPercentage",
      header: "Dis(%)",
      cell: ({ row }) => <span>{Number(row.original.discountPercentage || 0)}%</span>,
    },
    {
      accessorKey: "gstPercentage",
      header: "GST%",
      cell: ({ row }) => <span>{Number(row.original.gstPercentage || 0)}%</span>,
    },
    {
      header: "Amount (₹)",
      cell: ({ row }) => (
        <span className="font-semibold text-pneutral-900">
          {formatAmount(lineNet(row.original))}
        </span>
      ),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              setPending({
                product: {
                  productId: row.original.productId,
                  productName: row.original.productName,
                  brandName: row.original.brandName,
                  batchId: row.original.batchId,
                  batchNumber: row.original.batchNumber,
                  unit: row.original.unit,
                  expiryDate: row.original.expiryDate,
                  availableQuantity: row.original.availableQuantity,
                  mrpPerUnit: row.original.mrpPerUnit,
                  sellingPricePerUnit: row.original.sellingPricePerUnit,
                  gstPercentage: row.original.gstPercentage,
                },
                quantity: String(row.original.quantity),
                freeQuantity: String(row.original.freeQuantity),
                discountPercentage: String(row.original.discountPercentage),
                isEditing: true,
                editLineId: row.original.lineId,
              });
            }}
            title="Edit Item"
            className="text-[#7D32FC] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${row.original.productName}`}
            title="Remove from bill"
            onClick={() => removeLine(row.original.lineId)}
            className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 text-pneutral-900 pb-12">
      {/* Title */}
      <div className="text-[24px] font-semibold tracking-normal text-[#1E1E1D]">
        Billing POS
      </div>

      {/* Top Section - Customer Info & Prescription */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* Customer Information Card */}
        <div className="flex-1 w-full rounded-[12px] border border-pneutral-200 bg-white p-3 shadow-sm flex flex-col gap-2">
          <div className="text-[18px] font-semibold text-[#3C3D3A]">
            Customer Information
          </div>

          <div className="rounded-[8px] border border-[#D5D5D4] bg-white p-3 flex flex-col gap-4">
            <div className="text-[16px] font-normal text-[#3C3D3A]">
              Select the type of Customer
            </div>

            {/* 8 Customer Type Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CUSTOMER_TYPES.map((type) => {
                const isSelected = customer.customerType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setField("customerType", type.value)}
                    className={`h-[34px] px-3 py-1.5 rounded-[8px] border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#F8F5FF] border-[#7D32FC] text-[#7D32FC] font-semibold shadow-2xs"
                        : "bg-white border-[#D5D5D4] text-[#3C3D3A] hover:bg-gray-50"
                    }`}
                  >
                    <span className={isSelected ? "text-[#7D32FC]" : "text-[#3C3D3A]"}>
                      {type.icon}
                    </span>
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Name and Phone Number fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              <Input
                label="Name"
                placeholder="e.g. Ramesh Kumar"
                value={customer.customerName}
                onChange={(e) => setField("customerName", e.target.value)}
              />
              <Input
                label="Phone Number"
                type="tel"
                maxLength={10}
                placeholder="10 digit mobile number"
                value={customer.mobileNo}
                onChange={(e) => setField("mobileNo", e.target.value.replace(/\D/g, ""))}
              />
            </div>

            {/* Save notice */}
            <div className="text-[13px] sm:text-sm font-medium text-[#378200]">
              Customer details will be saved for this bill only.
            </div>
          </div>
        </div>

        {/* Prescription Card */}
        <div className="w-full lg:w-[300px] rounded-[12px] border border-[#EAEAE9] bg-white p-3 shadow-sm flex flex-col justify-between gap-4 shrink-0">
          <div className="text-[16px] font-medium text-black">
            Prescription (Optional)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-[129px] h-[36px] px-3 rounded-[8px] border-[1.5px] border-primary-800 bg-white hover:bg-[#F8F5FF] text-primary-800 font-medium text-[14px] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Upload size={16} />
              Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setPrescriptionName("Skipped");
                toast.success("Prescription skipped for this bill.");
              }}
              className="w-[129px] h-[36px] px-3 rounded-[8px] border-[1.5px] border-primary-800 bg-white hover:bg-[#F8F5FF] text-primary-800 font-medium text-[14px] flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0"
            >
              Skip
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const name = e.target.files?.[0]?.name;
              if (name) {
                setPrescriptionName(name);
                toast.success("Prescription file attached");
              }
            }}
          />

          {prescriptionName && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-pneutral-50 px-2.5 py-1.5 border border-pneutral-200">
              <span className="text-xs font-medium text-pneutral-700 truncate">
                {prescriptionName === "Skipped" ? "⚠️ Prescription Skipped" : `📄 ${prescriptionName}`}
              </span>
              <button
                type="button"
                aria-label="Remove prescription"
                onClick={() => setPrescriptionName("")}
                className="text-pneutral-500 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle Section - Product Search Bar */}
      <div className="relative w-full">
        <div className="h-[56px] w-full rounded-xl border-[2px] border-[#E1E1E1] bg-white px-4 shadow-sm flex items-center gap-3 transition-colors focus-within:border-[#7D32FC]">
          <Search size={20} className="text-pneutral-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product by name, generic, code..."
            className="flex-1 bg-transparent text-pneutral-900 placeholder-pneutral-400 text-sm md:text-base outline-none w-full"
          />
          <button
            type="button"
            onClick={() => toast("Barcode scanner reading...", { icon: "ℹ️" })}
            title="Scan Barcode / QR Code"
            className="text-pneutral-500 hover:text-[#7D32FC] transition-colors p-1 cursor-pointer"
          >
            <QrCode size={22} />
          </button>
        </div>

        {/* Search dropdown results */}
        {results.length > 0 && (
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-[12px] border border-[#C0C1BE] bg-white shadow-2xl">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full border-collapse text-[15px]">
                <thead className="sticky top-0 bg-[#EDEDEC] text-pneutral-800 border-b border-[#D5D5D4]">
                  <tr className="h-11 font-semibold">
                    <th className="px-5 text-left">Product Name</th>
                    <th className="px-4 text-center">Batch</th>
                    <th className="px-4 text-center">Available</th>
                    <th className="px-4 text-center">Expiry</th>
                    <th className="px-4 text-center">MRP (₹)</th>
                    <th className="px-4 text-center">Selling Price (₹)</th>
                    <th className="px-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAE9]">
                  {results.map((product) => (
                    <tr
                      key={`${product.productId}-${product.batchId}`}
                      className="py-3.5 border-b border-[#EAEAE9] hover:bg-pneutral-50 transition-colors"
                    >
                      <td className="px-5 py-3 text-left">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#000000] text-[15px]">{product.productName}</span>
                          <span className="text-[13px] text-[#5A5B57]">{product.brandName}</span>
                        </div>
                      </td>
                      <td className="px-4 text-center font-normal text-[#000000]">{product.batchNumber}</td>
                      <td className="px-4 text-center font-normal text-[#000000]">
                        {product.availableQuantity} {String(product.unit || "Unit")}
                      </td>
                      <td className="px-4 text-center font-normal text-[#000000]">{product.expiryDate}</td>
                      <td className="px-4 text-center font-normal text-[#000000]">{formatAmount(product.mrpPerUnit)}</td>
                      <td className="px-4 text-center font-normal text-[#000000]">{formatAmount(product.sellingPricePerUnit ?? product.mrpPerUnit)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={loadingSelect === product.batchId}
                          onClick={() => handleSelectBatch(product)}
                          className="h-[34px] px-6 rounded-[8px] border border-[#7D32FC] bg-white hover:bg-[#F8F5FF] text-[#7D32FC] font-semibold text-sm transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {loadingSelect === product.batchId ? "Loading..." : "Select"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <DataTable
        columns={cartColumns}
        data={lines}
        emptyState={
          <div className="py-20 flex flex-col items-center justify-center gap-3 w-full">
            <ShoppingCart size={46} className="text-pneutral-700 stroke-[1.5]" />
            <div className="text-base font-medium text-pneutral-700 mt-1">
              Search medicine to start billing
            </div>
          </div>
        }
      />

      {/* Bottom Section - Discount, Totals & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start mt-4">
        {/* Left Side - Discount Card & Clear Cart */}
        <div className="flex flex-col gap-5 w-full">
          {/* Discount Card */}
          <div className="w-full rounded-[12px] border border-[#EAEAE9] bg-white p-4 shadow-sm flex flex-col justify-between h-[226px]">
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-medium text-[#000000]">Discount</span>
              <div className="h-[36px] w-[122px] p-[4px] rounded-[12px] border border-[#EAEAE9] bg-[#F5F5F5] flex items-center">
                <button
                  type="button"
                  onClick={() => setDiscountType("AMOUNT")}
                  className={`h-[28px] flex-1 rounded-[8px] text-sm flex items-center justify-center transition-all cursor-pointer ${
                    discountType === "AMOUNT"
                      ? "bg-white font-semibold text-[#000000] shadow-[0px_2px_6px_0px_#00000040]"
                      : "font-normal text-[#3C3D3A] hover:text-black"
                  }`}
                >
                  ₹
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENTAGE")}
                  className={`h-[28px] flex-1 rounded-[8px] text-sm flex items-center justify-center transition-all cursor-pointer ${
                    discountType === "PERCENTAGE"
                      ? "bg-white font-semibold text-[#000000] shadow-[0px_2px_6px_0px_#00000040]"
                      : "font-normal text-[#3C3D3A] hover:text-black"
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="relative flex items-center w-full my-1">
              <input
                type="number"
                step="0.01"
                placeholder="Placeholder"
                value={billDiscountInput}
                onChange={(e) => setBillDiscountInput(e.target.value)}
                className="h-[48px] w-full rounded-[8px] border border-[#C0C1BE] bg-white pl-4 pr-10 text-sm text-pneutral-900 outline-none focus:border-[#7D32FC] transition-all shadow-2xs"
              />
              <span className="absolute right-3.5 font-medium text-[#3C3D3A] text-base select-none">
                {discountType === "AMOUNT" ? "₹" : "%"}
              </span>
            </div>

            <div className="text-[15px] font-medium text-[#378200]">
              Discount Amount : {formatAmount(totals.billDiscount)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (lines.length === 0) return;
              setLines([]);
              toast.success("Cart cleared");
            }}
            className="h-[48px] px-6 rounded-[8px] border-[2px] border-pneutral-900 bg-white hover:bg-pneutral-50 text-pneutral-900 font-semibold text-base flex items-center justify-center gap-2.5 shadow-sm transition-all w-fit cursor-pointer"
          >
            <ShoppingCart size={20} className="text-pneutral-900" />
            Clear Cart
          </button>
        </div>

        {/* Right Side - Totals Card & Proceed Button */}
        <div className="flex flex-col gap-5 w-full">
          {/* Payment Summary Card */}
          <div className="w-full rounded-[16px] border border-[#D5D5D4] bg-white p-4 shadow-sm flex flex-col justify-between h-[226px] text-[15px] font-normal text-pneutral-800">
            {/* Gross Amount */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Gross Amount</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.grossAmount)}</span>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Discount</span>
              <span className="text-center">(-)</span>
              <span className="text-right">₹ {formatAmount(totals.billDiscount)}</span>
            </div>

            {/* Taxable */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">Taxable</span>
              <span className="text-center"></span>
              <span className="text-right">₹ {formatAmount(totals.taxableAmount)}</span>
            </div>

            {/* GST (12%) */}
            <div className="grid grid-cols-3 items-center w-full">
              <span className="text-left">GST (12%)</span>
              <span className="text-center">(+)</span>
              <span className="text-right">₹ {formatAmount(totals.gstAmount)}</span>
            </div>

            {/* Net Amount */}
            <div className="grid grid-cols-3 items-center w-full text-[17px] font-semibold text-[#7D32FC]">
              <span className="text-left">Net Amount</span>
              <span className="text-center"></span>
              <span className="text-right font-bold">₹ {formatAmount(totals.netAmount)}</span>
            </div>
          </div>

          <div className="flex justify-end w-full">
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={() =>
                onProceedToPayment({
                  customer,
                  lines,
                  billDiscountPercentage:
                    discountType === "PERCENTAGE"
                      ? Number(billDiscountInput) || 0
                      : totals.grossAmount
                      ? ((Number(billDiscountInput) || 0) / totals.grossAmount) * 100
                      : 0,
                })
              }
              className="h-[48px] px-8 rounded-[8px] bg-[#7D32FC] hover:bg-[#6823df] text-white font-semibold text-base shadow-md disabled:opacity-50 transition-all w-full sm:w-auto cursor-pointer block"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation / Edit Modal */}
      {pending && (() => {
        const qtyNum = Number(pending.quantity) || 0;
        const discNum = Number(pending.discountPercentage) || 0;
        const mrp = pending.product.mrpPerUnit || 0;
        const rate = pending.product.sellingPricePerUnit ?? mrp;
        const gross = qtyNum * rate;
        const discountVal = (gross * discNum) / 100;
        const taxable = gross - discountVal;
        const gstVal = taxable * ((pending.product.gstPercentage || 0) / 100);
        const amount = taxable + gstVal;
        const unitLabel = String(pending.product.unit || "Unit");

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4 overflow-y-auto">
            <div className="relative w-full max-w-[880px] rounded-[12px] bg-white p-[16px] flex flex-col gap-[16px] shadow-2xl border border-[#D5D5D4] my-auto">
              {/* Top Header */}
              <div className="flex items-center justify-between h-[56px] pb-4 border-b border-[#EAEAE9] w-full">
                <span className="text-[18px] font-semibold text-[#1E1E1D]">
                  {pending.isEditing ? "Edit " : "Add "}{pending.product.productName} (Batch: {pending.product.batchNumber})
                </span>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPending(null)}
                  className="w-[28px] h-[28px] flex items-center justify-center rounded-lg text-[#1E1E1D] hover:bg-pneutral-100 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Middle Content - Two Cards */}
              <div className="flex flex-col md:flex-row gap-4 w-full items-stretch">
                {/* Left Card: Form */}
                <div className="w-full md:w-[525px] rounded-[16px] border border-[#EAEAE9] bg-white p-[16px] flex flex-col justify-between h-[266px]">
                  <div className="flex flex-col gap-3">
                    <span className="text-[15px] font-medium text-[#000000]">Sell As</span>
                    <div className="flex items-center gap-2.5 cursor-pointer">
                      <div className="w-5 h-5 rounded-full border-[2px] border-[#7D32FC] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#7D32FC]" />
                      </div>
                      <span className="text-[15px] font-normal text-[#000000]">
                        {unitLabel}
                      </span>
                    </div>
                  </div>

                  {/* Quantity and Discount Stepper & Field */}
                  <div className="flex items-start gap-6 pt-2">
                    {/* Quantity Stepper */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[15px] font-medium text-[#000000]">Quantity</label>
                      <div className="h-[50px] w-[170px] rounded-[10px] border border-[#C0C1BE] bg-white flex items-center overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setPending({ ...pending, quantity: String(Math.max(1, qtyNum - 1)) })}
                          className="w-[44px] h-[48px] flex items-center justify-center text-[#7D32FC] font-bold text-lg hover:bg-purple-50 transition-colors cursor-pointer select-none shrink-0"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={pending.product.availableQuantity}
                          value={pending.quantity}
                          onChange={(e) => setPending({ ...pending, quantity: e.target.value })}
                          className="w-[80px] h-[48px] border-x border-[#C0C1BE] bg-transparent text-center font-semibold text-[16px] text-[#000000] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPending({ ...pending, quantity: String(Math.min(pending.product.availableQuantity, qtyNum + 1)) })}
                          className="w-[44px] h-[48px] flex items-center justify-center text-[#7D32FC] font-bold text-lg hover:bg-purple-50 transition-colors cursor-pointer select-none shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Discount Field */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[15px] font-medium text-[#000000]">Discount (%)</label>
                      <div className="h-[50px] w-[170px] rounded-[10px] border border-[#C0C1BE] bg-white px-4 flex items-center justify-between shadow-2xs focus-within:border-[#7D32FC] transition-colors">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={pending.discountPercentage}
                          onChange={(e) => setPending({ ...pending, discountPercentage: e.target.value })}
                          placeholder="0"
                          className="w-full text-center font-semibold text-[16px] text-[#000000] bg-transparent outline-none"
                        />
                        <span className="text-[#7D32FC] font-bold text-base select-none ml-2">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Product Information */}
                <div className="w-full md:w-[307px] rounded-[16px] border border-[#EAEAE9] bg-white p-[16px] flex flex-col justify-between h-[266px] text-[14px] text-pneutral-700">
                  <div className="flex items-center justify-between">
                    <span>Brand</span>
                    <span className="font-semibold text-[#000000]">{pending.product.brandName || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expiry</span>
                    <span className="font-semibold text-[#000000]">{pending.product.expiryDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Available Stock</span>
                    <span className="font-semibold text-[#000000]">{pending.product.availableQuantity} {unitLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>MRP (₹)</span>
                    <span className="font-semibold text-[#000000]">₹ {formatAmount(mrp)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Selling Price</span>
                    <span className="font-semibold text-[#000000]">₹ {formatAmount(rate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GST (%)</span>
                    <span className="font-semibold text-[#000000]">{pending.product.gstPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Below Card: Summary Banner */}
              <div className="w-full h-[92px] rounded-[12px] border border-[#D5D5D4] bg-[#F8F5FF] p-[16px] grid grid-cols-3 items-center justify-between text-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-medium text-[#3C3D3A]">Total Qty</span>
                  <span className="text-[16px] font-semibold text-[#000000]">{qtyNum} {unitLabel}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-medium text-[#3C3D3A]">Rate (₹)</span>
                  <span className="text-[16px] font-semibold text-[#000000]">{formatAmount(rate)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-medium text-[#3C3D3A]">Amount (₹)</span>
                  <span className="text-[16px] font-semibold text-[#000000]">{formatAmount(amount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-6 pt-1 w-full">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="h-[40px] px-10 rounded-[8px] border border-[#FF5B5B] bg-white text-[#FF5B5B] font-medium text-[15px] hover:bg-red-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addPendingLine}
                  className="h-[40px] px-10 rounded-[8px] bg-[#7D32FC] hover:bg-[#6823df] text-white font-medium text-[15px] shadow-md transition-all cursor-pointer"
                >
                  {pending.isEditing ? "Update Item" : "Add to Bill"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Billing;
