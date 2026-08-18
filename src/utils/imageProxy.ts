/**
 * Rewrites a remote image URL to go through /api/image-proxy, making it
 * same-origin.
 *
 * Only needed for images that end up on a canvas — the bill and invoice PDFs —
 * because the image bucket sends no CORS headers. A picture that is only ever
 * displayed can use its URL directly.
 *
 * Local assets and data URIs are returned untouched.
 */
export const proxiedImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
};
