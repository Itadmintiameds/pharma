'use client';

import React, { useState } from 'react';
import UserDetails from './UserDetails';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';

export default function AddUserWizard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: '',
    department: '',
    designation: '',
    location: [] as string[]
  });
  const totalSteps = 3;

  const renderHeader = () => {
    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Title */}
        <div className="flex justify-between items-center w-full h-[30px]">
          <h2 className="font-semibold text-[32px] leading-[38px] text-[#1E1E1D]">
            Add Users
          </h2>
          <span className="text-sm text-gray-500 font-medium">Step {step} of {totalSteps}</span>
        </div>
        
        {/* Progress Bar Wrapper */}
        <div className="flex justify-between items-center w-full min-h-[50px] relative px-4">
          <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-gray-200 -z-10 transform -translate-y-1/2"></div>
          
          {/* Step 1 */}
          <div className="flex flex-col items-center bg-gray-50 px-4">
            <div 
              className={`w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${step >= 1 ? 'bg-[#7D32FC] text-white border-[0.53px] border-[#7D32FC]' : 'bg-white text-[#1E1E1D]'}`}
              style={step < 1 ? { border: '1px solid #1E1E1D' } : {}}
            >
              1
            </div>
            <span className={`text-[12px] ${step >= 1 ? 'text-[#7D32FC] font-semibold' : 'text-gray-500 font-medium'}`}>Personal Info</span>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col items-center bg-gray-50 px-4">
            <div 
              className={`w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${step >= 2 ? 'bg-[#7D32FC] text-white border-[0.53px] border-[#7D32FC]' : 'bg-white text-[#1E1E1D]'}`}
              style={step < 2 ? { border: '1px solid #1E1E1D' } : {}}
            >
              2
            </div>
            <span className={`text-[12px] ${step >= 2 ? 'text-[#7D32FC] font-semibold' : 'text-gray-500 font-medium'}`}>Role Assignment</span>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center bg-gray-50 px-1">
            <div 
              className={`w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${step >= 3 ? 'bg-[#7D32FC] text-white border-[0.53px] border-[#7D32FC]' : 'bg-white text-[#1E1E1D]'}`}
              style={step < 3 ? { border: '1px solid #1E1E1D' } : {}}
            >
              3
            </div>
            <span className={`text-[12px] ${step >= 3 ? 'text-[#7D32FC] font-semibold' : 'text-gray-500 font-medium'}`}>Complete</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="w-full flex-1 p-[14px] gap-[24px] rounded-[12px] border-[0.89px] border-pneutral-100 bg-white flex flex-col shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 shrink-">Personal Information</h3>
      
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Input label="Employee ID" placeholder="Emp-00001" />
        
        <Input 
          label="Full Name" 
          placeholder="John Doe" 
          leftIcon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          }
        />

        <div className="w-full">
          <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">Mobile Number</label>
          <div className="flex h-12 w-full items-center rounded-md border border-pneutral-300 bg-white transition-all">
            <select className="h-full bg-transparent border-r border-pneutral-300 px-3 text-p4 text-pneutral-900 outline-none">
              <option>+91</option>
            </select>
            <input type="text" placeholder="Enter company phone" className="h-full w-full bg-transparent px-3 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500" />
          </div>
        </div>

        <Input 
          label="Email ID" 
          type="email"
          placeholder="johndoe@gmail.com" 
          leftIcon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          }
        />

        <Input 
          label="Date of Birth" 
          type="text"
          placeholder="12-10-2016" 
          leftIcon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          }
        />

        <Dropdown
          label="Gender"
          required
          placeholder="Female"
          options={[
            { label: 'Female', value: 'female' },
            { label: 'Male', value: 'male' },
            { label: 'Other', value: 'other' }
          ]}
          value={formData.gender}
          onChange={(val) => setFormData({ ...formData, gender: val })}
        />

        <Dropdown
          label="Department"
          required
          placeholder="Pharmacy"
          options={[
            { label: 'Pharmacy', value: 'pharmacy' },
            { label: 'Operations', value: 'operations' }
          ]}
          value={formData.department}
          onChange={(val) => setFormData({ ...formData, department: val })}
        />

        <Dropdown
          label="Designation"
          required
          placeholder="Admin"
          options={[
            { label: 'Admin', value: 'admin' },
            { label: 'Manager', value: 'manager' }
          ]}
          value={formData.designation}
          onChange={(val) => setFormData({ ...formData, designation: val })}
        />

        <Dropdown
          label="Location Assigned"
          required
          searchable
          multiple
          placeholder="Search Location...."
          options={[
            { label: 'Headquarters', value: 'hq' },
            { label: 'Branch 1 - NY', value: 'branch1' },
            { label: 'Branch 2 - CA', value: 'branch2' }
          ]}
          value={formData.location}
          onChange={(val) => setFormData({ ...formData, location: val })}
        />

        <div className="w-full">
          <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">Upload Photo</label>
          <div className="flex h-12 w-full items-center justify-between rounded-md border border-dashed border-pneutral-300 bg-gray-50 transition-all px-3 cursor-pointer hover:bg-gray-100">
            <span className="text-p4 text-pneutral-500">click to browse JPEG or PNG</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const modules = ['Dashboard', 'Products', 'Suppliers', 'Purchase', 'Stack Management', 'Sales & Billing', 'Reports', 'User Management', 'Settings'];
    const permissions = ['Stock Overview', 'Stock Adjustment', 'Stock Transfer', 'Physical Verification', 'Stock Reconciliation', 'Stock Reports'];
    const cols = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Print', 'Export'];

    return (
      <div className="w-full flex-1 flex gap-[10px] items-stretch min-h-0">
        
        {/* Modules Card (Left) */}
        <div className="w-[210px] h-full p-[16px] flex flex-col gap-[8px] rounded-[12px] border-[1px] border-gray-200 bg-white shadow-sm shrink-0">
          <div className="w-full h-[40px] p-[8px] border-b-[1px] border-gray-200 shrink-0">
            <h3 className="font-medium text-[16px] leading-[24px] text-[#3C3D3A]">Modules</h3>
          </div>
          <div className="w-full flex-1 flex flex-col gap-[4px] overflow-y-auto min-h-0">
            {modules.map((mod, idx) => (
              <div 
                key={idx} 
                className={`w-full min-h-[36px] max-h-[44px] px-3 rounded-md flex justify-between items-center cursor-pointer shrink-0 ${mod === 'Stack Management' ? 'bg-[#F3EDFF] text-[#7E3AF2]' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="text-sm font-medium truncate pr-2">{mod}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            ))}
          </div>
        </div>

        {/* Role Management Card (Right) */}
        <div className="flex-1 h-full p-[16px] flex flex-col gap-[8px] rounded-[12px] border-[1px] border-gray-200 bg-white shadow-sm min-w-0">
          <div className="w-full h-[46px] flex flex-col gap-[4px] shrink-0">
            <h3 className="font-semibold text-[16px] leading-[24px] text-gray-900">Role Management</h3>
          </div>
          
          <div className="w-full flex-1 overflow-auto flex min-h-0">
            {/* Column 1: Permissions */}
            <div className="w-[180px] flex flex-col shrink-0">
              <div className="w-[180px] h-[72px] p-[16px_8px_16px_8px] border-b-[1px] border-[#EAEAE9] bg-[#F9F9F8] shrink-0 flex items-center gap-[10px]">
                <span className="h-[20px] text-[14px] leading-[20px] font-semibold text-[#1E1E1D]">Permission</span>
              </div>
              {permissions.map((p, i) => (
                <div key={i} className="w-[180px] h-[68px] p-[12px_8px_12px_8px] border-b-[1px] border-gray-200 shrink-0 flex items-center gap-[4px]">
                  <span className="h-[20px] text-[14px] leading-[20px] font-normal text-[#1E1E1D] truncate">{p}</span>
                </div>
              ))}
            </div>

            {/* Other columns (View, Create, etc) */}
            {cols.map(c => (
              <div key={c} className="flex-1 flex flex-col min-w-[78px]">
                <div className="w-full h-[72px] p-[16px_8px_16px_8px] border-b-[1px] border-[#EAEAE9] bg-[#F9F9F8] shrink-0 flex items-center justify-center gap-[10px]">
                  <span className="h-[20px] text-[14px] leading-[20px] font-semibold text-[#1E1E1D]">{c}</span>
                </div>
                {permissions.map((p, i) => (
                  <div key={i} className="w-full h-[68px] p-[12px_8px_12px_8px] border-b-[1px] border-gray-200 shrink-0 flex items-center justify-center gap-[4px]">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 rounded border-gray-300 outline-none cursor-pointer"
                      style={{
                        accentColor: 'var(--Colors-Brand-Primary-900, #4C0080)',
                        boxShadow: '0px 0px 0px 2px #E0E7FFCC'
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  };

  const renderStep3 = () => (
    <div className="w-full flex-1 bg-white rounded-[12px] border-[0.89px] border-pneutral-100 p-[16px] gap-[16px] shadow-sm flex items-center justify-center">
      <UserDetails />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full justify-between items-stretch">
      <div className="flex flex-col gap-2 w-full">
        {renderHeader()}
      </div>

      <div className="flex-1 flex flex-col w-full min-h-0">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className="w-full flex justify-end gap-4 mt-1 shrink-0">
        <button 
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white bg-white"
        >
          Cancel
        </button>
        {step < 3 ? (
          <button 
            onClick={() => setStep(step + 1)}
            className="px-8 py-2 bg-[#7E3AF2] text-white rounded-lg font-medium hover:bg-[#6c2bd9]"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={() => {
              onCancel();
            }}
            className="px-8 py-2 bg-[#7E3AF2] text-white rounded-lg font-medium hover:bg-[#6c2bd9]"
          >
            Save Changes
          </button>
        )}
      </div>
    </div>
  );
}