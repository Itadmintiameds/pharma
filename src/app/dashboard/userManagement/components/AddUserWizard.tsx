'use client';

import React, { useState, useEffect, useRef } from 'react';
import UserDetails from './UserDetails';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { getCities, getAllRoles, createUser, uploadUserImage } from '@/services/UserManagementService';
import RolesPermissions from './RolesPermissions';

interface AddUserWizardProps {
  onBack: () => void;
}

export default function AddUserWizard({ onBack }: AddUserWizardProps) {
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

  const [rolePermissions, setRolePermissions] = useState<Record<number, Record<number, boolean>>>({});
  
  const [cities, setCities] = useState<{pharmacyId: string, pharmacyName: string, pharmacyCity: string}[]>([]);
  const [roles, setRoles] = useState<{roleId: number, roleName: string}[]>([]);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createdUserId, setCreatedUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [citiesData, rolesData] = await Promise.all([
          getCities(),
          getAllRoles()
        ]);
        setCities(citiesData || []);
        setRoles(rolesData || []);
      } catch (err) {
        console.error("Failed to fetch role management data", err);
      }
    };
    fetchInitialData();
  }, []);

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

      if (newUserId) {
        setCreatedUserId(newUserId);
      //  setCreatedUserData(response.user || response);
      }

      if (newUserId && imageFile) {
        await uploadUserImage(newUserId, imageFile);
      }

      setStep(3); // Advance to preview step on success instead of closing
    } catch (err) {
      console.error("Failed to create user", err);
    }
  };

  const handleNextStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.designation) newErrors.designation = 'Designation is required';
    if (!formData.location || formData.location.length === 0) newErrors.location = 'At least one location must be assigned';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile Number is required';
    if (!formData.dob) newErrors.dob = 'Date of Birth is required';
    
    // Check if email is provided and valid
    if (!formData.emailId.trim()) {
      newErrors.emailId = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
      newErrors.emailId = 'Invalid email format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setStep(2);
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
          <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
            Mobile Number <span className="text-warning-500">*</span>
          </label>
          <div className={`flex h-12 w-full items-center rounded-md border ${errors.mobileNumber ? 'border-warning-500' : 'border-pneutral-300'} bg-white transition-all`}>
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
                    if (errors.mobileNumber) setErrors({ ...errors, mobileNumber: '' });
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
          required
          placeholder="johndoe@gmail.com" 
          value={formData.emailId}
          onChange={(e) => {
            setFormData({ ...formData, emailId: e.target.value });
            if (errors.emailId) setErrors({ ...errors, emailId: '' });
          }}
          onBlur={(e) => {
            const val = e.target.value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (val && !emailRegex.test(val)) {
              setErrors({ ...errors, emailId: 'Invalid email format' });
            } else if (!val) {
              setErrors({ ...errors, emailId: 'Email ID is required' });
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
          required
          placeholder="12-10-2016" 
          value={formData.dob}
          onChange={(e) => {
            setFormData({ ...formData, dob: e.target.value });
            if (errors.dob) setErrors({ ...errors, dob: '' });
          }}
          error={errors.dob}
          leftIcon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          }
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
          onChange={(val) => {
            setFormData({ ...formData, gender: val });
            if (errors.gender) setErrors({ ...errors, gender: '' });
          }}
          error={errors.gender}
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
          onChange={(val) => {
            setFormData({ ...formData, department: val });
            if (errors.department) setErrors({ ...errors, department: '' });
          }}
          error={errors.department}
        />

        <Dropdown
          label="Designation"
          required
          placeholder="Select Designation"
          options={roles.map(r => ({ label: r.roleName, value: r.roleId }))}
          value={formData.designation}
          onChange={(val) => {
            setFormData({ ...formData, designation: val });
            if (errors.designation) setErrors({ ...errors, designation: '' });
          }}
          error={errors.designation}
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
          onChange={(val) => {
            setFormData({ ...formData, location: val });
            if (errors.location) setErrors({ ...errors, location: '' });
          }}
          error={errors.location}
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
        <RolesPermissions mode="assign" onPermissionsChange={setRolePermissions} />
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="w-full h-full overflow-auto -m-4 p-4">
      <UserDetails userId={createdUserId || 1} />
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
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white bg-white"
        >
          Cancel
        </button>
        {step === 1 && (
          <button 
            onClick={handleNextStep1}
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
            onClick={onBack}
            className="px-8 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}