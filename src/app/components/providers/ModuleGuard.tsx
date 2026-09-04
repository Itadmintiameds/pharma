"use client";

/**
 * The half of route protection middleware cannot do.
 *
 * Middleware turns away a module the token does not grant. Whether a module
 * suits the organization at all — Warehouse Distribution without centralized
 * inventory, Purchase for a store role in a centrally-purchased org — depends on
 * `centralizedInventory`, which is not in the JWT and cannot be fetched per
 * navigation. So that rule is applied here, once the organization has loaded.
 *
 * A page whose module depends on that flag is held blank until the lookup
 * settles, so protected content never flashes before the redirect. Modules that
 * do not depend on it render straight away rather than waiting on a request
 * whose answer cannot change their outcome.
 */

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { dependsOnOrganization } from "@/access/accessControl";
import { useAccess } from "./AccessProvider";

export default function ModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { routeFor, availableModules, organizationLoaded } = useAccess();

  const route = routeFor(pathname);
  const awaitingOrganization =
    !!route && dependsOnOrganization(route.moduleKey) && !organizationLoaded;
  const blocked =
    !!route && !awaitingOrganization && !availableModules.has(route.moduleKey);

  useEffect(() => {
    if (!blocked || !route) return;
    router.replace(`/dashboard?denied=${route.moduleKey}`);
  }, [blocked, route, router]);

  // Nothing of a module the organization rules out is rendered, not even for the
  // frame before the redirect lands.
  if (blocked || awaitingOrganization) return null;

  return <>{children}</>;
}
