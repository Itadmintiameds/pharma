'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardMain() {
  // Dynamic compliance status from DB simulation (default: 'Not Submitted')
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

  return (
  
    <div className="flex flex-col select-none font-body w-full max-w-7xl gap-5">
      
      {/* 1. Compliance Warning Banner */}
      <div 
        className="w-full h-[75px] bg-danger-50 border border-danger-200 rounded-[10px] p-4 flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          {/* Warning Icon */}
          <div className="shrink-0">
            <Image 
              src="/dashboard/icons/yellow warning icon.svg" 
              alt="Warning Icon" 
              width={24} 
              height={24}
              className="object-contain"
            />
          </div>

          {/* Text block */}
          <div className="flex flex-col gap-0.5">
            <p className="text-[12px] font-semibold text-pneutral-900 leading-normal">
              Compliance submission is mandatory to activate inventory operations.
            </p>
            <p 
              className="text-[10px] font-normal leading-normal"
              style={{ color: '#A37D00' }}
            >
              Submit your compliance details to get verified by TiaMeds Admin.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Link 
          href="/dashboard/compliance"
          className="bg-danger-600 hover:bg-danger-700 text-white text-[12px] font-medium px-4 py-1.5 rounded-[8px] transition-all duration-200 shrink-0"
          style={{ backgroundColor: '#A37D00' }}
        >
          Submit Details
        </Link>
      </div>

      {/* 2. Stat Cards Row (3 Cards) */}
      <div className="w-full flex flex-col md:flex-row gap-4 shrink-0">
        
        {/* Card 1: Healthcare Entity Card */}
        <div 
          className="flex-1 h-[140px] bg-white border border-pneutral-200 rounded-[10px] p-5 flex flex-col justify-between shrink-0"
        >
          {/* Card Label */}
          <span className="text-[12px] font-medium text-pneutral-400 font-heading self-start">
            Healthcare Entity
          </span>

          {/* Card Body */}
          <div className="flex items-center gap-3 w-[200px] h-[60px]">
            {/* Hospital Icon */}
            <div className="w-[36px] h-[36px] shrink-0 relative flex items-center justify-center">
              <Image 
                src="/dashboard/icons/hospital icon.svg" 
                alt="Hospital Icon" 
                width={36} 
                height={36}
                className="object-contain"
              />
            </div>

            {/* Text block */}
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[14px] font-bold text-pneutral-900 leading-normal truncate font-heading">
                {hospitalName}
              </span>
              <span className="text-[11px] font-normal text-pneutral-500 leading-normal font-body">
                {entityType}
              </span>
              <span className="text-[10px] font-normal text-pneutral-400 leading-normal font-body">
                ID: ABHOS0001
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Compliance Status Card */}
        <div 
          className="flex-1 h-[140px] bg-white border border-pneutral-200 rounded-[10px] p-5 flex flex-col justify-between shrink-0"
        >
          {/* Card Label */}
          <span className="text-[12px] font-medium text-pneutral-400 font-heading self-start">
            Compliance Status
          </span>

          {/* Card Body */}
          <div className="w-[219px] h-[60px] flex flex-col justify-end gap-1.5">
            <span className="text-[16px] font-bold text-warning-500 leading-normal font-heading">
              {complianceStatus}
            </span>
            <span className="text-[11px] font-normal text-pneutral-500 leading-normal font-body">
              Please submit your compliance details.
            </span>
          </div>
        </div>

        {/* Card 3: Account Status Card */}
        <div 
          className="flex-1 h-[140px] bg-white border border-pneutral-200 rounded-[10px] p-5 flex flex-col justify-between shrink-0"
        >
          {/* Card Label */}
          <span className="text-[12px] font-medium text-pneutral-400 font-heading self-start">
            Account Status
          </span>

          {/* Card Body */}
          <div className="w-[219px] h-[60px] flex flex-col justify-end gap-1.5">
            <span className="text-[16px] font-bold text-danger-500 leading-normal font-heading">
              Pending
            </span>
            <span className="text-[11px] font-normal text-pneutral-500 leading-normal font-body">
              Compliance Submission
            </span>
          </div>
        </div>

      </div>

      {/* 3. Larger Widgets Row (2 Cards) */}
      <div className="w-full flex flex-col md:flex-row gap-5 shrink-0">
        
        {/* Left Card: Getting Started Widget */}
        <div 
          className="flex-1 h-[222px] bg-white border border-pneutral-200 rounded-[10px] p-5 flex flex-col gap-4 shrink-0"
        >
          <h3 className="text-[16px] font-bold text-pneutral-900 font-heading">Getting Started</h3>
          
          <div className="flex flex-col gap-3">
            {/* Step 1: Complete your profile (Completed) */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[14px] font-normal text-pneutral-500 font-body">
                Complete your profile
              </span>
            </div>

            {/* Step 2: Submit compliance documents */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 text-white text-[12px] font-bold">
                2
              </div>
              <span className="text-[14px] font-normal text-pneutral-800 font-body">
                Submit compliance documents
              </span>
            </div>

            {/* Step 3: Verification by TiaMeds Admin */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 text-white text-[12px] font-bold">
                3
              </div>
              <span className="text-[14px] font-normal text-pneutral-800 font-body">
                Verification by TiaMeds Admin
              </span>
            </div>

            {/* Step 4: Start using inventory features */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 text-white text-[12px] font-bold">
                4
              </div>
              <span className="text-[14px] font-normal text-pneutral-800 font-body">
                Start using inventory features
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Need Help? Widget */}
        <div 
          className="flex-1 h-[222px] bg-white border border-pneutral-200 rounded-[10px] p-5 flex flex-col justify-start gap-6 shrink-0"
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-[16px] font-bold text-pneutral-900 font-heading">Need Help?</h3>
            <p className="text-[14px] font-normal text-pneutral-500 font-body leading-relaxed">
              Contact our support team for any assistance.
            </p>
          </div>

          {/* Contact Support Button */}
          <button 
            onClick={() => console.log('Support clicked')}
            className="w-[191px] h-[48px] border-2 border-secondary-700 rounded-[8px] flex items-center justify-center gap-2 text-secondary-700 hover:bg-secondary-50 transition-colors shrink-0 font-heading font-medium text-[16px] select-none"
          >
            <Image 
              src="/dashboard/icons/headphone.svg" 
              alt="Support" 
              width={20} 
              height={20}
              className="object-contain shrink-0"
            />
            <span>Contact Support</span>
          </button>
        </div>

      </div>

      {/* 4. Restricted Modules (Available after approval) */}
      <div className="w-full flex flex-col gap-3 mt-[-13px] shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-bold text-pneutral-900 font-heading">Restricted Modules</h3>
          <span className="text-[12px] font-semibold text-[#FF3B3B] font-body">(Available after approval)</span>
        </div>

        {/* Row of cards styled to stretch to full page width */}
        <div className="flex flex-row gap-3 w-full overflow-hidden">
          {restrictedModules.map((module) => (
            <div 
              key={module.name}
              className="flex-1 h-[100px] bg-white border border-pneutral-200 rounded-[10px] p-4 flex flex-col items-center justify-center gap-2.5 cursor-not-allowed hover:shadow-md transition-all duration-200 overflow-hidden shrink-0 select-none"
            >
              {/* Render SVG directly (renders native #5A5B58 pneutral-700 path color) */}
              <Image 
                src={module.icon} 
                alt={module.name} 
                width={36} 
                height={36}
                className="object-contain"
              />
              {/* Module Name Label */}
              <span className="text-[12px] font-semibold text-pneutral-400 font-body tracking-tight text-center leading-none">
                {module.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

