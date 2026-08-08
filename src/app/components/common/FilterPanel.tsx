"use client";

import Image from "next/image";
import React, { useEffect, useId, useRef, useState } from "react";
import Button from "./Button";

/**
 * A generic, config-driven "Filter" button + popover for data tables.
 *
 * Filter values are a flat map of `key -> string | boolean`:
 *   - a `radio` section stores one string under its `key`
 *   - a `checkbox` section stores one boolean per item `key`
 *
 * The panel edits a local draft and only commits to `onApply` when the user
 * presses Apply, so the table isn't re-filtered on every click.
 */

export type FilterValue = string | boolean;
export type FilterValues = Record<string, FilterValue>;

/** Single-choice group: exactly one option's value is stored under `key`. */
export interface RadioFilterSection {
  type: "radio";
  key: string;
  title: string;
  options: { label: string; value: string }[];
}

/** A set of independent boolean toggles, each stored under its own `key`. */
export interface CheckboxFilterSection {
  type: "checkbox";
  title: string;
  items: { key: string; label: string }[];
}

export type FilterSection = RadioFilterSection | CheckboxFilterSection;

interface FilterPanelProps {
  sections: FilterSection[];
  /** Currently applied values. */
  value: FilterValues;
  /** The "cleared" values; used for the count badge and Reset. */
  defaults: FilterValues;
  onApply: (value: FilterValues) => void;
  onReset: () => void;
  label?: string;
  iconSrc?: string;
  /** Overrides the trigger button's classes. */
  buttonClassName?: string;
}

/** Number of values that differ from their defaults — drives the count badge. */
const countActive = (value: FilterValues, defaults: FilterValues): number =>
  Object.keys(defaults).reduce(
    (n, key) => n + (value[key] !== defaults[key] ? 1 : 0),
    0
  );

const DEFAULT_BUTTON_CLASS =
  "w-[108px]! shrink-0 gap-2 px-4 border! border-pneutral-200! bg-pneutral-50 text-p3! font-semibold tracking-[-0.02em] text-pneutral-900!";

const FilterPanel: React.FC<FilterPanelProps> = ({
  sections,
  value,
  defaults,
  onApply,
  onReset,
  label = "Filter",
  iconSrc = "/ProductManagement/LeadingIcon.svg",
  buttonClassName = DEFAULT_BUTTON_CLASS,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(value);
  const ref = useRef<HTMLDivElement>(null);
  // Namespaces radio groups so multiple panels on a page don't collide.
  const groupId = useId();
  const activeCount = countActive(value, defaults);

  // Start the draft from the applied values each time the panel opens.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        <Image src={iconSrc} alt="Filter" width={16} height={16} />
        {label}
        {activeCount > 0 && (
          <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-700 px-1 text-label-l2 font-semibold text-white">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[260px] rounded-lg border border-pneutral-200 bg-white p-4 shadow-lg">
          <div className="flex flex-col gap-4">
            {sections.map((section, i) => (
              <div key={i} className="flex flex-col gap-2">
                <span className="text-label-l4 font-semibold text-pneutral-900">
                  {section.title}
                </span>
                <div className="flex flex-col gap-1.5">
                  {section.type === "radio"
                    ? section.options.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 cursor-pointer text-p4 text-pneutral-900"
                        >
                          <input
                            type="radio"
                            name={`${groupId}-${section.key}`}
                            className="h-4 w-4 accent-secondary-700"
                            checked={draft[section.key] === opt.value}
                            onChange={() =>
                              setDraft((d) => ({
                                ...d,
                                [section.key]: opt.value,
                              }))
                            }
                          />
                          {opt.label}
                        </label>
                      ))
                    : section.items.map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 cursor-pointer text-p4 text-pneutral-900"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-secondary-700"
                            checked={!!draft[item.key]}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                [item.key]: e.target.checked,
                              }))
                            }
                          />
                          {item.label}
                        </label>
                      ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                className="text-p3 font-semibold text-pneutral-600"
                onClick={() => {
                  setDraft(defaults);
                  onReset();
                  setOpen(false);
                }}
              >
                Reset
              </button>
              <Button
                type="button"
                variant="primary"
                className="h-9! px-5 text-label-l3!"
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
