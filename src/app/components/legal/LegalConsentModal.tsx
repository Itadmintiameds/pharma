"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/app/components/common/Button";
import { getCurrentTerms, termsHtmlUrl } from "@/services/LegalService";
import type { AcceptedTerms, TermsDocument } from "@/types/LegalData";

interface LegalConsentModalProps {
  /** Called when the user accepts after reading to the end. */
  onAccept: (accepted: AcceptedTerms) => void;
  /** Called when the user closes without accepting (only reachable after reading). */
  onClose: () => void;
}

/**
 * Slack in the "have we hit the bottom?" test. Sub-pixel layout, zoom levels and
 * fractional scroll offsets mean scrollTop rarely lands exactly on the maximum.
 */
const BOTTOM_TOLERANCE_PX = 24;

type LoadState = "loading" | "ready" | "error";

const formatEffectiveFrom = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Consent gate for the Terms & Conditions and Privacy Policy.
 *
 * The text is not bundled with the app: `/terms/current` names the document
 * currently in force and `/api/legal/document` renders that exact file, so the
 * dialog always shows what the backend published and reports back which version
 * was accepted.
 *
 * The dialog is deliberately inescapable until the whole text has been scrolled
 * through: there is no close affordance, Escape is swallowed, and clicking the
 * backdrop does nothing. Accept / Close only mount once the scroll container
 * reaches its end.
 *
 * State resets by remounting — render this conditionally (`{open && <... />}`)
 * rather than passing an `isOpen` flag, so every opening starts unread.
 */
const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  onAccept,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasReadToEnd, setHasReadToEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  const [doc, setDoc] = useState<TermsDocument | null>(null);
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);

  // The reading gate must never open before there is something to read: an
  // empty container is unscrollable, which the measure below would otherwise
  // take as "nothing left to scroll, so it has been read".
  const isReady = status === "ready";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setHasReadToEnd(false);
      setProgress(0);

      try {
        const current = await getCurrentTerms();
        const response = await fetch(termsHtmlUrl(current));
        if (!response.ok) throw new Error(`Document request failed: ${response.status}`);

        const markup = await response.text();
        if (cancelled) return;

        setDoc(current);
        setHtml(markup);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load the legal document", error);
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /** Once read, stay read — a small scroll back up must not re-lock the dialog. */
  const measure = useCallback(
    (element: HTMLDivElement) => {
      if (!isReady) return;

      const scrollable = element.scrollHeight - element.clientHeight;

      // Short content (or a very tall window) can never be scrolled, so treat it
      // as read the moment we can see there is nothing to scroll.
      if (scrollable <= BOTTOM_TOLERANCE_PX) {
        setProgress(1);
        setHasReadToEnd(true);
        return;
      }

      setProgress(Math.min(1, element.scrollTop / scrollable));

      if (element.scrollTop >= scrollable - BOTTOM_TOLERANCE_PX) {
        setHasReadToEnd(true);
      }
    },
    [isReady]
  );

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    measure(event.currentTarget);
  };

  // Re-measure whenever the container or its content changes size: the document
  // arriving, a window resize, a font swap or an orientation change all move the
  // bottom.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => measure(element));
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);

    return () => observer.disconnect();
  }, [measure, html]);

  // Escape closes only after the text has been read; before that it is
  // swallowed so the dialog genuinely "does not go anywhere".
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();

      if (hasReadToEnd || status === "error") onClose();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [hasReadToEnd, status, onClose]);

  // Freeze the page behind the dialog so scroll gestures land on the text.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Give the scroll region focus so keyboard users can page through
  // immediately, without hunting for something focusable first.
  useEffect(() => {
    if (isReady) scrollRef.current?.focus();
  }, [isReady]);

  const handleAccept = () => {
    if (!doc) return;

    onAccept({
      termsId: doc.id,
      termsVersion: doc.version,
      termsContentHash: doc.contentHash,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-consent-title"
    >
      <div className="flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-1 border-b border-pneutral-200 px-6 py-4">
          <h2
            id="legal-consent-title"
            className="text-h6 font-semibold text-pneutral-900"
          >
            {doc?.title ?? "Terms & Conditions and Privacy Policy"}
          </h2>
          <p className="text-p3 text-pneutral-500">
            {doc
              ? `Version ${doc.version} · Effective ${formatEffectiveFrom(doc.effectiveFrom)} · `
              : ""}
            Please read the full document before continuing.
          </p>
        </div>

        <div className="h-1 w-full bg-pneutral-100">
          <div
            className="h-full bg-secondary-700 transition-[width] duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          tabIndex={0}
          className="flex-1 overflow-y-auto px-6 py-5 font-noto-sans outline-none"
        >
          {status === "loading" && (
            <div className="flex flex-col gap-3 py-10 text-center">
              <p className="text-p3 text-pneutral-500">
                Loading the latest Terms &amp; Conditions and Privacy Policy…
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-p3 text-pneutral-700">
                We could not load the Terms &amp; Conditions and Privacy Policy
                right now. You cannot accept a document you have not been shown,
                so please try again.
              </p>

              <Button
                variant="outline"
                className="h-10"
                onClick={() => setAttempt((previous) => previous + 1)}
              >
                Try again
              </Button>

              {doc && (
                <a
                  href={doc.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-p3 font-semibold text-secondary-700 hover:underline"
                >
                  Download {doc.fileName} ({Math.round(doc.fileSize / 1024)} KB)
                </a>
              )}
            </div>
          )}

          {isReady && (
            <div className="flex flex-col gap-8">
              {/* Server-converted from the published .docx and stripped to a
                  fixed tag allowlist in /api/legal/document. */}
              <div
                className="legal-doc"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              <p className="border-t border-pneutral-200 pt-4 text-p3 font-semibold text-pneutral-900">
                You have reached the end of the Terms &amp; Conditions and
                Privacy Policy.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-pneutral-200 px-6 py-4">
          {status === "error" ? (
            <div className="flex justify-end">
              <Button variant="outline" className="h-10" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : hasReadToEnd ? (
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="h-10" onClick={onClose}>
                Close
              </Button>
              <Button className="h-10 px-8" onClick={handleAccept}>
                Accept
              </Button>
            </div>
          ) : (
            <p className="text-center text-p3 text-pneutral-500">
              {status === "loading"
                ? "Loading the document…"
                : "Scroll to the bottom to enable Accept and Close."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalConsentModal;
