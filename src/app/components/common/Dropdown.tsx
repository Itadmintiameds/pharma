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
  /**
   * The option the keyboard is on, or -1 for none. Only ever set by the arrow
   * keys — the mouse has the pointer to say which option it means.
   */
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /** Keeps the arrow keys' option visible in a list taller than the menu. */
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    menuRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  /**
   * `fromKeyboard` keeps the focus where it is: blurring a searchable field
   * after an Enter-select would drop the caret out of the form, so the Tab that
   * follows would start over from the top of the page instead of moving on to
   * the next field.
   */
  const handleSelect = (option: DropdownOption, fromKeyboard = false) => {
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
      setActiveIndex(-1);
      if (!fromKeyboard) inputRef.current?.blur();
    }
  };

  const filteredOptions = dynamicOptions.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Non-interactive when disabled or readonly.
  const isLocked = disabled || readOnly;
  const isInert = isLocked || isLoading;

  /**
   * Keyboard operation of the control.
   *
   * The field is a div, so without this it was unreachable by Tab: the caret
   * jumped from the input above it to the input below, and a form of dropdowns
   * could not be filled in from the keyboard at all. Tab itself is deliberately
   * not handled beyond closing the menu — the browser's own focus order is what
   * should move on, so the next stop is whatever comes next in the markup,
   * date picker and upload button included.
   */
  const handleControlKeyDown = (event: React.KeyboardEvent) => {
    if (isInert) return;

    // An open menu must not outlive the focus that opened it.
    if (event.key === "Tab") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Escape") {
      if (!isOpen) return;
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        // Down enters the list at the top, Up at the bottom.
        setActiveIndex(
          filteredOptions.length
            ? event.key === "ArrowDown"
              ? 0
              : filteredOptions.length - 1
            : -1
        );
        return;
      }
      if (filteredOptions.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((prev) => {
        const next = prev + step;
        if (next < 0) return filteredOptions.length - 1;
        if (next >= filteredOptions.length) return 0;
        return next;
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      // Space opens a plain field (where it would otherwise scroll the page)
      // but is left alone on a searchable one — there it is a character being
      // typed into the query.
      if (event.key === " " && searchable) return;
      event.preventDefault();

      if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex], true);
        return;
      }
      setIsOpen((prev) => !prev);
      setActiveIndex(-1);
      return;
    }
  };

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
        ref={controlRef}
        // A searchable field has a real input inside it, which is the focus
        // stop; anything else needs the wrapper to be one, or Tab skips the
        // field entirely.
        tabIndex={searchable || isInert ? undefined : 0}
        role={searchable ? undefined : "combobox"}
        aria-expanded={searchable ? undefined : isOpen}
        aria-haspopup={searchable ? undefined : "listbox"}
        aria-disabled={!searchable && isInert ? true : undefined}
        onKeyDown={handleControlKeyDown}
        className={clsx(
          "flex h-12 w-full items-center justify-between rounded-md border px-3 transition-all duration-200",
          getStateStyles(),
          !searchable &&
            !isInert &&
            "focus:outline-none focus:border-secondary-300 focus:ring-1 focus:ring-secondary-300"
        )}
        onClick={() => {
          if (!isInert && !searchable) {
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
              // The list under the caret is a different list now, so the
              // keyboard's place in it means nothing.
              setActiveIndex(-1);
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
        <div
          role="listbox"
          className={clsx(
            "absolute z-50 w-full bg-white border border-pneutral-200 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col",
            menuPlacement === 'top' ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          <div ref={menuRef} className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-pneutral-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = multiple
                  ? Array.isArray(value) && value.includes(option.value)
                  : value === option.value;
                const isActive = index === activeIndex;

                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    // Read by the effect above to keep the arrow keys' option
                    // in view on a list longer than the menu.
                    data-active={isActive ? "true" : undefined}
                    className={clsx(
                      "px-3 py-2.5 text-sm cursor-pointer transition-colors flex items-center",
                      isSelected ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-pneutral-900",
                      // Outlined rather than filled, so it reads as "where the
                      // keyboard is" and not as a second selected row.
                      isActive && "ring-1 ring-inset ring-secondary-300 bg-gray-50"
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
