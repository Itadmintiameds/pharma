'use client';

import React, { useState, useEffect, useRef } from 'react';
import UserDetails from './UserDetails';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { getAllModules, getFeaturesByModuleId, getPermissions, getCities, getAllRoles, createUser, uploadUserImage } from '@/services/UserManagementService';

export default function AddUserWizard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    mobileNumber: '',
    emailId: '',
    dob: '',
    gender: '',
    department: '',
    designation: '',
    location: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalSteps = 3;

  const [modules, setModules] = useState<{moduleId: number, moduleName: string}[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [features, setFeatures] = useState<{featureId: number, featureName: string, featureCode: string}[]>([]);
  const [permissions, setPermissions] = useState<{permissionId: number, permissionName: string}[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<number, Record<number, boolean>>>({});
  
  const [cities, setCities] = useState<{pharmacyId: string, pharmacyName: string, pharmacyCity: string}[]>([]);
  const [roles, setRoles] = useState<{roleId: number, roleName: string}[]>([]);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [mods, perms, citiesData, rolesData] = await Promise.all([
          getAllModules(),
          getPermissions(),
          getCities(),
          getAllRoles()
        ]);
        setModules(mods);
        setPermissions(perms);
        setCities(citiesData || []);
        setRoles(rolesData || []);
        if (mods && mods.length > 0) {
          setSelectedModuleId(mods[0].moduleId);
        }
      } catch (err) {
        console.error("Failed to fetch role management data", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedModuleId !== null) {
      const fetchFeatures = async () => {
        try {
          const data = await getFeaturesByModuleId(selectedModuleId);
          setFeatures(data.features || []);
        } catch (err) {
          console.error("Failed to fetch features", err);
        }
      };
      fetchFeatures();
    }
  }, [selectedModuleId]);

  const handleSave = async () => {
    try {
      const permissionsPayload: any[] = [];
      Object.keys(rolePermissions).forEach(featureIdStr => {
        const featureId = parseInt(featureIdStr);
        const permMap = rolePermissions[featureId];
        const permissionIds = Object.keys(permMap)
          .filter(permIdStr => permMap[parseInt(permIdStr)])
          .map(permIdStr => parseInt(permIdStr));
        
        if (permissionIds.length > 0) {
          permissionsPayload.push({ featureId, permissionIds });
        }
      });

      const payload = {
        user: {
          userEmail: formData.emailId || null,
          password: "Password@123",
          fullName: formData.fullName || null,
          userPhone: formData.mobileNumber || null,
          employeeId: formData.employeeId || null,
          dob: formData.dob || null,
          gender: formData.gender || null,
          department: formData.department || null,
          imageUrl: null,
          pharmaRolesDto: {
            roleId: (formData.designation && !isNaN(parseInt(String(formData.designation))))
                      ? parseInt(String(formData.designation))
                      : 2
          }
        },
        pharmacyIds: formData.location,
        permissions: permissionsPayload
      };

      const response = await createUser(payload);
      const newUserId = response.user?.userId || response.userId || response.id; // Correct extraction from CreateUserResponseDto

      if (newUserId && imageFile) {
        await uploadUserImage(newUserId, imageFile);
      }

      setStep(3); // Advance to preview step on success instead of closing
    } catch (err) {
      console.error("Failed to create user", err);
    }
  };

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
          <div className="absolute top-[39px] left-8 right-8 h-[1.75px] bg-[#1E1E1D] z-0"></div>
          
          {/* Step 1 */}
          <div className="flex flex-col items-center bg-gray-50 px-4 relative z-10">
            <div 
              className={`w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${step >= 1 ? 'bg-[#7D32FC] text-white border-[0.53px] border-[#7D32FC]' : 'bg-white text-[#1E1E1D]'}`}
              style={step < 1 ? { border: '1px solid #1E1E1D' } : {}}
            >
              1
            </div>
            <span className={`text-[12px] ${step >= 1 ? 'text-[#7D32FC] font-semibold' : 'text-gray-500 font-medium'}`}>Personal Info</span>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col items-center bg-gray-50 px-4 relative z-10">
            <div 
              className={`w-[35px] h-[35px] rounded-full flex items-center justify-center text-sm font-semibold mb-2 ${step >= 2 ? 'bg-[#7D32FC] text-white border-[0.53px] border-[#7D32FC]' : 'bg-white text-[#1E1E1D]'}`}
              style={step < 2 ? { border: '1px solid #1E1E1D' } : {}}
            >
              2
            </div>
            <span className={`text-[12px] ${step >= 2 ? 'text-[#7D32FC] font-semibold' : 'text-gray-500 font-medium'}`}>Role Assignment</span>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center bg-gray-50 px-1 relative z-10">
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
        <Input 
          label="Employee ID" 
          placeholder="Emp-00001" 
          maxLength={15}
          value={formData.employeeId}
          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
        />
        
        <Input 
          label="Full Name" 
          required
          placeholder="John Doe" 
          value={formData.fullName}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^[a-zA-Z\s]+$/.test(val)) {
              if (val.length <= 30) {
                setFormData({ ...formData, fullName: val });
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }
            }
          }}
          error={errors.fullName}
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
            <input 
              type="text" 
              placeholder="Enter company phone" 
              className="h-full w-full bg-transparent px-3 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500" 
              value={formData.mobileNumber}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^[0-9]+$/.test(val)) {
                  if (val.length <= 10) {
                    setFormData({ ...formData, mobileNumber: val });
                  }
                }
              }}
            />
          </div>
          {errors.mobileNumber && <p className="mt-1 text-p2 text-warning-500">{errors.mobileNumber}</p>}
        </div>

        <Input 
          label="Email ID" 
          type="email"
          placeholder="johndoe@gmail.com" 
          value={formData.emailId}
          onChange={(e) => setFormData({ ...formData, emailId: e.target.value })}
          onBlur={(e) => {
            const val = e.target.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (val && !emailRegex.test(val)) {
              setErrors({ ...errors, emailId: 'Invalid email format' });
            } else {
              setErrors({ ...errors, emailId: '' });
            }
          }}
          error={errors.emailId}
          leftIcon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          }
        />

        <Input 
          label="Date of Birth" 
          type="date"
          placeholder="12-10-2016" 
          value={formData.dob}
          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
        />

        <Dropdown
          label="Gender"
          required
          placeholder="Female"
          options={[
            { label: 'Female', value: 'Female' },
            { label: 'Male', value: 'Male' },
            { label: 'Other', value: 'Other' }
          ]}
          value={formData.gender}
          onChange={(val) => setFormData({ ...formData, gender: val })}
        />

        <Dropdown
          label="Department"
          required
          placeholder="Pharmacy"
          options={[
            { label: 'Pharmacy', value: 'Pharmacy' },
            { label: 'Operations', value: 'Operations' }
          ]}
          value={formData.department}
          onChange={(val) => setFormData({ ...formData, department: val })}
        />

        <Dropdown
          label="Designation"
          required
          allowOther
          placeholder="Select Designation"
          options={roles.map(r => ({ label: r.roleName, value: r.roleId }))}
          value={formData.designation}
          onChange={(val) => setFormData({ ...formData, designation: val })}
        />

        <Dropdown
          label="Location Assigned"
          required
          searchable
          multiple
          placeholder="Search Location...."
          options={cities.map(c => ({
            label: `${c.pharmacyName} - ${c.pharmacyCity}`,
            value: c.pharmacyId
          }))}
          value={formData.location}
          onChange={(val) => setFormData({ ...formData, location: val })}
        />

        <div className="w-full">
          <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">Upload Photo</label>
          <input 
            type="file" 
            accept="image/jpeg, image/png" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setImageFile(e.target.files[0]);
              }
            }}
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 w-full items-center justify-between rounded-md border border-dashed border-pneutral-300 bg-gray-50 transition-all px-3 cursor-pointer hover:bg-gray-100"
          >
            <span className="text-p4 text-pneutral-500 truncate">
              {imageFile ? imageFile.name : "click to browse JPEG or PNG"}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    return (
      <div className="w-full flex-1 flex gap-[10px] items-stretch min-h-0">
        
        {/* Modules Card (Left) */}
        <div className="w-[210px] h-full p-[16px] flex flex-col gap-[8px] rounded-[12px] border-[1px] border-gray-200 bg-white shadow-sm shrink-0">
          <div className="w-full h-[40px] p-[8px] border-b-[1px] border-gray-200 shrink-0">
            <h3 className="font-medium text-[16px] leading-[24px] text-[#3C3D3A]">Modules</h3>
          </div>
          <div className="w-full flex-1 flex flex-col gap-[4px] overflow-y-auto min-h-0">
            {modules.map((mod) => (
              <div 
                key={mod.moduleId} 
                onClick={() => setSelectedModuleId(mod.moduleId)}
                className={`w-full min-h-[36px] max-h-[44px] px-3 rounded-md flex justify-between items-center cursor-pointer shrink-0 ${selectedModuleId === mod.moduleId ? 'bg-[#F3EDFF] text-[#7E3AF2]' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="text-sm font-medium truncate pr-2">{mod.moduleName}</span>
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
              {features.map((f) => (
                <div key={f.featureId} className="w-[180px] h-[68px] p-[12px_8px_12px_8px] border-b-[1px] border-gray-200 shrink-0 flex items-center gap-[4px]">
                  <span className="h-[20px] text-[14px] leading-[20px] font-normal text-[#1E1E1D] truncate" title={f.featureName}>{f.featureName}</span>
                </div>
              ))}
            </div>

            {/* Other columns (View, Create, etc) */}
            {permissions.map((p) => (
              <div key={p.permissionId} className="flex-1 flex flex-col min-w-[78px]">
                <div className="w-full h-[72px] p-[16px_8px_16px_8px] border-b-[1px] border-[#EAEAE9] bg-[#F9F9F8] shrink-0 flex items-center justify-center gap-[10px]">
                  <span className="h-[20px] text-[14px] leading-[20px] font-semibold text-[#1E1E1D]" title={p.permissionName}>
                    {p.permissionName.charAt(0).toUpperCase() + p.permissionName.slice(1).toLowerCase()}
                  </span>
                </div>
                {features.map((f) => (
                  <div key={f.featureId} className="w-full h-[68px] p-[12px_8px_12px_8px] border-b-[1px] border-gray-200 shrink-0 flex items-center justify-center gap-[4px]">
                    <input 
                      type="checkbox" 
                      checked={!!rolePermissions[f.featureId]?.[p.permissionId]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRolePermissions(prev => ({
                          ...prev,
                          [f.featureId]: {
                            ...(prev[f.featureId] || {}),
                            [p.permissionId]: checked
                          }
                        }));
                      }}
                      className="h-5 w-5 rounded border-gray-300 outline-none cursor-pointer checked:shadow-[0_0_0_2px_#E0E7FFCC]"
                      style={{
                        accentColor: 'var(--Colors-Brand-Primary-900, #4C0080)'
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
      <UserDetails userId={1}/>
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
        {step === 1 && (
          <button 
            onClick={() => setStep(2)}
            className="px-8 py-2 bg-[#7E3AF2] text-white rounded-lg font-medium hover:bg-[#6c2bd9]"
          >
            Next
          </button>
        )}
        {step === 2 && (
          <button 
            onClick={handleSave}
            className="px-8 py-2 bg-[#7E3AF2] text-white rounded-lg font-medium hover:bg-[#6c2bd9]"
          >
            Save Changes
          </button>
        )}
        {step === 3 && (
          <button 
            onClick={() => onCancel()}
            className="px-8 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}