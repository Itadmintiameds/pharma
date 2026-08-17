"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getById, getUserById } from "@/services/UserManagementService";
import { usePharmacyStore } from "@/store/pharmacyStore";
import Dropdown, { DropdownOption } from "../common/Dropdown";

interface NavbarProps {
  userRole?: string;
}

const Navbar = ({ userRole = "Super Admin" }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [fullName, setFullName] = useState("");
  // A Warehouse Manager operates on a fixed warehouse, not a selectable
  // pharmacy — the top-right control shows the warehouse name for them.
  const [isWarehouseUser, setIsWarehouseUser] = useState(false);
  const [warehouseName, setWarehouseName] = useState<string | null>(null);

  const { pharmacies, selectedPharmacy, selectPharmacy, loading } =
    usePharmacyStore();

  const pharmacyOptions: DropdownOption[] = useMemo(
    () =>
      pharmacies.map((p) => ({
        label: p.pharmacyName,
        value: p.pharmacyId,
      })),
    [pharmacies],
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRes = await fetch("/api/user-info");
        if (!userRes.ok) return;

        const { userId } = await userRes.json();
        if (!userId) return;

        const user = await getById(userId);
        if (user?.fullName) {
          setFullName(user.fullName);
        }

        // Resolve the warehouse (if any) from the fuller user record so the
        // control can swap the pharmacy dropdown for the warehouse name.
        const details = await getUserById(userId).catch(() => null);
        const normalize = (r?: string) =>
          (r || "").toLowerCase().replace(/[^a-z]/g, "");
        const wName =
          details?.warehouse?.warehouseName ?? details?.warehouseName ?? null;
        if (
          wName ||
          normalize(details?.pharmaRolesDto?.roleName) === "warehousemanager"
        ) {
          setIsWarehouseUser(true);
          setWarehouseName(wName);
        }
      } catch (error) {
        console.error("Failed to fetch user for Navbar", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <header
      className="w-full h-[61.5px] bg-white border-b border-pneutral-100 flex items-center justify-between px-6 shrink-0"
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      <div className="flex items-center gap-4 select-none">
        <Image
          src="/Logo/tiameds logo.svg"
          alt="TiaMeds Logo"
          width={108}
          height={34}
          className="object-contain"
          priority
        />

        <div className="flex flex-col gap-1 ml-26">
          <h1
            className="text-[13px] font-semibold leading-none font-noto-sans"
            style={{ color: "#3C3D3A" }}
          >
            Welcome, {fullName}
          </h1>

          <p
            className="text-[11.5px] font-normal leading-none"
            style={{ color: "#969793" }}
          >
            {userRole}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-[220px] flex items-center justify-center overflow-visible">
          {isWarehouseUser ? (
            <div
              className="w-full origin-center scale-[0.82]"
              style={{ marginTop: "-8px", marginBottom: "-8px" }}
            >
              <div className="flex h-12 w-full items-center rounded-md border border-pneutral-300 bg-pneutral-50 px-3 text-p4 text-pneutral-900">
                <span className="truncate">{warehouseName || "Warehouse"}</span>
              </div>
            </div>
          ) : (
            <div
              className="w-full origin-center scale-[0.82]"
              style={{ marginTop: "-8px", marginBottom: "-8px" }}
            >
              <Dropdown
                options={pharmacyOptions}
                value={selectedPharmacy?.pharmacyId}
                onChange={(value) => {
                  const pharmacy = pharmacies.find((p) => p.pharmacyId === value);

                  if (pharmacy) {
                    selectPharmacy(pharmacy);
                  }
                }}
                placeholder="Select Pharmacy"
                isLoading={loading}
              />
            </div>
          )}
        </div>

        <button className="relative w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity">
          <Image
            src="/dashboard/icons/notification bell.svg"
            alt="Notifications"
            width={28}
            height={28}
            className="object-contain"
          />
        </button>

        <div className="w-[40px] h-[40px] rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-100 transition-all select-none shrink-0">
          <Image
            src="/dashboard/icons/Avatar Base.svg"
            alt="User Avatar"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
