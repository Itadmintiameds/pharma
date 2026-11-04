"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { showToast } from "@/app/components/common/Toast";
import type { ReportExportFormat } from "@/types/FinancialReportData";
import { printElement } from "@/utils/printElement";
import { REPORT_PRINT_CSS } from "./reportPrintStyles";

/** What the header's Print / Download buttons are busy with, if anything. */
export type ReportAction = "print" | ReportExportFormat;

interface UseReportActionsOptions<R> {
  /** The report on screen; nothing is printed until it has loaded. */
  report: R | null;
  /** Whether rows matching the filters are missing from the page on screen. */
  hasMoreRows: (report: R) => boolean;
  /** The report with every matching row on one page, for printing. */
  fetchAll: () => Promise<R>;
  /** The backend's CSV / Excel download, with the filters on screen. */
  exportReport: (format: ReportExportFormat) => Promise<void>;
  /** The print's document title, which the dialog offers as the PDF's name. */
  fileStem: string;
}

/**
 * The header's Print / Download for a report page.
 *
 * Print / PDF and the CSV / Excel download cover every matching row, not just
 * the page on screen. The page's root carries `printId`, and renders
 * `printReport ?? report`: every row is swapped in only while the print copy
 * is taken.
 */
export function useReportActions<R>({
  report,
  hasMoreRows,
  fetchAll,
  exportReport,
  fileStem,
}: UseReportActionsOptions<R>) {
  // Found by id rather than a ref so the returned object stays a plain value in render.
  const printId = useId();
  const [printReport, setPrintReport] = useState<R | null>(null);
  const [busy, setBusy] = useState<ReportAction | null>(null);

  const print = async () => {
    if (!report || busy) return;
    setBusy("print");
    try {
      // A single-page report already has every row on screen.
      if (hasMoreRows(report)) {
        const all = await fetchAll();
        // Committed now, so the copy below picks up every row.
        flushSync(() => setPrintReport(all));
      }
      const root = document.getElementById(printId);
      if (!root) throw new Error("Nothing to print.");
      // The element is copied synchronously, so the page can go straight back.
      printElement(root, fileStem, REPORT_PRINT_CSS);
    } catch (err) {
      console.error("Failed to print the report:", err);
      showToast.error((err as Error)?.message || "Could not open the print dialog.");
    } finally {
      setPrintReport(null);
      setBusy(null);
    }
  };

  const download = async (format: ReportExportFormat) => {
    if (busy) return;
    setBusy(format);
    try {
      await exportReport(format);
    } catch (err) {
      console.error("Failed to download the report:", err);
      showToast.error((err as Error)?.message || "Failed to download the report.");
    } finally {
      setBusy(null);
    }
  };

  return { printId, printReport, print, download, busy };
}
