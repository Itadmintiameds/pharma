'use client';

import { useEffect } from 'react';

import { getUserById } from '@/services/UserManagementService';
import { getUserOrganization } from '@/services/SetupBusinessService';
import { getWarehousesByOrganizationId } from '@/services/SetupWarehouseService';

import { useWarehouseStore } from '@/store/warehouseStore';
import { UserWarehouse } from '@/types/UserData';

/**
 * Loads the warehouses the signed-in user can operate into {@link useWarehouseStore}.
 *
 * For a Warehouse Manager (or any user mapped to warehouses) this is the set off
 * their own record: there is no "my warehouses" endpoint, so the mapping is read
 * from `GET /user/{id}`.
 *
 * A Super Admin is mapped to no warehouses but may step into any of them, so for
 * that role the whole organization's warehouses are loaded instead
 * (`GET /warehouse/organization/{orgId}`). With decentralized inventory there
 * are none and the list is simply empty — the navbar toggle is hidden there too.
 *
 * Safe to call before a warehouse is selected: none of these lookups are scoped
 * to a location, so they do not need the `X-Warehouse-Id` header this call
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

    const normalizeRole = (role?: string) =>
      (role || '').toLowerCase().replace(/[^a-z]/g, '');

    const loadWarehouses = async () => {

      try {

        setLoading(true);

        const userRes = await fetch('/api/user-info');
        if (!userRes.ok) {
          return;
        }

        const { userId, role } = await userRes.json();
        if (!userId) {
          return;
        }

        // Super Admin: load every warehouse in the organization so they can
        // switch into any of them. Falls back to the user-record path on error.
        if (normalizeRole(role) === 'superadmin') {
          const org = await getUserOrganization();
          if (org?.organizationId) {
            const orgWarehouses = await getWarehousesByOrganizationId(
              org.organizationId
            );
            const mapped: UserWarehouse[] = orgWarehouses
              .filter((w) => !!w.warehouseId)
              .map((w) => ({
                warehouseId: w.warehouseId as string,
                warehouseCode: w.warehouseCode,
                warehouseName: w.warehouseName,
              }));
            setWarehouses(mapped);
            return;
          }
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
