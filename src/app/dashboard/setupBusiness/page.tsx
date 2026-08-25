"use client";

import React, { useState } from 'react';
import DashboardMain from '../dashboardComponents/DashboardMain';
import AddBusiness from './components/AddBusiness';

const Page = () => {
  const [showAddBusiness, setShowAddBusiness] = useState(false);

  if (showAddBusiness) {
    return <AddBusiness />;
  }

  return <DashboardMain onCreateBusinessSetup={() => setShowAddBusiness(true)} />;
};

export default Page;
