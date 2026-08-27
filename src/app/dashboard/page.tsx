'use client';

import React from 'react';
import FeatureComingSoon from '@/app/components/common/FeatureComingSoon';
import SuperAdminDashboard from './dashboardComponents/superAdmin/SuperAdminDashboard';
import AdminDashboard from './dashboardComponents/admin/AdminDashboard';
import WarehouseManagerDashboard from './dashboardComponents/warehouseManager/WarehouseManagerDashboard';
import DeskDashboard from './dashboardComponents/desk/DeskDashboard';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const Page = () => {
  const { role } = useCurrentUser();

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

  return <FeatureComingSoon />;
};

export default Page;
