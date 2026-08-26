/**
 * Reads a JWT's payload without verifying it.
 *
 * Verification is the backend's job — every endpoint checks the signature, and
 * this app only reads the token to decide what to *show*. Decoding runs in both
 * the Node (route handlers) and Edge (middleware) runtimes, so it uses atob
 * rather than Buffer.
 */
export interface JwtPayload {
  sub?: string;
  userId?: string;
  userID?: string;
  email?: string;
  role?: string;
  permissions?: unknown;
  iat?: number;
  exp?: number;
}

export const decodeJwtPayload = (token?: string | null): JwtPayload | null => {
  if (!token) return null;

  const segment = token.split(".")[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    // atob yields one byte per character, so multi-byte UTF-8 has to be
    // reassembled rather than read directly.
    const binary = atob(base64);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * Whether the token describes permissions at all.
 *
 * This is not the same as holding none: a token minted before the backend
 * started stamping the claim has no `permissions` key, and treating that as
 * "no access" would lock the account out of every module. Gating is skipped
 * for such a token and left to the backend; an explicitly empty array is
 * honoured as "nothing granted".
 */
export const hasPermissionsClaim = (payload: JwtPayload | null): boolean =>
  Array.isArray(payload?.permissions);

/** The permission strings as the token carries them, ignoring anything malformed. */
export const readTokenPermissions = (payload: JwtPayload | null): string[] =>
  Array.isArray(payload?.permissions)
    ? payload.permissions.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim() !== ""
      )
    : [];
