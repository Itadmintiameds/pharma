/**
 * The GST master (`/gst/getAll`) hands back `gstPercentage` as display text —
 * "5%", "18%", or the non-numeric slab "Exempted" — since that's what the
 * dropdown shows verbatim. Anywhere that value is costed, it has to be
 * unwrapped back to a plain rate first, or `Number("18%")` / `Number("Exempted")`
 * silently comes out `NaN` and corrupts the line's GST amount.
 *
 * For costing, "Exempted" is treated as a 0% rate — the amount math has no
 * other use for it. Anywhere the distinction from a genuine 0% product matters
 * (e.g. flagging an invoice line as exempt), use `isGstExempted` alongside it.
 */
export const parseGstPercentage = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const numeric = Number(String(value).replace('%', '').trim());
  return Number.isFinite(numeric) ? numeric : 0;
};

/** Whether a GST dropdown/master value is the non-numeric "Exempted" slab. */
export const isGstExempted = (value: unknown): boolean =>
  String(value ?? '').trim().toLowerCase() === 'exempted';
