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
    },
    {
      key: "role",
      header: "Role",
    },
    {
      key: "pharmacyId",
      header: "Location",
      render: (row: UserData) => row.pharmacyId ?? "-",
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
            src="/Usermanagement/ViewIcon.svg"
            alt="View"
            width={21}
            height={16}
          />
        </button>
      ),
    },
  ];

  if (selectedUserId) {
    return <UserDetails userId={selectedUserId} />;
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
              <button className="w-27 h-9 bg-white border border-pneutral-50 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2 text-label-l3 font-medium text-pneutral-900">
                <Image
                  src="/Usermanagement/ExportIcon.svg"
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
                  src="/Usermanagement/FilterIcon.svg"
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
                placeholder="Search Location..."
                className="w-full bg-transparent outline-none text-p2 font-normal placeholder:text-pneutral-400"
              />
            </div>

            {/* Buttons */}
            <button className="w-[117px] h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg flex items-center justify-center gap-2 text-p2 font-normal">
              All Roles
              <Image
                src="/BusinessSetup/DropdownIcon.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>

            <button className="w-[117px] h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg flex items-center justify-center gap-2 text-p2 font-normal">
              All Locations
              <Image
                src="/BusinessSetup/DropdownIcon.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>

            <button className="w-[117px] h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg flex items-center justify-center gap-2 text-p2 font-normal">
              All Status
              <Image
                src="/BusinessSetup/DropdownIcon.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>

            <button className="w-[117px] h-9 shrink-0 bg-white border border-pneutral-50 rounded-lg shadow-sm flex items-center justify-center gap-2 text-label-l3 font-medium text-pneutral-900">
              <Image
                src="/Usermanagement/FilterBlackIcon.svg"
                alt="Filters"
                width={16}
                height={16}
              />
              <span>Filters</span>
            </button>
          </div>

          <div className="w-full h-full bg-white border border-pneutral-100 rounded-lg p-4">
            <DataTable
              columns={columns}
              data={users}
              page={1}
              pageSize={7}
              totalItems={users.length}
              onPageChange={(page) => console.log(page)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default page;
