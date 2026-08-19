'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { UserWarehouse } from '@/types/UserData';

/**
 * The warehouses the signed-in user is mapped to, and the one they are acting
 * as for the moment. The counterpart of {@link usePharmacyStore}: a Warehouse
 * Manager operates on a warehouse rather than a pharmacy, and since the mapping
 * became many-to-many they may hold several and need to pick one.
 *
 * The selection rides on every request as the `X-Warehouse-Id` header (see
 * `utils/api.ts`). The backend only lets it be omitted when the user is mapped
 * to exactly one warehouse — with more than one it rejects the request outright,
 * so a selection is not a nicety here.
 */
interface WarehouseStore {
  warehouses: UserWarehouse[];

  selectedWarehouse: UserWarehouse | null;

  loading: boolean;

  setLoading: (loading: boolean) => void;

  setWarehouses: (warehouses: UserWarehouse[]) => void;

  selectWarehouse: (warehouse: UserWarehouse) => void;

  clearWarehouse: () => void;
}

export const useWarehouseStore = create<WarehouseStore>()(
  persist(
    (set) => ({
      warehouses: [],

      selectedWarehouse: null,

      loading: false,

      setLoading: (loading) => set({ loading }),

      setWarehouses: (warehouses) =>
        set((state) => ({
          warehouses,

          // Keep an earlier choice across a refresh, as long as the user is
          // still mapped to it; otherwise fall back to the first.
          selectedWarehouse:
            state.selectedWarehouse &&
            warehouses.find(
              (w) => w.warehouseId === state.selectedWarehouse?.warehouseId
            )
              ? state.selectedWarehouse
              : warehouses.length > 0
              ? warehouses[0]
              : null,
        })),

      selectWarehouse: (warehouse) => set({ selectedWarehouse: warehouse }),

      clearWarehouse: () =>
        set({
          warehouses: [],
          selectedWarehouse: null,
        }),
    }),
    {
      name: 'warehouse-storage',
      // Session-scoped for the same reason as the pharmacy store: the selection
      // belongs to this login, not to the browser profile.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
