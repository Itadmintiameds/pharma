"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarClock,
  Package,
  PackageCheck,
  PackageX,
  Receipt,
  Wallet,
} from "lucide-react";
import StatCard from "@/app/components/common/StatCard";
import SalesOverviewSection from "../salesOverview/SalesOverviewSection";
import { getAllBillings } from "@/services/BillingService";
import { getBatchExpiryKpi, getProductStockSummary } from "@/services/InventoryService";
import {
  getDestinationReceiptKpi,
  getSourceTransferKpi,
} from "@/services/WarehouseDistributionService";
import { BatchExpiryKpi } from "@/types/ProductData";
import { TodaysSalesSnapshot, getOutOfStockCount, getTodaysSalesSnapshot } from "./aggregations";

const currency = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const EMPTY_SNAPSHOT: TodaysSalesSnapshot = {
  billsToday: 0,
  revenueToday: 0,
  pendingPayments: 0,
};

const AdminDashboard = () => {
  const [snapshot, setSnapshot] = useState<TodaysSalesSnapshot>(EMPTY_SNAPSHOT);
  const [salesLoading, setSalesLoading] = useState(true);

  const [inventoryKpi, setInventoryKpi] = useState<BatchExpiryKpi | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const [outOfStock, setOutOfStock] = useState(0);
  const [stockSummaryLoading, setStockSummaryLoading] = useState(true);

  const [transfersCompleted, setTransfersCompleted] = useState(0);
  const [transferLoading, setTransferLoading] = useState(true);

  const [receivedToday, setReceivedToday] = useState(0);
  const [receiptLoading, setReceiptLoading] = useState(true);

  const stockAlertsLoading =
    inventoryLoading || stockSummaryLoading || transferLoading || receiptLoading;

  useEffect(() => {
    let cancelled = false;

    getAllBillings()
      .then((bills) => {
        if (!cancelled) setSnapshot(getTodaysSalesSnapshot(bills));
      })
      .catch((err) => console.error("Failed to load billing data:", err))
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
      });

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

    getSourceTransferKpi()
      .then((kpi) => {
        if (!cancelled) setTransfersCompleted(kpi.completed);
      })
      .catch((err) => console.error("Failed to load inter-store transfer KPI:", err))
      .finally(() => {
        if (!cancelled) setTransferLoading(false);
      });

    getDestinationReceiptKpi()
      .then((kpi) => {
        if (!cancelled) setReceivedToday(kpi.receivedToday);
      })
      .catch((err) => console.error("Failed to load stock receipt KPI:", err))
      .finally(() => {
        if (!cancelled) setReceiptLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <SalesOverviewSection />

      <section className="flex flex-col gap-3">
        <h2 className="text-label-l5 font-medium text-pneutral-900">Today&apos;s Snapshot</h2>
        {salesLoading ? (
          <p className="text-p3 text-pneutral-500">Loading sales data…</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <StatCard
              icon={Receipt}
              label="Bills Today"
              value={snapshot.billsToday}
              colorScheme="secondary"
            />
            <StatCard
              icon={Wallet}
              label="Revenue Today"
              value={currency(snapshot.revenueToday)}
              colorScheme="success"
            />
            <StatCard
              icon={AlertCircle}
              label="Pending Payments"
              value={snapshot.pendingPayments}
              caption="Bills"
              colorScheme="warning"
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-label-l5 font-medium text-pneutral-900">Stock Alerts</h2>
        {stockAlertsLoading ? (
          <p className="text-p3 text-pneutral-500">Loading stock data…</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <StatCard
              icon={Package}
              label="Total Products"
              value={inventoryKpi?.totalProducts ?? 0}
              caption="In inventory"
              colorScheme="secondary"
            />
            <StatCard
              icon={PackageCheck}
              label="Stock Received"
              value={receivedToday}
              caption="Today"
              colorScheme="success"
            />
            <StatCard
              icon={ArrowLeftRight}
              label="Inter-Store Transfers"
              value={transfersCompleted}
              caption="Completed"
              colorScheme="info"
            />
            <StatCard
              icon={CalendarClock}
              label="Expiring Soon"
              value={inventoryKpi?.expiring0To30DaysBatches ?? 0}
              caption="Batches, next 30 days"
              colorScheme="danger"
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
    </div>
  );
};

export default AdminDashboard;
