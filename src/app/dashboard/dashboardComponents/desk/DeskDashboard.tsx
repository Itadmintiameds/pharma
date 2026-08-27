"use client";

import React from "react";
import SalesOverviewSection from "../salesOverview/SalesOverviewSection";
import TodaysSnapshotSection from "../todaysSnapshot/TodaysSnapshotSection";
import StockAlertsSection from "../stockAlerts/StockAlertsSection";

/**
 * Desk gets the same SalesOverviewSection/TodaysSnapshotSection/
 * StockAlertsSection Admin uses — front-counter staff need the same billing
 * and stock picture, just without Admin's org-management scope.
 */
const DeskDashboard = () => {
  return (
    <div className="flex w-full flex-col gap-6">
      <SalesOverviewSection />
      <TodaysSnapshotSection />
      <StockAlertsSection />
    </div>
  );
};

export default DeskDashboard;
