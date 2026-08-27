"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Receipt, Wallet } from "lucide-react";
import StatCard from "@/app/components/common/StatCard";
import { getAllBillings } from "@/services/BillingService";
import { TodaysSalesSnapshot, getTodaysSalesSnapshot } from "./aggregations";

const currency = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const EMPTY_SNAPSHOT: TodaysSalesSnapshot = {
  billsToday: 0,
  revenueToday: 0,
  pendingPayments: 0,
};

/**
 * Bills today / revenue today / pending payments, shared across role
 * dashboards — fetches its own data so any dashboard can just drop it in.
 */
const TodaysSnapshotSection = () => {
  const [snapshot, setSnapshot] = useState<TodaysSalesSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getAllBillings()
      .then((bills) => {
        if (!cancelled) setSnapshot(getTodaysSalesSnapshot(bills));
      })
      .catch((err) => console.error("Failed to load billing data:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label-l5 font-medium text-pneutral-900">Today&apos;s Snapshot</h2>
      {loading ? (
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
  );
};

export default TodaysSnapshotSection;
