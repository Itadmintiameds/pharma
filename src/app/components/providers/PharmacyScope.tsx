"use client";

/**
 * Every dashboard screen loads its data in a `useEffect` that runs once on
 * mount, and the pharmacy it belongs to only ever rides along as the
 * `X-Pharmacy-Id` header the api client stamps on each request. So switching
 * pharmacy in the navbar changes what the next request would return without
 * anything asking for it — the screen keeps showing the previous pharmacy's
 * rows until the user navigates away and back.
 *
 * Keying the page subtree on the selected pharmacy remounts it on a switch,
 * which re-runs every one of those effects against the new header. One place
 * to do it, rather than a listener in each of the dozen or so pages.
 */

import { Fragment, ReactNode, useEffect, useRef } from "react";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { usePurchaseStore } from "@/store/usePurchaseStore";

export default function PharmacyScope({ children }: { children: ReactNode }) {
  const pharmacyId = usePharmacyStore(
    (state) => state.selectedPharmacy?.pharmacyId ?? ""
  );

  // Seeded with the first value so a fresh mount is not treated as a switch.
  const previousId = useRef(pharmacyId);

  useEffect(() => {
    if (previousId.current === pharmacyId) return;
    previousId.current = pharmacyId;

    // The purchase draft is persisted outside the page tree, so the remount
    // alone would leave a half-built invoice — supplier, lines and all —
    // pointing at the pharmacy it was started under.
    usePurchaseStore.getState().resetPurchase();
  }, [pharmacyId]);

  return <Fragment key={pharmacyId}>{children}</Fragment>;
}
