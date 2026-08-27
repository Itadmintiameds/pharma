"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "@/app/components/common/ChartCard";
import { getAllPurchases } from "@/services/PurchaseServiceNew";
import { DailySeriesPoint } from "../dailySeries";
import { getPurchaseSpendByDay } from "./aggregations";

const currency = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : String(value ?? "");

// A deep teal, distinct from the purple used for revenue/patient visits and
// the green/gold/terracotta used for payment status.
const PURCHASE_SPEND_COLOR = "#2F8F84";

/**
 * The daily purchase-spend chart, shared across role dashboards — fetches its
 * own data so any dashboard can just drop it in.
 */
const PurchaseOverviewSection = () => {
  const [purchaseSeries, setPurchaseSeries] = useState<DailySeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getAllPurchases()
      .then((purchases) => {
        if (!cancelled) setPurchaseSeries(getPurchaseSpendByDay(purchases));
      })
      .catch((err) => console.error("Failed to load purchase data:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-label-l5 font-medium text-pneutral-900">Purchase Overview</h2>
      {loading ? (
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
  );
};

export default PurchaseOverviewSection;
