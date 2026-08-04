import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * Rasterises a DOM subtree and saves it as a multi-page A4 landscape PDF.
 *
 * html2canvas-pro is used rather than the original html2canvas because the
 * Tailwind v4 output contains modern colour functions (color-mix) that the
 * original parser rejects.
 *
 * The element must be laid out — `display: none` gives a zero-sized canvas —
 * so callers render it off-screen (see OffscreenPortal) instead of hiding it.
 */
export const downloadElementAsPdf = async (
  element: HTMLElement,
  fileName: string
): Promise<void> => {
  // Web fonts have to be resolved before capture or text renders in a fallback.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    // 2x keeps text crisp without ballooning the file.
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("Nothing was captured — the element has no layout.");
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 18;
  const usableWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2;

  const scaleToPage = usableWidth / canvas.width;
  const fullHeight = canvas.height * scaleToPage;

  if (fullHeight <= usableHeight) {
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      margin,
      margin,
      usableWidth,
      fullHeight
    );
    pdf.save(fileName);
    return;
  }

  // Taller than one page: slice the canvas into page-height bands.
  const bandHeightPx = Math.floor(usableHeight / scaleToPage);
  const slice = document.createElement("canvas");
  const ctx = slice.getContext("2d");
  if (!ctx) throw new Error("Could not create a canvas context for the PDF.");

  for (let offset = 0, page = 0; offset < canvas.height; page++) {
    const height = Math.min(bandHeightPx, canvas.height - offset);

    slice.width = canvas.width;
    slice.height = height;
    // Reset between bands so no pixels bleed through from the previous slice.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0, offset, canvas.width, height,
      0, 0, canvas.width, height
    );

    if (page > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL("image/png"),
      "PNG",
      margin,
      margin,
      usableWidth,
      height * scaleToPage
    );

    offset += height;
  }

  pdf.save(fileName);
};
