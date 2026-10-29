"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShieldAlert,
  Settings,
  ShoppingCart,
  // Package, // only used by the commented-out Stock Management item below
  Receipt,
  ReceiptText,
  Box,
  Truck,
  Users,
  BarChart3,
  LogOut,
  ClipboardList,
  PackageCheck,
  ArrowLeftRight,
  Undo2,
  PackageOpen,
  Scale,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { logout } from "@/services/AuthService";
import Image from "next/image";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { useAccess } from "@/app/components/providers/AccessProvider";
import {
  ModuleKey,
  bypassesPermissionChecks,
  denialReason,
  isWarehouseManagerRole,
  superAdminLockedModules,
} from "@/access/accessControl";
import useBusinessRegistration from "@/hooks/useBusinessRegistration";

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { clearPharmacy } = usePharmacyStore.getState();
  const { clearWarehouse } = useWarehouseStore.getState();


  // Which modules this role and organization may reach, and what the token
  // grants inside them. Both come from the access context, which the dashboard
  // layout seeds from the JWT — so role and organization are no longer looked up
  // here, and the sidebar cannot disagree with the route guards.
  const {
    moduleRoutes,
    isModuleAvailable,
    organizationLoaded,
    roleName,
    organization,
    actingAsWarehouse,
  } = useAccess();

  const { hasApprovedPharmacy } = useBusinessRegistration();

  // Items with sub-items (Reports) expand downwards in place. Starts open when
  // the current page is one of the sub-items, so the active link stays visible.
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => ({
    Reports: pathname.startsWith("/dashboard/reports/"),
  }));
  const toggleItem = (name: string) =>
    setOpenItems((prev) => ({ ...prev, [name]: !prev[name] }));

  // Whether Suppliers / Supplier Payment are listed at all is decided by the
  // access rules (warehouse side only under centralized inventory). Where they
  // are, they unlock the same way as the other pharmacy-side masters (Products,
  // etc.): once the account has an approved pharmacy. On the warehouse side, a
  // Super Admin who has toggled into a warehouse, or the Warehouse Manager
  // role, already reach the other warehouse flows (Products, Warehouse
  // Distribution, Purchase) unlocked the same way, so they unlock them
  // unconditionally.
  const isSuperAdmin = bypassesPermissionChecks(roleName);
  const isWarehouseManager = isWarehouseManagerRole(roleName);
  const isSuppliersUnlockedForWarehouse =
    isWarehouseManager || (isSuperAdmin && actingAsWarehouse);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      // Clear regardless of whether the API call succeeded — a failed logout
      // request shouldn't leave the previous session's location selection behind.
      clearPharmacy();
      clearWarehouse();
    }
    router.replace("/login");
  };

  const navGroups: {
    category: string;
    isHeaderHidden?: boolean;
    heightClass: string;
    items: {
      name: string;
      moduleKey?: ModuleKey;
      icon: typeof LayoutDashboard;
      path: string;
      isLocked: boolean;
      children?: {
        name: string;
        path: string;
      }[];
    }[];
  }[] = [
    {
      category: "MAIN MENU",
      isHeaderHidden: true,
      heightClass: "h-[116px]",
      items: [
        {
          name: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Setup Business",
          moduleKey: "SET_UP_BUSINESS" as ModuleKey,
          icon: ShieldAlert,
          path: "/dashboard/setupBusiness",
          isLocked: false,
        },
        {
          name: "Settings",
          icon: Settings,
          path: "/dashboard/settings",
          isLocked: !hasApprovedPharmacy,
        },
      ],
    },
    {
      category: "TRANSACTIONS",
      heightClass: "h-[144px]",
      items: [
        {
          name: "Purchase",
          moduleKey: "PURCHASE" as ModuleKey,
          icon: ShoppingCart,
          path: "/dashboard/purchase",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Purchase Return",
          moduleKey: "PURCHASE_RETURN" as ModuleKey,
          icon: ShoppingCart,
          path: "/dashboard/purchaseReturn",
          isLocked: !hasApprovedPharmacy,
        },
        // Stock Management is hidden for now — uncomment to bring it back.
        // {
        //   name: "Stock Management",
        //   icon: Package,
        //   path: "/dashboard/stockManagement",
        //   isLocked: !isBusinessRegistered,
        // },
        {
          name: "Sales / Billing",
          moduleKey: "SALES" as ModuleKey,
          icon: Receipt,
          path: "/dashboard/salesBilling",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Sales Return",
          moduleKey: "SALES_RETURN" as ModuleKey,
          icon: ReceiptText,
          path: "/dashboard/salesReturn",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Warehouse Distribution",
          moduleKey: "WAREHOUSE_DISTRIBUTION" as ModuleKey,
          icon: ClipboardList,
          path: "/dashboard/warehouseDistribution",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Warehouse Receipt",
          moduleKey: "WAREHOUSE_RECEIPT" as ModuleKey,
          icon: PackageCheck,
          path: "/dashboard/warehouseReceipt",
          isLocked: !hasApprovedPharmacy,
        },
               {
          name: "Inter Store Transfer",
          moduleKey: "INTER_STORE_TRANSFER" as ModuleKey,
          icon: ArrowLeftRight,
          path: "/dashboard/interStoreTransfer",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Stock Return",
          moduleKey: "WAREHOUSE_STOCK_RETURN" as ModuleKey,
          icon: Undo2,
          path: "/dashboard/wearhouseStockReturn",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Stock Return Receipt",
          moduleKey: "STOCK_RETURN_RECEIPT" as ModuleKey,
          icon: PackageOpen,
          path: "/dashboard/StockReturnReciept",
          // The warehouse side reaches its other flows without an approved
          // pharmacy, the same as Suppliers above.
          isLocked: isSuppliersUnlockedForWarehouse ? false : !hasApprovedPharmacy,
        },
        // Listed for both the pharmacy and the warehouse side, and unlocks the
        // same way as Suppliers.
        {
          name: "Stock Adjustment",
          moduleKey: "STOCK_ADJUSTMENT" as ModuleKey,
          icon: Scale,
          path: "/dashboard/stockAdjustment",
          isLocked: isSuppliersUnlockedForWarehouse ? false : !hasApprovedPharmacy,
        },
      ],
    },
    {
      category: "MASTERS",
      heightClass: "h-[144px]",
      items: [
        {
          name: "Products",
          moduleKey: "PRODUCTS" as ModuleKey,
          icon: Box,
          path: "/dashboard/products",
          isLocked: !hasApprovedPharmacy,
        },
        {
          name: "Suppliers",
          moduleKey: "SUPPLIER_MASTER" as ModuleKey,
          icon: Truck,
          path: "/dashboard/suppliers",
          isLocked: isSuppliersUnlockedForWarehouse
            ? false
            : !hasApprovedPharmacy,
        },
        {
          name: "Supplier Payment",
          moduleKey: "SUPPLIER_PAYMENT" as ModuleKey,
          icon: Wallet,
          path: "/dashboard/supplierPayment",
          isLocked: isSuppliersUnlockedForWarehouse
            ? false
            : !hasApprovedPharmacy,
        },
        {
          name: "User Management",
          moduleKey: "USER_MANAGEMENT" as ModuleKey,
          icon: Users,
          path: "/dashboard/userManagement",
          isLocked: !hasApprovedPharmacy,
        },
      ],
    },
    {
      category: "REPORTS",
      heightClass: "h-[64px]",
      items: [
        // No moduleKey, so it is listed for every role — the same as Dashboard.
        {
          name: "Reports",
          icon: BarChart3,
          path: "/dashboard/reports",
          isLocked: !hasApprovedPharmacy,
          children: [
            {
              name: "Inventory Sales Report",
              path: "/dashboard/reports/inventorySalesReport",
            },
            {
              name: "Current Stock Summary Report",
              path: "/dashboard/reports/currentStockSummaryReport",
            },
            {
              name: "Stock Movement Report",
              path: "/dashboard/reports/stockMovementReport",
            },
            {
              name: "Stock Expiry Report",
              path: "/dashboard/reports/stockExpiryReport",
            },
            {
              name: "Stock Damage Report",
              path: "/dashboard/reports/stockDamageReport",
            },
            {
              name: "Stock Return Report",
              path: "/dashboard/reports/stockReturnReport",
            },
            {
              name: "Stock Adjustment Report",
              path: "/dashboard/reports/stockAdjustmentReport",
            },
            {
              name: "Purchase Register Report",
              path: "/dashboard/reports/purchaseRegisterReport",
            },
            {
              name: "Supplier Purchase Return Report",
              path: "/dashboard/reports/supplierPurchaseReturnReport",
            },
            {
              name: "Supplier Outstanding Report",
              path: "/dashboard/reports/supplierOutstandingReport",
            },
            {
              name: "Supplier Payment Report",
              path: "/dashboard/reports/supplierPaymentReport",
            },
            {
              name: "Pharmacy Sales Return Report",
              path: "/dashboard/reports/pharmacySalesReturnReport",
            },
            {
              name: "Gross Profit Report",
              path: "/dashboard/reports/grossProfitReport",
            },
            {
              name: "User-wise Collection Report",
              path: "/dashboard/reports/userwiseCollectionReport",
            },
            {
              name: "Product-wise Purchase and Sales Analysis Report",
              path: "/dashboard/reports/productwisePurchase&SalesAnalysisReport",
            },
            {
              name: "Bill Summary",
              path: "/dashboard/reports/BillSummary",
            },
            {
              name: "Detailed Sale Report",
              path: "/dashboard/reports/DetailedSaleReport",
            },
            {
              name: "Doctor-wise Sale Report",
              path: "/dashboard/reports/DoctorWiseSaleReport",
            },
            {
              name: "Bill Due Summary",
              path: "/dashboard/reports/BillDueSummary",
            },
          ],
        },
      ],
    },
  ];

  // A Super Admin sees a module it cannot reach as a padlock only when the flow
  // exists for this organization but is not the role's to operate — Warehouse
  // Distribution and Purchase under centralized inventory. Modules the inventory
  // shape rules out entirely are hidden, the same as for every other role — a
  // lock there would advertise a flow the organization does not have.
  const superAdminLocked = superAdminLockedModules(
    organization,
    actingAsWarehouse
  );

  const decorate = (
    item: (typeof navGroups)[number]["items"][number],
    hidden: boolean,
    accessLocked = false,
    accessMessage?: string
  ) => ({ ...item, hidden, accessLocked, accessMessage });

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (!item.moduleKey) return decorate(item, false);
          const route = moduleRoutes.find((r) => r.moduleKey === item.moduleKey);
          if (!route) return decorate(item, false);

          // Modules hinging on centralizedInventory wait for the organization to
          // resolve before being judged — briefly missing beats briefly wrong.
          if (!organizationLoaded) return decorate(item, true);

          if (isModuleAvailable(route)) return decorate(item, false);

          // Unavailable for this user. A Super Admin still sees the modules that
          // exist for this organization but belong to another role, shown locked
          // with the reason; everything the inventory shape rules out is hidden,
          // the same as for any other role.
          if (isSuperAdmin && superAdminLocked.has(route.moduleKey)) {
            return decorate(
              item,
              false,
              true,
              denialReason(route, roleName, organization) ?? undefined
            );
          }
          return decorate(item, true);
        })
        .filter((item) => !item.hidden),
    }))
    .filter((group) => group.items.length > 0);

  return (
    // No padding of its own: the two bands below carry it, so the scroll area
    // reaches the bar's own edges and the scrollbar sits against the side
    // rather than 20px inside it.
    <aside className="w-[244px] h-full min-h-0 bg-secondary-600 text-pneutral-50 flex flex-col shrink-0 font-body">
      {/*
        The nav is the only part that scrolls, and `auto` means it only does so
        on a screen too short to hold every module — nothing changes on a tall
        one. It used to be a `justify-between` column under `overflow-hidden`,
        so on a short screen the growing nav pushed Logout past the bottom edge
        and the clip simply swallowed it: there was no way to sign out at all.
      */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-[20px] pt-[24px] pb-2 [scrollbar-width:thin] [scrollbar-color:#ffffff59_transparent]">
        {/* Navigation Menu */}
        <nav className="w-full flex flex-col gap-[8px]">
          {visibleGroups.map((group) => (
            <div
              key={group.category}
              className={`w-full flex flex-col gap-[2px]`}
            >
              {!group.isHeaderHidden && (
                <div className="w-[120px] h-[24px] flex items-center text-[14px] font-medium font-work-sans text-[#F8F8F9] select-none tracking-wider">
                  {group.category}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                // Two reasons an item can be locked: the module is ruled out by
                // the organization or role (Super Admin only — everyone else has
                // it hidden), or business setup is not yet done. The access
                // reason takes precedence and carries its own message.
                const isLocked = item.isLocked || item.accessLocked;
                const lockedMessage = item.accessLocked
                  ? item.accessMessage
                  : item.isLocked
                    ? "Complete business setup to unlock this module"
                    : undefined;

                if (item.children) {
                  const isOpen = !isLocked && !!openItems[item.name];
                  const isChildActive = item.children.some(
                    (child) => pathname === child.path
                  );
                  return (
                    <div key={item.name} className="flex flex-col gap-[2px]">
                      <button
                        type="button"
                        title={lockedMessage}
                        aria-expanded={isOpen}
                        onClick={() => {
                          if (!isLocked) toggleItem(item.name);
                        }}
                        className={`w-full flex items-center gap-3 px-4 h-[36px] rounded-[10px] text-[14px] font-medium transition-all duration-200 select-none ${
                          isLocked
                            ? "text-pneutral-50 cursor-not-allowed"
                            : `text-pneutral-50 hover:bg-secondary-50 hover:text-pneutral-800 cursor-pointer ${
                                isChildActive ? "font-semibold" : ""
                              }`
                        }`}
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="truncate">{item.name}</span>
                        {isLocked ? (
                          <Image
                            src="/sidebar/lock-icon.svg"
                            alt="Locked"
                            width={14}
                            height={14}
                            className="ml-auto shrink-0"
                            style={{ width: "auto", height: "auto" }}
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            className={`ml-auto shrink-0 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                      {isOpen &&
                        item.children.map((child) => {
                          const isSubActive = pathname === child.path;
                          return (
                            <Link
                              key={child.name}
                              href={child.path}
                              title={child.name}
                              className={`flex items-center gap-3 pl-9 pr-4 h-[36px] rounded-[10px] text-[13px] font-medium transition-all duration-200 select-none ${
                                isSubActive
                                  ? "bg-secondary-50 text-pneutral-800 shadow-sm font-semibold"
                                  : "text-pneutral-50 hover:bg-secondary-50 hover:text-pneutral-800 cursor-pointer"
                              }`}
                            >
                              <span className="truncate">{child.name}</span>
                            </Link>
                          );
                        })}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={isLocked ? "#" : item.path}
                    title={lockedMessage}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                      }
                    }}
                    className={`flex items-center gap-3 px-4 h-[36px] rounded-[10px] text-[14px] font-medium transition-all duration-200 select-none ${
                      isActive
                        ? "bg-secondary-50 text-pneutral-800 shadow-sm font-semibold"
                        : isLocked
                          ? "text-pneutral-50 cursor-not-allowed"
                          : "text-pneutral-50 hover:bg-secondary-50 hover:text-pneutral-800 cursor-pointer"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {isLocked && (
                      <Image
                        src="/sidebar/lock-icon.svg"
                        alt="Locked"
                        width={14}
                        height={14}
                        className="ml-auto shrink-0"
                        style={{ width: "auto", height: "auto" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section: User & Logout. Outside the scroll area and shrink-0,
          so it stays on screen whatever the nav above it does — signing out is
          not something to have to scroll for. */}
      <div className="shrink-0 flex flex-col gap-4 border-t border-white/10 px-[20px] pt-3 pb-[24px]">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-[48px] p-[12px] gap-[10px] rounded-[16px] bg-warning-50 flex items-center justify-start text-[14px] font-normal leading-none text-warning-500 hover:bg-warning-100 transition-all duration-200 select-none shrink-0"
        >
          <LogOut size={18} className="text-warning-500 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
