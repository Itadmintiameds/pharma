import clsx from "clsx";
import { X } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  label: string;
  value: string | number;
}

interface DropdownProps {
  label?: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  options: DropdownOption[];
  value?: string | number | (string | number)[];
  onChange: (value: any) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
  isLoading?: boolean;
  allowOther?: boolean;
  /**
   * Single-select only. Lets the chosen option be taken back: clicking it a
   * second time clears the field, and a ✕ appears beside the chevron. Off by
   * default — on a required field there is nothing sensible to clear back to.
   */
  clearable?: boolean;
  menuPlacement?: 'top' | 'bottom';
  /**
   * Rendered at the right of the label row — for a control that swapped in for
   * another one and needs a way back, the way an Input uses `rightIcon`.
   */
  labelAction?: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  required,
  error,
  success,
  hint,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchable = false,
  multiple = false,
  className,
  labelClassName,
  disabled = false,
  readOnly = false,
  isLoading = false,
  allowOther = false,
  clearable = false,
  menuPlacement = 'bottom',
  labelAction,
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
      } else if (clearable && option.value === value) {
        // Picking the selected option again takes it back.
        setIsCustomOther(false);
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

  // Non-interactive when disabled or readonly
  const isLocked = disabled || readOnly;

  // State styles on the control: disabled > readonly > error > success > enabled/active
  const getStateStyles = () => {
    if (disabled)
      return "border-pneutral-300 bg-sneutral-100 cursor-not-allowed";
    if (readOnly)
      return "border-pneutral-300 bg-pneutral-50 cursor-default";
    if (error)
      return clsx(
        "border-warning-500 bg-white cursor-pointer",
        isOpen && "ring-1 ring-warning-500"
      );
    if (success)
      return clsx(
        "border-success-700 bg-white cursor-pointer",
        isOpen && "ring-1 ring-success-700"
      );
    return clsx(
      "bg-white cursor-pointer",
      isOpen
        ? "border-secondary-300 ring-1 ring-secondary-300"
        : "border-pneutral-300"
    );
  };

  return (
    <div className={clsx("w-full relative", className)} ref={dropdownRef}>
      {label && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <label
            className={clsx(
              "block text-label-l4 font-medium justify-center transition-colors duration-200",
              disabled ? "text-pneutral-500" : "text-pneutral-900",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-2 text-warning-500 font-semibold text-label-l2">
                *
              </span>
            )}
          </label>
          {labelAction}
        </div>
      )}

      <div
        className={clsx(
          "flex h-12 w-full items-center justify-between rounded-md border px-3 transition-all duration-200",
          getStateStyles()
        )}
        onClick={() => {
          if (!isLocked && !isLoading && !searchable) {
            setIsOpen(!isOpen);
          }
        }}
      >
        {searchable ? (
          <input
            ref={inputRef}
            type="text"
            className={clsx(
              "w-full outline-none bg-transparent text-p4 flex-1 placeholder:text-pneutral-500",
              disabled
                ? "text-pneutral-500 cursor-not-allowed"
                : readOnly
                ? "text-pneutral-800 cursor-default"
                : "text-pneutral-900"
            )}
            placeholder={isOpen ? "Search..." : (displayValue || placeholder)}
            value={isOpen ? searchQuery : (displayValue || "")}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!isLocked && !isLoading) {
                setIsOpen(true);
                setSearchQuery("");
              }
            }}
            onClick={() => {
              if (!isOpen && !isLocked && !isLoading) setIsOpen(true);
            }}
            readOnly={readOnly}
            disabled={disabled || isLoading}
          />
        ) : (
          <span
            title={displayValue || undefined}
            className={clsx(
              "text-p4 truncate w-full flex-1",
              !displayValue || isLoading
                ? "text-pneutral-500"
                : disabled
                ? "text-pneutral-500"
                : readOnly
                ? "text-pneutral-800"
                : "text-pneutral-900"
            )}
          >
            {isLoading ? "Loading..." : (displayValue || placeholder)}
          </span>
        )}
        {clearable && !multiple && !isLocked && !isLoading && displayValue && (
          <button
            type="button"
            aria-label={`Clear ${label ?? "selection"}`}
            title="Clear"
            onClick={(e) => {
              e.stopPropagation();
              setIsCustomOther(false);
              setSearchQuery("");
              setIsOpen(false);
              onChange("");
            }}
            className="shrink-0 ml-2 flex h-5 w-5 items-center justify-center rounded text-pneutral-500 hover:text-pneutral-900 hover:bg-pneutral-100 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        )}

        <Image
          src="/ProductManagement/ChevronDouble.svg"
          alt="Dropdown"
          width={14}
          height={8}
          onClick={(e) => {
            if (!isLocked && !isLoading) {
              e.stopPropagation();
              if (searchable && !isOpen) {
                inputRef.current?.focus();
              } else {
                setIsOpen(!isOpen);
              }
            }
          }}
          className={clsx(
            "transition-transform duration-200 shrink-0 ml-2",
            isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            readOnly && "cursor-default",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {allowOther && isCustomOther && !multiple && (
        <input
          type="text"
          className={clsx(
            "mt-2 flex h-12 w-full items-center justify-between rounded-md border bg-white px-3 transition-all duration-200 text-p4 text-pneutral-900 outline-none placeholder:text-pneutral-500",
            error
              ? "border-warning-500 focus:ring-1 focus:ring-warning-500"
              : success
              ? "border-success-700 focus:ring-1 focus:ring-success-700"
              : "border-pneutral-300 focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300"
          )}
          placeholder="Please specify..."
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus
        />
      )}

      {(error || success || hint) && (
        <p
          className={clsx(
            "mt-1 text-p2",
            error
              ? "text-warning-500"
              : success
              ? "text-success-700"
              : "text-pneutral-500"
          )}
        >
          {error || success || hint}
        </p>
      )}

      {isOpen && (
        <div className={clsx(
          "absolute z-50 w-full bg-white border border-pneutral-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col",
          menuPlacement === 'top' ? "bottom-full mb-1" : "top-full mt-1"
        )}>
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
                    {/* Truncated labels (long product names, "store - city"
                        pairs) are unreadable at this width, so the full text is
                        available on hover. */}
                    <span className="truncate" title={option.label}>
                      {option.label}
                    </span>
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
