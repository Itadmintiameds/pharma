"use client";

/**
 * Carries who the user is and what they may do, for the whole dashboard tree.
 *
 * The session half (role + permissions) is decoded from the JWT by the server
 * layout and handed in as props, so the very first paint already knows the
 * answer — no fetch, no loading state, nothing to flash. It is deliberately not
 * persisted anywhere: the token is the source of truth, and a cached copy would
 * shadow the fresher grants that arrive with a refreshed token.
 *
 * The organization half (centralizedInventory) is not in the token, so it is
 * fetched once here. Until it lands, `centralizedInventory` stays null and the
 * rules withhold every module that depends on it.
 */

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  actionsFor,
  availableModuleKeys,
  buildPermissionIndex,
  can,
  isModuleAvailable,
  isWarehouseManagerRole,
  MODULE_ROUTES,
  ModuleKey,
  ModuleRoute,
  OrganizationShape,
  PermissionAction,
  PermissionIndex,
  routeForPath,
} from "@/access/accessControl";
import { getUserOrganization } from "@/services/SetupBusinessService";

export interface AccessSession {
  userId: string | null;
  roleName: string | null;
  permissions: string[];
  /**
   * Whether the token described permissions at all. False for a token issued
   * before the backend added the claim, which is gated by organization shape
   * alone rather than losing every module.
   */
  permissionsDescribed: boolean;
}

interface AccessContextValue extends AccessSession {
  /** Re-exported from the session so gating helpers can honour the fail-open. */
  index: PermissionIndex;
  organization: OrganizationShape;
  /** False until the organization lookup has settled, successfully or not. */
  organizationLoaded: boolean;
  isWarehouseManager: boolean;
  can: (
    moduleKey: string,
    featureKey: string,
    action: PermissionAction
  ) => boolean;
  actionsFor: (moduleKey: string, featureKey: string) => Set<string>;
  /** Organization shape AND a VIEW grant — what the sidebar and guards ask. */
  isModuleAvailable: (route: ModuleRoute) => boolean;
  availableModules: Set<ModuleKey>;
  /** The module a path belongs to, or null for an ungated route. */
  routeFor: (pathname: string) => ModuleRoute | null;
  moduleRoutes: ModuleRoute[];
}

const AccessContext = createContext<AccessContextValue | null>(null);

export default function AccessProvider({
  session,
  children,
}: {
  session: AccessSession;
  children: ReactNode;
}) {
  const [organization, setOrganization] = useState<OrganizationShape>({
    centralizedInventory: null,
    organizationType: null,
  });
  const [organizationLoaded, setOrganizationLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    getUserOrganization()
      .then((org) => {
        if (!active) return;
        setOrganization({
          centralizedInventory:
            typeof org?.centralizedInventory === "boolean"
              ? org.centralizedInventory
              : null,
          organizationType: org?.organizationType ?? null,
        });
      })
      .catch((error) => {
        console.error("Failed to load the organization for access rules", error);
      })
      .finally(() => {
        if (active) setOrganizationLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AccessContextValue>(() => {
    const index = buildPermissionIndex(session.permissions);
    const availableModules = availableModuleKeys(session.roleName, organization);

    return {
      ...session,
      index,
      organization,
      organizationLoaded,
      isWarehouseManager: isWarehouseManagerRole(session.roleName),
      can: (moduleKey, featureKey, action) =>
        can(index, moduleKey, featureKey, action),
      actionsFor: (moduleKey, featureKey) =>
        actionsFor(index, moduleKey, featureKey),
      isModuleAvailable: (route) =>
        isModuleAvailable(
          route,
          index,
          session.roleName,
          organization,
          session.permissionsDescribed
        ),
      availableModules,
      routeFor: routeForPath,
      moduleRoutes: MODULE_ROUTES,
    };
  }, [session, organization, organizationLoaded]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export const useAccess = (): AccessContextValue => {
  const value = useContext(AccessContext);
  if (!value) {
    throw new Error("useAccess must be used inside the dashboard AccessProvider");
  }
  return value;
};
