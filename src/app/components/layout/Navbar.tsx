"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { getById, getUserById } from "@/services/UserManagementService";
import { usePharmacyStore } from "@/store/pharmacyStore";
import { useWarehouseStore } from "@/store/warehouseStore";
import { warehouseLabel } from "@/types/UserData";
import { useAccess } from "@/app/components/providers/AccessProvider";
import Dropdown, { DropdownOption } from "../common/Dropdown";
import ConfirmDialog from "../common/ConfirmDialog";

interface NavbarProps {
  userRole?: string;
}

const Navbar = ({ userRole }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  // A Warehouse Manager operates on warehouses, not pharmacies — the top-right
  // control switches warehouse for them instead of pharmacy.
  const [isWarehouseUser, setIsWarehouseUser] = useState(false);

  const { pharmacies, selectedPharmacy, selectPharmacy, loading } =
    usePharmacyStore();

  const {
    warehouses,
    selectedWarehouse,
    selectWarehouse,
    setActingAsWarehouse,
    loading: warehousesLoading,
  } = useWarehouseStore();

  // A Super Admin (under centralized inventory) can switch into a warehouse and
  // operate it; the toggle below drives that. Everyone else uses the single
  // location control their role implies.
  const { canActAsWarehouse, actingAsWarehouse, organization } = useAccess();

  // Switching context clears any half-built purchase and reloads every screen,
  // so the toggle asks first. `pendingScope` holds the target actingAsWarehouse
  // value while the confirmation is open (null when nothing is pending).
  const [pendingScope, setPendingScope] = useState<boolean | null>(null);

  const requestSwitch = (target: boolean) => {
    if (target === actingAsWarehouse) return;
    setPendingScope(target);
  };

  const confirmSwitch = () => {
    if (pendingScope !== null) {
      setActingAsWarehouse(pendingScope);
    }
    setPendingScope(null);
  };

  const cancelSwitch = () => setPendingScope(null);

  const pharmacyOptions: DropdownOption[] = useMemo(
    () =>
      pharmacies.map((p) => ({
        label: p.pharmacyName,
        value: p.pharmacyId,
      })),
    [pharmacies],
  );

  /**
   * What the header shows when there is nothing to switch between. The selected
   * pharmacy names it; the only one in the list covers the moment before the
   * store has settled on it. Failing both — an account with no pharmacy assigned
   * yet — the organization names the scope, which for a single-location setup is
   * the location. "Pharmacy" is the last resort and means nothing is known.
   */
  const soleLocationLabel =
    selectedPharmacy?.pharmacyName?.trim() ||
    pharmacies[0]?.pharmacyName?.trim() ||
    organization.organizationName?.trim() ||
    "Pharmacy";

  const warehouseOptions: DropdownOption[] = useMemo(
    () =>
      warehouses.map((w) => ({
        label: warehouseLabel(w),
        value: w.warehouseId,
      })),
    [warehouses],
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

        // Whether to show the warehouse switcher instead of the pharmacy one.
        // The warehouses themselves come from the store (useInitializeWarehouse),
        // so this only has to settle which control belongs here.
        const details = await getUserById(userId).catch(() => null);
        const normalize = (r?: string) =>
          (r || "").toLowerCase().replace(/[^a-z]/g, "");
        if (
          (details?.warehouses?.length ?? 0) > 0 ||
          normalize(details?.pharmaRolesDto?.roleName) === "warehousemanager"
        ) {
          setIsWarehouseUser(true);
        }

        if (details?.pharmaRolesDto?.roleName) {
          setRole(details.pharmaRolesDto.roleName);
        }
      } catch (error) {
        console.error("Failed to fetch user for Navbar", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <>
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
            {userRole || role}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* A Super Admin picks whether they are operating a pharmacy or a
              warehouse; the choice flips the control beside it and drives the
              access rules and the api client's location header. */}
          {canActAsWarehouse && (
            <div className="flex items-center rounded-full bg-pneutral-100 p-[2px] text-[11px] font-medium select-none">
              <button
                type="button"
                onClick={() => requestSwitch(false)}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  actingAsWarehouse
                    ? "text-pneutral-500 hover:text-pneutral-700"
                    : "bg-white text-pneutral-900 shadow-sm"
                }`}
              >
                Pharmacy
              </button>
              <button
                type="button"
                onClick={() => requestSwitch(true)}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  actingAsWarehouse
                    ? "bg-white text-pneutral-900 shadow-sm"
                    : "text-pneutral-500 hover:text-pneutral-700"
                }`}
              >
                Warehouse
              </button>
            </div>
          )}

          <div className="w-[200px] flex items-center justify-center overflow-visible">
            {(canActAsWarehouse ? actingAsWarehouse : isWarehouseUser) ? (
              <div
                className="w-full origin-center scale-[0.82]"
                style={{ marginTop: "-8px", marginBottom: "-8px" }}
              >
                {warehouses.length > 1 ? (
                  <Dropdown
                    options={warehouseOptions}
                    value={selectedWarehouse?.warehouseId}
                    onChange={(value) => {
                      const warehouse = warehouses.find(
                        (w) => w.warehouseId === value,
                      );

                      if (warehouse) {
                        selectWarehouse(warehouse);
                      }
                    }}
                    placeholder="Select Warehouse"
                    isLoading={warehousesLoading}
                  />
                ) : (
                  // One warehouse (or none yet): nothing to choose between, so it
                  // reads as a label rather than a dropdown that cannot be used.
                  <div className="flex h-12 w-full items-center rounded-md border border-pneutral-300 bg-pneutral-50 px-3 text-p4 text-pneutral-900">
                    <span className="truncate">
                      {selectedWarehouse
                        ? warehouseLabel(selectedWarehouse)
                        : "Warehouse"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="w-full origin-center scale-[0.82]"
                style={{ marginTop: "-8px", marginBottom: "-8px" }}
              >
                {pharmacies.length > 1 ? (
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
                ) : (
                  // A single-location setup — and a multi-location org where this
                  // user is assigned one store — has nothing to choose between, so
                  // it reads as a label rather than a dropdown that cannot be used.
                  // Mirrors the warehouse side above.
                  <div className="flex h-12 w-full items-center rounded-md border border-pneutral-300 bg-pneutral-50 px-3 text-p4 text-pneutral-900">
                    <span className="truncate" title={soleLocationLabel}>
                      {loading ? "Loading..." : soleLocationLabel}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
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

    <ConfirmDialog
      isOpen={pendingScope !== null}
      title={pendingScope ? "Switch to Warehouse" : "Switch to Pharmacy"}
      message={
        pendingScope
          ? "You'll start operating a warehouse. Any in-progress purchase entry is cleared and the current screen reloads for the selected warehouse."
          : "You'll go back to operating a pharmacy. Any in-progress purchase entry is cleared and the current screen reloads for the selected pharmacy."
      }
      confirmLabel={pendingScope ? "Switch to Warehouse" : "Switch to Pharmacy"}
      cancelLabel="Cancel"
      onConfirm={confirmSwitch}
      onCancel={cancelSwitch}
    />
    </>
  );
};

export default Navbar;
