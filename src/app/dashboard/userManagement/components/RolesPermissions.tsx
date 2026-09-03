import React, { useState, useEffect, useMemo } from 'react';
import { getAllModules, getFeaturesByModuleId, getPermissions } from '@/services/UserManagementService';

/**
 * One feature row of the matrix, plus the permissions that actually apply to it.
 * GET /modules/{id}/features carries that per feature, so a cell like "Approve"
 * on a feature that has no approval step is shown but never enabled.
 */
interface FeatureRow {
  featureId: number;
  featureName: string;
  featureCode: string;
  /**
   * Permission ids this feature supports, or null when the response said
   * nothing about them — in that case every column stays enabled rather than
   * locking a row the API simply did not describe.
   */
  allowedPermissionIds: Set<number> | null;
}

/** Accepts a bare id, a numeric string, or an object keyed permissionId / id. */
const toPermissionId = (entry: unknown): number | null => {
  if (typeof entry === "number") return Number.isFinite(entry) ? entry : null;
  if (typeof entry === "string") {
    const parsed = Number(entry);
    return entry.trim() !== "" && Number.isFinite(parsed) ? parsed : null;
  }
  if (entry && typeof entry === "object") {
    const value =
      (entry as { permissionId?: unknown }).permissionId ??
      (entry as { id?: unknown }).id;
    return typeof value === "number" ? value : null;
  }
  return null;
};

/**
 * Reads a feature's applicable permissions. The list has been seen under a few
 * names, and each entry may be an id or a whole permission object, so every
 * shape is accepted; anything unrecognised leaves the row unrestricted.
 */
const readAllowedPermissionIds = (feature: unknown): Set<number> | null => {
  const source = feature as Record<string, unknown> | null;
  const raw =
    source?.permissions ??
    source?.permissionIds ??
    source?.allowedPermissions ??
    source?.featurePermissions;

  if (!Array.isArray(raw)) return null;

  const ids = raw
    .map(toPermissionId)
    .filter((id): id is number => id !== null);

  // An explicitly empty list means "no permissions apply here", which is not
  // the same as the API staying silent — so it is kept as an empty set.
  return new Set(ids);
};

const toFeatureRow = (feature: Record<string, unknown>): FeatureRow => ({
  featureId: Number(feature.featureId),
  featureName: String(feature.featureName ?? ""),
  featureCode: String(feature.featureCode ?? ""),
  allowedPermissionIds: readAllowedPermissionIds(feature),
});

/**
 * VIEW is the gate for a module, so the other actions imply it: granting CREATE
 * without the ability to see the screen is not a state worth being able to save.
 * Clearing VIEW therefore clears the row, while VIEW on its own stays valid.
 */
const VIEW_PERMISSION_NAME = 'VIEW';

interface RolesPermissionsProps {
  mode: 'assign' | 'view';
  /**
   * Module keys the target user's role and this organization allow. Modules
   * outside the list are left out of the picker, so a Warehouse Manager cannot
   * be granted Sales and a store role cannot be granted Warehouse Distribution.
   */
  allowedModuleNames?: string[] | null;
  assignedPermissions?: Record<number, Record<number, boolean>>; // for view mode
  onPermissionsChange?: (permissions: Record<number, Record<number, boolean>>) => void; // for assign mode
  /**
   * Shows every applicable cell as granted, ignoring assignedPermissions. A
   * Super Admin's authority is not tracked as explicit rows the way other
   * roles' is, so the matrix would otherwise render empty for them; this is
   * how the role's actual "everything" gets reflected instead.
   */
  allChecked?: boolean;
}

