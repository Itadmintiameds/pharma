import React, { useState, useEffect } from 'react';
import { getAllModules, getFeaturesByModuleId, getPermissions } from '@/services/UserManagementService';

interface RolesPermissionsProps {
  mode: 'assign' | 'view';
  assignedPermissions?: Record<number, Record<number, boolean>>; // for view mode
  onPermissionsChange?: (permissions: Record<number, Record<number, boolean>>) => void; // for assign mode
}

const RolesPermissions = ({ mode, assignedPermissions, onPermissionsChange }: RolesPermissionsProps) => {
  const [modules, setModules] = useState<{moduleId: number, moduleName: string}[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [features, setFeatures] = useState<{featureId: number, featureName: string, featureCode: string}[]>([]);
  const [permissions, setPermissions] = useState<{permissionId: number, permissionName: string}[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<number, Record<number, boolean>>>(assignedPermissions || {});

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [mods, perms] = await Promise.all([
          getAllModules(),
          getPermissions()
        ]);
        setModules(mods || []);
        setPermissions(perms || []);
        if (mods && mods.length > 0) {
          setSelectedModuleId(mods[0].moduleId);
        }
      } catch (err) {
        console.error("Failed to fetch modules or permissions", err);
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

  // Sync back to parent when in assign mode
  useEffect(() => {
    if (mode === 'assign' && onPermissionsChange) {
      onPermissionsChange(rolePermissions);
    }
  }, [rolePermissions, mode, onPermissionsChange]);

  // Sync from props. Also applies in assign mode, where an edit hands over the
  // grants the user already has: the matrix opens on what is currently granted
  // and stays editable. In that mode the parent holds the very object it was
  // given back, so this settles rather than ping-ponging.
  useEffect(() => {
    if (assignedPermissions) {
      setRolePermissions(assignedPermissions);
    }
  }, [assignedPermissions]);

  return (
    <div className="w-full flex-1 flex gap-[10px] items-stretch min-h-[440px]">
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
                    readOnly={mode === 'view'}
                    checked={!!rolePermissions[f.featureId]?.[p.permissionId]}
                    onClick={(e) => {
                      if (mode === 'view') e.preventDefault();
                    }}
                    onChange={(e) => {
                      if (mode === 'view') return;
                      const checked = e.target.checked;
                      setRolePermissions(prev => ({
                        ...prev,
                        [f.featureId]: {
                          ...(prev[f.featureId] || {}),
                          [p.permissionId]: checked
                        }
                      }));
                    }}
                    className={`h-5 w-5 rounded border-gray-300 outline-none checked:shadow-[0_0_0_2px_#E0E7FFCC] ${mode === 'view' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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

export default RolesPermissions;
