"use client";

import Button from "@/app/components/common/Button";
import Dropdown from "@/app/components/common/Dropdown";
import Input from "@/app/components/common/Input";
import StatusBadge, { BadgeStatus } from "@/app/components/common/table/StatusBadge";
import TableWithoutGrid, {
  Chevron,
  TableColumn,
} from "@/app/components/common/table/TableWithoutGrid";
import Image from "next/image";
import { useState } from "react";

interface InventoryBatch {
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  stock: number;
  shelfLife: string;
  status: BadgeStatus;
}

interface InventoryVariant {
  id: string;
  name: string;
  pack: string;
  totalStock: number;
  status: BadgeStatus;
  nearestExpiry: string;
  batches: InventoryBatch[];
}

interface InventoryProduct {
  id: string;
  name: string;
  manufacturer: string;
  totalStock: number;
  status: BadgeStatus;
  nearestExpiry: string;
  variants: InventoryVariant[];
}

interface StatCard {
  label: string;
  sublabel: string;
  count: number;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}

const statCards: StatCard[] = [
  {
    label: "Expired (Cannot Sell)",
    sublabel: "Products",
    count: 5,
    icon: "/ProductManagement/Clock.svg",
    iconBg: "bg-warning-50",
    iconColor: "text-warning-500",
  },
  {
    label: "Expiring in 0-30 Days",
    sublabel: "Products",
    count: 20,
    icon: "/ProductManagement/Calendar.svg",
    iconBg: "bg-danger-50",
    iconColor: "text-secondary-700",
  },
  {
    label: "Expiring in 31-60 Days",
    sublabel: "Products",
    count: 45,
    icon: "/ProductManagement/Calendar.svg",
    iconBg: "bg-danger-50",
    iconColor: "text-secondary-700",
  },
  {
    label: "Healthy (> 60 Days)",
    sublabel: "Products",
    count: 80,
    icon: "/ProductManagement/ShieldCheck.svg",
    iconBg: "bg-success-50",
    iconColor: "text-success-900",
  },
  {
    label: "Total Products",
    sublabel: "Across All Variants",
    count: 1545,
  },
];

const categoryOptions = [{ label: "All Categories", value: "all" }];
const statusOptions = [{ label: "All Status", value: "all" }];
const manufacturerOptions = [{ label: "All Manufacturers", value: "all" }];

const productData: InventoryProduct[] = [
  {
    id: "dolo-650",
    name: "Dolo 650",
    manufacturer: "Micro Labs",
    totalStock: 3521,
    status: "Active",
    nearestExpiry: "25-Jul-2026 (5 days)",
    variants: [
      {
        id: "dolo-650-15",
        name: "Dolo 650 tab",
        pack: "strip of 15",
        totalStock: 3521,
        status: "Near Expiry Batch",
        nearestExpiry: "25-Jul-2026 (5 days)",
        batches: [
          {
            batchNo: "DL245",
            mfgDate: "Jan-2025",
            expiryDate: "25-Jul-2026",
            stock: 211,
            shelfLife: "5 days",
            status: "Near Expiry",
          },
          {
            batchNo: "DL520",
            mfgDate: "Jan-2025",
            expiryDate: "10-Jan-2027",
            stock: 541,
            shelfLife: "185 days",
            status: "Healthy",
          },
          {
            batchNo: "DL520",
            mfgDate: "Jan-2025",
            expiryDate: "10-Jan-2027",
            stock: 541,
            shelfLife: "185 days",
            status: "Healthy",
          },
        ],
      },
      {
        id: "dolo-650-20",
        name: "Dolo 650 tab",
        pack: "Strip of 20",
        totalStock: 240,
        status: "Active",
        nearestExpiry: "25-Jul-2026 (5 days)",
        batches: [
          {
            batchNo: "DL610",
            mfgDate: "Mar-2025",
            expiryDate: "25-Jul-2026",
            stock: 240,
            shelfLife: "5 days",
            status: "Healthy",
          },
        ],
      },
    ],
  },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `paracetamol-${i + 1}`,
    name: "Paracetamol",
    manufacturer: "Micro Labs",
    totalStock: 3521,
    status: "Active" as const,
    nearestExpiry: "25-Jul-2026 (5 days)",
    variants: [
      {
        id: `paracetamol-${i + 1}-500-10`,
        name: "Paracetamol 500 tab",
        pack: "strip of 10",
        totalStock: 3521,
        status: "Active" as const,
        nearestExpiry: "25-Jul-2026 (5 days)",
        batches: [
          {
            batchNo: "PC100",
            mfgDate: "Jan-2025",
            expiryDate: "25-Jul-2026",
            stock: 3521,
            shelfLife: "5 days",
            status: "Healthy" as const,
          },
        ],
      },
    ],
  })),
  {
    id: "paracetamol-expired",
    name: "Paracetamol",
    manufacturer: "Micro Labs",
    totalStock: 3521,
    status: "Expired batch",
    nearestExpiry: "25-Jul-2026 (5 days)",
    variants: [
      {
        id: "paracetamol-expired-500-10",
        name: "Paracetamol 500 tab",
        pack: "strip of 10",
        totalStock: 3521,
        status: "Expired batch",
        nearestExpiry: "25-Jul-2026 (5 days)",
        batches: [
          {
            batchNo: "PC900",
            mfgDate: "Jan-2023",
            expiryDate: "25-Jul-2024",
            stock: 3521,
            shelfLife: "Expired",
            status: "Expired",
          },
        ],
      },
    ],
  },
];

