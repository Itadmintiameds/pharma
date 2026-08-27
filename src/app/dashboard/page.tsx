'use client';

import React from 'react';
import FeatureComingSoon from '@/app/components/common/FeatureComingSoon';
import SuperAdminDashboard from './dashboardComponents/superAdmin/SuperAdminDashboard';
import AdminDashboard from './dashboardComponents/admin/AdminDashboard';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const Page = () => {
  const { role } = useCurrentUser();

  // Desk / Warehouse Manager dashboards are follow-up passes reusing the same
  // StatCard/ChartCard/useCurrentUser foundation built for these two.
  if (role === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  return <FeatureComingSoon />;
};

export default Page;
