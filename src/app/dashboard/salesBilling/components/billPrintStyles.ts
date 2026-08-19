/**
 * Print-only stylesheet for the payment invoice.
 *
 * It is handed to `printElement`, which injects it into the print iframe after
 * the page's own stylesheets — so the on-screen bill and the html2canvas PDF
 * capture are untouched, and only paper looks like this.
 *
 * Three things drive it:
 *
 * 1. **Monochrome.** Bills are printed on office lasers and then photocopied,
 *    so every colour is flattened to black on white and the hierarchy is
 *    carried by weight, rules and boxes instead of hue. Nothing depends on the
 *    purple surviving.
 * 2. **One sheet, landscape.** `@page size` asks for landscape, the chrome of
 *    the screen layout (tall title bar, 68px rows, 16px gaps) is compressed,
 *    and type drops to 8–9pt so the nine-column grid fits across the page.
 * 3. **Portrait must still work.** The dialog lets the user override the
 *    orientation, and a portrait page lays out at ~733 CSS px — below
 *    Tailwind's `md`, which would stack the header and the totals into a
 *    column. The row layouts are therefore restated here unconditionally, and
 *    every width is a percentage, so the same design just narrows.
 *
 * The hooks are `data-print` attributes on the invoice's own markup rather
 * than Tailwind class selectors, which change whenever the design does.
 */
