'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import UserDetails from './UserDetails';
import Input from '@/app/components/common/Input';
import Dropdown from '@/app/components/common/Dropdown';
import { getCities, getAllRoles, createUser, updateUser, uploadUserImage, checkUserEmail, checkEmployeeId, getUserById } from '@/services/UserManagementService';
import { getUserOrganization } from '@/services/SetupBusinessService';
import { getWarehousesByOrganizationId } from '@/services/SetupWarehouseService';
import { sendEmailOtp, verifyEmailOtp } from '@/services/AuthService';
import { showToast } from '@/app/components/common/Toast';
import RolesPermissions from './RolesPermissions';
import {
  availableModuleKeys,
  isSingleLocationOrganization,
  isSuperAdminRole,
  isWarehouseManagerRole as roleNameIsWarehouseManager,
} from '@/access/accessControl';
import { useAccess } from '@/app/components/providers/AccessProvider';

interface AddUserWizardProps {
  onBack: () => void;
  /**
   * Editing an existing user rather than adding one: their user code, e.g.
   * "USR-2026-00003". The same three steps run, prefilled from the account, with
   * everything the update endpoint does not accept — email, password, photo —
   * locked.
   */
  editUserId?: string | number;
  /** Called after a successful update, so the caller can re-read the account. */
  onSaved?: () => void;
}

