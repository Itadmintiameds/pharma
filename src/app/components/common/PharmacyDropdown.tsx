"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { usePharmacyStore } from "@/store/pharmacyStore";

export default function PharmacyDropdown() {
  const { pharmacies, selectedPharmacy, selectPharmacy, loading } =
    usePharmacyStore();

  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (pharmacy: typeof selectedPharmacy) => {
    if (!pharmacy) return;

    selectPharmacy(pharmacy);

    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="w-[250px] h-[40px] rounded-lg bg-pneutral-100 animate-pulse" />
    );
  }

  if (!selectedPharmacy) {
    return <div className="text-p3 text-pneutral-500">No Pharmacy Found</div>;
  }

  return (
    <div ref={dropdownRef} className="relative w-[250px]">
      {/* Selected Pharmacy */}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[42px]
                   border border-pneutral-200
                   rounded-xl
                   bg-white
                   px-4
                   flex
                   items-center
                   justify-between
                   hover:border-secondary-500
                   transition-all"
      >
        <div className="flex flex-col items-start overflow-hidden">
          <span className="text-[11px] text-pneutral-500">
            Current Pharmacy
          </span>

          <span className="text-[14px] font-semibold text-pneutral-900 truncate max-w-[180px]">
            {selectedPharmacy.pharmacyName}
          </span>
        </div>

        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}

      {isOpen && (
        <div
          className="
          absolute
          mt-2
          w-full
          bg-white
          border
          border-pneutral-200
          rounded-xl
          shadow-xl
          z-50
          overflow-hidden
          max-h-[260px]
          overflow-y-auto"
        >
          {pharmacies.map((pharmacy) => {
            const selected =
              pharmacy.pharmacyId === selectedPharmacy.pharmacyId;

            return (
              <button
                key={pharmacy.pharmacyId}
                onClick={() => handleSelect(pharmacy)}
                className={`
                  w-full
                  px-4
                  py-3
                  flex
                  justify-between
                  items-center
                  text-left
                  transition-colors

                  ${selected ? "bg-secondary-50" : "hover:bg-pneutral-50"}
                `}
              >
                <div className="flex flex-col">
                  <span className="text-p4 font-medium text-pneutral-900">
                    {pharmacy.pharmacyName}
                  </span>

                  <span className="text-[11px] text-pneutral-500">
                    {pharmacy.pharmacyId}
                  </span>
                </div>

                {selected && <Check size={18} className="text-secondary-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
