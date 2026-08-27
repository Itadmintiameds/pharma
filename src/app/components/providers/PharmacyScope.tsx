"use client";

/**
 * Every dashboard screen loads its data in a `useEffect` that runs once on
 * mount, and the location it belongs to only ever rides along as the
 * `X-Pharmacy-Id` / `X-Warehouse-Id` header the api client stamps on each
 * request. So switching location in the navbar changes what the next request
 * would return without anything asking for it — the screen keeps showing the
 * previous location's rows until the user navigates away and back.
 *
 * Keying the page subtree on the selected location remounts it on a switch,
 * which re-runs every one of those effects against the new header. One place
 * to do it, rather than a listener in each of the dozen or so pages.
 *
 * Both ids are in the key: a Warehouse Manager switches warehouse and everyone
 * else switches pharmacy, and only one of the two is ever set for a given user.
 */

import { Fragment, ReactNode, useEffect, useRef } from "react";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { usePurchaseStore } from "@/store/usePurchaseStore";

export default function PharmacyScope({ children }: { children: ReactNode }) {
  const pharmacyId = usePharmacyStore(
    (state) => state.selectedPharmacy?.pharmacyId ?? ""
  );
  const warehouseId = useWarehouseStore(
    (state) => state.selectedWarehouse?.warehouseId ?? ""
  );
  // A Super Admin toggling between pharmacy and warehouse changes which header
  // the next request carries without changing either id, so the mode is part of
  // the key too — flipping it remounts the tree and re-runs every page's fetch.
  const actingAsWarehouse = useWarehouseStore(
    (state) => state.actingAsWarehouse
  );

  const locationId = `${pharmacyId}|${warehouseId}|${actingAsWarehouse}`;

  // Seeded with the first value so a fresh mount is not treated as a switch.
  const previousId = useRef(locationId);

  useEffect(() => {
    if (previousId.current === locationId) return;
    previousId.current = locationId;

    // The purchase draft is persisted outside the page tree, so the remount
    // alone would leave a half-built invoice — supplier, lines and all —
    // pointing at the location it was started under.
    usePurchaseStore.getState().resetPurchase();
  }, [locationId]);

  return <Fragment key={locationId}>{children}</Fragment>;
}
