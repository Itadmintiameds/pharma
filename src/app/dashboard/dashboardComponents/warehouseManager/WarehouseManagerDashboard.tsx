"use client";

import React, { useEffect, useState } from "react";
import { Package, PackageX, Repeat, ShoppingCart, Boxes } from "lucide-react";
import StatCard from "@/app/components/common/StatCard";
import PurchaseOverviewSection from "../purchaseOverview/PurchaseOverviewSection";
import { getBatchExpiryKpi, getProductStockSummary } from "@/services/InventoryService";
import { getRequestedByKpi } from "@/services/WarehouseDistributionService";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { BatchExpiryKpi } from "@/types/ProductData";
import { getOutOfStockCount } from "../inventoryAggregations";
import { getTotalProductsPurchased, getTotalPurchaseAmount } from "../purchaseOverview/aggregations";

const currency = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

/**
 * Warehouse Managers don't handle patient billing, so unlike the other role
 * dashboards this has no SalesOverviewSection — just warehouse inventory and
 * inter-store movement, plus the same PurchaseOverviewSection Super Admin
 * uses in warehouse mode.
 */
const WarehouseManagerDashboard = () => {
  const [inventoryKpi, setInventoryKpi] = useState<BatchExpiryKpi | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const [outOfStock, setOutOfStock] = useState(0);
  const [stockSummaryLoading, setStockSummaryLoading] = useState(true);

  const [totalTransfers, setTotalTransfers] = useState(0);
  const [totalTransfersLoading, setTotalTransfersLoading] = useState(true);

  const [totalPurchaseAmount, setTotalPurchaseAmount] = useState(0);
  const [totalProductsPurchased, setTotalProductsPurchased] = useState(0);
  const [purchaseLoading, setPurchaseLoading] = useState(true);

  const overviewLoading =
    inventoryLoading || stockSummaryLoading || totalTransfersLoading || purchaseLoading;

  useEffect(() => {
    let cancelled = false;

    getBatchExpiryKpi()
      .then((data) => {
        if (!cancelled) setInventoryKpi(data);
      })
      .catch((err) => console.error("Failed to load inventory expiry KPIs:", err))
      .finally(() => {
        if (!cancelled) setInventoryLoading(false);
      });

    getProductStockSummary()
      .then((summaries) => {
        if (!cancelled) setOutOfStock(getOutOfStockCount(summaries));
      })
      .catch((err) => console.error("Failed to load stock summary:", err))
      .finally(() => {
        if (!cancelled) setStockSummaryLoading(false);
      });

    getRequestedByKpi()
      .then((kpi) => {
        if (!cancelled) setTotalTransfers(kpi.totalTransfers);
      })
      .catch((err) => console.error("Failed to load total transfer KPI:", err))
      .finally(() => {
        if (!cancelled) setTotalTransfersLoading(false);
      });

    getAllPurchases()
      .then((purchases) => {
        if (cancelled) return;
        setTotalPurchaseAmount(getTotalPurchaseAmount(purchases));
        setTotalProductsPurchased(getTotalProductsPurchased(purchases));
      })
      .catch((err) => console.error("Failed to load purchase data:", err))
      .finally(() => {
        if (!cancelled) setPurchaseLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-label-l5 font-medium text-pneutral-900">Overview</h2>
        {overviewLoading ? (
          <p className="text-p3 text-pneutral-500">Loading warehouse data…</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <StatCard
              icon={Package}
              label="Total Products"
              value={inventoryKpi?.totalProducts ?? 0}
              caption="In warehouse inventory"
              colorScheme="secondary"
            />
            <StatCard
              icon={Repeat}
              label="Total Transfers"
              value={totalTransfers}
              caption="By this warehouse"
              colorScheme="danger"
            />
            <StatCard
              icon={Boxes}
              label="Products Purchased"
              value={totalProductsPurchased.toLocaleString()}
              caption="Units, all time"
              colorScheme="secondary"
            />
            <StatCard
              icon={ShoppingCart}
              label="Total Purchases"
              value={currency(totalPurchaseAmount)}
              caption="All time"
              colorScheme="info"
            />
            <StatCard
              icon={PackageX}
              label="Out of Stock"
              value={outOfStock}
              caption="Products"
              colorScheme="warning"
            />
          </div>
        )}
      </section>

      <PurchaseOverviewSection />
    </div>
  );
};

export default WarehouseManagerDashboard;
