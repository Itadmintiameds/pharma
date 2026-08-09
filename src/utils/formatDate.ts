/**
 * Dates are displayed as dd-mm-yyyy throughout the app. The APIs hand back
 * ISO-ish strings (`2026-11-30`, `2026-11-30T10:15:00`), so the date part is
 * taken as written rather than parsed — a Date would shift it by the timezone.
 */

const EM_DASH = "—";

/** `2026-11-30T10:15:00` → `30-11-2026`. Anything unparseable is passed back. */
export const formatDate = (value?: string | null, fallback = EM_DASH): string => {
    if (!value) return fallback;

    const datePart = value.split("T")[0].trim();
    const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;

    // Already dd-mm-yyyy, or a form this helper does not recognise.
    return datePart || fallback;
};

/**
 * `2026-11-30` → `11/2026`. Stock expires at the end of a month, so the day is
 * noise on an invoice. Also accepts a value already written as `11/2026`.
 */
export const formatMonthYear = (
    value?: string | null,
    fallback = EM_DASH
): string => {
    if (!value) return fallback;

    const datePart = value.split("T")[0].trim();

    const iso = datePart.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
    if (iso) return `${iso[2]}/${iso[1]}`;

    const monthYear = datePart.match(/^(\d{1,2})[/-](\d{4})$/);
    if (monthYear) return `${monthYear[1].padStart(2, "0")}/${monthYear[2]}`;

    // dd-mm-yyyy, as formatDate would have produced it.
    const dmy = datePart.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) return `${dmy[2]}/${dmy[3]}`;

    return datePart || fallback;
};

/** `2026-11-30T10:15:00` → `30-11-2026 10:15`. */
export const formatDateTime = (
    value?: string | null,
    fallback = EM_DASH
): string => {
    if (!value) return fallback;

    const [datePart, timePart] = value.split("T");
    const date = formatDate(datePart, fallback);
    if (!timePart) return date;

    return `${date} ${timePart.slice(0, 5)}`;
};
