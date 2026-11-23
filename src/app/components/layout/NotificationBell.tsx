"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BellRing, Sparkles } from "lucide-react";

/** Notifications aren't built yet — the bell opens a "coming soon" note. */
const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere else, or pressing Escape, closes the popover.
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
        aria-label="Notifications"
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
        <div
          role="status"
          className="animate-modal absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-xl border border-primary-100 bg-white shadow-[0px_12px_40px_0px_#8f2dd226]"
        >
          {/* Soft brand-tinted header with the bell icon */}
          <div className="relative flex flex-col items-center bg-linear-to-br from-primary-100 via-secondary-50 to-white px-6 pt-6 pb-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0px_4px_16px_0px_#c571ff40] ring-4 ring-primary-100">
              <BellRing size={26} className="text-primary-700" />
              <Sparkles
                size={16}
                className="absolute -right-1 -top-1 text-secondary-500"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 px-6 pb-6 text-center">
            <span className="rounded-full bg-primary-100 px-3 py-0.5 text-label-l2 font-semibold tracking-wide text-primary-700 uppercase">
              Coming soon
            </span>
            <p className="text-h6 font-semibold text-pneutral-900">
              Notifications are on the way
            </p>
            <p className="text-p3 font-regular text-pneutral-500">
              We&apos;re building alerts for stock, expiries and orders. You&apos;ll
              see them right here soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
