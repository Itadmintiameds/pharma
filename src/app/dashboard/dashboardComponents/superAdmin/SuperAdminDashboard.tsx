"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeftRight, CalendarClock, MapPin, Package, Warehouse } from "lucide-react";
import StatCard from "@/app/components/common/StatCard";
import SalesOverviewSection from "../salesOverview/SalesOverviewSection";
import PurchaseOverviewSection from "../purchaseOverview/PurchaseOverviewSection";
import { useAccess } from "@/app/components/providers/AccessProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWarehouseStore } from "@/store/warehouseStore";
import { getUserPharmacyKPIs } from "@/services/SetupBusinessService";
import { getBatchExpiryKpi } from "@/services/InventoryService";
import { getSourceTransferKpi } from "@/services/WarehouseDistributionService";
import { BatchExpiryKpi } from "@/types/ProductData";

const SuperAdminDashboard = () => {
  const { user } = useCurrentUser();
  const { actingAsWarehouse } = useAccess();
  // Populated app-wide by useInitializeWarehouse (in DashboardProvider) with
  // every warehouse in the organization, for a Super Admin.
  const warehouses = useWarehouseStore((state) => state.warehouses);
  const warehouseListLoading = useWarehouseStore((state) => state.loading);

  const [totalPharmacies, setTotalPharmacies] = useState(0);
  const [businessLoading, setBusinessLoading] = useState(true);

  const [inventoryKpi, setInventoryKpi] = useState<BatchExpiryKpi | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const [transfersCompleted, setTransfersCompleted] = useState(0);
  const [transferLoading, setTransferLoading] = useState(true);

  const kpiLoading =
    (actingAsWarehouse ? warehouseListLoading : businessLoading) ||
    inventoryLoading ||
    (actingAsWarehouse && transferLoading);

  // Total Pharmacies only applies in pharmacy mode, so this waits for the
  // current user's id and skips entirely once toggled into warehouse mode.
  useEffect(() => {
    if (!user?.userId || actingAsWarehouse) return;
    let cancelled = false;

    getUserPharmacyKPIs(String(user.userId))
      .then((res) => {
        if (!cancelled) setTotalPharmacies(res?.data?.totalPharmacies || 0);
      })
      .catch((err) => console.error("Failed to load business setup KPIs:", err))
      .finally(() => {
        if (!cancelled) setBusinessLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId, actingAsWarehouse]);

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

    return () => {
      cancelled = true;
    };
  }, []);

  // Only meaningful once toggled into warehouse mode, so it re-fetches on toggle
  // rather than running unconditionally.
  useEffect(() => {
    if (!actingAsWarehouse) return;
    let cancelled = false;

    getSourceTransferKpi()
      .then((kpi) => {
        if (!cancelled) setTransfersCompleted(kpi.completed);
      })
      .catch((err) => console.error("Failed to load inter-store transfer KPI:", err))
      .finally(() => {
        if (!cancelled) setTransferLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [actingAsWarehouse]);

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Billing/sales data doesn't apply once Super Admin has toggled into warehouse mode. */}
      {!actingAsWarehouse && <SalesOverviewSection />}

      <section className="flex flex-col gap-3">
        <h2 className="text-label-l5 font-medium text-pneutral-900">Overview</h2>

        {kpiLoading ? (
          <p className="text-p3 text-pneutral-500">Loading KPIs…</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {actingAsWarehouse ? (
              <StatCard
                icon={Warehouse}
                label="Total Warehouse"
                value={warehouses.length}
                colorScheme="secondary"
              />
            ) : (
              <StatCard
                icon={MapPin}
                label="Total Pharmacies"
                value={totalPharmacies}
                colorScheme="secondary"
              />
            )}
            <StatCard
              icon={Package}
              label="Total Products"
              value={inventoryKpi?.totalProducts ?? 0}
              caption={actingAsWarehouse ? "In warehouse inventory" : "In inventory"}
              colorScheme="info"
            />
            {actingAsWarehouse && (
              <StatCard
                icon={ArrowLeftRight}
                label="Warehouse Transfers"
                value={transfersCompleted}
                caption="Completed"
                colorScheme="secondary"
              />
            )}
            <StatCard
              icon={CalendarClock}
              label="Expiring Soon"
              value={inventoryKpi?.expiring0To30DaysBatches ?? 0}
              caption="Batches, next 30 days"
              colorScheme="warning"
            />
          </div>
        )}

        {actingAsWarehouse && <PurchaseOverviewSection />}
      </section>
    </div>
  );
};

export default SuperAdminDashboard;
