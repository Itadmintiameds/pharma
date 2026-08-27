"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, MapPin, Package } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/app/components/common/ChartCard";
import StatCard from "@/app/components/common/StatCard";
import SalesOverviewSection from "../salesOverview/SalesOverviewSection";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { getUserPharmacyKPIs } from "@/services/SetupBusinessService";
import { getBatchExpiryKpi } from "@/services/InventoryService";
import { BatchExpiryKpi } from "@/types/ProductData";
import { DailySeriesPoint } from "../dailySeries";
import { getPurchaseSpendByDay } from "./aggregations";

const currency = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : String(value ?? "");

// A deep teal, distinct from the purple used for revenue/patient visits and
// the green/gold/terracotta used for payment status.
const PURCHASE_SPEND_COLOR = "#2F8F84";

const SuperAdminDashboard = () => {
  const { user } = useCurrentUser();

  const [purchaseSeries, setPurchaseSeries] = useState<DailySeriesPoint[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(true);

  const [totalPharmacies, setTotalPharmacies] = useState(0);
  const [businessLoading, setBusinessLoading] = useState(true);

  const [inventoryKpi, setInventoryKpi] = useState<BatchExpiryKpi | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(true);

  const kpiLoading = businessLoading || inventoryLoading;

  // Needs the current user's id, so it waits for useCurrentUser to resolve.
  useEffect(() => {
    if (!user?.userId) return;
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
  }, [user?.userId]);

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

    getAllPurchases()
      .then((purchases) => {
        if (!cancelled) setPurchaseSeries(getPurchaseSpendByDay(purchases));
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
      <SalesOverviewSection />

      <section className="flex flex-col gap-3">
        <h2 className="text-label-l5 font-medium text-pneutral-900">Purchase Overview</h2>
        <div className="flex gap-4">
          <div className="w-1/2">
            {purchaseLoading ? (
              <p className="text-p3 text-pneutral-500">Loading purchase data…</p>
            ) : (
              <ChartCard title="Daily Purchase" subtitle="Last 30 days">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={purchaseSeries} barCategoryGap="2%">
                    <defs>
                      <linearGradient id="purchaseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PURCHASE_SPEND_COLOR} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={PURCHASE_SPEND_COLOR} stopOpacity={0.55} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-pneutral-100)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "var(--color-pneutral-400)" }}
                      interval={4}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "var(--color-pneutral-400)" }}
                      width={48}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => currency(value)}
                      cursor={false}
                      labelStyle={{ color: "var(--color-pneutral-500)", fontWeight: 500 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-pneutral-100)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#purchaseFill)"
                      radius={[6, 6, 0, 0]}
                      background={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          <div className="flex w-1/2 flex-col gap-4">
            {kpiLoading ? (
              <p className="text-p3 text-pneutral-500">Loading KPIs…</p>
            ) : (
              <>
                <StatCard
                  icon={MapPin}
                  label="Total Pharmacies"
                  value={totalPharmacies}
                  colorScheme="secondary"
                />
                <StatCard
                  icon={Package}
                  label="Total Products"
                  value={inventoryKpi?.totalProducts ?? 0}
                  caption="In inventory"
                  colorScheme="info"
                />
                <StatCard
                  icon={CalendarClock}
                  label="Expiring Soon"
                  value={inventoryKpi?.expiring0To30DaysBatches ?? 0}
                  caption="Batches, next 30 days"
                  colorScheme="warning"
                />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminDashboard;
