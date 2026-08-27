"use client";

/**
 * A first-time user who registered but has no pharmacy, organization or
 * warehouse associated with them yet has nothing to see on the landing
 * dashboard or in Settings — so both stay locked until Setup Business is
 * done, and the user is sent there instead.
 *
 * Everything else (the sidebar, other modules) is left to the guards that
 * already own them; this only ever touches the two ungated paths.
 */

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UNGATED_PATHS } from "@/access/accessControl";
import useBusinessRegistration from "@/hooks/useBusinessRegistration";

export default function BusinessSetupGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasApprovedPharmacy, loaded } = useBusinessRegistration();

  const isLockedPath = UNGATED_PATHS.includes(pathname);
  const shouldRedirect = isLockedPath && loaded && !hasApprovedPharmacy;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/dashboard/setupBusiness");
    }
  }, [shouldRedirect, router]);

  // Hold the locked page blank while the check is in flight and once the
  // redirect is under way, so it never flashes before Setup Business lands.
  if (isLockedPath && (!loaded || shouldRedirect)) return null;

  return <>{children}</>;
}
