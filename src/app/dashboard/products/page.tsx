"use client";

import Button from "@/app/components/common/Button";
import Dropdown from "@/app/components/common/Dropdown";
import Input from "@/app/components/common/Input";
import StatusBadge, { BadgeStatus } from "@/app/components/common/table/StatusBadge";
import TableWithoutGrid, {
  Chevron,
  TableColumn,
} from "@/app/components/common/table/TableWithoutGrid";
import {
  getProductDetails,
  getProductExpiryKpi,
  getProductStockSummary,
} from "@/services/InventoryService";
import type {
  ProductBatchDetails,
  ProductExpiryKpi,
  ProductPackageDetails,
  ProductStockSummary,
  StockStatus,
} from "@/types/ProductData";
import Image from "next/image";
import { useEffect, useState } from "react";

interface StatCard {
  /** Field on the expiry-KPI payload that supplies this card's count. */
  key: keyof ProductExpiryKpi;
  label: string;
  sublabel: string;
  icon?: string;
  iconBg?: string;
  iconColor?: string;
}

const statCards: StatCard[] = [
  {
    key: "expired",
    label: "Expired (Cannot Sell)",
    sublabel: "Products",
    icon: "/ProductManagement/Clock.svg",
    iconBg: "bg-warning-50",
    iconColor: "text-warning-500",
  },
  {
    key: "expiring0To30Days",
    label: "Expiring in 0-30 Days",
    sublabel: "Products",
    icon: "/ProductManagement/Calendar.svg",
    iconBg: "bg-danger-50",
    iconColor: "text-secondary-700",
  },
  {
    key: "expiring31To60Days",
    label: "Expiring in 31-60 Days",
    sublabel: "Products",
    icon: "/ProductManagement/Calendar.svg",
    iconBg: "bg-danger-50",
    iconColor: "text-secondary-700",
  },
  {
    key: "healthyAbove60Days",
    label: "Healthy (> 60 Days)",
    sublabel: "Products",
    icon: "/ProductManagement/ShieldCheck.svg",
    iconBg: "bg-success-50",
    iconColor: "text-success-900",
  },
  {
    key: "totalProducts",
    label: "Total Products",
    sublabel: "Across All Variants",
  },
];

const categoryOptions = [{ label: "All Categories", value: "all" }];
const statusOptions = [{ label: "All Status", value: "all" }];
const manufacturerOptions = [{ label: "All Manufacturers", value: "all" }];

const PAGE_SIZE = 10;
const NEAR_EXPIRY_DAYS = 30;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ------------------------------ display helpers --------------------------- */

/** "2031-04-09" -> "09-Apr-2031"; null / invalid -> "—". */
const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

/** Whole days from today (midnight) to the given date; negative if past. */
const daysUntil = (iso: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

/** Nearest-expiry column text, e.g. "25-Jul-2026 (5 days)". */
const formatNearestExpiry = (iso: string | null): string => {
  if (!iso) return "—";
  const days = daysUntil(iso);
  if (days < 0) return `${formatDate(iso)} (Expired)`;
  return `${formatDate(iso)} (${days} days)`;
};

/** Shelf-life text for a batch based on its expiry date. */
const formatShelfLife = (iso: string): string => {
  const days = daysUntil(iso);
  return days < 0 ? "Expired" : `${days} days`;
};

/** Map the API's overall stock status onto a badge label. */
const STOCK_STATUS_BADGE: Record<StockStatus, BadgeStatus> = {
  ACTIVE: "Active",
  NEAR_EXPIRY: "Near Expiry",
  EXPIRED: "Expired",
  OUT_OF_STOCK: "Out of Stock",
};

/** Status of a single batch, derived from stock + expiry. */
const batchStatus = (b: ProductBatchDetails): BadgeStatus => {
  if (b.stockQuantity <= 0) return "Out of Stock";
  const days = daysUntil(b.expiryDate);
  if (days < 0) return "Expired";
  if (days <= NEAR_EXPIRY_DAYS) return "Near Expiry";
  return "Healthy";
};

/** Roll a package's batches up into a single status. */
const packageStatus = (pkg: ProductPackageDetails): BadgeStatus => {
  const withStock = pkg.batches.filter((b) => b.stockQuantity > 0);
  if (withStock.length === 0) return "Out of Stock";
  if (withStock.some((b) => daysUntil(b.expiryDate) < 0)) return "Expired batch";
  if (withStock.some((b) => daysUntil(b.expiryDate) <= NEAR_EXPIRY_DAYS))
    return "Near Expiry Batch";
  return "Active";
};

const packageStock = (pkg: ProductPackageDetails): number =>
  pkg.batches.reduce((sum, b) => sum + b.stockQuantity, 0);

/** Earliest expiry among a package's in-stock batches (or null). */
const packageNearestExpiry = (pkg: ProductPackageDetails): string | null => {
  const dates = pkg.batches
    .filter((b) => b.stockQuantity > 0)
    .map((b) => b.expiryDate)
    .filter(Boolean);
  if (dates.length === 0) return null;
  return dates.reduce((earliest, d) => (d < earliest ? d : earliest));
};

/* --------------------------------- columns -------------------------------- */

const batchColumns: TableColumn<ProductBatchDetails>[] = [
  {
    header: "Batch No.",
    render: (b) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {b.batchNumber}
      </span>
    ),
  },
  {
    header: "Mfg. Date",
    render: (b) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {formatDate(b.manufacturingDate)}
      </span>
    ),
  },
  {
    header: "Expiry Date",
    render: (b) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {formatDate(b.expiryDate)}
      </span>
    ),
  },
  {
    header: "Stock (Units)",
    render: (b) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {b.stockQuantity}
      </span>
    ),
  },
  {
    header: "Shelf Life",
    render: (b) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {formatShelfLife(b.expiryDate)}
      </span>
    ),
  },
  {
    header: "Status",
    render: (b) => <StatusBadge status={batchStatus(b)} />,
  },
];

