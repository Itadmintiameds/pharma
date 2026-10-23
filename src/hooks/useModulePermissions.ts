"use client";

/**
 * The actions the signed-in user may take inside one module.
 *
 * Call sites read like the UI they gate — `const { canCreate, canExport } =
 * useModulePermissions("PURCHASE")` — so a screen never has to know the
 * "MODULE/FEATURE/ACTION" string format or which feature key its module uses.
 *
 * A token that predates the permissions claim grants everything here: the
 * module has already been vetted by the sidebar and the route guards, and
 * hiding every button inside it would leave an unusable screen. A Super Admin is
 * likewise unrestricted inside any module it can reach.
 */

import { useMemo } from "react";
import {
  bypassesPermissionChecks,
  grantModuleOf,
  MODULE_ROUTES,
  ModuleKey,
} from "@/access/accessControl";
import { useAccess } from "@/app/components/providers/AccessProvider";

export interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canPrint: boolean;
  canExport: boolean;
  canActivateDeactivate: boolean;
}

export const useModulePermissions = (moduleKey: ModuleKey): ModulePermissions => {
  const { can, permissionsDescribed, roleName } = useAccess();

  return useMemo(() => {
    if (!permissionsDescribed || bypassesPermissionChecks(roleName)) {
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canPrint: true,
        canExport: true,
        canActivateDeactivate: true,
      };
    }

    const route = MODULE_ROUTES.find((r) => r.moduleKey === moduleKey);
    const grantModule = route ? grantModuleOf(route) : moduleKey;
    const featureKey = route?.featureKey ?? moduleKey;

    return {
      canView: can(grantModule, featureKey, "VIEW"),
      canCreate: can(grantModule, featureKey, "CREATE"),
      canEdit: can(grantModule, featureKey, "EDIT"),
      canPrint: can(grantModule, featureKey, "PRINT"),
      canExport: can(grantModule, featureKey, "EXPORT"),
      canActivateDeactivate: can(grantModule, featureKey, "ACTIVATE_DEACTIVATE"),
    };
  }, [can, moduleKey, permissionsDescribed, roleName]);
};
