"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  addReportFavourite,
  getReportFavourites,
  removeReportFavourite,
} from "@/services/ReportPreferenceService";

/**
 * The user's favourite reports (route segments), oldest first, stored on the
 * backend as a per-user preference.
 *
 * Toggling updates the screen immediately and then calls the API; if the
 * call fails, that one change is undone and an error toast is shown.
 */
export function useReportFavourites() {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Keys with a request in flight, so a rapid second click on the same heart
  // waits for the first request rather than racing it.
  const pending = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    getReportFavourites()
      .then((loaded) => {
        // Favourites toggled while the initial load was in flight are kept.
        if (!cancelled) setKeys((current) => [...new Set([...loaded, ...current])]);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load favourite reports.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const favouriteSet = useMemo(() => new Set(keys), [keys]);

  const isFavourite = useCallback((key: string) => favouriteSet.has(key), [favouriteSet]);

  const toggleFavourite = useCallback(
    async (key: string) => {
      if (pending.current.has(key)) return;
      pending.current.add(key);

      const adding = !favouriteSet.has(key);
      const apply = (add: boolean) =>
        setKeys((current) =>
          add
            ? current.includes(key) ? current : [...current, key]
            : current.filter((k) => k !== key)
        );

      apply(adding);
      try {
        await (adding ? addReportFavourite(key) : removeReportFavourite(key));
      } catch (error) {
        apply(!adding);
        toast.error(
          error instanceof Error ? error.message : "Couldn't update favourites. Please try again."
        );
      } finally {
        pending.current.delete(key);
      }
    },
    [favouriteSet]
  );

  return { favouriteKeys: keys, isFavourite, toggleFavourite, loading };
}
