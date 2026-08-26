/**
 * The single place that maps what the UI shows onto what the backend grants.
 *
 * A permission arrives as "MODULE/FEATURE/ACTION" (e.g. "PURCHASE/PURCHASE/VIEW").
 * Module and feature happen to be the same string for every module today, but
 * they are kept apart so a module that later grows real features only changes
 * MODULE_ROUTES here, not the call sites.
 *
 * Everything in this file is pure and runtime-agnostic: middleware (Edge),
 * route handlers (Node) and components all import the same rules.
 */

export type PermissionAction =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "PRINT"
  | "EXPORT"
  | "ACTIVATE_DEACTIVATE";

export type ModuleKey =
  | "PURCHASE"
  | "SALES"
  | "WAREHOUSE_DISTRIBUTION"
  | "WAREHOUSE_RECEIPT"
  | "INTER_STORE_TRANSFER"
  | "PRODUCTS"
  | "USER_MANAGEMENT"
  | "SET_UP_BUSINESS";

export interface ModuleRoute {
  moduleKey: ModuleKey;
  /** Same as moduleKey while a module has no sub-features of its own. */
  featureKey: string;
  path: string;
  label: string;
}

export const MODULE_ROUTES: ModuleRoute[] = [
  {
    moduleKey: "PURCHASE",
    featureKey: "PURCHASE",
    path: "/dashboard/purchase",
    label: "Purchase",
  },
  {
    moduleKey: "SALES",
    featureKey: "SALES",
    path: "/dashboard/salesBilling",
    label: "Sales / Billing",
  },
  {
    moduleKey: "WAREHOUSE_DISTRIBUTION",
    featureKey: "WAREHOUSE_DISTRIBUTION",
    path: "/dashboard/warehouseDistribution",
    label: "Warehouse Distribution",
  },
  {
    moduleKey: "WAREHOUSE_RECEIPT",
    featureKey: "WAREHOUSE_RECEIPT",
    path: "/dashboard/warehouseReceipt",
    label: "Warehouse Receipt",
  },
  {
    moduleKey: "INTER_STORE_TRANSFER",
    featureKey: "INTER_STORE_TRANSFER",
    path: "/dashboard/interStoreTransfer",
    label: "Inter Store Transfer",
  },
  {
    moduleKey: "PRODUCTS",
    featureKey: "PRODUCTS",
    path: "/dashboard/products",
    label: "Products",
  },
  {
    moduleKey: "USER_MANAGEMENT",
    featureKey: "USER_MANAGEMENT",
    path: "/dashboard/userManagement",
    label: "User Management",
  },
  {
    moduleKey: "SET_UP_BUSINESS",
    featureKey: "SET_UP_BUSINESS",
    path: "/dashboard/setupBusiness",
    label: "Setup Business",
  },
];

/**
 * Routes that carry no module of their own and are never permission-gated:
 * the landing dashboard and Settings. (Stock Management, Suppliers and Reports
 * have no backend module either, but stay behind the existing
 * business-registration lock rather than being opened here.)
 */
export const UNGATED_PATHS = ["/dashboard", "/dashboard/settings"];

/** Permissions indexed as "MODULE/FEATURE" -> the actions granted on it. */
export type PermissionIndex = Map<string, Set<string>>;

const featureKeyOf = (moduleKey: string, featureKey: string) =>
  `${moduleKey}/${featureKey}`;

export const buildPermissionIndex = (permissions: string[]): PermissionIndex => {
  const index: PermissionIndex = new Map();

  permissions.forEach((entry) => {
    const [moduleKey, featureKey, action] = entry.split("/");
    if (!moduleKey || !featureKey || !action) return;

    const key = featureKeyOf(moduleKey, featureKey);
    const actions = index.get(key) ?? new Set<string>();
    actions.add(action);
    index.set(key, actions);
  });

  return index;
};

export const can = (
  index: PermissionIndex,
  moduleKey: string,
  featureKey: string,
  action: PermissionAction
): boolean => !!index.get(featureKeyOf(moduleKey, featureKey))?.has(action);

/** Every action granted on one feature — for gating a row of controls at once. */
export const actionsFor = (
  index: PermissionIndex,
  moduleKey: string,
  featureKey: string
): Set<string> => index.get(featureKeyOf(moduleKey, featureKey)) ?? new Set();

/**
 * VIEW is the gate for a whole module: the matrix couples the other actions to
 * it (checking CREATE checks VIEW, clearing VIEW clears the rest), so a module
 * without VIEW is one the user should not reach at all.
 */
export const canViewModule = (
  index: PermissionIndex,
  route: ModuleRoute
): boolean => can(index, route.moduleKey, route.featureKey, "VIEW");

