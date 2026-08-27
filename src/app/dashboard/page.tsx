'use client';

import React from 'react';
import FeatureComingSoon from '@/app/components/common/FeatureComingSoon';
import SuperAdminDashboard from './dashboardComponents/superAdmin/SuperAdminDashboard';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const Page = () => {
  const { role } = useCurrentUser();

  // Admin / Desk / Warehouse Manager dashboards are follow-up passes reusing
  // the same StatCard/ChartCard/useCurrentUser foundation built for this one.
  if (role === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  return <FeatureComingSoon />;
};

export default Page;