export default function AddUserWizard({ onBack, editUserId, onSaved }: AddUserWizardProps) {
  const isEdit = editUserId !== undefined && editUserId !== null && editUserId !== '';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    mobileNumber: '',
    emailId: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '',
    department: '',
    // Holds a roleId, which the dropdown carries as a number.
    designation: '' as string | number,
    location: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalSteps = 3;

  const [rolePermissions, setRolePermissions] = useState<Record<number, Record<number, boolean>>>({});
  
  const [cities, setCities] = useState<{pharmacyId: string, pharmacyName: string, pharmacyCity: string}[]>([]);
  const [warehouses, setWarehouses] = useState<{warehouseId: string, warehouseName: string, warehouseAddress: string}[]>([]);
  const [roles, setRoles] = useState<{roleId: number, roleName: string}[]>([]);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  // The employee id the account already had. An unchanged one must not be
  // reported as "already exists" against itself.
  const [originalEmployeeId, setOriginalEmployeeId] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  /** The photo the account already has, shown beside the picker. */
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  /** True when the account being edited is the signed-in user's own. */
  const [isOwnAccount, setIsOwnAccount] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  /**
   * A photo is set by whoever administers the account, so nobody replaces their
   * own — except a super admin, who administers everything including themselves.
   */
  const canUploadImage = !isEdit || !isOwnAccount || isSuperAdmin;

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showOtp, setShowOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [citiesData, rolesData] = await Promise.all([
          getCities(),
          getAllRoles()
        ]);
        setCities(citiesData || []);
        setRoles(rolesData || []);

        // Warehouse Managers are assigned warehouse locations instead of
        // pharmacies, so fetch the org's central warehouse(s) up front.
        const org = await getUserOrganization();
        if (org && org.organizationId) {
          const orgWarehouses = await getWarehousesByOrganizationId(org.organizationId);
          setWarehouses((orgWarehouses as { warehouseId: string, warehouseName: string, warehouseAddress: string }[]) || []);
        }
      } catch (err) {
        console.error("Failed to fetch role management data", err);
      }
    };
    fetchInitialData();
  }, []);

  // What the account being created may ever be granted: the role picked in step 1
  // combined with this organization's inventory model. A Warehouse Manager is
  // therefore offered Warehouse Distribution but not Sales or Warehouse Receipt,
  // and the reverse for store-side roles — the same rule the sidebar and the
  // route guards use, so a grant that could never take effect cannot be made.
  const { organization } = useAccess();

  const selectedRoleName = roles.find(
    r => String(r.roleId) === String(formData.designation)
  )?.roleName ?? null;

  // Which designations may be handed out here:
  //  - Super Admin never is: the role owns the organization rather than being
  //    granted from this screen.
  //  - Warehouse Manager only in a multi-location organization; a single-location
  //    one has no warehouse for anyone to manage.
  // Either is still listed when the account being edited already holds it —
  // filtering it out would leave Designation looking cleared.
  const isSingleLocationOrg = isSingleLocationOrganization(
    organization.organizationType
  );

  const assignableRoles = useMemo(
    () =>
      roles.filter(r => {
        if (String(r.roleId) === String(formData.designation)) return true;
        if (isSuperAdminRole(r.roleName)) return false;
        if (isSingleLocationOrg && roleNameIsWarehouseManager(r.roleName)) return false;
        return true;
      }),
    [roles, formData.designation, isSingleLocationOrg]
  );

  const allowedModuleNames = useMemo(
    () =>
      formData.designation
        ? Array.from(availableModuleKeys(selectedRoleName, organization))
        : null,
    [formData.designation, selectedRoleName, organization]
  );

  // Switching to a role with a different module surface invalidates whatever was
  // ticked, so those grants are dropped rather than silently submitted for
  // modules the picker no longer shows. Same surface (a rename, or a swap
  // between two store-side roles) keeps the selections.
  const allowedSignature = (allowedModuleNames ?? []).slice().sort().join(',');
  const previousAllowedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (previousAllowedSignature.current === null) {
      previousAllowedSignature.current = allowedSignature;
      return;
    }
    if (previousAllowedSignature.current === allowedSignature) return;
    previousAllowedSignature.current = allowedSignature;
    setRolePermissions({});
  }, [allowedSignature]);

  // With only one location to assign there is nothing to choose, so it is filled
  // in: the org's single warehouse for a Warehouse Manager, and the single
  // pharmacy of a single-location organization for everyone else. It stays
  // editable — the fields are genuine multi-selects, and a second location may
  // be added later.
  useEffect(() => {
    const role = roles.find(r => String(r.roleId) === String(formData.designation));
    if (!role) return;
    const isWM = role.roleName?.trim().toUpperCase() === 'WAREHOUSE MANAGER';

    const onlyId = isWM
      ? (warehouses.length === 1 ? warehouses[0].warehouseId : null)
      : (cities.length === 1 ? cities[0].pharmacyId : null);
    if (!onlyId) return;

    setFormData(prev =>
      prev.location.length > 0 ? prev : { ...prev, location: [onlyId] }
    );
    setErrors(prev => (prev.location ? { ...prev, location: '' } : prev));
  }, [formData.designation, roles, warehouses, cities]);

  // Editing: fill the form from the account itself, so the wizard opens showing
  // what the user is today rather than an empty form.
  useEffect(() => {
    if (!isEdit) return;

    let active = true;
    const fetchUser = async () => {
      try {
        const data = await getUserById(editUserId as string);
        if (!active || !data) return;

        setFormData({
          employeeId: data.employeeId || '',
          fullName: data.fullName || '',
          mobileNumber: data.userPhone ? String(data.userPhone) : '',
          emailId: data.userEmail || '',
          // Neither is ever sent on an update, so they stay empty and locked.
          password: '',
          confirmPassword: '',
          // The API returns a date-only string; an input[type=date] needs it bare.
          dob: data.dob ? String(data.dob).split('T')[0] : '',
          gender: data.gender || '',
          department: data.department || '',
          designation: data.pharmaRolesDto?.roleId ?? '',
          // A Warehouse Manager's assignment is warehouses, everyone else's is
          // pharmacies; the field carries whichever the account holds.
          location: [
            ...(data.warehouses || []).map(
              (warehouse: { warehouseId?: string }) => warehouse.warehouseId
            ),
            ...(data.pharmacies || []).map(
              (pharmacy: { pharmacyId?: string }) => pharmacy.pharmacyId
            ),
          ].filter((id: string | undefined): id is string => !!id),
        });
        setOriginalEmployeeId(data.employeeId || '');
        setCurrentImageUrl(data.imageUrl || null);

        // Whose account this is, so the photo picker knows to stay shut. Both
        // the code and the email are compared: the token's claim is a code like
        // USR-2026-00003 on some deployments and an email on others.
        try {
          const response = await fetch('/api/user-info');
          if (response.ok && active) {
            const { userId: signedInId, email, role } = await response.json();
            setIsOwnAccount(
              (!!signedInId && !!data.userId && String(signedInId) === String(data.userId)) ||
              (!!email && !!data.userEmail &&
                String(email).toLowerCase() === String(data.userEmail).toLowerCase())
            );
            setIsSuperAdmin(
              String(role || '').toLowerCase().replace(/[^a-z]/g, '') === 'superadmin'
            );
          }
        } catch (err) {
          console.error('Failed to resolve the signed-in user', err);
        }

        // The grants arrive one row per feature+permission pair; the matrix
        // wants them keyed feature -> permission.
        const granted: Record<number, Record<number, boolean>> = {};
        (data.permissions || []).forEach(
          (permission: { featureId: number; permissionId: number }) => {
            if (!granted[permission.featureId]) granted[permission.featureId] = {};
            granted[permission.featureId][permission.permissionId] = true;
          }
        );
        setRolePermissions(granted);

        // Their address is already the account's, so there is nothing to verify.
        setIsEmailVerified(true);
      } catch (err) {
        console.error('Failed to load the user for editing', err);
        showToast.error('Could not load this user.');
      } finally {
        if (active) setIsLoadingUser(false);
      }
    };

    fetchUser();
    return () => {
      active = false;
    };
  }, [isEdit, editUserId]);

  /** The permission matrix as the API takes it: one row per feature. */
  const buildPermissionsPayload = () => {
    const permissionsPayload: { featureId: number; permissionIds: number[] }[] = [];
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
    return permissionsPayload;
  };

  const roleIdOf = () =>
    formData.designation && !isNaN(parseInt(String(formData.designation)))
      ? parseInt(String(formData.designation))
      : 2;

  /**
   * Saves the changes to an existing account. Email and password are left out —
   * the endpoint does not accept them, and the form keeps them locked. A new
   * photo goes up separately, through the same endpoint the create flow uses.
   */
  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      await updateUser(editUserId as string, {
        user: {
          fullName: formData.fullName || null,
          userPhone: formData.mobileNumber || null,
          employeeId: formData.employeeId || null,
          department: formData.department || null,
          gender: formData.gender || null,
          dob: formData.dob || null,
          pharmaRolesDto: { roleId: roleIdOf() },
        },
        // Warehouses for a Warehouse Manager, pharmacies for everyone else —
        // the same split the create payload makes.
        ...(isWarehouseManager
          ? { warehouseIds: formData.location }
          : { pharmacyIds: formData.location }),
        permissions: buildPermissionsPayload(),
      });

      // The photo has its own endpoint, so it goes up after the details are
      // saved. Not part of a create here, so it leaves its own audit row. A
      // failure must not cost the changes that already went through.
      if (imageFile && canUploadImage) {
        try {
          await uploadUserImage(editUserId as string, imageFile);
        } catch (imageErr) {
          console.error('Failed to upload the profile image', imageErr);
          showToast.error('Details saved, but the photo upload failed.');
        }
      }

      showToast.success('User updated successfully');
      // Lets the caller re-read the account before the preview step renders it.
      if (onSaved) onSaved();
      setStep(3);
    } catch (err) {
      console.error('Failed to update user', err);
      showToast.error(err instanceof Error ? err.message : 'Failed to update the user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      const permissionsPayload = buildPermissionsPayload();

      const payload: Record<string, unknown> = {
        user: {
          userEmail: formData.emailId || null,
          password: formData.password,
          fullName: formData.fullName || null,
          userPhone: formData.mobileNumber || null,
          employeeId: formData.employeeId || null,
          dob: formData.dob || null,
          gender: formData.gender || null,
          department: formData.department || null,
          imageUrl: null,
          pharmaRolesDto: { roleId: roleIdOf() }
        },
        permissions: permissionsPayload
      };

      // A Warehouse Manager is assigned warehouses (warehouseIds); every other
      // role is assigned pharmacies (pharmacyIds). Both are lists — the two
      // mappings are many-to-many alike.
      if (isWarehouseManager) {
        payload.warehouseIds = formData.location;
      } else {
        payload.pharmacyIds = formData.location;
      }

      const response = await createUser(payload);
      const newUserId = response.user?.userId || response.userId || response.id; // Correct extraction from CreateUserResponseDto

      if (newUserId) {
        setCreatedUserId(newUserId);
      //  setCreatedUserData(response.user || response);
      }

      if (newUserId && imageFile) {
        // Part of creating the account, so it does not log its own
        // "Profile image updated" row on top of USER_CREATED.
        await uploadUserImage(newUserId, imageFile, true);
      }

      setStep(3); // Advance to preview step on success instead of closing
    } catch (err) {
      console.error("Failed to create user", err);
    }
  };

  const validatePassword = (password: string) => {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,20}$/;

    if (!password) {
      return "Password is required";
    }

    if (!passwordRegex.test(password)) {
      return "Password must be 8-20 characters and include an uppercase letter, lowercase letter, number, and special character.";
    }

    return "";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFormData({ ...formData, password: value });
    setErrors(prev => ({ ...prev, password: validatePassword(value) }));

    if (formData.confirmPassword) {
      if (value !== formData.confirmPassword) {
        setErrors(prev => ({ ...prev, password: validatePassword(value), confirmPassword: "Passwords did not match" }));
      } else {
        setErrors(prev => ({ ...prev, password: validatePassword(value), confirmPassword: "" }));
      }
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFormData({ ...formData, confirmPassword: value });

    if (value !== formData.password) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords did not match" }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: "" }));
    }
  };

  const handleSendOtp = async () => {
    const email = formData.emailId.trim();

    if (!email) {
      setErrors({ ...errors, emailId: 'Email ID is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrors({ ...errors, emailId: 'Please enter a valid email address' });
      return;
    }

    setErrors({ ...errors, emailId: '' });
    setIsSendingOtp(true);

    try {
      const exists = await checkUserEmail(email);
      if (exists) {
        setErrors(prev => ({ ...prev, emailId: 'Email already exists' }));
        return;
      }

      await sendEmailOtp({ email });

      showToast.success("OTP Sent");
      setShowOtp(true);
    } catch (error) {
      if (error instanceof Error) {
        showToast.error(error.message);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async (updatedOtp: string[]) => {
    try {
      await verifyEmailOtp({
        email: formData.emailId,
        otp: updatedOtp.join(""),
      });

      setIsEmailVerified(true);
      setShowOtp(false);
      setOtp(["", "", "", "", "", ""]);
      setErrors(prev => ({ ...prev, emailId: '' }));

      showToast.success("Email verified successfully");
    } catch (error) {
      if (error instanceof Error) {
        showToast.error(error.message);

        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      }
    }
  };

  const handleOtpChange = async (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const updatedOtp = [...newOtp];

    if (updatedOtp.every((digit) => digit !== "")) {
      await verifyOtp(updatedOtp);
    }
  };

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedOtp = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedOtp) return;

    const newOtp = [...otp];

    pastedOtp.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    otpInputRefs.current[Math.min(pastedOtp.length - 1, 5)]?.focus();

    if (newOtp.every((digit) => digit !== "")) {
      verifyOtp(newOtp);
    }
  };

  const handleNextStep1 = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.designation) newErrors.designation = 'Designation is required';
    if (!formData.location || formData.location.length === 0) newErrors.location = 'At least one location must be assigned';
    
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile Number is required';
    } else if (formData.mobileNumber.length < 10) {
      newErrors.mobileNumber = 'Mobile Number must be 10 digits';
    }
    
    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required';
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.dob = 'User must be at least 18 years old';
      }
    }
    
    // Check if employee ID already exists. On an edit the account's own id is
    // already taken — by itself — so only a changed one is checked.
    if (formData.employeeId.trim() && formData.employeeId.trim() !== originalEmployeeId.trim()) {
      if (!/[a-zA-Z0-9]/.test(formData.employeeId)) {
        newErrors.employeeId = 'Employee ID cannot contain only special characters';
      } else {
        try {
          const exists = await checkEmployeeId(formData.employeeId);
          if (exists) {
            newErrors.employeeId = 'Employee ID already exists';
          }
        } catch (err) {
          console.error("Failed to check employee ID during submission", err);
        }
      }
    }

    // The email and password belong to the account, not to this form: an update
    // sends neither, so there is nothing to validate or verify on an edit.
    if (!isEdit) {
      // Check if email is provided, valid and verified
      if (!formData.emailId.trim()) {
        newErrors.emailId = 'Email ID is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
        newErrors.emailId = 'Invalid email format';
      } else if (!isEmailVerified) {
        newErrors.emailId = 'Please verify your Email ID';
      }

      // Password validation
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required.';
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (passwordValidation) {
          newErrors.password = passwordValidation;
        }
      }

      // Confirm password validation
      if (!formData.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Confirm Password is required.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords did not match.';
      }
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
            {isEdit ? 'Edit User' : 'Add Users'}
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

  const isWarehouseManagerRole = (designation: string | number) => {
    const role = roles.find(r => String(r.roleId) === String(designation));
    return role?.roleName?.trim().toUpperCase() === 'WAREHOUSE MANAGER';
  };
  const isWarehouseManager = isWarehouseManagerRole(formData.designation);

  const renderStep1 = () => (
    <div className="w-full flex-1 p-[14px] gap-[24px] rounded-[12px] border-[0.89px] border-pneutral-100 bg-white flex flex-col shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 shrink-">Personal Information</h3>
      
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Input
          label="Employee ID"
          placeholder="Emp-00001"
          maxLength={15}
          value={formData.employeeId}
          onChange={(e) => {
            let val = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
            const firstHyphenIndex = val.indexOf('-');
            if (firstHyphenIndex !== -1) {
              val = val.slice(0, firstHyphenIndex + 1) + val.slice(firstHyphenIndex + 1).replace(/-/g, '');
            }
            setFormData({ ...formData, employeeId: val });
            if (errors.employeeId) setErrors({ ...errors, employeeId: '' });
          }}
          onBlur={async (e) => {
            const val = e.target.value.trim();
            if (!val) return;
            if (!/[a-zA-Z0-9]/.test(val)) {
              setErrors({ ...errors, employeeId: 'Employee ID cannot contain only special characters' });
              return;
            }
            try {
              const exists = await checkEmployeeId(val);
              if (exists) {
                setErrors({ ...errors, employeeId: 'Employee ID already exists' });
              }
            } catch (err) {
              console.error("Failed to check employee ID", err);
            }
          }}
          error={errors.employeeId}
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

        <div className="space-y-2">
          {/* The email is the account's identity: an update cannot change it,
              so on an edit it is shown as it stands and locked. */}
          <Input
            label="Email ID"
            type="email"
            required
            disabled={isEdit}
            placeholder="johndoe@gmail.com"
            value={formData.emailId}
            onChange={(e) => {
              setFormData({ ...formData, emailId: e.target.value });
              if (errors.emailId) setErrors({ ...errors, emailId: '' });
              if (isEmailVerified) setIsEmailVerified(false);
              if (showOtp) setShowOtp(false);
            }}
            error={errors.emailId}
            leftIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            }
            rightIcon={isEdit ? undefined : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isEmailVerified || isSendingOtp}
                className={`w-24 h-7 rounded-lg font-medium text-label-l2 flex items-center justify-center ${
                  isEmailVerified
                    ? "border border-success-900 bg-success-50 text-success-900 cursor-not-allowed"
                    : isSendingOtp
                      ? "bg-pneutral-500 text-pneutral-50 cursor-wait"
                      : "bg-pneutral-900 text-pneutral-50 hover:bg-pneutral-800"
                }`}
              >
                {isEmailVerified
                  ? "Verified"
                  : isSendingOtp
                    ? "Sending..."
                    : "Send OTP"}
              </button>
            )}
          />
          {isEmailVerified && !isEdit && (
            <div className="w-full h-8 border-2 border-success-900 rounded-lg bg-success-50 flex items-center gap-2 px-3 text-p4 font-medium text-success-900">
              <Image
                src="/Login&RegistrationIcons/VerifyIcon.svg"
                alt="Email"
                width={17}
                height={17}
              />
              Email verified successfully
            </div>
          )}

          {showOtp && !isEdit && (
            <div className="flex flex-col gap-2.5 h-[78px] w-[348px]">
              <label className="text-p3 font-normal text-[#4B5563] font-body leading-none">
                Enter OTP
              </label>
              <div className="flex justify-between gap-[12px] w-full">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    className="w-[42px] h-[48px] min-h-[48px] max-h-[52px] border border-pneutral-200 rounded-[8px] text-center font-bold text-lg focus:outline-none focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500 font-body text-[#1A1F3A]"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Password is not part of an update — it has its own reset flow. */}
        <Input
          label="Password"
          placeholder={isEdit ? "Unchanged" : "Enter password"}
          disabled={isEdit}
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handlePasswordChange}
          error={errors.password}
          leftIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="flex items-center cursor-pointer"
            >
              {showPassword ? (
                <EyeOff size={20} className="text-pneutral-500" aria-label="Hide Password" />
              ) : (
                <Eye size={20} className="text-pneutral-500" aria-label="Show Password" />
              )}
            </button>
          }
        />

        <Input
          label="Confirm Password"
          placeholder={isEdit ? "Unchanged" : "Re-enter password"}
          disabled={isEdit}
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={errors.confirmPassword}
          leftIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="flex items-center cursor-pointer"
            >
              {showConfirmPassword ? (
                <EyeOff size={20} className="text-pneutral-500" aria-label="Hide Password" />
              ) : (
                <Eye size={20} className="text-pneutral-500" aria-label="Show Password" />
              )}
            </button>
          }
        />

        <Input
          label="Date of Birth"
          type="date"
          required
          min="1900-01-01"
          max="9999-12-31"
          placeholder="12-10-2016" 
          value={formData.dob}
          onChange={(e) => {
            const val = e.target.value;
            if (val.length > 10) return; // Prevent more than 4 digit years
            
            setFormData({ ...formData, dob: val });
            
            if (val) {
              const dobDate = new Date(val);
              const today = new Date();
              let age = today.getFullYear() - dobDate.getFullYear();
              const m = today.getMonth() - dobDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                age--;
              }
              if (age < 18) {
                setErrors({ ...errors, dob: 'User must be at least 18 years old' });
              } else {
                if (errors.dob) setErrors({ ...errors, dob: '' });
              }
            } else {
              if (errors.dob) setErrors({ ...errors, dob: '' });
            }
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
          options={assignableRoles.map(r => ({ label: r.roleName, value: r.roleId }))}
          value={formData.designation}
          onChange={(val) => {
            // Switching into/out of Warehouse Manager changes the location
            // list (warehouses vs pharmacies), so clear any prior selection.
            const flips = isWarehouseManagerRole(formData.designation) !== isWarehouseManagerRole(val);
            setFormData(prev => ({ ...prev, designation: val, location: flips ? [] : prev.location }));
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
          options={isWarehouseManager
            ? warehouses.map(w => ({
                label: `${w.warehouseName} - ${w.warehouseAddress}`,
                value: w.warehouseId
              }))
            : cities.map(c => ({
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

        {/* The photo is not part of the update payload; it is replaced through
            its own endpoint once the details are saved. Locked only on one's own
            account. */}
        <div className="w-full">
          <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
            {isEdit ? 'Replace Photo' : 'Upload Photo'}
          </label>
          <input
            type="file"
            accept="image/jpeg, image/png"
            className="hidden"
            disabled={!canUploadImage}
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                if (file.size > 5 * 1024 * 1024) {
                  setErrors(prev => ({ ...prev, image: 'Image size should not exceed 5 MB' }));
                  setImageFile(null);
                } else {
                  setErrors(prev => ({ ...prev, image: '' }));
                  setImageFile(file);
                }
              }
            }}
          />
          <div className="flex items-center gap-3">
            {/* The photo on the account today, so it is clear what is being
                replaced. Plain <img>: an S3 URL from the API, outside
                next/image's configured remote patterns. */}
            {isEdit && currentImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImageUrl}
                alt="Current photo"
                className="h-12 w-12 shrink-0 rounded-full border border-pneutral-200 object-cover"
              />
            )}
            <div
              onClick={() => {
                if (canUploadImage) fileInputRef.current?.click();
              }}
              className={`flex h-12 flex-1 min-w-0 items-center justify-between rounded-md border border-dashed ${errors.image ? 'border-warning-500' : 'border-pneutral-300'} bg-gray-50 transition-all px-3 ${canUploadImage ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-60'}`}
            >
              <span className="text-p4 text-pneutral-500 truncate">
                {!canUploadImage
                  ? "You cannot change your own photo"
                  : imageFile
                    ? imageFile.name
                    : isEdit
                      ? "click to browse a new JPEG or PNG"
                      : "click to browse JPEG or PNG"}
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pneutral-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </div>
          </div>
          {errors.image && <p className="mt-1 text-p2 text-warning-500">{errors.image}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    return (
      <div className="w-full flex-1 flex gap-[10px] items-stretch min-h-0">
        {/* On an edit the matrix opens with what the account already has. */}
        <RolesPermissions
          mode="assign"
          assignedPermissions={isEdit ? rolePermissions : undefined}
          onPermissionsChange={setRolePermissions}
          allowedModuleNames={allowedModuleNames}
        />
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="w-full h-full overflow-auto -m-4 p-4">
      <UserDetails userId={(isEdit ? editUserId : createdUserId) || 1} />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full justify-between items-stretch">
      <div className="flex flex-col gap-2 w-full">
        {renderHeader()}
      </div>

      <div className="flex-1 flex flex-col w-full min-h-0">
        {/* An edit must not show an empty form first and fill in underneath the
            person typing, so step 1 waits for the account. */}
        {isLoadingUser ? (
          <div className="w-full flex-1 flex items-center justify-center py-20 text-p3 text-pneutral-600">
            Loading user…
          </div>
        ) : (
          <>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </>
        )}
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
          <>
            <button 
              onClick={() => setStep(1)}
              className="px-8 py-2 border border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-100 bg-white"
            >
              Back to Step 1
            </button>
            <button
              onClick={isEdit ? handleUpdate : handleSave}
              disabled={isSaving}
              className="px-8 py-2 bg-[#7E3AF2] text-white rounded-lg font-medium hover:bg-[#6c2bd9] disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
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