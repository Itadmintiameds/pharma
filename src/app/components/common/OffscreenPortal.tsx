"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface OffscreenPortalProps {
  children: React.ReactNode;
  /** Layout width in px — set this to the width the design expects, not the viewport's. */
  width?: number;
  /** Fired with the host node once the children are mounted and laid out. */
  onReady: (node: HTMLElement) => void;
}

/**
 * Renders children into a body-level node that is positioned off-screen but
 * still laid out, then hands the node to `onReady` for capture.
 *
 * Two reasons it can't simply be hidden or rendered in place:
 *  - `display: none` (or `visibility: hidden`) produces a zero-sized canvas,
 *    so html2canvas captures nothing.
 *  - The dashboard shell nests pages in `h-screen` / `overflow-hidden`
 *    containers, which would clip the capture to one viewport. Portalling to
 *    <body> escapes them, and the explicit width means the invoice is captured
 *    at its intended size regardless of the window.
 */
const OffscreenPortal: React.FC<OffscreenPortalProps> = ({
  children,
  width = 1440,
  onReady,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    // Two frames: the first commits layout, the second guarantees a paint has
    // happened before anything tries to read the node's geometry.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => onReady(node));
    });

    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: "-20000px",
        width: `${width}px`,
        background: "#ffffff",
        padding: "24px",
        // Keep it out of the a11y tree and off the interaction surface.
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default OffscreenPortal;
