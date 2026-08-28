"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardMain from '../dashboardComponents/DashboardMain';
import AddBusiness from './components/AddBusiness';
import { useModulePermissions } from '@/hooks/useModulePermissions';

/**
 * The registration form is reached by `?view=add` rather than by local state, so
 * "Add Location" can open it from the dashboard list — a plain push to this
 * route re-rendered the same list — and so the browser's Back button leaves the
 * form instead of the whole module.
 */
const SetupBusinessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Registering a business is CREATE. Without it the dashboard still lists what
  // exists (VIEW), it just offers no way to add another.
  const { canCreate } = useModulePermissions('SET_UP_BUSINESS');

  if (searchParams.get('view') === 'add' && canCreate) {
    return <AddBusiness />;
  }

  return (
    <DashboardMain
      onCreateBusinessSetup={
        canCreate
          ? () => router.push('/dashboard/setupBusiness?view=add')
          : undefined
      }
    />
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <SetupBusinessContent />
  </Suspense>
);

export default Page;
