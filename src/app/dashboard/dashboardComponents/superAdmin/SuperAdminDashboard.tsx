"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, MapPin, Package } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/app/components/common/ChartCard";
import StatCard from "@/app/components/common/StatCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getAllBillings } from "@/services/BillingService";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { getUserPharmacyKPIs } from "@/services/SetupBusinessService";
import { getBatchExpiryKpi } from "@/services/InventoryService";
import { BatchExpiryKpi } from "@/types/ProductData";
import {
  CustomerTypeSlice,
  DailySeriesPoint,
  PaymentStatusSlice,
  getPatientVisitBreakdown,
  getPaymentStatusBreakdown,
  getPurchaseSpendByDay,
  getRevenueByDay,
} from "./aggregations";

const currency = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : String(value ?? "");

// A muted, low-saturation triad reads calmer/more premium in a thin ring than
// the raw success/danger/warning tokens used for StatCard icon fills do.
const PAYMENT_STATUS_COLOR: Record<PaymentStatusSlice["status"], string> = {
  PAID: "#4C9A78",
  PARTIAL: "#D6A24C",
  UNPAID: "#C97A6D",
};

// A deep teal, distinct from the purple used for revenue/patient visits and
// the green/gold/terracotta used for payment status.
const PURCHASE_SPEND_COLOR = "#2F8F84";

// Alternates between the app's primary and secondary purple ramps (globals.css),
// staying in their lighter-middle range (300-600) rather than the dark 700+
// shades — mixing ramps keeps every slice distinguishable while staying in the
// same soft purple family. Most-saturated first so the busiest slice still
// reads boldest and the ring fades out toward pale lilac.
const PURPLE_SHADES = [
  "#9659FD", // secondary-600
  "#B550FA", // primary-600
  "#9F75FC", // secondary-500
  "#C571FF", // primary-500
  "#B08DFC", // secondary-400
  "#D290FF", // primary-400
  "#C4AAFD", // secondary-300
  "#DEAFFF", // primary-300
];

interface LegendEntry {
  value: string;
  color: string;
}

/** Small, evenly-spaced legend — recharts' default is cramped here. */
const DoughnutLegend = ({ payload }: { payload?: LegendEntry[] }) => (
  <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-3">
    {payload?.map((entry) => (
      <div key={entry.value} className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-p2 font-medium tracking-wide text-pneutral-500">
          {entry.value}
        </span>
      </div>
    ))}
  </div>
);

const SuperAdminDashboard = () => {
  const { user } = useCurrentUser();

  const [revenueSeries, setRevenueSeries] = useState<DailySeriesPoint[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentStatusSlice[]>([]);
  const [patientVisits, setPatientVisits] = useState<CustomerTypeSlice[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

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

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAllBillings()
      .then((bills) => {
        if (cancelled) return;
        setRevenueSeries(getRevenueByDay(bills));
        setPaymentBreakdown(getPaymentStatusBreakdown(bills));
        setPatientVisits(getPatientVisitBreakdown(bills));
      })
      .catch((err) => console.error("Failed to load billing data:", err))
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
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
      <section className="flex flex-col gap-3">
        <h2 className="text-label-l5 font-medium text-pneutral-900">Sales Overview</h2>
        {salesLoading ? (
          <p className="text-p3 text-pneutral-500">Loading sales data…</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            <div className="min-w-77 flex-1">
              <ChartCard title="Daily Revenue" subtitle="Last 30 days">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-secondary-600)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-secondary-600)" stopOpacity={0} />
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
                      labelStyle={{ color: "var(--color-pneutral-500)", fontWeight: 500 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-pneutral-100)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-secondary-600)"
                      strokeWidth={2.5}
                      fill="url(#revenueFill)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-base-white)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="min-w-77 flex-1">
              <ChartCard title="Payment Status" subtitle="All bills">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={72}
                      outerRadius={100}
                      paddingAngle={4}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {paymentBreakdown.map((slice) => (
                        <Cell key={slice.status} fill={PAYMENT_STATUS_COLOR[slice.status]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-pneutral-100)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Legend content={<DoughnutLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="min-w-77 flex-1">
              <ChartCard title="Patient Visits" subtitle="By visit type">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={patientVisits}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={72}
                      outerRadius={100}
                      paddingAngle={4}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {patientVisits.map((slice, index) => (
                        <Cell
                          key={slice.customerType}
                          fill={PURPLE_SHADES[index % PURPLE_SHADES.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-pneutral-100)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 12,
                      }}
                    />
                    <Legend content={<DoughnutLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}
      </section>

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
