"use client";

import React, { useEffect, useState } from "react";
import { useModulePermissions } from '@/hooks/useModulePermissions';
import Image from "next/image";
import Table from "@/app/components/common/table/Table";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import { EyeIcon, Plus } from "lucide-react";
import DataTable from "@/app/components/common/table/Table";
import UserDetails from "./components/UserDetails";
import AddUserWizard from "./components/AddUserWizard";
import { UserData, warehouseLabel } from "@/types/UserData";
import { getAllUsers } from "@/services/UserManagementService";

const page = () => {
  // CREATE opens the add-user wizard; EXPORT covers the user list export.
  // Activating/deactivating an account is gated inside the user detail screen.
  const { canCreate, canExport } = useModulePermissions('USER_MANAGEMENT');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  /** The user code being edited, e.g. "USR-2026-00003". */
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("None");

  const normalizeRole = (role?: string) => (role || "").toLowerCase().replace(/[^a-z]/g, "");
  const isCurrentUserSuperAdmin = normalizeRole(currentUserRole) === "superadmin";

  // Super Admin users are only visible to another Super Admin viewer
  const visibleUsers = isCurrentUserSuperAdmin
    ? users
    : users.filter((u) => normalizeRole(u.roleName) !== "superadmin");

  const roles = ["All Roles", ...Array.from(new Set(visibleUsers.map(u => u.roleName).filter(Boolean)))];
  const locations = ["All Locations", ...Array.from(new Set(visibleUsers.flatMap(u => u.pharmacyCities || []).filter(Boolean)))];
  const statuses = ["All Status", "Active", "Inactive"];
  const sortOptions = ["None", "Ascending (A-Z)", "Descending (Z-A)"];

  const filteredUsers = visibleUsers.filter((u) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      u.fullName?.toLowerCase().includes(term) ||
      u.userEmail?.toLowerCase().includes(term) ||
      u.employeeId?.toLowerCase().includes(term);

    const matchesRole = selectedRole === "All Roles" || u.roleName === selectedRole;
    const matchesLocation =
      selectedLocation === "All Locations" ||
      (u.pharmacyCities && u.pharmacyCities.includes(selectedLocation));
    
    // API returns Active/Inactive. Fallback to Inactive if null.
    const statusVal = u.userStatus || "Inactive";
    const matchesStatus =
      selectedStatus === "All Status" || statusVal === selectedStatus;

    return matchesSearch && matchesRole && matchesLocation && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortOrder === "Ascending (A-Z)") {
      return (a.fullName || "").localeCompare(b.fullName || "");
    } else if (sortOrder === "Descending (Z-A)") {
      return (b.fullName || "").localeCompare(a.fullName || "");
    }
    return 0;
  });

  /** Re-reads the listing; also used after a user is edited. */
  const fetchUsers = async () => {
    setLoading(true);

    const data = await getAllUsers();
    if (data) {
      setUsers(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const response = await fetch("/api/user-info");
        if (!response.ok) return;
        const { role } = await response.json();
        setCurrentUserRole(role || "");
      } catch (error) {
        console.error("Failed to fetch current user role:", error);
      }
    };

    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  const handleExport = () => {
    if (sortedUsers.length === 0) return;

    const headers = ["Name", "Email", "Employee ID", "Role", "Location/Warehouse", "Status"];
    const rows = sortedUsers.map(u => {
      // Semicolons between warehouses: the cell is already comma-quoted for CSV,
      // and a warehouse name may itself contain a comma.
      const locationOrWarehouse = u.warehouses && u.warehouses.length > 0
        ? u.warehouses.map(warehouseLabel).join('; ')
        : (u.pharmacyCities?.join(', ') || '');
      return [
        `"${u.fullName || ''}"`,
        `"${u.userEmail || ''}"`,
        `"${u.employeeId || ''}"`,
        `"${u.roleName || ''}"`,
        `"${locationOrWarehouse}"`,
        `"${u.userStatus || 'Inactive'}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tiameds_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const columns = [
    {
      key: "fullName",
      header: "Name",
      render: (row: UserData) => (
        <span className="font-semibold">{row.fullName}</span>
      ),
    },
    {
      key: "userEmail",
      header: "Email",
    },
    {
      key: "employeeId",
      header: "Employee ID",
      render: (row: UserData) => row.employeeId?.trim() || "Not Present",
    },
    {
      key: "roleName",
      header: "Role",
      render: (row: UserData) => row.roleName || "Not Present",
    },
    {
      key: "pharmacyCities",
      header: "Location/Warehouse",
      render: (row: UserData) => {
        if (row.warehouses && row.warehouses.length > 0) {
          return row.warehouses.map(warehouseLabel).join(", ");
        }
        return row.pharmacyCities && row.pharmacyCities.length > 0
          ? row.pharmacyCities.join(", ")
          : "-";
      },
    },
    {
      key: "userStatus",
      header: "Status",
      render: (row: UserData) => (
        <StatusBadge status={(row.userStatus ?? "Inactive") as any} />
      ),
    },
    {
      key: "action",
      header: "Actions",
      render: (row: UserData) => (
        <button onClick={() => setSelectedUserId(row.userId)}>
          <Image
            src="/UserManagement/ViewIcon.svg"
            alt="View"
            width={21}
            height={16}
          />
        </button>
      ),
    },
  ];

  // Editing runs through the same wizard the account was created with, so it
  // takes over the page ahead of the details view it was opened from.
  if (editUserId) {
    return (
      <AddUserWizard
        editUserId={editUserId}
        // The listing is re-read straight away; the details view refetches by
        // itself when it comes back on screen below.
        onSaved={fetchUsers}
        onBack={() => setEditUserId(null)}
      />
    );
  }

  if (selectedUserId) {
    return (
      <UserDetails
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
        onEdit={(userCode) => setEditUserId(userCode)}
      />
    );
  }

  return (
    <>
      {showAddUser ? (
        <AddUserWizard
          onBack={() => setShowAddUser(false)}
          onSaved={fetchUsers}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="text-h4 font-semibold text-pneutral-900">Users</div>
            <div className="flex gap-4">
              {canExport && (
              <button 
                onClick={handleExport}
                className="w-27 h-9 bg-white border border-pneutral-50 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2 text-label-l3 font-medium text-pneutral-900">
                <Image
                  src="/UserManagement/ExportIcon.svg"
                  alt="Export"
                  width={16}
                  height={16}
                />
                <span>Export</span>
              </button>
              )}

              {canCreate && (
              <button
                onClick={() => setShowAddUser(true)}
                className="w-27.75 h-9 bg-primary-800 rounded-lg flex items-center justify-center gap-2 text-pneutral-50 text-label-l3 font-medium"
              >
                <Plus size={16} />
                <span>Add User</span>
              </button>
              )}
            </div>
          </div>

          <div className="w-full h-[70px] bg-white border border-pneutral-200 rounded-lg flex items-center p-4 gap-2">
            {/* Search */}
            <div className="flex-1 min-w-0 h-9 border-[1.5px] border-secondary-100 rounded-lg flex items-center px-3 gap-2 bg-white">
              <Image
                src="/BusinessSetup/SearchIcon.svg"
                alt="Search"
                width={16}
                height={16}
              />

              <input
                type="text"
                placeholder="Search by Name, Email, or Employee ID..."
                className="w-full bg-transparent outline-none text-p2 font-normal placeholder:text-pneutral-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.replace(/  +/g, ' '))}
              />
            </div>

            {/* Buttons / Dropdowns */}
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="w-[117px] h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg px-2 text-p2 font-normal outline-none bg-white cursor-pointer"
            >
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setCurrentPage(1); }}
              className="w-[117px] h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg px-2 text-p2 font-normal outline-none bg-white cursor-pointer"
            >
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-[117px] h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg px-2 text-p2 font-normal outline-none bg-white cursor-pointer"
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}
              className="w-[117px] h-9 shrink-0 bg-white border border-pneutral-50 rounded-lg shadow-sm px-2 text-label-l3 font-medium text-pneutral-900 outline-none cursor-pointer"
            >
              {sortOptions.map(o => <option key={o} value={o}>{o === 'None' ? 'Sort' : o}</option>)}
            </select>
          </div>

          <div className="w-full h-full bg-white border border-pneutral-100 rounded-lg p-4">
            {sortedUsers.length > 0 ? (
              <DataTable
                columns={columns}
                data={sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                page={currentPage}
                pageSize={pageSize}
                totalItems={sortedUsers.length}
                onPageChange={(page) => setCurrentPage(page)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <p className="text-lg font-medium text-red-500">No records found matching your search.</p>
                <p className="text-sm">Try adjusting your filters or search term.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default page;
