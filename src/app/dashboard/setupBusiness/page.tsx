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
  // Registering a business is CREATE; amending an existing draft/correction is
  // EDIT. Without either the dashboard still lists what exists (VIEW).
  const { canCreate, canEdit } = useModulePermissions('SET_UP_BUSINESS');

  // Editing carries a `reqId` (from the details modal's Edit button) so the form
  // can fetch that registration and autofill it. It has no `view=add`, so it
  // must be matched here or the page falls back to the dashboard list.
  if (searchParams.get('reqId') && canEdit) {
    return <AddBusiness />;
  }

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
