"use client";

import Image from "next/image";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showQRCode?: boolean;
  onQRCodeClick?: () => void;
}

const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  disabled = false,
  showQRCode = true,
  onQRCodeClick,
}: SearchInputProps) => {
  return (
    <div
      className={`flex items-center h-14 w-full rounded-xl border-2 border-secondary-100 bg-white px-4  ${className}`}
    >
      <Image
        src="/Purchase/SearchIcon.svg"
        alt="QR Code"
        width={22}
        height={22}
      />

      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3 text-label-l4 font-normal text-pneutral-300 placeholder:text-pneutral-300 focus:outline-none"
      />

      {showQRCode && (
        <button type="button" onClick={onQRCodeClick} className="ml-2 shrink-0">
          <Image
            src="/ProductManagement/scanIcon.svg"
            alt="QR Code"
            width={22}
            height={22}
          />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
