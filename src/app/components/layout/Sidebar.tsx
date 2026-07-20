'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  LogOut 
} from 'lucide-react';
import { logout } from '@/services/AuthService';
import Image from 'next/image';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [hasApprovedPharmacy, setHasApprovedPharmacy] = React.useState(false);
  
  // Dynamic lock check - for other inventory modules
  const isBusinessRegistered = false;

  React.useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const userRes = await fetch('/api/user-info');
        if (!userRes.ok) return;
        const { userId } = await userRes.json();
        if (!userId) return;

        const { getUserPharmacyKPIs } = await import('@/services/SetupBusinessService');
        const kpiResponse = await getUserPharmacyKPIs(String(userId));
        
        if (kpiResponse && kpiResponse.data) {
          // Unlock ONLY User Management if there is at least 1 approved (ACCEPTED) pharmacy
          if (kpiResponse.data.approved > 0) {
            setHasApprovedPharmacy(true);
          }
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
    }
    router.replace("/login");
  };

  const navGroups = [
    {
      category: 'MAIN MENU',
      isHeaderHidden: true,
      heightClass: 'h-[116px]',
      items: [
        {
          name: 'Dashboard',
          icon: LayoutDashboard,
          path: '/dashboard',
          isLocked: false,
        },
        {
          name: 'Setup Business',
          icon: ShieldAlert,
          path: '/dashboard/setupBusiness',
          isLocked: false,
        },
        {
          name: 'Settings',
          icon: Settings,
          path: '/dashboard/settings',
          isLocked: false,
        }
      ]
    },
    {
      category: 'TRANSACTIONS',
      heightClass: 'h-[144px]',
      items: [
        {
          name: 'Purchase',
          icon: ShoppingCart,
          path: '/dashboard/purchase',
          isLocked: !isBusinessRegistered,
        },
        {
          name: 'Stock Management',
          icon: Package,
          path: '/dashboard/stockManagement',
          isLocked: !isBusinessRegistered,
        },
        {
          name: 'Sales / Billing',
          icon: Receipt,
          path: '/dashboard/salesBilling',
          isLocked: !isBusinessRegistered,
        }
      ]
    },
    {
      category: 'MASTERS',
      heightClass: 'h-[144px]',
      items: [
        {
          name: 'Products',
          icon: Box,
          path: '/dashboard/products',
          isLocked: !isBusinessRegistered,
        },
        {
          name: 'Suppliers',
          icon: Truck,
          path: '/dashboard/suppliers',
          isLocked: !isBusinessRegistered,
        },
        {
          name: 'User Management',
          icon: Users,
          path: '/dashboard/userManagement',
          isLocked: !hasApprovedPharmacy,
        }
      ]
    },
    {
      category: 'REPORTS',
      heightClass: 'h-[64px]',
      items: [
        {
          name: 'Reports',
          icon: BarChart3,
          path: '/dashboard/reports',
          isLocked: !isBusinessRegistered,
        }
      ]
    }
  ];

  return (
    <aside className="w-[244px] h-screen bg-secondary-900 text-white px-[20px] py-[24px] flex flex-col justify-between shrink-0 font-body overflow-hidden">
      {/* Top Section: Logo & Navigation */}
      <div className="flex flex-col gap-8">
        {/* Logo Container */}
        <div 
          className="w-[204px] h-[75px] px-2 py-1 rounded-[52px] flex items-center justify-center select-none"
        >
          <Image 
            src="/Logo/tiameds logo.svg" 
            alt="TiaMeds Logo" 
            width={176} 
            height={75}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Navigation Menu */}
        <nav className="w-[204px] flex flex-col gap-[8px]">
          {navGroups.map((group) => (
            <div key={group.category} className={`w-[204px] flex flex-col gap-[2px]`}>
              {!group.isHeaderHidden && (
                <div className="w-[120px] h-[24px] flex items-center text-[14px] font-medium font-work-sans text-[#F8F8F9] select-none tracking-wider">
                  {group.category}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                  <Link
                    key={item.name}
                    href={item.isLocked ? '#' : item.path}
                    onClick={(e) => {
                      if (item.isLocked) {
                        e.preventDefault();
                      }
                    }}
                    className={`flex items-center gap-3 px-4 h-[36px] rounded-[10px] text-[14px] font-medium transition-all duration-200 select-none ${
                      isActive
                        ? 'bg-secondary-200 text-secondary-900 shadow-sm font-semibold'
                        : item.isLocked
                        ? 'text-pneutral-50 cursor-not-allowed'
                        : 'text-pneutral-50 hover:bg-secondary-800 hover:text-white cursor-pointer'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {item.isLocked && (
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