const PAGE_SIZE = 10;

const batchColumns: TableColumn<InventoryBatch>[] = [
  {
    header: "Batch No.",
    render: (b) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {b.batchNo}
      </span>
    ),
  },
  {
    header: "Mfg. Date",
    render: (b) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {b.mfgDate}
      </span>
    ),
  },
  {
    header: "Expiry Date",
    render: (b) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {b.expiryDate}
      </span>
    ),
  },
  {
    header: "Stock (Units)",
    render: (b) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {b.stock}
      </span>
    ),
  },
  {
    header: "Shelf Life",
    render: (b) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {b.shelfLife}
      </span>
    ),
  },
  {
    header: "Status",
    render: (b) => <StatusBadge status={b.status} />,
  },
];

const variantColumns: TableColumn<InventoryVariant>[] = [
  {
    header: "Variant (Pack)",
    render: (v) => (
      <div className="flex flex-col gap-1">
        <span className="text-label-l4 font-semibold text-pneutral-900">
          {v.name}
        </span>
        <span className="text-label-l3 font-regular text-pneutral-900">
          {v.pack}
        </span>
      </div>
    ),
  },
  {
    header: "Total Stock",
    render: (v) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {v.totalStock}
      </span>
    ),
  },
  {
    header: "Overall Status",
    render: (v) => <StatusBadge status={v.status} />,
  },
  {
    header: "Nearest Expiry",
    render: (v) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {v.nearestExpiry}
      </span>
    ),
  },
  {
    header: "Actions",
    width: "w-20",
    align: "center",
    render: (_v, { expanded, toggle }) => (
      <div className="flex items-center justify-center gap-3">
        <button type="button" aria-label="View variant">
          <Image
            src="/ProductManagement/ViewIcon.svg"
            alt=""
            width={20}
            height={16}
          />
        </button>
        <button
          type="button"
          aria-label={expanded ? "Collapse batches" : "Expand batches"}
          onClick={toggle}
        >
          <Chevron open={expanded} />
        </button>
      </div>
    ),
  },
];

const productColumns: TableColumn<InventoryProduct>[] = [
  {
    header: "Product Name / Variant",
    render: (p) => (
      <div className="flex flex-col gap-1">
        <span className="text-label-l4 font-semibold text-pneutral-900">
          {p.name}
        </span>
        <span className="text-label-l3 font-regular text-pneutral-900">
          {p.manufacturer}
        </span>
      </div>
    ),
  },
  {
    header: "Total Stock",
    render: (p) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {p.totalStock}
      </span>
    ),
  },
  {
    header: "Overall Status",
    render: (p) => <StatusBadge status={p.status} />,
  },
  {
    header: "Nearest Expiry",
    render: (p) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {p.nearestExpiry}
      </span>
    ),
  },
];

