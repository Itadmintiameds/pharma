/**
 * Stock is stored in smallest units, but a fraction of a pack ("5.5 Strips")
 * means little at the counter. These split it into whole packs plus the loose
 * smallest units left over: 66 tablets at 12 per strip → "5 Strips 6 Tablets".
 */

/** "Strips" → "Strip"; the API sends unit names either way. */
const singular = (unit: string) =>
  unit.length > 1 && /[^s]s$/i.test(unit) ? unit.slice(0, -1) : unit;

const withCount = (count: number, unit: string) => {
  const one = singular(unit.trim());
  if (!one) return String(count);
  if (count === 1) return `${count} ${one}`;
  return `${count} ${one}${/(s|x|ch|sh)$/i.test(one) ? "es" : "s"}`;
};

/** First three letters, for tight spots: "5 Str 6 Tab". */
const shortForm = (unit: string) => singular(unit.trim()).slice(0, 3);

export const formatPackQty = (
  smallestQty: number,
  unitContains: number,
  purchaseUnit?: string,
  smallestUnit?: string,
  /** `full` keeps a zero part instead of dropping it: "0 Strips 7 Tablets". */
  options: { short?: boolean; full?: boolean } = {}
): string => {
  const total = Math.max(Math.round(Number(smallestQty) || 0), 0);
  const perPack = Number(unitContains) > 0 ? Number(unitContains) : 1;
  const packUnit = purchaseUnit || smallestUnit || "";
  const looseUnit = smallestUnit || purchaseUnit || "";
  const label = (count: number, unit: string) =>
    options.short
      ? `${count}${unit ? ` ${shortForm(unit)}` : ""}`
      : withCount(count, unit);

  // A pack that is its own smallest unit (one bottle is one bottle) has no
  // loose part to show.
  if (perPack === 1) return label(total, packUnit);

  const packs = Math.floor(total / perPack);
  const loose = total % perPack;

  if (options.full) return `${label(packs, packUnit)} ${label(loose, looseUnit)}`;
  if (packs === 0) return label(loose, looseUnit);
  if (loose === 0) return label(packs, packUnit);
  return `${label(packs, packUnit)} ${label(loose, looseUnit)}`;
};
