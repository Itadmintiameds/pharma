"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ReportExportFormat } from "@/types/FinancialReportData";
import type { ReportAction } from "./useFinancialReport";

interface ReportHeaderProps {
  title: string;
  description: string;
  /** Path under /public for the 28px tile icon. */
  icon?: string;
  /** Print, and the Download menu's PDF (the print dialog's "Save as PDF"). */
  onPrint?: () => void;
  /** The Download menu's Excel / CSV. */
  onDownload?: (format: ReportExportFormat) => void;
  /** Disables the buttons and labels the one at work. */
  busy?: ReportAction | null;
}

const DOWNLOAD_OPTIONS: { key: ReportExportFormat | "pdf"; label: string; hint: string }[] = [
  { key: "xlsx", label: "Excel", hint: ".xlsx, every row" },
  { key: "csv", label: "CSV", hint: ".csv, every row" },
  { key: "pdf", label: "PDF", hint: 'Choose "Save as PDF" in the print dialog' },
];

/** Title row of a report page: icon tile, title and description, Print / Download. */
export default function ReportHeader({
  title,
  description,
  icon = "/Reports/DocumentChartBar.svg",
  onPrint,
  onDownload,
  busy = null,
}: ReportHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const choose = (key: ReportExportFormat | "pdf") => {
    setMenuOpen(false);
    if (key === "pdf") onPrint?.();
    else onDownload?.(key);
  };

  const downloading = busy === "xlsx" || busy === "csv";

  return (
    <div className="flex flex-wrap items-center gap-4 print:hidden">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary-100">
        <Image src={icon} alt="" width={28} height={28} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-h5 font-semibold text-pneutral-900">{title}</h1>
        <p className="text-p3 font-normal text-pneutral-500">{description}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPrint}
          disabled={!!busy}
          className="flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg border-2 border-pneutral-900 px-4 text-label-l4 font-medium text-pneutral-900 disabled:cursor-wait disabled:opacity-60"
        >
          <Image src="/Reports/Printer.svg" alt="" width={20} height={20} />
          {busy === "print" ? "Preparing…" : "Print"}
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={!!busy}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-12 min-w-27 items-center justify-center gap-2 rounded-lg bg-pneutral-900 px-4 text-label-l4 font-medium text-pneutral-50 disabled:cursor-wait disabled:opacity-60 sm:w-46.75"
          >
            <Image src="/Reports/ArrowDownTray.svg" alt="" width={20} height={20} />
            {downloading ? "Downloading…" : "Download"}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 flex w-60 flex-col overflow-hidden rounded-lg border border-pneutral-200 bg-white py-1 shadow-lg"
            >
              {DOWNLOAD_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(option.key)}
                  className="flex flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-secondary-50"
                >
                  <span className="text-label-l4 font-medium text-pneutral-900">{option.label}</span>
                  <span className="text-p2 text-pneutral-500">{option.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
