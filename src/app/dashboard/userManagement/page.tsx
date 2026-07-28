"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Table from "@/app/components/common/table/Table";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import { EyeIcon } from "lucide-react";
import DataTable from "@/app/components/common/table/Table";
import UserDetails from "./components/UserDetails";
import AddUserWizard from "./components/AddUserWizard";
import { UserData } from "@/types/UserData";
import { getAllUsers } from "@/services/UserManagementService";

const page = () => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("None");

  const roles = ["All Roles", ...Array.from(new Set(users.map(u => u.roleName).filter(Boolean)))];
  const locations = ["All Locations", ...Array.from(new Set(users.flatMap(u => u.pharmacyCities || []).filter(Boolean)))];
  const statuses = ["All Status", "Active", "Inactive"];
  const sortOptions = ["None", "Ascending (A-Z)", "Descending (Z-A)"];

  const filteredUsers = users.filter((u) => {
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

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);

      const data = await getAllUsers();
      if (data) {
        setUsers(data);
      }

      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleExport = () => {
    if (sortedUsers.length === 0) return;

    const headers = ["Name", "Email", "Employee ID", "Role", "Location", "Status"];
    const rows = sortedUsers.map(u => [
      `"${u.fullName || ''}"`,
      `"${u.userEmail || ''}"`,
      `"${u.employeeId || ''}"`,
      `"${u.roleName || ''}"`,
      `"${u.pharmacyCities?.join(', ') || ''}"`,
      `"${u.userStatus || 'Inactive'}"`
    ]);

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
      header: "Location",
      render: (row: UserData) =>
        row.pharmacyCities && row.pharmacyCities.length > 0
          ? row.pharmacyCities.join(", ")
          : "-",
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

  if (selectedUserId) {
    return (
      <UserDetails
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <>
      {showAddUser ? (
        <AddUserWizard onBack={() => setShowAddUser(false)} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between">
            <div className="text-h4 font-semibold text-pneutral-900">Users</div>
            <div className="flex gap-4">
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

              <button
                onClick={() => setShowAddUser(true)}
                className="w-27.75 h-9 bg-primary-800 rounded-lg flex items-center justify-center gap-2 text-pneutral-50 text-label-l3 font-medium"
              >
                <Image
                  src="/UserManagement/FilterIcon.svg"
                  alt="Add User"
                  width={16}
                  height={16}
                />
                <span>Add User</span>
              </button>
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
