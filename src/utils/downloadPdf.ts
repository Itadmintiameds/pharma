import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/** Web fonts have to be resolved before capture or text renders in a fallback. */
const waitForFonts = async () => {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
};

/**
 * Rasterises the element once, at 2x — crisp text without ballooning the file.
 *
 * html2canvas-pro is used rather than the original html2canvas because the
 * Tailwind v4 output contains modern colour functions (color-mix) that the
 * original parser rejects.
 *
 * The element must be laid out — `display: none` gives a zero-sized canvas —
 * so callers render it off-screen (see OffscreenPortal) instead of hiding it.
 */
const rasterise = async (element: HTMLElement) => {
  await waitForFonts();

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("Nothing was captured — the element has no layout.");
  }

  return canvas;
};

/** One horizontal band of the capture, as a PNG data URL. */
const bandDataUrl = (
  source: HTMLCanvasElement,
  from: number,
  to: number
): string => {
  const height = Math.max(1, Math.round(to - from));
  const band = document.createElement("canvas");
  band.width = source.width;
  band.height = height;

  const ctx = band.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas context for the PDF.");
  // Painted white first: a transparent band would show the page through it.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, band.width, height);
  ctx.drawImage(
    source,
    0, Math.round(from), source.width, height,
    0, 0, source.width, height
  );

  return band.toDataURL("image/png");
};

/**
 * Saves a document as a portrait A4 PDF, scaled to the page width, that survives
 * running onto a second sheet: pages break between rows rather than through
 * them, and the grid's column headings repeat so no page is a wall of
 * unlabelled numbers. What is captured is what the screen shows.
 *
 * What repeats on every page is decided by the markup, not by a flag. A document
 * that marks a running header and footer with the same `data-print` hooks the
 * print stylesheet uses — `[data-print="header"]` / `[data-print="footer"]` —
 * gets them redrawn on each sheet; one that doesn't, like the purchase invoice,
 * simply flows.
 */
export const downloadElementAsPdf = async (
  element: HTMLElement,
  fileName: string
): Promise<void> => {
  const canvas = await rasterise(element);

  // Canvas pixels per CSS pixel, so DOM geometry can be read in canvas terms.
  const density = canvas.width / element.offsetWidth;
  const elementTop = element.getBoundingClientRect().top;
  const edge = (node: Element, which: "top" | "bottom") =>
    Math.round((node.getBoundingClientRect()[which] - elementTop) * density);

  const header = element.querySelector('[data-print="header"]');
  const footer = element.querySelector('[data-print="footer"]');
  // The grid's own headings. `:not([data-print])` skips the scaffolding thead
  // some documents wrap themselves in to get a running header when the browser
  // prints them — that one comes first in the document and is already captured
  // as the header band.
  const thead = element.querySelector("thead:not([data-print])");

  // The header band takes everything above the header's bottom edge, so the
  // capture's own top padding travels with it; the footer band likewise.
  const bodyStart = header ? edge(header, "bottom") : 0;
  const bodyEnd = footer ? edge(footer, "top") : canvas.height;

  /**
   * Where a page may break: the bottom edge of any grid row or whole block.
   * Cutting only here is what stops a row — or the totals card — being sliced
   * in half across two sheets.
   */
  const breakpoints = Array.from(
    element.querySelectorAll(
      'tbody:not([data-print]) tr, thead:not([data-print]), [data-print="title"], [data-print="facts"], [data-print="summary"]'
    )
  )
    .map((node) => edge(node, "bottom"))
    .filter((y) => y > bodyStart && y < bodyEnd)
    .sort((a, b) => a - b);

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 18;
  const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  // Points per canvas pixel: the whole bill is scaled to the page width, which
  // is what shrinks the wide desktop layout onto portrait A4.
  const scale = usableWidth / canvas.width;

  const headerImage = bodyStart > 0 ? bandDataUrl(canvas, 0, bodyStart) : null;
  const headerHeight = bodyStart * scale;

  const footerImage =
    bodyEnd < canvas.height
      ? bandDataUrl(canvas, bodyEnd, canvas.height)
      : null;
  const footerHeight = (canvas.height - bodyEnd) * scale;

  // The column headings are redrawn on later pages, so no sheet is a table of
  // numbers with nothing naming the columns.
  const theadTop = thead ? edge(thead, "top") : 0;
  const theadBottom = thead ? edge(thead, "bottom") : 0;
  const theadImage =
    thead && theadBottom > theadTop
      ? bandDataUrl(canvas, theadTop, theadBottom)
      : null;
  const theadHeight = (theadBottom - theadTop) * scale;

  let cursor = bodyStart;
  let page = 0;

  while (cursor < bodyEnd) {
    if (page > 0) pdf.addPage();
    let top = margin;

    if (headerImage) {
      pdf.addImage(headerImage, "PNG", margin, top, usableWidth, headerHeight);
      top += headerHeight;
    }

    // Only once the grid itself has been left behind — before that the headings
    // are still in the slice.
    if (page > 0 && theadImage && cursor >= theadBottom) {
      pdf.addImage(theadImage, "PNG", margin, top, usableWidth, theadHeight);
      top += theadHeight;
    }

    const budget = Math.floor((usableHeight - (top - margin) - footerHeight) / scale);
    if (budget < 1) throw new Error("The page has no room left for the bill.");

    let end = Math.min(bodyEnd, cursor + budget);
    if (end < bodyEnd) {
      // The last row that finishes inside the budget. Without one — a single
      // block taller than a page — the hard cut stands, or nothing would fit.
      const fits = breakpoints.filter((y) => y > cursor && y <= end);
      if (fits.length > 0) end = fits[fits.length - 1];
    }

    pdf.addImage(
      bandDataUrl(canvas, cursor, end),
      "PNG",
      margin,
      top,
      usableWidth,
      (end - cursor) * scale
    );

    // Pinned to the foot of the sheet rather than trailing the content, so it
    // reads as the bill's footer on every page.
    if (footerImage) {
      pdf.addImage(
        footerImage,
        "PNG",
        margin,
        margin + usableHeight - footerHeight,
        usableWidth,
        footerHeight
      );
    }

    cursor = end;
    page += 1;
  }

  pdf.save(fileName);
};
