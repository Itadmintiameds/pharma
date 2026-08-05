"use client";

import { useEffect, useState } from "react";
import { ProductMasterService } from "@/services/ProductMasterService";
import type { PurchaseSmallestUnit } from "@/types/ProductData";

/**
 * Category masters don't change within a session, and both the packaging and
 * batch forms need the same list — cache per category so the endpoint is hit
 * once instead of once per form.
 */
const cache = new Map<number, PurchaseSmallestUnit[]>();

/**
 * Valid purchase-unit / smallest-unit pairings for a product category.
 * One row per pairing, e.g. a Strip of Tablets or a Bottle of Syrup (ml).
 */
export const usePurchaseSmallestUnits = (categoryId?: number) => {
  const [units, setUnits] = useState<PurchaseSmallestUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!categoryId) {
      setUnits([]);
      return;
    }

    let active = true;

    const load = async () => {
      const cached = cache.get(categoryId);
      if (cached) {
        if (active) setUnits(cached);
        return;
      }

      setIsLoading(true);
      try {
        const res = await ProductMasterService.getPurchaseSmallestUnits(categoryId);
        const rows: PurchaseSmallestUnit[] = res.data ?? [];
        cache.set(categoryId, rows);
        if (active) setUnits(rows);
      } catch (error) {
        console.error("Error fetching purchase / smallest units:", error);
        if (active) setUnits([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [categoryId]);

  return { units, isLoading };
};
