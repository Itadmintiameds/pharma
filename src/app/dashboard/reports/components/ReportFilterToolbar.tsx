"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import Button from "@/app/components/common/Button";
import {
  PERIOD_TABS,
  ReportPeriod,
  formatReportDate,
  formatReportMonth,
  toDateInputValue,
} from "./reportUtils";

export interface AppliedFilterChip {
  key: string;
  label: string;
  /** Omit for a chip that cannot be cleared, like the reporting period. */
  onRemove?: () => void;
}

interface ReportFilterToolbarProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  /** The filter fields after the date one, one grid cell each. Always shown. */
  children: React.ReactNode;
  /**
   * Extra fields, a grid cell each, revealed by "More Filters (n)" under the
   * first row. Without them the toggle is not rendered.
   */
  moreFilters?: React.ReactNode;
  /** The n in "More Filters (n)": how many fields `moreFilters` holds. */
  moreFilterCount?: number;
  chips: AppliedFilterChip[];
  onReset: () => void;
  onSearch: () => void;
  searching?: boolean;
}

const OUTLINE_BUTTON =
  "flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg border-2 border-secondary-700 px-4 text-label-l4 font-medium text-secondary-700";

const openPicker = (input: HTMLInputElement | null) => {
  try {
    input?.showPicker?.();
  } catch {
    // showPicker throws outside a user gesture or on an unsupported input;
    // there is nothing to recover — the field just stays closed.
  }
};

/**
 * A native date/month input that shows its value the reports' way
 * ("01-Oct-2026") instead of in the browser's locale format. The input sits
 * invisibly over the formatted text, so a click or Enter/Space on it opens
 * the browser's own picker.
 */
const PickerInput = React.forwardRef<
  HTMLInputElement,
  {
    type: "date" | "month";
    label: string;
    value: string;
    display: string;
    min?: string;
    max?: string;
    onChange: (value: string) => void;
  }
>(({ type, label, value, display, min, max, onChange }, ref) => (
  <span className="relative whitespace-nowrap">
    <span className="text-p4 text-pneutral-900">{display}</span>
    <input
      ref={ref}
      type={type}
      aria-label={label}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => openPicker(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker(e.currentTarget);
        }
      }}
      className="absolute inset-0 w-full cursor-pointer opacity-0"
    />
  </span>
));
PickerInput.displayName = "PickerInput";

/** The date field for the active tab: a range, a single day, a month or (Today) a fixed label. */
function PeriodField({
  period,
  onChange,
}: {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const label =
    period.mode === "range" ? "Date Range" : period.mode === "month" ? "Month" : "Date";

  return (
    <div className="w-full">
      <label className="mb-1 block px-1 text-label-l4 font-medium text-pneutral-900">
        {label}
      </label>
      <div className="flex h-12 w-full items-center gap-3 rounded-md border border-pneutral-300 bg-white px-3 focus-within:border-secondary-300 focus-within:ring-1 focus-within:ring-secondary-300">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {period.mode === "today" && (
            <span className="text-p4 text-pneutral-900">
              {formatReportDate(toDateInputValue(new Date()))}
            </span>
          )}

          {period.mode === "day" && (
            <PickerInput
              ref={firstInputRef}
              type="date"
              label="Date"
              value={period.day}
              display={formatReportDate(period.day)}
              onChange={(day) => onChange({ ...period, day })}
            />
          )}

          {period.mode === "month" && (
            <PickerInput
              ref={firstInputRef}
              type="month"
              label="Month"
              value={period.month}
              display={formatReportMonth(period.month)}
              onChange={(month) => onChange({ ...period, month })}
            />
          )}

          {period.mode === "range" && (
            <>
              <PickerInput
                ref={firstInputRef}
                type="date"
                label="From date"
                value={period.from}
                display={formatReportDate(period.from)}
                max={period.to || undefined}
                onChange={(from) => onChange({ ...period, from })}
              />
              <span className="text-p4 text-pneutral-900">–</span>
              <PickerInput
                type="date"
                label="To date"
                value={period.to}
                display={formatReportDate(period.to)}
                min={period.from || undefined}
                onChange={(to) => onChange({ ...period, to })}
              />
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Open calendar"
          disabled={period.mode === "today"}
          onClick={() => openPicker(firstInputRef.current)}
          className="shrink-0 disabled:cursor-default"
        >
          <Image src="/Reports/Calendar.svg" alt="" width={20} height={20} />
        </button>
      </div>
    </div>
  );
}

/**
 * The filter card at the top of a report: reporting-period tabs and the
 * More Filters / Reset / Search actions, the filter fields, and a chip per
 * applied filter.
 *
 * The fields edit a draft; nothing is applied until Search, so the chips (and
 * the data) describe what was last searched, not what is half-typed.
 */
export default function ReportFilterToolbar({
  period,
  onPeriodChange,
  children,
  moreFilters,
  moreFilterCount = 0,
  chips,
  onReset,
  onSearch,
  searching = false,
}: ReportFilterToolbarProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="@container flex w-full flex-col gap-4 rounded-2xl bg-white p-4 shadow-[4px_4px_12px_0px_rgba(213,213,212,0.2),-4px_-4px_12px_0px_rgba(213,213,212,0.2),0px_0px_12px_0px_rgba(192,193,190,0.2)]">
      <div className="flex flex-wrap items-center gap-4 border-b border-pneutral-200">
        <div role="tablist" aria-label="Reporting period" className="flex flex-1 flex-wrap items-start">
          {PERIOD_TABS.map(({ mode, label }) => {
            const active = period.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onPeriodChange({ ...period, mode })}
                className="flex flex-col items-center gap-2 pt-2"
              >
                <span
                  className={clsx(
                    "px-3 text-center text-label-l3 font-semibold whitespace-nowrap",
                    active ? "text-secondary-700" : "text-pneutral-500",
                  )}
                >
                  {label}
                </span>
                <span
                  className={clsx("h-1 w-full", active ? "bg-secondary-700" : "bg-transparent")}
                />
              </button>
            );
          })}
        </div>

        <div className="mb-2 flex flex-wrap gap-3">
          {moreFilters && (
            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((prev) => !prev)}
              className={OUTLINE_BUTTON}
            >
              <Image src="/Reports/Funnel.svg" alt="" width={20} height={20} />
              {showMore ? "Fewer Filters" : `More Filters (${moreFilterCount})`}
              <Image src="/Reports/ChevronDoubleDown.svg" alt="" width={20} height={20} />
            </button>
          )}
          <button type="button" onClick={onReset} className={OUTLINE_BUTTON}>
            Reset
          </button>
          <Button
            type="button"
            onClick={onSearch}
            loading={searching}
            className="min-w-27 px-4"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Columns follow the card's width, not the viewport's: the sidebar's width varies. */}
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
        <PeriodField period={period} onChange={onPeriodChange} />
        {children}
        {showMore && moreFilters}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-p3 text-pneutral-500">Applied filters</p>
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-2 rounded-sm bg-primary-100 px-2 py-1 text-p2 font-medium text-primary-800"
            >
              {chip.label}
              {chip.onRemove && (
                <button
                  type="button"
                  aria-label={`Remove ${chip.label}`}
                  onClick={chip.onRemove}
                >
                  <Image src="/Reports/Close.svg" alt="" width={16} height={16} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
