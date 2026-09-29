"use client";

/**
 * DEVELOPMENT ONLY — delete this file and its one usage in Navbar.tsx.
 *
 * Sample identifiers that satisfy the app's own validators, so forms can be
 * filled without hunting for a real GSTIN every time. The GSTINs also carry
 * correct check digits, so they survive a stricter backend check too.
 *
 * None of these belong to a real business: the PANs inside the GSTINs are
 * made up, and the numbers are for filling test forms only.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";

interface SampleGroup {
  title: string;
  /** What the value has to satisfy, as a reminder while testing. */
  rule: string;
  values: string[];
}

const SAMPLES: SampleGroup[] = [
  {
    title: "GSTIN",
    rule: "15 chars · valid state code · valid check digit",
    values: ["27AAACT3518Q1ZX", "29AABCU9603R1ZJ", "07AAACH7409R1Z3"],
  },
  {
    title: "Drug Licence",
    rule: "free text, max 30 chars",
    values: ["20B/KA/2023/104567", "21B/MH/2024/008912", "MH-MUM-20B-114520"],
  },
  {
    title: "PAN",
    rule: "5 letters · 4 digits · 1 letter",
    values: ["AAACT3518Q"],
  },
  {
    title: "FSSAI Licence",
    rule: "exactly 14 digits",
    values: ["10023011000123"],
  },
];

const CopyRow = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access is refused outside a secure context, so the value
      // stays selectable by hand rather than the click doing nothing at all.
      console.warn("Could not copy to the clipboard — select the value instead.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy"
      className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-pneutral-50"
    >
      <span className="font-mono text-p3 text-pneutral-900">{value}</span>
      {copied ? (
        <Check size={16} className="shrink-0 text-success-600" />
      ) : (
        <Copy size={16} className="shrink-0 text-pneutral-500" />
      )}
    </button>
  );
};

const DevTestIds = () => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere else, or pressing Escape, closes the list.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Sample test identifiers (development only)"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-7 w-7 items-center justify-center transition-opacity hover:opacity-80"
      >
        <Image
          src="/dashboard/icons/notification bell.svg"
          alt=""
          width={28}
          height={28}
          className="object-contain"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-75 rounded-lg border border-pneutral-200 bg-white p-3 shadow-[0px_8px_32px_0px_#00000026]">
          <p className="mb-2 text-label-l2 font-semibold tracking-wide text-pneutral-500 uppercase">
            Test values · dev only
          </p>

          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
            {SAMPLES.map((group) => (
              <div key={group.title} className="flex flex-col gap-0.5">
                <p className="px-2 text-p3 font-semibold text-pneutral-900">
                  {group.title}
                </p>
                <p className="px-2 pb-1 text-label-l2 font-regular text-pneutral-500">
                  {group.rule}
                </p>
                {group.values.map((value) => (
                  <CopyRow key={value} value={value} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTestIds;
