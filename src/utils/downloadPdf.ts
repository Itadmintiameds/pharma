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

/** One image placed on a sheet. Offsets are in points, from the margin box. */
interface PagePlacement {
  dataUrl: string;
  top: number;
  height: number;
}

/**
 * The paginated document, decided once and rendered either as a PDF file or as
 * printable HTML — which is what keeps the printout and the download identical.
 */
interface PlannedDocument {
  pages: PagePlacement[][];
  pageWidth: number;
  pageHeight: number;
  margin: number;
  imageWidth: number;
}

/**
 * Lays a document out as portrait A4 sheets, scaled to the page width, so it
 * survives running onto a second sheet: pages break between rows rather than
 * through them, and the grid's column headings repeat so no page is a wall of
 * unlabelled numbers. What is captured is what the screen shows.
 *
 * What repeats on every page is decided by the markup, not by a flag. A document
 * that marks a running header and footer with the same `data-print` hooks the
 * print stylesheet uses — `[data-print="header"]` / `[data-print="footer"]` —
 * gets them redrawn on each sheet; one that doesn't, like the purchase invoice,
 * simply flows.
 */
const planDocument = async (element: HTMLElement): Promise<PlannedDocument> => {
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

  // A4 portrait in points, the same geometry jsPDF would report.
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 18;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
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

  const pages: PagePlacement[][] = [];
  let cursor = bodyStart;
  let page = 0;

  while (cursor < bodyEnd) {
    const placements: PagePlacement[] = [];
    let top = 0;

    if (headerImage) {
      placements.push({ dataUrl: headerImage, top, height: headerHeight });
      top += headerHeight;
    }

    // Only once the grid itself has been left behind — before that the headings
    // are still in the slice.
    if (page > 0 && theadImage && cursor >= theadBottom) {
      placements.push({ dataUrl: theadImage, top, height: theadHeight });
      top += theadHeight;
    }

    const budget = Math.floor((usableHeight - top - footerHeight) / scale);
    if (budget < 1) throw new Error("The page has no room left for the bill.");

    let end = Math.min(bodyEnd, cursor + budget);
    if (end < bodyEnd) {
      // The last row that finishes inside the budget. Without one — a single
      // block taller than a page — the hard cut stands, or nothing would fit.
      const fits = breakpoints.filter((y) => y > cursor && y <= end);
      if (fits.length > 0) end = fits[fits.length - 1];
    }

    placements.push({
      dataUrl: bandDataUrl(canvas, cursor, end),
      top,
      height: (end - cursor) * scale,
    });

    // Pinned to the foot of the sheet rather than trailing the content, so it
    // reads as the bill's footer on every page.
    if (footerImage) {
      placements.push({
        dataUrl: footerImage,
        top: usableHeight - footerHeight,
        height: footerHeight,
      });
    }

    pages.push(placements);
    cursor = end;
    page += 1;
  }

  return { pages, pageWidth, pageHeight, margin, imageWidth: usableWidth };
};

export const downloadElementAsPdf = async (
  element: HTMLElement,
  fileName: string
): Promise<void> => {
  const { pages, margin, imageWidth } = await planDocument(element);

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pages.forEach((placements, index) => {
    if (index > 0) pdf.addPage();
    placements.forEach(({ dataUrl, top, height }) => {
      pdf.addImage(dataUrl, "PNG", margin, margin + top, imageWidth, height);
    });
  });

  pdf.save(fileName);
};

/**
 * Prints the very document `downloadElementAsPdf` would save.
 *
 * The pages come from the same `planDocument` pass, so the printout matches the
 * downloaded file sheet for sheet — but they are rendered as HTML and printed
 * through an iframe rather than handed to the browser's PDF viewer with an
 * auto-print action. Chrome honours that action inside an iframe; Edge ignores
 * it, so the dialog never opened there. `iframe.contentWindow.print()` is what
 * the rest of the app (the bill) already relies on and works everywhere.
 */
export const printElementAsPdf = async (element: HTMLElement): Promise<void> => {
  const { pages, pageWidth, pageHeight, margin, imageWidth } =
    await planDocument(element);

  // Each sheet is a box of the exact paper size with the bands placed inside it,
  // so nothing reflows: @page carries no margin of its own because the margin is
  // already part of the placement.
  const pagesHtml = pages
    .map((placements, index) => {
      const images = placements
        .map(
          ({ dataUrl, top, height }) =>
            `<img src="${dataUrl}" style="position:absolute;left:${margin}pt;top:${
              margin + top
            }pt;width:${imageWidth}pt;height:${height}pt;">`
        )
        .join("");

      return (
        `<div class="sheet"${index === pages.length - 1 ? ' data-last="true"' : ""}>` +
        `${images}</div>`
      );
    })
    .join("");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("Could not open the print view.");
  }

  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><style>` +
    `@page{size:A4 portrait;margin:0;}` +
    `html,body{margin:0;padding:0;background:#fff;}` +
    `*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}` +
    `.sheet{position:relative;width:${pageWidth}pt;height:${pageHeight}pt;` +
    `overflow:hidden;page-break-after:always;break-after:page;}` +
    `.sheet[data-last="true"]{page-break-after:auto;break-after:auto;}` +
    `</style></head><body>${pagesHtml}</body></html>`
  );
  doc.close();

  // Printing before the band images have decoded sends blank sheets. The iframe
  // is 0x0 by design, so nothing would ever enter a viewport — each image is
  // forced eager rather than left to lazy loading.
  const images = Array.from(doc.images);
  images.forEach((img) => {
    img.loading = "eager";
  });

  await Promise.all(
    images
      .filter((img) => !img.complete)
      .map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
      )
  );

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  // The dialog reads from the iframe, so it cannot be torn down until the
  // browser has taken the document.
  window.setTimeout(() => iframe.remove(), 60_000);
};
