'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface NavbarProps {
  hospitalName?: string;
  userRole?: string;
}

const Navbar = ({ hospitalName = 'ABC Hospital', userRole = 'Super Admin' }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header 
      className="w-full h-[61.5px] bg-white border-b border-pneutral-100 flex items-center justify-between px-6 shrink-0"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      {/* Left side info block */}
      <div className="flex flex-col gap-1 select-none">
        <h1 
          className="text-[13px] font-semibold leading-none"
          style={{ color: '#3C3D3A' }}
        >
          Welcome, {hospitalName}
        </h1>
        <p 
          className="text-[11.5px] font-normal leading-none"
          style={{ color: '#969793' }}
        >
          {userRole}
        </p>
      </div>

      {/* Right side interactive block */}
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative w-[240px] h-[40px] bg-pneutral-50 border border-pneutral-200 rounded-[10px] flex items-center pl-3 pr-2">
          {/* Custom Search Icon (Magnifying Glass) */}
          <div className="relative w-[16px] h-[16px] text-pneutral-400 shrink-0 mr-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="absolute w-full h-full"
              style={{ top: '1.6px', left: '1.6px' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none text-[13px] text-pneutral-800 placeholder-pneutral-400"
          />
        </div>

        {/* Notification Bell */}
        <button className="relative w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity">
          <Image 
            src="/dashboard/icons/notification bell.svg" 
            alt="Notifications" 
            width={28} 
            height={28}
            className="object-contain"
          />
        </button>

        {/* User Profile Avatar */}
        <div className="w-[40px] h-[40px] rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-100 transition-all select-none shrink-0">
          <Image 
            src="/dashboard/icons/Avatar Base.svg" 
            alt="User Avatar" 
            width={40} 
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
