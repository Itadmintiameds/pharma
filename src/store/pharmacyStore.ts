'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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

// Pre-fix builds persisted this store to localStorage under the same key, so
// that copy survives indefinitely on machines that logged in before the
// switch to sessionStorage — nothing else will ever clear it, so drop it once
// here.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('pharmacy-storage');
  } catch {
    // Storage can be unavailable (e.g. disabled), never worth failing app init over.
  }
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
      // Session-scoped: the selected pharmacy belongs to this login session,
      // so it shouldn't survive the browser being closed the way localStorage would.
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);