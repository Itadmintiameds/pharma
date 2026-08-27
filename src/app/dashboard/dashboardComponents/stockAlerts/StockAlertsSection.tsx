"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeftRight, CalendarClock, Package, PackageCheck, PackageX } from "lucide-react";
import StatCard from "@/app/components/common/StatCard";
import { getBatchExpiryKpi, getProductStockSummary } from "@/services/InventoryService";
import {
  getDestinationReceiptKpi,
  getSourceTransferKpi,
} from "@/services/WarehouseDistributionService";
import { BatchExpiryKpi } from "@/types/ProductData";
import { getOutOfStockCount } from "../inventoryAggregations";

/**
 * Total Products / Stock Received / Inter-Store Transfers / Expiring Soon /
 * Out of Stock, shared across role dashboards — fetches its own data so any
 * dashboard can just drop it in.
 */
const StockAlertsSection = () => {
  const [inventoryKpi, setInventoryKpi] = useState<BatchExpiryKpi | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const [outOfStock, setOutOfStock] = useState(0);
  const [stockSummaryLoading, setStockSummaryLoading] = useState(true);

  const [transfersCompleted, setTransfersCompleted] = useState(0);
  const [transferLoading, setTransferLoading] = useState(true);

  const [receivedToday, setReceivedToday] = useState(0);
  const [receiptLoading, setReceiptLoading] = useState(true);

  const loading = inventoryLoading || stockSummaryLoading || transferLoading || receiptLoading;

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
    <section className="flex flex-col gap-3">
      <h2 className="text-label-l5 font-medium text-pneutral-900">Stock Alerts</h2>
      {loading ? (
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
  );
};

export default StockAlertsSection;
