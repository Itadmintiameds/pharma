"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShieldAlert,
  Settings,
  ShoppingCart,
  // Package, // only used by the commented-out Stock Management item below
  Receipt,
  Box,
  Truck,
  Users,
  BarChart3,
  LogOut,
  ClipboardList,
  PackageCheck,
  ArrowLeftRight,
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

  // Dynamic lock check - for other inventory modules
  const isBusinessRegistered = false;

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

  const navGroups = [
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
          icon: Truck,
          path: "/dashboard/suppliers",
          isLocked: !isBusinessRegistered,
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
        {
          name: "Reports",
          icon: BarChart3,
          path: "/dashboard/reports",
          isLocked: !isBusinessRegistered,
        },
      ],
    },
  ];

  // A Super Admin sees a module it cannot reach as a padlock only when the flow
  // exists for this organization but is not the role's to operate — Warehouse
  // Distribution and Purchase under centralized inventory. Modules the inventory
  // shape rules out entirely are hidden, the same as for every other role — a
  // lock there would advertise a flow the organization does not have.
  const isSuperAdmin = bypassesPermissionChecks(roleName);
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
    <aside className="w-[244px] h-full bg-secondary-600 text-pneutral-50 px-[20px] py-[24px] flex flex-col justify-between shrink-0 font-body overflow-hidden">
      {/* Top Section: Navigation */}
      <div className="flex flex-col gap-8">
        {/* Navigation Menu */}
        <nav className="w-[204px] flex flex-col gap-[8px]">
          {visibleGroups.map((group) => (
            <div
              key={group.category}
              className={`w-[204px] flex flex-col gap-[2px]`}
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

      {/* Bottom Section: User & Logout */}
      <div className="flex flex-col gap-4">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-[204px] h-[48px] p-[12px] gap-[10px] rounded-[16px] bg-warning-50 flex items-center justify-start text-[14px] font-normal leading-none text-warning-500 hover:bg-warning-100 transition-all duration-200 select-none shrink-0"
        >
          <LogOut size={18} className="text-warning-500 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
