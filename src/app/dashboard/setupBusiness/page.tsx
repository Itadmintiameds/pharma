"use client";

import React, { useState } from 'react';
import DashboardMain from '../dashboardComponents/DashboardMain';
import AddBusiness from './components/AddBusiness';
import { useModulePermissions } from '@/hooks/useModulePermissions';

const Page = () => {
  // Registering a business is CREATE. Without it the dashboard still lists what
  // exists (VIEW), it just offers no way to add another.
  const { canCreate } = useModulePermissions('SET_UP_BUSINESS');
  const [showAddBusiness, setShowAddBusiness] = useState(false);

  if (showAddBusiness && canCreate) {
    return <AddBusiness />;
  }

  return (
    <DashboardMain
      onCreateBusinessSetup={
        canCreate ? () => setShowAddBusiness(true) : undefined
      }
    />
  );
};

export default Page;
