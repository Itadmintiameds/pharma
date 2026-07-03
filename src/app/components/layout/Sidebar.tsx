'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShieldAlert, User, LogOut } from 'lucide-react';
import { logout } from '@/services/AuthService';

import Image from 'next/image';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    router.replace("/login");
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      name: 'Setup Business',
      icon: ShieldAlert,
      path: '/dashboard/setupBusiness',
    },
    {
      name: 'Settings',
      icon: User,
      path: '/dashboard/settings',
    }
    
  ];

  return (
    <aside className="w-[224px] h-screen bg-secondary-900 text-white p-[24px] flex flex-col justify-between shrink-0 font-body overflow-hidden">
      {/* Top Section: Logo & Navigation */}
      <div className="flex flex-col gap-8">
        {/* Logo Container */}
        <div 
          className="w-[176px] h-[75px] px-2 py-1 rounded-[52px] flex items-center justify-center select-none"
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
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-secondary-200 text-secondary-900 shadow-sm font-semibold'
                    : 'text-secondary-200 hover:bg-secondary-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: User & Logout */}
      <div className="flex flex-col gap-4">
        {/* Divider */}
       {/* <hr className="border-secondary-800" /> */}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-[176px] h-[48px] p-[12px] gap-[10px] rounded-[16px] bg-warning-50 flex items-center justify-start text-[14px] font-normal leading-none text-warning-500 hover:bg-warning-100 transition-all duration-200 select-none shrink-0"
        >
          <LogOut size={18} className="text-warning-500 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