/** Longest-prefix match, so nested routes resolve to their module. */
export const routeForPath = (pathname: string): ModuleRoute | null => {
  const matches = MODULE_ROUTES.filter(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`)
  );
  if (matches.length === 0) return null;

  return matches.reduce((longest, route) =>
    route.path.length > longest.path.length ? route : longest
  );
};

const normalizeRole = (roleName?: string | null): string =>
  (roleName || "").toLowerCase().replace(/[^a-z]/g, "");

export const isWarehouseManagerRole = (roleName?: string | null): boolean =>
  normalizeRole(roleName) === "warehousemanager";

export const isSuperAdminRole = (roleName?: string | null): boolean =>
  normalizeRole(roleName) === "superadmin";

/**
 * A Super Admin oversees the whole organization, so the per-action grants are
 * not applied to that role — it may do anything inside a module it can reach.
 * Which modules it can reach is still decided by `availableModuleKeys`.
 */
export const bypassesPermissionChecks = (roleName?: string | null): boolean =>
  isSuperAdminRole(roleName);

export interface OrganizationShape {
  /**
   * null while the organization has not loaded (or failed to). Warehouse
   * modules and Purchase both hinge on this flag, so they are withheld until
   * it is known — briefly missing beats briefly wrong.
   */
  centralizedInventory: boolean | null;
  organizationType?: string | null;
}

/**
 * Which modules this organization and role can have at all, before the token's
 * grants are consulted. This is the "shape" half of access:
 *
 *  - centralized inventory: stock moves warehouse -> store, so purchasing is
 *    done at the warehouse (Warehouse Manager only) and the store side works
 *    through Warehouse Receipt / Inter Store Transfer.
 *  - decentralized: each store purchases for itself and none of the three
 *    warehouse modules apply to anyone.
 *
 * Effective access is this set intersected with the token's permissions, so a
 * grant the organization's shape rules out is still withheld.
 */
export const availableModuleKeys = (
  roleName: string | null | undefined,
  organization: OrganizationShape
): Set<ModuleKey> => {
  const centralized = organization.centralizedInventory;
  const isWarehouseManager = isWarehouseManagerRole(roleName);

  if (isSuperAdminRole(roleName)) {
    // Everything except Warehouse Distribution, which stays a warehouse-side
    // screen until a Super Admin can switch into a warehouse the way they
    // already switch pharmacy. Purchase is included even under centralized
    // inventory: the role oversees the organization rather than one store.
    const keys: ModuleKey[] = [
      "PURCHASE",
      "SALES",
      "PRODUCTS",
      "USER_MANAGEMENT",
      "SET_UP_BUSINESS",
    ];
    // The warehouse pair only exists at all with centralized inventory, so it
    // is withheld when there is none — that is the organization having no such
    // flow, not the role lacking rights.
    if (centralized === true) {
      keys.push("WAREHOUSE_RECEIPT", "INTER_STORE_TRANSFER");
    }
    return new Set(keys);
  }

  if (isWarehouseManager) {
    const keys: ModuleKey[] = ["PRODUCTS"];
    // Purchase belongs to the warehouse only while inventory is centralized.
    if (centralized === true) keys.push("WAREHOUSE_DISTRIBUTION", "PURCHASE");
    return new Set(keys);
  }

  const keys: ModuleKey[] = [
    "SALES",
    "PRODUCTS",
    "USER_MANAGEMENT",
    "SET_UP_BUSINESS",
  ];

  if (centralized === true) {
    keys.push("WAREHOUSE_RECEIPT", "INTER_STORE_TRANSFER");
  } else if (centralized === false) {
    keys.push("PURCHASE");
  }

  return new Set(keys);
};

/**
 * Modules whose availability hinges on `centralizedInventory`. A guard waits for
 * the organization before judging one of these, and lets the rest through
 * immediately — no reason to hold up Sales for a lookup it does not depend on.
 */
const ORGANIZATION_DEPENDENT_MODULES = new Set<ModuleKey>([
  "PURCHASE",
  "WAREHOUSE_DISTRIBUTION",
  "WAREHOUSE_RECEIPT",
  "INTER_STORE_TRANSFER",
]);

export const dependsOnOrganization = (moduleKey: ModuleKey): boolean =>
  ORGANIZATION_DEPENDENT_MODULES.has(moduleKey);

/**
 * Why a module was withheld, in the user's terms. Returns null when the module
 * is in fact available.
 */
export const denialReason = (
  route: ModuleRoute,
  roleName: string | null | undefined,
  organization: OrganizationShape
): string | null => {
  if (availableModuleKeys(roleName, organization).has(route.moduleKey)) {
    return null;
  }

  const centralized = organization.centralizedInventory;

  if (
    centralized === false &&
    route.moduleKey !== "PURCHASE" &&
    dependsOnOrganization(route.moduleKey)
  ) {
    return `${route.label} is available only with centralized inventory.`;
  }

  if (route.moduleKey === "PURCHASE" && centralized === true) {
    return "Purchasing is handled at the warehouse for centralized inventory.";
  }

  if (route.moduleKey === "WAREHOUSE_DISTRIBUTION") {
    return `${route.label} is available to the Warehouse Manager role.`;
  }

  if (isSuperAdminRole(roleName) && dependsOnOrganization(route.moduleKey)) {
    return `${route.label} is available only with centralized inventory.`;
  }

  return `${route.label} is not available for your role.`;
};

/**
 * A module is reachable only if the organization allows it and the token grants
 * VIEW.
 *
 * `permissionsDescribed` is false for a token minted before the backend started
 * stamping the claim. Such a session is gated by the organization's shape alone
 * rather than being shown an empty sidebar — the same fail-open the middleware
 * applies, kept in one place so the two cannot disagree.
 */
export const isModuleAvailable = (
  route: ModuleRoute,
  index: PermissionIndex,
  roleName: string | null | undefined,
  organization: OrganizationShape,
  permissionsDescribed = true
): boolean =>
  availableModuleKeys(roleName, organization).has(route.moduleKey) &&
  (!permissionsDescribed ||
    bypassesPermissionChecks(roleName) ||
    canViewModule(index, route));