export const BILL_PRINT_CSS = `
/* Deliberately not "size: A4 landscape". Asking for landscape on a printer or
   PDF target fixed to portrait makes the browser rotate the bill 90° onto the
   portrait sheet, which is unreadable. "auto" hands the orientation back to the
   print dialog, and the rules below make both orientations fit. */
@page { size: auto; margin: 8mm; }

html, body { background: #fff; }
body { margin: 0 !important; padding: 0 !important; }

/* Flatten the palette. Later, more specific rules paint back the few fills
   that have to stay (table head, logo tile). */
[data-print-root],
[data-print-root] * {
  color: #000 !important;
  background-color: transparent !important;
  background-image: none !important;
  border-color: #000 !important;
  box-shadow: none !important;
  border-radius: 2px !important;
  /* One size for the whole sheet; the exceptions below are deliberate. */
  font-size: 8.5pt !important;
  line-height: 1.3 !important;
}

[data-print-root] {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  gap: 5px !important;
  padding: 0 !important;
}

/* Images are the only colour left; grey them so a colour printer matches the
   mono one, and cap them so nothing pushes past the page. */
[data-print-root] img {
  filter: grayscale(100%) !important;
  max-width: 100% !important;
}

/* ---- Pharmacy header ---------------------------------------------------- */

[data-print="header"] {
  padding: 5px 8px !important;
  border: 1pt solid #000 !important;
  break-inside: avoid;
}

/* Restated so a portrait page keeps the logo | name | details row. The middle
   track is minmax(0, 1fr), not 1fr: a plain 1fr floors at the name's
   min-content width, which on a narrow page shoves the details column clean off
   the card. */
[data-print="header-grid"] {
  display: grid !important;
  grid-template-columns: 96px minmax(0, 1fr) 24% !important;
  align-items: center !important;
  gap: 8px !important;
}

/* Paper cannot scroll or ellipsise its way out of trouble, so anything the
   screen truncates wraps instead. */
[data-print="header-plate"] h2,
[data-print="header-facts"] span,
[data-print="facts"] span {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: normal !important;
  word-break: break-word !important;
}

/* The logo is the bare artwork — no tile, no rule. Just smaller on paper. */
[data-print="header-logo"] {
  height: 46px !important;
  width: auto !important;
  max-width: 130px !important;
  border: 0 !important;
  padding: 0 !important;
}

/* The initials shown when the organization has no logo. Not an image, so they
   keep their square box and its rule — the auto width above would otherwise
   collapse the box onto the two letters. */
[data-print="header-logo"]:not(img) {
  width: 46px !important;
  border: 0.75pt solid #000 !important;
}

[data-print="header-logo"]:not(img) span {
  font-size: 14pt !important;
  color: #000 !important;
}

/* The plate is the header's anchor on screen; on paper a heavier rule does
   that job, since the purple is gone. */
[data-print="header-plate"] {
  padding: 3px 8px !important;
  border: 1.5pt solid #000 !important;
  gap: 1px !important;
}

[data-print="header-plate"] h2 {
  font-size: 13pt !important;
  font-weight: 700 !important;
  line-height: 1.15 !important;
}

[data-print="header-plate"] p { font-size: 8pt !important; }

[data-print="header-facts"] { gap: 1px !important; }

/* ---- Title bar --------------------------------------------------------- */

/* 70px of solid purple is a screen affordance, not information: on paper it
   collapses to one underlined line. */
[data-print="title"] {
  height: auto !important;
  min-height: 0 !important;
  padding: 1px 0 3px !important;
  border: 0 !important;
  border-bottom: 1pt solid #000 !important;
  border-radius: 0 !important;
}

[data-print="title"] h1 {
  font-size: 10pt !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

/* ---- Bill + customer facts --------------------------------------------- */

[data-print="facts"] {
  flex-direction: row !important;
  gap: 12px !important;
  padding: 4px 8px !important;
  border: 0.5pt solid #000 !important;
  break-inside: avoid;
}

[data-print="facts"] > div { gap: 0 !important; }
/* Screen rows are a fixed 24px; on paper they close up. */
[data-print="facts"] [class*="h-6"] { height: auto !important; }

/* ---- Invoice grid ------------------------------------------------------ */

/* Auto layout, not fixed: nine equal columns would starve the product name and
   leave "Sl. No." half empty. Content sets the widths, and word-break on the
   cells stops a long name from pushing the grid past the page. */
[data-print-root] table {
  width: 100% !important;
  table-layout: auto !important;
  border-collapse: collapse !important;
}

/* A grid that runs past one page repeats its header on the next. */
[data-print-root] thead { display: table-header-group !important; }

[data-print-root] th {
  /* Light grey, not the purple: white-on-purple headers photocopy to
     white-on-grey mush. */
  background-color: #e6e6e6 !important;
  border: 0.5pt solid #000 !important;
  padding: 3px 2px !important;
  font-size: 7.5pt !important;
  font-weight: 700 !important;
  text-align: center !important;
}

[data-print-root] tbody tr {
  height: auto !important;
  break-inside: avoid;
}

[data-print-root] td {
  border: 0.5pt solid #000 !important;
  padding: 3px 2px !important;
  font-size: 7.5pt !important;
  text-align: center !important;
  word-break: break-word !important;
}

/* ---- Words + totals ---------------------------------------------------- */

[data-print="summary"] {
  flex-direction: row !important;
  align-items: stretch !important;
  gap: 6px !important;
  break-inside: avoid;
}

[data-print="words"],
[data-print="totals"] {
  height: auto !important;
  min-height: 0 !important;
  padding: 5px 8px !important;
  border: 0.5pt solid #000 !important;
  gap: 2px !important;
}

[data-print="totals"] { width: 34% !important; flex: 0 0 34% !important; }
[data-print="totals"] > div { height: auto !important; }

/* NET PAYABLE stays the loudest line on the page. */
[data-print="net"] {
  border-top: 1pt solid #000 !important;
  padding-top: 3px !important;
  margin-top: 2px !important;
}
[data-print="net"] span { font-size: 10pt !important; font-weight: 700 !important; }

/* ---- Branding footer --------------------------------------------------- */

/* Kept with the totals so the bill never ends on an orphaned footer. */
[data-print="footer"] {
  padding-top: 4px !important;
  border-top: 0.5pt solid #000 !important;
  break-inside: avoid;
  break-before: avoid;
}

[data-print="footer"] span { font-size: 7.5pt !important; }
[data-print="footer"] img { height: 12px !important; width: auto !important; }
`;