const Page = () => {
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [manufacturer, setManufacturer] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pageData = productData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const renderVariantBatches = (variant: InventoryVariant) => (
    <div className="pb-3 pl-12 pr-2">
      <TableWithoutGrid
        columns={batchColumns}
        data={variant.batches}
        rowKey={(b, i) => `${b.batchNo}-${i}`}
        headerVariant="muted"
        container="box"
        footer={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 py-3 text-label-l4 font-medium text-secondary-700"
          >
            <span className="text-p5 leading-none">+</span>
            Add/View More Batches
          </button>
        }
      />
    </div>
  );

  const renderProductVariants = (product: InventoryProduct) => (
    <div className="pl-10">
      <TableWithoutGrid
        columns={variantColumns}
        data={product.variants}
        rowKey={(v) => v.id}
        headerVariant="muted"
        container="none"
        renderExpanded={renderVariantBatches}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-h4 text-pneutral-900">
          <span className="font-semibold">Inventory</span>
          <span className="font-normal">/ Stock with Expiry Status</span>
        </div>

        <Button
          variant="primary"
          className="h-9! min-w-[108px] gap-2 px-3 bg-primary-800! text-label-l3! font-medium! shadow-[-1px_1px_4px_0px_#00000040]"
        >
          <Image
            src="/ProductManagement/Plus.svg"
            alt="Add"
            width={14}
            height={14}
            className="shrink-0"
          />
          Add Product
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {statCards.map(({ label, sublabel, count, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className={`flex items-center gap-2 flex-1 min-w-[204px] h-[118px] p-3 rounded-xl border border-pneutral-100 bg-white ${
              !Icon ? "justify-center" : ""
            }`}
          >
            {Icon && (
              <div
                className={`flex items-center justify-center w-13 h-13 rounded-full shrink-0 ${iconBg}`}
              >
                {Icon && (
                  <div
                    className={`flex items-center justify-center w-13 h-13 rounded-full shrink-0 ${iconBg}`}
                  >
                    <Image
                      src={Icon}
                      alt={label}
                      width={20}
                      height={20}
                    />
                  </div>
                )}
              </div>
            )}

            <div
              className="flex flex-col justify-between self-stretch">
              <span className="text-label-l3 font-medium text-pneutral-900">
                {label}
              </span>
              <span className="text-h4 font-medium text-pneutral-900 leading-9">
                {count}
              </span>
              <span className="text-label-l2 font-normal text-base-black">
                {sublabel}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-row items-start gap-4 w-full">
        <div className="flex items-center w-[286px] shrink-0 h-[43px] rounded-lg border border-pneutral-200 bg-white overflow-hidden">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Search"
              className="h-[43px]! border-0! rounded-none bg-transparent"
            />
          </div>
          <Button
            type="button"
            className="h-[43px]! w-[43px] shrink-0 rounded-none! border-l border-pneutral-200 bg-[#E4D6FB]! text-primary-900!"
          >
            <Image
              src="/ProductManagement/Search.svg"
              alt="Search"
              width={18}
              height={18}
            />
          </Button>
        </div>

        <div className="flex-1 min-w-[166px]">
          <Dropdown
            options={categoryOptions}
            value={category}
            onChange={setCategory}
            placeholder="All Categories"
          />
        </div>

        <div className="flex-1 min-w-[166px]">
          <Dropdown
            options={statusOptions}
            value={status}
            onChange={setStatus}
            placeholder="All Status"
          />
        </div>

        <div className="flex-1 min-w-[190px]">
          <Dropdown
            options={manufacturerOptions}
            value={manufacturer}
            onChange={setManufacturer}
            placeholder="All Manufacturers"
          />
        </div>

        <Button
          variant="outline"
          className="w-[108px]! shrink-0 gap-2 px-4 border! border-pneutral-200! bg-pneutral-50 text-p3! font-semibold tracking-[-0.02em] text-pneutral-900!"
        >
          <Image
            src="/ProductManagement/LeadingIcon.svg"
            alt="Filter"
            width={16}
            height={16}
          />
          Filter
        </Button>
      </div>

      <TableWithoutGrid
        columns={productColumns}
        data={pageData}
        rowKey={(p) => p.id}
        headerVariant="primary"
        container="card"
        renderExpanded={renderProductVariants}
        pagination={{
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalItems: productData.length,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
};

export default Page;
