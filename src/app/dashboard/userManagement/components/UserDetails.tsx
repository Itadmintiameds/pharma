import React, { useEffect, useState } from "react";
import Image from "next/image";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import AssignedLocation from "./AssignedLocation";
import RolesPermissions from "./RolesPermissions";
import AuditLogs from "./AuditLogs";
import { UserData } from "@/types/UserData";
import { getUserById } from "@/services/UserManagementService";

interface UserDetailsProps {
  userId: number;
  onBack?: () => void;
}

const tabs = ["Assigned Location", "Roles & Permissions", "Audit Logs"];

const UserDetails = ({ userId, onBack }: UserDetailsProps) => {
  const [activeTab, setActiveTab] = useState("Assigned Location");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const renderComponent = () => {
    switch (activeTab) {
      case "Assigned Location":
        return (
          <AssignedLocation
            pharmacyCities={
              user?.pharmacies?.map((pharmacy) => pharmacy.pharmacyCity) ?? []
            }
          />
        );

      case "Roles & Permissions":
        const anyUser = user as any;
        const mappedPermissions = anyUser?.permissions?.reduce((acc: any, p: any) => {
          if (!acc[p.featureId]) {
            acc[p.featureId] = {};
          }
          acc[p.featureId][p.permissionId] = true;
          return acc;
        }, {} as Record<number, Record<number, boolean>>) || {};
        
        return <RolesPermissions mode="view" assignedPermissions={mappedPermissions} />;

      case "Audit Logs":
        return <AuditLogs />;

      default:
        return null;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await getUserById(userId);
        console.log("User Data ----", response);

        setUser(response);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const pharmacyCities =
    user?.pharmacies?.map((pharmacy) => pharmacy.pharmacyCity) ?? [];

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex justify-between">
          <div className="text-h4 font-semibold">User Details</div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-label-l3 font-medium text-secondary-700"
            >
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

        <div className="bg-white border border-pneutral-100 rounded-xl w-full h-61 p-4">
          <div className="flex gap-8">
            {/* Left Section */}
            <div className="flex flex-col gap-2 items-center justify-center border-r-2 border-pneutral-200 pr-8 min-w-[170px]">
              <img
                src={user?.imageUrl || "/Usermanagement/UserImg.svg"}
                alt="Profile"
                className="w-[100px] h-[100px] rounded-full object-cover"
              />
              <StatusBadge
                status={(user?.userStatus || "Inactive") as any}
              />{" "}
            </div>

            {/* Right Section */}
            <div className="flex-1">
              {/* Name */}
              <div className="flex flex-col gap-1 font-noto-sans text-pneutral-900">
                <h2 className="text-p5 font-semibold">
                  {user?.fullName || "Not Present"}
                </h2>
                <p className="text-p3 font-normal">
                  {user?.pharmaRolesDto?.roleName || "Not Present"}
                </p>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-x-24 gap-y-8 mt-6 text-p3 text-pneutral-900">
                {/* Employee ID */}
                <div className="flex">
                  <p className="w-36 font-semibold ">Employee ID</p>
                  <p className="font-bold">
                    {user?.employeeId || "Not Present"}
                  </p>
                </div>

                {/* Email */}
                <div className="flex">
                  <p className="w-36 font-semibold">Email</p>
                  <p>{user?.userEmail || "Not Present"}</p>
                </div>

                {/* Mobile */}
                <div className="flex">
                  <p className="w-36 font-semibold ">Mobile</p>
                  <p className="font-normal">
                    {user?.userPhone || "Not Present"}
                  </p>
                </div>

                {/* Department */}
                <div className="flex">
                  <p className="w-36 font-semibold">Department</p>
                  <p className="font-semibold">
                    {(user as any)?.department || "Not Present"}
                  </p>
                </div>

                {/* Joining */}
                <div className="flex">
                  <p className="w-36 font-semibold">Date of Joining</p>
                  <p className="font-normal">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not Present"}
                  </p>
                </div>

                {/* Last Login */}
                <div className="flex">
                  <p className="w-36 font-semibold">Last Login</p>
                  <p className="font-normal">14 May 2024, 10:15 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Tabs */}
          <div className="flex ">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-4 text-label-l4 font-medium transition-colors ${
                  activeTab === tab
                    ? "text-secondary-700 font-semibold"
                    : "text-pneutral-800 "
                }`}
              >
                {tab}

                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 h-1 w-full rounded-t bg-secondary-700" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="w-full h-full p-4 mt-4 bg-white border border-pneutral-100 rounded-xl">
            {renderComponent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDetails;
