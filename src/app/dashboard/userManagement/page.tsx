import React from "react";
import Image from "next/image";

const page = () => {
  
  return (
    <>
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

            <button className="w-27.75 h-9 bg-primary-800 rounded-lg flex items-center justify-center gap-2 text-pneutral-50 text-label-l3 font-medium">
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
      </div>
    </>
  );
};

export default page;
