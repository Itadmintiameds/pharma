"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShieldAlert,
  Settings,
  ShoppingCart,
  Package,
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
import { ModuleKey } from "@/access/accessControl";

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { clearPharmacy } = usePharmacyStore.getState();
  const { clearWarehouse } = useWarehouseStore.getState();


  // Which modules this role and organization may reach, and what the token
  // grants inside them. Both come from the access context, which the dashboard
  // layout seeds from the JWT — so role and organization are no longer looked up
  // here, and the sidebar cannot disagree with the route guards.
  const { moduleRoutes, isModuleAvailable, organizationLoaded } = useAccess();

  const [hasApprovedPharmacy, setHasApprovedPharmacy] = React.useState(false);

  // Dynamic lock check - for other inventory modules
  const isBusinessRegistered = false;

  React.useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const userRes = await fetch("/api/user-info");
        if (!userRes.ok) return;
        const { userId } = await userRes.json();
        if (!userId) return;

        const [{ getUserPharmacyKPIs }, { getUserById }] = await Promise.all([
          import("@/services/SetupBusinessService"),
          import("@/services/UserManagementService"),
        ]);

        const [kpiResponse, userDetails] = await Promise.all([
          getUserPharmacyKPIs(String(userId)).catch(() => null),
          getUserById(userId).catch(() => null),
        ]);

        // Unlock if this account registered an approved (ACCEPTED) pharmacy itself,
        // OR a Super Admin already assigned it to an existing (already-approved) pharmacy
        // via User Management — that user never goes through Setup Business/compliance.
        // A Warehouse Manager is assigned a warehouse instead of a pharmacy, so an
        // assigned warehouse unlocks the modules just like an assigned pharmacy does.
        const hasOwnApprovedPharmacy = (kpiResponse?.data?.approved ?? 0) > 0;
        const hasAssignedPharmacy = (userDetails?.pharmacies?.length ?? 0) > 0;
        const hasAssignedWarehouse = (userDetails?.warehouses?.length ?? 0) > 0;

        if (hasOwnApprovedPharmacy || hasAssignedPharmacy || hasAssignedWarehouse) {
          setHasApprovedPharmacy(true);
        }
      } catch (err) {
        console.error("Failed to check registration status for sidebar:", err);
      }
    };

    checkRegistrationStatus();
  }, []);

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
          isLocked: false,
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
          isLocked: false,
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
          name: "Stock Management",
          icon: Package,
          path: "/dashboard/stockManagement",
          isLocked: !isBusinessRegistered,
        },
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

  // A module the role or organization rules out is left out entirely rather than
  // shown with a padlock: the lock means "finish setting up to unlock this",
  // which is a promise that does not apply to an inapplicable module.
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.moduleKey) return true;
        const route = moduleRoutes.find((r) => r.moduleKey === item.moduleKey);
        if (!route) return true;
        // Modules hinging on centralizedInventory stay hidden until the
        // organization resolves — briefly missing beats briefly wrong.
        return organizationLoaded && isModuleAvailable(route);
      }),
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
                // Role and organization rules now decide whether an item is
                // listed at all, so the only lock left is the original one:
                // the module exists for this user but business setup is not done.
                const isLocked = item.isLocked;
                const lockedMessage = isLocked
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
