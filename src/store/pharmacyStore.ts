'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Pharmacy {
  pharmacyId: string;
  pharmacyName: string;
}

interface PharmacyStore {
  pharmacies: Pharmacy[];

  selectedPharmacy: Pharmacy | null;

  loading: boolean;

  setLoading: (loading: boolean) => void;

  setPharmacies: (pharmacies: Pharmacy[]) => void;

  selectPharmacy: (pharmacy: Pharmacy) => void;

  clearPharmacy: () => void;
}

export const usePharmacyStore = create<PharmacyStore>()(
  persist(
    (set) => ({
      pharmacies: [],

      selectedPharmacy: null,

      loading: false,

      setLoading: (loading) =>
        set({
          loading,
        }),

      setPharmacies: (pharmacies) =>
        set((state) => ({
          pharmacies,

          // If user has already selected one previously,
          // keep it after refresh.
          selectedPharmacy:
            state.selectedPharmacy &&
            pharmacies.find(
              (p) =>
                p.pharmacyId ===
                state.selectedPharmacy?.pharmacyId
            )
              ? state.selectedPharmacy
              : pharmacies.length > 0
              ? pharmacies[0]
              : null,
        })),

      selectPharmacy: (pharmacy) =>
        set({
          selectedPharmacy: pharmacy,
        }),

      clearPharmacy: () =>
        set({
          pharmacies: [],
          selectedPharmacy: null,
        }),
    }),
    {
      name: 'pharmacy-storage',
    }
  )
);