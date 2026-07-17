import React, { useEffect, useState } from "react";
import Image from "next/image";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import AssignedLocation from "./AssignedLocation";
import RolesPermissions from "./RolesPermissions";
import AuditLogs from "./AuditLogs";

interface UserDetailsProps {
  userId: number;
}

const tabs = [
  "Assigned Location",
  "Roles & Permissions",
  "Audit Logs",
];

const UserDetails = ({ userId }: UserDetailsProps) => {
  const [activeTab, setActiveTab] = useState("Assigned Location");

  const renderComponent = () => {
    switch (activeTab) {
      case "Assigned Location":
        return <AssignedLocation />;

      case "Roles & Permissions":
        return <RolesPermissions />;

      case "Audit Logs":
        return <AuditLogs />;

      default:
        return null;
    }
  };
  
  return (
    <>
      <div className="flex flex-col gap-10">
        <div className="flex justify-between">
          <div className="text-h4 font-semibold">User Details</div>

          <div className="flex items-center justify-between gap-4">
            <button className="flex items-center gap-2 text-label-l3 font-medium text-secondary-700">
              <Image
                src="/Usermanagement/BackIcon.svg"
                alt="Back"
                width={16}
                height={16}
              />
              <span>Back</span>
            </button>

            <button className="w-27 h-9 border-[1.5px] border-secondary-700 rounded-lg flex items-center justify-center gap-2 text-label-l3 font-medium text-secondary-700">
              <Image
                src="/Usermanagement/EditIcon.svg"
                alt="Edit"
                width={16}
                height={16}
              />
              <span>Edit</span>
            </button>
            <button className="w-27 h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg flex items-center justify-between text-p2 font-normal p-3">
              Actions
              <Image
                src="/BusinessSetup/DropdownIcon.svg"
                alt=""
                width={16}
                height={16}
              />
            </button>
          </div>
        </div>
        
      </div>

     <div className="bg-white border border-pneutral-100 rounded-lg w-full h-61 p-4">
      <div className="flex gap-8">
        {/* Left Section */}
        <div className="flex flex-col gap-2 items-center justify-center border-r-2 border-pneutral-200 pr-8 min-w-[170px]">
          <Image
            src="/Usermanagement/UserImg.svg"
            alt="Profile"
            width={100}
            height={100}
            className="rounded-full object-cover"
          />

          <StatusBadge status="Active"/>

        </div>

        {/* Right Section */}
        <div className="flex-1">
          {/* Name */}
          <div className="flex flex-col gap-1 font-noto-sans text-pneutral-900">
            <h2 className="text-p5 font-semibold">
              Rahul Sharma
            </h2>
            <p className="text-p3 font-normal">Super Admin</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-24 gap-y-8 mt-6 text-p3 text-pneutral-900">
            {/* Employee ID */}
            <div className="flex">
              <p className="w-36 font-semibold ">
                Employee ID
              </p>
              <p className="font-bold">EMP-0001</p>
            </div>

            {/* Email */}
            <div className="flex">
              <p className="w-36 font-semibold">
                Email
              </p>
              <p >
                rahul@tiameds.ai
              </p>
            </div>

            {/* Mobile */}
            <div className="flex">
              <p className="w-36 font-semibold ">
                Mobile
              </p>
              <p className="font-normal">
                +91 99000 12345
              </p>
            </div>

            {/* Department */}
            <div className="flex">
              <p className="w-36 font-semibold">
                Department
              </p>
              <p className="font-semibold">
                Administration
              </p>
            </div>

            {/* Joining */}
            <div className="flex">
              <p className="w-36 font-semibold">
                Date of Joining
              </p>
              <p className="font-normal">
                01 Jan 2023
              </p>
            </div>

            {/* Last Login */}
            <div className="flex">
              <p className="w-36 font-semibold">
                Last Login
              </p>
              <p className="font-normal">
                14 May 2024, 10:15 AM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

     <div className="w-full rounded-lg border border-pneutral-100 bg-white">
      {/* Tabs */}
      <div className="flex border-b border-pneutral-100">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-4 text-label-l1 font-semibold transition-colors ${
              activeTab === tab
                ? "text-primary-500"
                : "text-pneutral-700 hover:text-primary-500"
            }`}
          >
            {tab}

            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 h-1 w-full rounded-t bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">{renderComponent()}</div>
    </div>
    </>
  );
};

export default UserDetails;
