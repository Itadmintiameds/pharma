"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

/**
 * The role / organization facts a page needs to decide whether the current user
 * may access it. Derived from /organization/getUserOrganization plus the user's
 * role, using the same normalization the sidebar applies.
 */
export interface OrgInventoryAccess {
  /** Warehouse Manager role — the only role tied to warehouse operations. */
  isWarehouseManager: boolean;
  /** Multiple-store organization running a single, centralized inventory. */
  isCentralizedMultiOrg: boolean;
  /** Organization loaded and inventory is decentralized (per-store). */
  isDecentralizedInventory: boolean;
}

interface GuardConfig {
  /** Return true to block the current user from this page. */
  deny: (access: OrgInventoryAccess) => boolean;
  /** Toast shown when access is denied. */
  message: string;
  /** Where to send a blocked user. Defaults to the dashboard home. */
  redirectTo?: string;
}

/**
 * Client-side route guard keyed off the user's role and their organization's
 * inventory settings. Keeps `checking` true until the lookup resolves so a page
 * can render nothing before a redirect fires (no flash of protected content).
 * Fails open: a lookup error never hard-blocks an otherwise-permitted user.
 */
export function useOrgInventoryGuard(config: GuardConfig): { checking: boolean } {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Hold the latest config without making it an effect dependency, so passing an
  // inline `deny` / `message` on every render doesn't re-run the lookup.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const userRes = await fetch("/api/user-info");
        if (!userRes.ok) {
          if (!cancelled) setChecking(false);
          return;
        }
        const { userId } = await userRes.json();
        if (!userId) {
          if (!cancelled) setChecking(false);
          return;
        }

        const [{ getUserOrganization }, { getUserById }] = await Promise.all([
          import("@/services/SetupBusinessService"),
          import("@/services/UserManagementService"),
        ]);

        const [userDetails, organization] = await Promise.all([
          getUserById(userId).catch(() => null),
          getUserOrganization().catch(() => null),
        ]);

        const normalize = (v?: string) =>
          (v || "").toLowerCase().replace(/[^a-z]/g, "");

        const access: OrgInventoryAccess = {
          isWarehouseManager:
            normalize(userDetails?.pharmaRolesDto?.roleName) === "warehousemanager",
          isCentralizedMultiOrg:
            normalize(organization?.organizationType) === "multiple" &&
            organization?.centralizedInventory === true,
          // Only treat as decentralized once an organization actually loaded, so a
          // failed/missing lookup doesn't wrongly block these pages.
          isDecentralizedInventory:
            !!organization && organization.centralizedInventory === false,
        };

        if (configRef.current.deny(access)) {
          toast.error(configRef.current.message);
          router.replace(configRef.current.redirectTo ?? "/dashboard");
          return; // Leave the gate up so nothing renders before the redirect.
        }

        if (!cancelled) setChecking(false);
      } catch (err) {
        console.error("Failed to verify inventory access:", err);
        if (!cancelled) setChecking(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { checking };
}
