"use client";

import React, { useRef, useState } from "react";
import Button from "@/app/components/common/Button";

type Props = {
  imageSrc: string;
  fileName?: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
};

const VIEWPORT = 320; // square crop viewport (px)
const OUTPUT = 400; // exported image size (px)
const MAX_ZOOM = 4;

// Lightweight square cropper with drag-to-pan + zoom. The circular overlay is
// only a guide — the exported image is the square region under the viewport,
// which the app then renders inside its circular logo frames.
export default function LogoCropModal({
  imageSrc,
  fileName = "logo.png",
  onCancel,
  onCropped,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Base fit = "contain": the whole image is visible at zoom 1; the user can
  // then zoom in to crop. Empty space around the image is filled white on export.
  const baseScale = natural ? VIEWPORT / Math.max(natural.w, natural.h) : 1;
  const scale = baseScale * zoom;
  const dW = natural ? natural.w * scale : 0;
  const dH = natural ? natural.h * scale : 0;

  // When the image is larger than the viewport, keep it covering; when smaller,
  // keep it fully inside. Applied per axis so wide/tall images behave sensibly.
  const clampAxis = (v: number, dim: number) =>
    dim >= VIEWPORT
      ? Math.min(0, Math.max(VIEWPORT - dim, v))
      : Math.max(0, Math.min(VIEWPORT - dim, v));

  const clamp = (x: number, y: number, w: number, h: number) => ({
    x: clampAxis(x, w),
    y: clampAxis(y, h),
  });

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    const bScale = VIEWPORT / Math.max(w, h);
    const iw = w * bScale;
    const ih = h * bScale;
    setNatural({ w, h });
    setZoom(1);
    setOffset({ x: (VIEWPORT - iw) / 2, y: (VIEWPORT - ih) / 2 });
  };

  const handleZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!natural) return;
    const newZoom = Number(e.target.value);
    const oldScale = baseScale * zoom;
    const newScale = baseScale * newZoom;
    // Preserve the point currently at the viewport centre
    const cx = (VIEWPORT / 2 - offset.x) / oldScale;
    const cy = (VIEWPORT / 2 - offset.y) / oldScale;
    const nw = natural.w * newScale;
    const nh = natural.h * newScale;
    setZoom(newZoom);
    setOffset(clamp(VIEWPORT / 2 - cx * newScale, VIEWPORT / 2 - cy * newScale, nw, nh));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp(d.ox + (e.clientX - d.x), d.oy + (e.clientY - d.y), dW, dH));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleApply = () => {
    if (!imgRef.current || !natural) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map the viewport 1:1 onto the output canvas: draw the whole image at its
    // on-screen position/scale on a transparent background (PNG keeps the alpha).
    // Anything outside the viewport is clipped by the canvas bounds.
    const ratio = OUTPUT / VIEWPORT;
    ctx.drawImage(
      imgRef.current,
      offset.x * ratio,
      offset.y * ratio,
      dW * ratio,
      dH * ratio,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const name = fileName.replace(/\.[^.]+$/, "") + ".png";
      onCropped(new File([blob], name, { type: "image/png" }));
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-pneutral-900/60 backdrop-blur-sm px-4">
      <div
        className="shrink-0 overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        style={{ width: 460, maxWidth: "92vw" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-pneutral-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary-50 text-secondary-700 flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.13 1 6 16a2 2 0 0 0 2 2h15M1 6.13 16 6a2 2 0 0 1 2 2v15"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <h2 className="text-h6 font-semibold text-pneutral-900 font-work-sans">
                Crop Logo
              </h2>
              <p className="text-p4 font-noto-sans text-pneutral-500">
                Position and zoom your logo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="-mr-2 p-2 rounded-full text-pneutral-400 hover:bg-pneutral-100 hover:text-pneutral-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col items-center gap-5 px-6 py-6">
          <div
            className="relative overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f1f1f3_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px] ring-1 ring-pneutral-200 touch-none select-none cursor-move"
            style={{ width: VIEWPORT, height: VIEWPORT }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: dW || "auto",
                height: dH || "auto",
                maxWidth: "none",
              }}
            />
            {/* Circular crop guide: dim outside + crisp white ring */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  "0 0 0 9999px rgba(17,24,39,0.45), inset 0 0 0 2px rgba(255,255,255,0.95)",
              }}
            />
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3 w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 text-pneutral-400 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M1.5 6A1.5 1.5 0 0 1 3 4.5h18A1.5 1.5 0 0 1 22.5 6v12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 18V6Zm4 2.25a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Zm-1 6.44 3.22-3.22a.75.75 0 0 1 1.06 0l1.97 1.97 3.72-3.72a.75.75 0 0 1 1.06 0l3.72 3.72v2.06a.75.75 0 0 1-.75.75H4.5v-1.56Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={handleZoom}
              disabled={!natural}
              className="flex-1 h-1.5 rounded-full accent-secondary-700 cursor-pointer disabled:opacity-50"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-pneutral-400 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M1.5 6A1.5 1.5 0 0 1 3 4.5h18A1.5 1.5 0 0 1 22.5 6v12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 18V6Zm4 2.25a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Zm-1 6.44 3.22-3.22a.75.75 0 0 1 1.06 0l1.97 1.97 3.72-3.72a.75.75 0 0 1 1.06 0l3.72 3.72v2.06a.75.75 0 0 1-.75.75H4.5v-1.56Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-pneutral-100 bg-pneutral-50">
          <Button variant="outline" onClick={onCancel} className="min-w-[112px]">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={!natural}
            className="min-w-[112px]"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
