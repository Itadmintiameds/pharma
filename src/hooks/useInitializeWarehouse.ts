'use client';

import { useEffect } from 'react';

import { getUserById } from '@/services/UserManagementService';

import { useWarehouseStore } from '@/store/warehouseStore';

/**
 * Loads the signed-in user's warehouses into {@link useWarehouseStore}.
 *
 * There is no "my warehouses" endpoint — `/warehouse/list` returns every
 * warehouse in the organization, which is not the same set — so this reads the
 * mapping off the user's own record. Users who manage none simply end up with
 * an empty list and no selection, which is what non-warehouse roles want.
 *
 * Safe to call before a warehouse is selected: `GET /user/{id}` is not scoped
 * to a location, so it does not need the `X-Warehouse-Id` header this call
 * exists to populate.
 */
export default function useInitializeWarehouse() {

  const {
    warehouses,
    setLoading,
    setWarehouses,
  } = useWarehouseStore();

  useEffect(() => {

    // Prevent unnecessary API calls
    if (warehouses.length > 0) {
      return;
    }

    const loadWarehouses = async () => {

      try {

        setLoading(true);

        const userRes = await fetch('/api/user-info');
        if (!userRes.ok) {
          return;
        }

        const { userId } = await userRes.json();
        if (!userId) {
          return;
        }

        const user = await getUserById(userId);

        setWarehouses(user?.warehouses ?? []);

      } catch {

        // Falls back to an empty warehouse list — the same outcome as a user
        // who genuinely manages none, so this is not worth surfacing.

      } finally {

        setLoading(false);

      }
    };

    loadWarehouses();

  }, []);

}
