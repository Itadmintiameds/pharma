'use client';

import { useEffect } from 'react';

import { getUserPharmacies } from '@/services/PharmacyService';

import { usePharmacyStore } from '@/store/pharmacyStore';

export default function useInitializePharmacy() {

  const {
    pharmacies,
    setLoading,
    setPharmacies,
  } = usePharmacyStore();

  useEffect(() => {

    // Prevent unnecessary API calls
    if (pharmacies.length > 0) {
      return;
    }

    const loadPharmacies = async () => {

      try {

        setLoading(true);

        const data = await getUserPharmacies();

        setPharmacies(data);

      } catch (error) {

        console.error(
          "Unable to fetch pharmacies",
          error
        );

      } finally {

        setLoading(false);

      }
    };

    loadPharmacies();

  }, []);

}