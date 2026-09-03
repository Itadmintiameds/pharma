'use client';

import React from 'react';
import FeatureComingSoon from '@/app/components/common/FeatureComingSoon';
import SuperAdminDashboard from './dashboardComponents/superAdmin/SuperAdminDashboard';
import AdminDashboard from './dashboardComponents/admin/AdminDashboard';
import WarehouseManagerDashboard from './dashboardComponents/warehouseManager/WarehouseManagerDashboard';
import DeskDashboard from './dashboardComponents/desk/DeskDashboard';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Stands in until the role is known.
 *
 * Without it the page falls through to <FeatureComingSoon /> on the very first
 * render — role is "" until /api/user-info and the user record have both come
 * back — so a slow load showed "Feature Coming Soon" and then replaced it with
 * the real dashboard. Three cards' worth of grey, so the shell keeps the height
 * the dashboards below it will take.
 */
const DashboardLoading = () => (
  <div className="flex w-full flex-col gap-6" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading your dashboard…</span>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-48 w-full animate-pulse rounded-2xl border border-pneutral-100 bg-pneutral-50"
      />
    ))}
  </div>
);

const Page = () => {
  const { role, loading } = useCurrentUser();

  // Nothing can be decided from an empty role, so wait rather than guess.
  if (loading) {
    return <DashboardLoading />;
  }

  if (role === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'warehousemanager') {
    return <WarehouseManagerDashboard />;
  }

  if (role === 'deskrole') {
    return <DeskDashboard />;
  }
  return <DashboardLoading />
  //return <FeatureComingSoon />;
};

export default Page;