const packageColumns: TableColumn<ProductPackageDetails>[] = [
  {
    header: "Variant (Pack)",
    render: (pkg) => (
      <div className="flex flex-col gap-1">
        <span className="text-label-l4 font-semibold text-pneutral-900">
          {pkg.purchaseUnit}
        </span>
        <span className="text-label-l3 font-regular text-pneutral-900">
          1 {pkg.purchaseUnit} = {pkg.purchaseUnitContains} {pkg.smallestUnit}
        </span>
      </div>
    ),
  },
  {
    header: "Total Stock",
    render: (pkg) => (
      <span className="text-p3 font-semibold text-pneutral-900">
        {packageStock(pkg)}
      </span>
    ),
  },
  {
    header: "Overall Status",
    render: (pkg) => <StatusBadge status={packageStatus(pkg)} />,
  },
  {
    header: "Nearest Expiry",
    render: (pkg) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {formatNearestExpiry(packageNearestExpiry(pkg))}
      </span>
    ),
  },
  {
    header: "Actions",
    width: "w-20",
    align: "center",
    render: (_pkg, { expanded, toggle }) => (
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

const productColumns: TableColumn<ProductStockSummary>[] = [
  {
    header: "Product Name / Variant",
    render: (p) => (
      <div className="flex flex-col gap-1">
        <span className="text-label-l4 font-semibold text-pneutral-900">
          {p.productName}
        </span>
        <span className="text-label-l3 font-regular text-pneutral-900">
          {p.productId}
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
    render: (p) => <StatusBadge status={STOCK_STATUS_BADGE[p.overallStatus]} />,
  },
  {
    header: "Nearest Expiry",
    render: (p) => (
      <span className="text-label-l4 font-regular text-pneutral-900">
        {formatNearestExpiry(p.nearestExpiryDate)}
      </span>
    ),
  },
];

/* ------------------------------ nested tables ----------------------------- */

/** Batch table shown under an expanded package row. */
const renderPackageBatches = (pkg: ProductPackageDetails) => (
  <div className="pb-3 pl-12 pr-2">
    <TableWithoutGrid
      columns={batchColumns}
      data={pkg.batches}
      rowKey={(b, i) => `${b.batchId}-${i}`}
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

/**
 * Package (variant) table shown under an expanded product row.
 * Fetches the product's details on mount so the call only fires when
 * a product row is actually expanded.
 */
const ProductPackages = ({ productId }: { productId: string }) => {
  const [packages, setPackages] = useState<ProductPackageDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const details = await getProductDetails(productId);
        if (active) setPackages(details.packages);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load product details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [productId]);

  if (error) {
    return (
      <div className="py-6 pl-10 text-label-l4 text-danger-600">{error}</div>
    );
  }

  return (
    <div className="pl-10">
      <TableWithoutGrid
        columns={packageColumns}
        data={packages}
        rowKey={(pkg) => pkg.packagingId}
        headerVariant="muted"
        container="none"
        loading={loading}
        renderExpanded={renderPackageBatches}
      />
    </div>
  );
};

/* ----------------------------------- page --------------------------------- */

const Page = () => {
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [manufacturer, setManufacturer] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [products, setProducts] = useState<ProductStockSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [kpi, setKpi] = useState<ProductExpiryKpi | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getProductStockSummary();
        setProducts(data);
      } catch (error) {
        console.error("Unable to fetch product stock summary", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProductExpiryKpi();
        setKpi(data);
      } catch (error) {
        console.error("Unable to fetch product expiry KPIs", error);
      }
    };

    load();
  }, []);

  const pageData = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const renderProductPackages = (product: ProductStockSummary) => (
    <ProductPackages productId={product.productId} />
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
        {statCards.map(({ key, label, sublabel, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className={`flex items-center gap-2 flex-1 min-w-[204px] h-[118px] p-3 rounded-xl border border-pneutral-100 bg-white ${!Icon ? "justify-center" : ""
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
                {kpi ? kpi[key] : 0}
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
        rowKey={(p) => p.productId}
        headerVariant="primary"
        container="card"
        loading={loading}
        renderExpanded={renderProductPackages}
        pagination={{
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalItems: products.length,
          onPageChange: setCurrentPage,
        }}
      />
    </div>
  );
};

export default Page;
