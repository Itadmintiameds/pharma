'use client';

import { useEffect, useState } from 'react';

/**
 * Whether this account has any pharmacy or warehouse associated with it yet —
 * the same check the sidebar uses to lock nav items, pulled out so a route
 * guard can use it too without a second, divergent fetch.
 */
export default function useBusinessRegistration() {
  const [hasApprovedPharmacy, setHasApprovedPharmacy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const checkRegistrationStatus = async () => {
      try {
        const userRes = await fetch('/api/user-info');
        if (!userRes.ok) return;
        const { userId } = await userRes.json();
        if (!userId) return;

        const [{ getUserPharmacyKPIs }, { getUserById }] = await Promise.all([
          import('@/services/SetupBusinessService'),
          import('@/services/UserManagementService'),
        ]);

        const [kpiResponse, userDetails] = await Promise.all([
          getUserPharmacyKPIs(String(userId)).catch(() => null),
          getUserById(userId).catch(() => null),
        ]);

        // Unlock if this account registered an approved (ACCEPTED) pharmacy itself,
        // OR a Super Admin already assigned it to an existing (already-approved) pharmacy
        // via User Management — that user never goes through Setup Business/compliance.
        // A Warehouse Manager is assigned a warehouse instead of a pharmacy, so an
        // assigned warehouse unlocks the modules just like an assigned pharmacy does.
        const hasOwnApprovedPharmacy = (kpiResponse?.data?.approved ?? 0) > 0;
        const hasAssignedPharmacy = (userDetails?.pharmacies?.length ?? 0) > 0;
        const hasAssignedWarehouse = (userDetails?.warehouses?.length ?? 0) > 0;

        if (active && (hasOwnApprovedPharmacy || hasAssignedPharmacy || hasAssignedWarehouse)) {
          setHasApprovedPharmacy(true);
        }
      } catch (err) {
        console.error('Failed to check business registration status:', err);
      } finally {
        if (active) setLoaded(true);
      }
    };

    checkRegistrationStatus();

    return () => {
      active = false;
    };
  }, []);

  return { hasApprovedPharmacy, loaded };
}
