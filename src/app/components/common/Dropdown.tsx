import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";

export interface DropdownOption {
  label: string;
  value: string | number;
}

interface DropdownProps {
  label?: string;
  required?: boolean;
  error?: string;
  options: DropdownOption[];
  value?: string | number | (string | number)[];
  onChange: (value: any) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  allowOther?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  required,
  error,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchable = false,
  multiple = false,
  className,
  disabled = false,
  isLoading = false,
  allowOther = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dynamicOptions = allowOther 
    ? [...options, { label: "Other", value: "OTHER" }] 
    : options;

  const [isCustomOther, setIsCustomOther] = useState(() => {
    if (allowOther && value && !multiple && !options.find(o => o.value === value)) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (allowOther && value && !multiple && !options.find(o => o.value === value)) {
      setIsCustomOther(true);
    } else if (!value) {
      setIsCustomOther(false);
    }
  }, [value, allowOther, options, multiple]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: DropdownOption) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.includes(option.value);

      let newValues;
      if (isSelected) {
        newValues = currentValues.filter((v) => v !== option.value);
      } else {
        newValues = [...currentValues, option.value];
      }
      onChange(newValues);
    } else {
      if (option.value === "OTHER") {
        setIsCustomOther(true);
        onChange("");
      } else {
        setIsCustomOther(false);
        onChange(option.value);
      }
      setSearchQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const filteredOptions = dynamicOptions.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayValue = () => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.length === 0) return "";
      if (currentValues.length === 1) {
        return dynamicOptions.find((o) => o.value === currentValues[0])?.label || "";
      }
      return `${currentValues.length} items selected`;
    }

    if (value !== undefined && value !== null && value !== "") {
      const opt = dynamicOptions.find((o) => o.value === value);
      if (opt) return opt.label;
      if (allowOther) return value as string;
    }
    return "";
  };

  const displayValue = getDisplayValue();

  return (
    <div className={clsx("w-full relative", className)} ref={dropdownRef}>
      {label && (
        <label className="mb-1 block text-label-l4 font-medium text-pneutral-900 justify-center">
          {label}
          {required && (
            <span className="ml-2 text-warning-500 font-semibold text-label-l2">
              *
            </span>
          )}
        </label>
      )}

      <div
        className={clsx(
          "flex h-12 w-full items-center justify-between rounded-md border bg-white px-3 transition-all",
          error ? "border-warning-500" : "border-pneutral-300",
          disabled ? "opacity-60 cursor-not-allowed bg-gray-50" : "cursor-pointer"
        )}
        onClick={() => {
          if (!disabled && !isLoading && !searchable) {
            setIsOpen(!isOpen);
          }
        }}
      >
        {searchable ? (
          <input
            ref={inputRef}
            type="text"
            className={clsx(
              "w-full outline-none bg-transparent text-p4 flex-1",
              disabled && "cursor-not-allowed"
            )}
            placeholder={isOpen ? "Search..." : (displayValue || placeholder)}
            value={isOpen ? searchQuery : (displayValue || "")}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled && !isLoading) {
                setIsOpen(true);
                setSearchQuery("");
              }
            }}
            onClick={() => {
              if (!isOpen && !disabled && !isLoading) setIsOpen(true);
            }}
            disabled={disabled || isLoading}
          />
        ) : (
          <span
            className={clsx(
              "text-p4 truncate w-full flex-1",
              displayValue && !isLoading ? "text-pneutral-900" : "text-pneutral-500"
            )}
          >
            {isLoading ? "Loading..." : (displayValue || placeholder)}
          </span>
        )}
        <svg
          onClick={(e) => {
            if (!disabled && !isLoading) {
              e.stopPropagation();
              if (searchable && !isOpen) {
                inputRef.current?.focus();
              } else {
                setIsOpen(!isOpen);
              }
            }
          }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={clsx(
            "text-pneutral-500 transition-transform duration-200 shrink-0 ml-2 cursor-pointer",
            isOpen && "rotate-180"
          )}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {allowOther && isCustomOther && !multiple && (
        <input
          type="text"
          className={clsx(
            "mt-2 flex h-12 w-full items-center justify-between rounded-md border bg-white px-3 transition-all text-p4 text-pneutral-900 outline-none focus:border-pneutral-500",
            error ? "border-warning-500" : "border-pneutral-300"
          )}
          placeholder="Please specify..."
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}

      {error && <p className="mt-1 text-p2 text-warning-500">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-pneutral-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-pneutral-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multiple
                  ? Array.isArray(value) && value.includes(option.value)
                  : value === option.value;

                return (
                  <div
                    key={option.value}
                    className={clsx(
                      "px-3 py-2.5 text-sm cursor-pointer transition-colors flex items-center",
                      isSelected ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-pneutral-900"
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    {multiple && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mr-3 h-4 w-4 rounded border-gray-300 outline-none cursor-pointer checked:shadow-[0_0_0_2px_#E0E7FFCC]"
                        style={{
                          accentColor: 'var(--Colors-Brand-Primary-900, #4C0080)'
                        }}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
