import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import StatusBadge from "@/app/components/common/table/StatusBadge";
import AssignedLocation from "./AssignedLocation";
import RolesPermissions from "./RolesPermissions";
import AuditLogs from "./AuditLogs";
import UnlockAccount from "./UnlockAccount";
import DeactivateUser from "./DeactivateUser";
import { UserData } from "@/types/UserData";
import { getUserById, updateUserStatus } from "@/services/UserManagementService";
import { showToast } from "@/app/components/common/Toast";

interface UserDetailsProps {
  userId: number;
  onBack?: () => void;
}

const tabs = ["Assigned Location", "Roles & Permissions", "Audit Logs"];

const UserDetails = ({ userId, onBack }: UserDetailsProps) => {
  const [activeTab, setActiveTab] = useState("Assigned Location");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const normalizeRole = (role?: string) => (role || "").toLowerCase().replace(/[^a-z]/g, "");
  const isOwnAccount = currentUserId !== null && Number(currentUserId) === Number(userId);
  const canManageActions = ["superadmin", "admin"].includes(normalizeRole(currentUserRole));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const response = await fetch("/api/user-info");
        if (!response.ok) return;
        const { role, userId: loggedInUserId } = await response.json();
        setCurrentUserRole(role || "");
        setCurrentUserId(loggedInUserId ?? null);
      } catch (error) {
        console.error("Failed to fetch current user role:", error);
      }
    };

    fetchCurrentUserRole();
  }, []);

  const handleStatusChange = async (userStatus: "Active" | "Inactive") => {
    if (!userId) return;

    setActionsOpen(false);
    setStatusUpdating(true);
    try {
      await updateUserStatus(userId, userStatus);
      setUser((prev) => (prev ? { ...prev, userStatus } : prev));
      showToast.success(
        userStatus === "Active"
          ? "User unlocked successfully."
          : "User deactivated successfully."
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
      showToast.error("Failed to update user status.");
    } finally {
      setStatusUpdating(false);
      setUnlockModalOpen(false);
      setDeactivateModalOpen(false);
    }
  };

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
                src="/UserManagement/BackIcon.svg"
                alt="Back"
                width={16}
                height={16}
              />
              <span>Back</span>
            </button>

            <button className="w-27 h-9 border-[1.5px] border-secondary-700 rounded-lg flex items-center justify-center gap-2 text-label-l3 font-medium text-secondary-700">
              <Image
                src="/UserManagement/EditIcon.svg"
                alt="Edit"
                width={16}
                height={16}
              />
              <span>Edit</span>
            </button>
            <div className="relative" ref={actionsRef}>
              <button
                onClick={() => setActionsOpen((prev) => !prev)}
                disabled={statusUpdating || !canManageActions}
                className="w-27 h-9 shrink-0 border-[1.5px] border-pneutral-300 rounded-lg flex items-center justify-between text-p2 font-normal p-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Actions
                <Image
                  src="/BusinessSetup/DropdownIcon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className={actionsOpen ? "rotate-180" : ""}
                />
              </button>

              {actionsOpen && (
                <div className="absolute right-0 top-full mt-1 w-29.25 h-23 opacity-100 bg-white border border-pneutral-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      setUnlockModalOpen(true);
                    }}
                    disabled={isOwnAccount || user?.userStatus === "Active"}
                    className="w-full text-left px-4 py-2.5 font-noto-sans font-normal text-p4 tracking-[-0.02em] bg-white text-pneutral-900 hover:bg-pneutral-50 disabled:cursor-not-allowed disabled:text-pneutral-400 disabled:hover:bg-white"
                  >
                    Unlock
                  </button>
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      setDeactivateModalOpen(true);
                    }}
                    disabled={isOwnAccount || user?.userStatus !== "Active"}
                    className="w-full text-left px-4 py-2.5 font-noto-sans font-normal text-p4 tracking-[-0.02em] bg-white text-pneutral-900 hover:bg-pneutral-50 disabled:cursor-not-allowed disabled:text-pneutral-400 disabled:hover:bg-white"
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-pneutral-100 rounded-xl w-full h-61 p-4">
          <div className="flex gap-8">
            {/* Left Section */}
            <div className="flex flex-col gap-2 items-center justify-center border-r-2 border-pneutral-200 pr-8 min-w-[170px]">
              <img
                src={user?.imageUrl || "/dashboard/icons/Avatar Base.svg"}
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
                  <p className="font-normal">
                    {user?.lastLogin
                      ? new Date(user.lastLogin).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not Logged In Yet"}
                  </p>
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

      <UnlockAccount
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onConfirm={() => handleStatusChange("Active")}
        userName={user?.fullName}
        employeeId={user?.employeeId}
        loading={statusUpdating}
      />

      <DeactivateUser
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        onConfirm={() => handleStatusChange("Inactive")}
        userName={user?.fullName}
        employeeId={user?.employeeId}
        loading={statusUpdating}
      />
    </>
  );
};

export default UserDetails;
