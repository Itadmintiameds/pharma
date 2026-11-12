"use client";

import clsx from "clsx";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  /** The text to show; nothing is shown while it is empty. */
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Keeps it hidden, e.g. while the dropdown it sits on is open. */
  disabled?: boolean;
  /** Checked on each hover; return false to skip it (e.g. the text is not cut off). */
  shouldShow?: (anchor: HTMLElement) => boolean;
}

/** True when the element marked `data-tooltip-text` inside `anchor` is cut off. */
export const isTextTruncated = (anchor: HTMLElement) => {
  const text = anchor.querySelector<HTMLElement>("[data-tooltip-text]") ?? anchor;
  // An input's scrollWidth does not follow its value in every browser, so its
  // text is measured against the box it has to fit in.
  if (text instanceof HTMLInputElement) {
    const style = getComputedStyle(text);
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return true;
    context.font = style.font;
    const room = text.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return context.measureText(text.value).width > room;
  }
  return text.scrollWidth > text.clientWidth;
};

const GAP = 8;
const EDGE = 8;

/**
 * A hover balloon above (or, without room, below) whatever it wraps.
 *
 * It is drawn in a portal against the viewport, so a table cell or scrolling
 * card with overflow hidden cannot clip it.
 */
export default function Tooltip({ content, children, className, disabled, shouldShow }: TooltipProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const open = hovered && !disabled && !!content;

  const show = () => {
    const anchor = anchorRef.current;
    if (!content || disabled || !anchor) return;
    if (shouldShow && !shouldShow(anchor)) return;
    setHovered(true);
  };
  const hide = () => setHovered(false);

  // Placed by hand against the anchor's on-screen box, before paint.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      const bubble = bubbleRef.current;
      if (!anchor || !bubble) return;
      const rect = anchor.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = bubble;
      const fitsAbove = rect.top - GAP - height >= EDGE;
      const left = Math.min(
        Math.max(EDGE, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - EDGE,
      );
      bubble.style.left = `${left}px`;
      bubble.style.top = `${fitsAbove ? rect.top - GAP - height : rect.bottom + GAP}px`;
      // The arrow points at the anchor's centre even when the bubble is pushed off it.
      bubble.style.setProperty("--arrow-x", `${rect.left + rect.width / 2 - left}px`);
      setPlacement(fitsAbove ? "top" : "bottom");
    };
    place();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, content]);

  return (
    <div
      ref={anchorRef}
      className={clsx("w-full", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      // Clicking in opens the control underneath; the balloon would sit over it.
      onMouseDown={hide}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            role="tooltip"
            className="pointer-events-none fixed z-[1000] max-w-xs rounded-md bg-pneutral-900 px-3 py-2 text-p4 text-white shadow-lg break-words"
            style={{ left: -9999, top: -9999 }}
          >
            {content}
            <span
              aria-hidden
              className={clsx(
                "absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-pneutral-900",
                placement === "top" ? "-bottom-1" : "-top-1",
              )}
              style={{ left: "var(--arrow-x, 50%)" }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
