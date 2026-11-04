/**
 * Print sheet for the report pages, handed to `printElement` so only the print
 * iframe sees it — the screen keeps its roomy layout.
 *
 * Landscape, because the detail grids are wide (the detailed sale report has
 * fifteen columns); compact rows, so a 2,000-row print stays a sensible number
 * of sheets; the grid's headings repeat on every sheet and rows never split.
 */
export const REPORT_PRINT_CSS = `
@page { size: A4 landscape; margin: 10mm; }
body { padding: 0 !important; }
/* The table scrolls sideways on screen; on paper it has to show every column. */
.overflow-x-auto { overflow: visible !important; }
[class*="min-w-"] { min-width: 0 !important; }
table { width: 100%; }
thead { display: table-header-group; }
tfoot { display: table-row-group; }
tr { break-inside: avoid; page-break-inside: avoid; }
th, td { height: auto !important; padding: 4px 6px !important; font-size: 10px !important; line-height: 1.3 !important; }
th img { display: none; }
/* Cards and shadows are for the screen. */
.rounded-2xl { box-shadow: none !important; }
`;
