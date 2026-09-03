"use client";

/**
 * The prescription attached to a saved bill.
 *
 * Uploads go up with the bill (see uploadPrescription) but there was nowhere to
 * look at one afterwards — the file was write-only. This is that view: opened
 * from the invoice screen, beside Print.
 */

import React, { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";

interface PrescriptionModalProps {
  isOpen: boolean;
  /** The stored file — /billing/{id} returns it as prescriptionUrl. */
  url: string;
  onClose: () => void;
}

/** The file name the bucket stored it under, for the dialog's subtitle. */
const fileNameOf = (url: string): string => {
  try {
    const path = new URL(url, "http://localhost").pathname;
    return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "") || "Prescription";
  } catch {
    return "Prescription";
  }
};

/**
 * Images are shown as images and PDFs in a frame, so the extension has to be
 * read off the URL — the stored URL is all there is to go on, and it usually
 * carries a query string (a presigned link), which is why the path is taken
 * apart rather than the whole string matched.
 */
type PrescriptionKind = "image" | "pdf" | "unknown";

const kindOf = (url: string): PrescriptionKind => {
  const name = fileNameOf(url).toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|avif|heic|heif)$/.test(name)) return "image";
  if (/\.pdf$/.test(name)) return "pdf";
  return "unknown";
};

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  url,
  onClose,
}) => {
  // Escape closes it, as it does every other overlay.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  const kind = kindOf(url);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Uploaded prescription"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6"
      // A click on the backdrop itself, not on the panel above it.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full max-h-[860px] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-pneutral-200 px-5 py-4">
          <div className="flex min-w-0 flex-col">
            <h2 className="text-h6 font-semibold text-pneutral-900">
              Prescription
            </h2>
            <span className="truncate text-p2 font-noto-sans text-pneutral-500">
              {fileNameOf(url)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* The way out for anything this dialog cannot render inline, and
                the way to print or save the file itself. */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-2 rounded-lg border border-pneutral-300 px-3 text-label-l3 font-medium text-pneutral-700 hover:bg-pneutral-50"
            >
              <ExternalLink size={16} />
              Open in new tab
            </a>

            <button
              type="button"
              aria-label="Close prescription"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-pneutral-500 hover:bg-pneutral-100 hover:text-pneutral-900"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-pneutral-50 p-4">
          {kind === "image" ? (
            /* Plain <img>: the URL is whatever the API returns, so it cannot go
               through next/image's configured remote patterns. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Uploaded prescription"
              className="max-h-full max-w-full object-contain"
            />
          ) : kind === "pdf" ? (
            <iframe
              src={url}
              title="Uploaded prescription"
              className="h-full w-full rounded-lg border border-pneutral-200 bg-white"
            />
          ) : (
            /* An extension we cannot place — a bucket key with no suffix, or a
               format the browser will not display. Better to say so and hand
               over the link than to frame it and show a blank panel. */
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-label-l4 font-medium text-pneutral-900">
                This file cannot be previewed here.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-label-l3 font-medium text-secondary-700 underline"
              >
                Open the prescription in a new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionModal;