const RolesPermissions = ({ mode, assignedPermissions, onPermissionsChange, allowedModuleNames, allChecked }: RolesPermissionsProps) => {
  const [modules, setModules] = useState<{moduleId: number, moduleName: string}[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [permissions, setPermissions] = useState<{permissionId: number, permissionName: string}[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<number, Record<number, boolean>>>(assignedPermissions || {});
  // "VIEW" -> its permissionId, so the coupling below does not depend on the
  // id happening to be 1.
  const [permissionIdsByName, setPermissionIdsByName] = useState<Record<string, number>>({});

  // Module names arrive as human labels ("Warehouse Distribution") while the
  // allow-list carries backend keys ("WAREHOUSE_DISTRIBUTION"), so both sides are
  // reduced to letters before comparing. Containment counts as a match, not just
  // equality: a label may carry extra words the key does not ("Sales / Billing"
  // against SALES), and dropping a module the role genuinely has would be worse
  // than tolerating a loose match among these few names.
  const visibleModules = useMemo(() => {
    if (!allowedModuleNames) return modules;
    const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '');
    const allowed = allowedModuleNames.map(normalize).filter(Boolean);

    return modules.filter((mod) => {
      const name = normalize(mod.moduleName);
      return allowed.some(
        (key) => key === name || name.includes(key) || key.includes(name)
      );
    });
  }, [modules, allowedModuleNames]);

  // Which module the matrix is actually showing: the selected one while it is
  // still visible, else the first that is. Changing the target user's role can
  // remove the module that was open.
  const effectiveModuleId =
    visibleModules.some((mod) => mod.moduleId === selectedModuleId)
      ? selectedModuleId
      : (visibleModules[0]?.moduleId ?? null);

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
        setPermissionIdsByName(
          Object.fromEntries(
            (perms || []).map((p: { permissionId: number; permissionName: string }) => [
              p.permissionName.toUpperCase(),
              p.permissionId,
            ])
          )
        );
      } catch (err) {
        console.error("Failed to fetch modules or permissions", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (effectiveModuleId !== null) {
      const fetchFeatures = async () => {
        try {
          const data = await getFeaturesByModuleId(effectiveModuleId);
          setFeatures((data?.features || []).map(toFeatureRow));
        } catch (err) {
          console.error("Failed to fetch features", err);
        }
      };
      fetchFeatures();
    }
  }, [effectiveModuleId]);

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

  // No visible module means no rows, whatever was last fetched.
  const featureRows = effectiveModuleId === null ? [] : features;

  return (
    <div className="w-full flex-1 flex gap-[10px] items-stretch min-h-[440px]">
      {/* Modules Card (Left) */}
      <div className="w-[210px] h-full p-[16px] flex flex-col gap-[8px] rounded-[12px] border-[1px] border-gray-200 bg-white shadow-sm shrink-0">
        <div className="w-full h-[40px] p-[8px] border-b-[1px] border-gray-200 shrink-0">
          <h3 className="font-medium text-[16px] leading-[24px] text-[#3C3D3A]">Modules</h3>
        </div>
        <div className="w-full flex-1 flex flex-col gap-[4px] overflow-y-auto min-h-0">
          {visibleModules.map((mod) => (
            <div 
              key={mod.moduleId} 
              onClick={() => setSelectedModuleId(mod.moduleId)}
              className={`w-full min-h-[36px] max-h-[44px] px-3 rounded-md flex justify-between items-center cursor-pointer shrink-0 ${effectiveModuleId === mod.moduleId ? 'bg-[#F3EDFF] text-[#7E3AF2]' : 'text-gray-700 hover:bg-gray-50'}`}
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
            {featureRows.map((f) => (
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
              {featureRows.map((f) => {
                // A permission the feature does not support is shown but never
                // offered — the grid keeps its shape without implying the
                // combination exists.
                const isApplicable =
                  f.allowedPermissionIds === null ||
                  f.allowedPermissionIds.has(p.permissionId);
                const isChecked = allChecked
                  ? isApplicable
                  : !!rolePermissions[f.featureId]?.[p.permissionId];
                const isLocked = mode === 'view' || !isApplicable;

                return (
                  <div key={f.featureId} className="w-full h-[68px] p-[12px_8px_12px_8px] border-b-[1px] border-gray-200 shrink-0 flex items-center justify-center gap-[4px]">
                    <input 
                      type="checkbox" 
                      readOnly={isLocked}
                      disabled={!isApplicable}
                      checked={isChecked}
                      title={
                        isApplicable
                          ? `${p.permissionName} — ${f.featureName}`
                          : `${p.permissionName} does not apply to ${f.featureName}`
                      }
                      onClick={(e) => {
                        if (isLocked) e.preventDefault();
                      }}
                      onChange={(e) => {
                        if (isLocked) return;
                        const checked = e.target.checked;
                        const viewId = permissionIdsByName[VIEW_PERMISSION_NAME];
                        const isViewColumn = p.permissionId === viewId;

                        setRolePermissions(prev => {
                          const row = { ...(prev[f.featureId] || {}) };

                          if (isViewColumn && !checked) {
                            // Losing VIEW takes the rest of the row with it —
                            // an action on a screen the user cannot open is
                            // not a state worth saving.
                            Object.keys(row).forEach((id) => {
                              row[Number(id)] = false;
                            });
                          } else {
                            row[p.permissionId] = checked;
                            // Any other action implies VIEW. The reverse does
                            // not hold: VIEW on its own is perfectly valid.
                            if (checked && !isViewColumn && viewId !== undefined) {
                              row[viewId] = true;
                            }
                          }

                          return { ...prev, [f.featureId]: row };
                        });
                      }}
                      className={`h-5 w-5 rounded border-gray-300 outline-none checked:shadow-[0_0_0_2px_#E0E7FFCC] ${
                        !isApplicable
                          ? 'cursor-not-allowed opacity-30'
                          : mode === 'view'
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer'
                      }`}
                      style={{
                        accentColor: 'var(--Colors-Brand-Primary-900, #4C0080)'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
