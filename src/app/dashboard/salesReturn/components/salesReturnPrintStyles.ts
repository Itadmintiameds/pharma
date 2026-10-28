/**
 * Print-only stylesheet for Sales Return Details, handed to `printElement`
 * (with `fitToOnePage`) so only paper looks like this.
 *
 * The screen layout is built for a wide dashboard — 16px card padding, shadows,
 * 60px table rows, and grids that stack below Tailwind's `md`/`lg`, which an A4
 * portrait sheet (~733 CSS px) is under. Here everything is compressed and the
 * detail rows are restated as single rows, so a typical return fits one sheet;
 * `fitToOnePage` scales down whatever is still too long.
 *
 * Hooks are `data-print` attributes on the component's own markup rather than
 * Tailwind class selectors, which change whenever the design does.
 */
export const SALES_RETURN_PRINT_CSS = `
@page { size: A4 portrait; margin: 8mm; }

html, body { background: #fff; }
body { margin: 0 !important; padding: 0 !important; }

[data-print-root],
[data-print-root] * {
  box-shadow: none !important;
  font-size: 8.5pt !important;
  line-height: 1.3 !important;
}

[data-print-root] { gap: 6px !important; }

/* Gone before the page is measured for fitting, not only once printing starts */
[data-print-root] .print\\:hidden { display: none !important; }

[data-print="title"] > div:first-child > p { font-size: 13pt !important; }

[data-print="card"] {
  gap: 4px !important;
  padding: 6px 8px !important;
  border: 0.5pt solid #c0c1be !important;
  border-radius: 6px !important;
  break-inside: avoid;
}

[data-print="card-title"] { font-size: 10pt !important; }

/* Bill details and the totals strip stay one row each, as on a wide screen */
[data-print="row"] {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start !important;
  gap: 8px !important;
}
[data-print="row"] > * { flex: 1 1 0 !important; gap: 0 !important; }

[data-print-summary] { padding: 6px 8px !important; break-inside: avoid; }
[data-print-summary] p:last-child { font-size: 10.5pt !important; }

/* Returned products grid */
[data-print-root] table {
  width: 100% !important;
  table-layout: auto !important;
  border-collapse: collapse !important;
}
[data-print-root] thead tr,
[data-print-root] tbody tr { height: auto !important; break-inside: avoid; }
[data-print-root] th,
[data-print-root] td {
  padding: 3px 4px !important;
  font-size: 7.5pt !important;
  word-break: break-word !important;
}

[data-print="banner"] { padding: 6px 8px !important; break-inside: avoid; }
[data-print="banner"] > span:first-child { width: 16px !important; height: 16px !important; }

[data-print="audit"] { padding: 0 2px !important; }

[data-print-root] svg { width: 14px !important; height: 14px !important; }
`;
