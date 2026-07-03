'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/common/Button';

export default function DashboardMain() {
  /*
  // PREVIOUS REDESIGNED CODE PRESERVED:
  const complianceStatus = 'Not Submitted'; 
  const hospitalName = 'ABC Hospital';
  const entityType = 'Hospital';

  const restrictedModules = [
    { name: 'Inventory', icon: '/dashboard/inventory.svg' },
    { name: 'Purchase', icon: '/dashboard/purchase.svg' },
    { name: 'Sales', icon: '/dashboard/sales.svg' },
    { name: 'Suppliers', icon: '/dashboard/suppliers.svg' },
    { name: 'Customers', icon: '/dashboard/Customer.svg' },
    { name: 'Reports', icon: '/dashboard/Reports.svg' },
    { name: 'Billing', icon: '/dashboard/billing.svg' },
  ];
  */

  const setupPercentage = 0; // Dynamic setup percentage
  const applicationStep = 2; // Dynamic step status: 1 = Submitted, 2 = Under Review, 3 = Approved
  const router = useRouter();

  return (
    <div className="flex flex-col select-none font-body w-full max-w-7xl gap-8">
      
      {/* Title & Setup Call-to-action Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
        {/* Welcome Text block */}
        <div className="flex flex-col gap-2 w-full max-w-[500px]">
          <h1 className="text-h4 font-semibold font-work-sans leading-[44px] text-pneutral-900">
            Welcome to TiaMeds
          </h1>
          <p className="text-p3 font-normal text-pneutral-900 font-body leading-normal">
            Complete your Business setup to start using <br /> TiaMeds Inventory Platform
          </p>
        </div>

        {/* Start Setup Button */}
        <Button 
          onClick={() => router.push("/dashboard/setupBusiness")}
          variant="primary"
          className="w-[272px] h-[48px] rounded-[8px] font-work-sans font-medium text-[16px] leading-[32px] text-pneutral-50 whitespace-nowrap select-none shrink-0"
        >
          Start Setting Up Your Business
        </Button>
      </div>

      {/* Grid containing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        
        {/* Left Card: Setup Progress (Stretched to w-full) */}
        <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] p-4 flex flex-col gap-4 overflow-hidden select-none shrink-0">
          {/* Card Header (divider line placed below the percentage) */}
          <div className="flex flex-col border-b border-pneutral-100 pb-2 w-full gap-3">
            <span className="text-[16px] font-bold text-pneutral-900 font-body leading-none">
              Setup Progress
            </span>
            <span className="text-[12px] font-normal text-pneutral-500 font-body leading-none">
              {setupPercentage}% Complete
            </span>
          </div>

          {/* Setup Steps (w-[447.33px] h-[106.44px]) */}
          <div className="flex flex-col justify-between w-full h-[106.44px] gap-[14px] mt-1">
            {/* Step 1: Business Information */}
            <div className="flex items-center justify-between w-full h-[26px]">
              <div className="flex items-center gap-3">
                <Image 
                  src="/dashboard/icons/step 1.svg" 
                  alt="Step 1" 
                  width={24} 
                  height={24} 
                  className="object-contain shrink-0" 
                />
                <span className="text-[14px] font-normal text-pneutral-800 font-body leading-none">
                  Business Information
                </span>
              </div>
              {/* Status Box (single line) */}
              <div className="w-[96px] h-[26px] bg-pneutral-50 border border-pneutral-200 rounded-[4px] py-1 px-2 flex items-center justify-center text-[12px] font-medium text-pneutral-900 font-body leading-none select-none whitespace-nowrap">
                Not Started
              </div>
            </div>

            {/* Step 2: Location Setup */}
            <div className="flex items-center justify-between w-full h-[26px]">
              <div className="flex items-center gap-3">
                <Image 
                  src="/dashboard/icons/step 2.svg" 
                  alt="Step 2" 
                  width={24} 
                  height={24} 
                  className="object-contain shrink-0" 
                />
                <span className="text-[14px] font-normal text-pneutral-800 font-body leading-none">
                  Location Setup
                </span>
              </div>
              <div className="w-[96px] h-[26px] bg-pneutral-50 border border-pneutral-200 rounded-[4px] py-1 px-2 flex items-center justify-center text-[12px] font-medium text-pneutral-900 font-body leading-none select-none whitespace-nowrap">
                Not Started
              </div>
            </div>

            {/* Step 3: Compliance Submission */}
            <div className="flex items-center justify-between w-full h-[26px]">
              <div className="flex items-center gap-3">
                <Image 
                  src="/dashboard/icons/step 3.svg" 
                  alt="Step 3" 
                  width={24} 
                  height={24} 
                  className="object-contain shrink-0" 
                />
                <span className="text-[14px] font-normal text-pneutral-800 font-body leading-none">
                  Compliance Submission
                </span>
              </div>
              <div className="w-[96px] h-[26px] bg-pneutral-50 border border-pneutral-200 rounded-[4px] py-1 px-2 flex items-center justify-center text-[12px] font-medium text-pneutral-900 font-body leading-none select-none whitespace-nowrap">
                Not Started
              </div>
            </div>

          </div>
        </div>

        {/* Right Card: Application Status Card (Stretched to w-full) */}
        <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] p-4 flex flex-col gap-4 overflow-hidden select-none shrink-0">
          <div className="flex flex-col border-b border-pneutral-100 pb-2 w-full gap-1">
            <span className="text-[16px] font-bold text-pneutral-900 font-body leading-none">
              Application Status
            </span>
          </div>
          
          {/* Dynamic Horizontal Wizard Flow Container */}
          <div className="flex flex-col w-full max-w-[436px] mx-auto select-none mt-3">
            {/* Circles Row */}
            <div className="relative flex items-center justify-between w-full h-[54px]">
              {/* Background Line Connector */}
              <div className="absolute top-[26px] left-[27px] right-[27px] h-[2px] flex z-0">
                <div className={`h-full w-1/2 ${applicationStep >= 2 ? 'bg-[#56C201]' : 'bg-pneutral-200'}`}></div>
                <div className={`h-full w-1/2 ${applicationStep >= 3 ? 'bg-[#56C201]' : 'bg-pneutral-200'}`}></div>
              </div>

              {/* Step 1 Circle (Submission: Always Completed) */}
              <div className="w-[54px] h-[54px] rounded-full border-2 border-[#56C201] bg-[#56C201] flex items-center justify-center z-10 shrink-0">
                <Image 
                  src="/dashboard/icons/completed.svg" 
                  alt="Completed" 
                  width={22} 
                  height={20} 
                  className="object-contain shrink-0" 
                />
              </div>

              {/* Step 2 Circle (Under Review) */}
              <div className={`w-[54px] h-[54px] rounded-full border-2 flex items-center justify-center z-10 shrink-0 ${
                applicationStep >= 2 ? 'border-secondary-700 bg-secondary-700' : 'border-pneutral-300 bg-white'
              }`}>
                <Image 
                  src={applicationStep >= 2 ? '/dashboard/icons/inprogress.svg' : '/dashboard/icons/pending.svg'} 
                  alt="Status" 
                  width={applicationStep >= 2 ? 26 : 27} 
                  height={applicationStep >= 2 ? 24 : 27} 
                  className="object-contain shrink-0" 
                />
              </div>

              {/* Step 3 Circle (Approved) */}
              <div className={`w-[54px] h-[54px] rounded-full border-2 flex items-center justify-center z-10 shrink-0 ${
                applicationStep >= 3 ? 'border-[#56C201] bg-[#56C201]' : 'border-pneutral-300 bg-white'
              }`}>
                <Image 
                  src={applicationStep >= 3 ? '/dashboard/icons/completed.svg' : '/dashboard/icons/pending.svg'} 
                  alt="Status" 
                  width={applicationStep >= 3 ? 22 : 27} 
                  height={applicationStep >= 3 ? 20 : 27} 
                  className="object-contain shrink-0" 
                />
              </div>
            </div>

            {/* Labels Row */}
            <div className="flex justify-between items-start w-full mt-2">
              {/* Step 1 Label */}
              <div className="w-[120px] flex flex-col items-center text-center gap-0.5">
                <span className="text-[11px] font-medium text-pneutral-800 font-body leading-tight">
                  Application Submission
                </span>
                <span className="text-[10px] font-bold text-success-600 font-body">
                  Completed
                </span>
              </div>

              {/* Step 2 Label */}
              <div className="w-[120px] flex flex-col items-center text-center gap-0.5">
                <span className="text-[11px] font-medium text-pneutral-800 font-body leading-tight">
                  Under Review
                </span>
                <span className={`text-[10px] font-bold font-body ${applicationStep >= 2 ? 'text-secondary-600' : 'text-pneutral-400'}`}>
                  {applicationStep >= 2 ? 'In Progress' : 'Pending'}
                </span>
              </div>

              {/* Step 3 Label */}
              <div className="w-[120px] flex flex-col items-center text-center gap-0.5">
                <span className={`text-[11px] font-medium font-body leading-tight ${applicationStep >= 3 ? 'text-pneutral-800' : 'text-pneutral-400'}`}>
                  Approved
                </span>
                <span className={`text-[10px] font-bold font-body ${applicationStep >= 3 ? 'text-success-600' : 'text-pneutral-400'}`}>
                  {applicationStep >= 3 ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Two empty identical boxes below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] shrink-0"></div>
        <div className="w-full h-[208px] bg-white border border-pneutral-200 rounded-[10px] shrink-0"></div>
      </div>

    </div>
  );
}
