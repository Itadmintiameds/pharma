/**
 * Host allowlist shared by the server-side proxies.
 *
 * Both proxies fetch a URL chosen by the caller, so without this they would be
 * open proxies — able to reach anything the server can, including hosts on its
 * own private network.
 */

// The buckets and APIs we actually serve content from.
const ALLOWED_HOST_SUFFIXES = ["amazonaws.com"];

const apiHosts = (): string[] =>
  [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_ADMIN_API_URL]
    .map((base) => {
      try {
        return base ? new URL(base.trim()).hostname : null;
      } catch {
        return null;
      }
    })
    .filter((host): host is string => !!host);

export const isAllowedRemoteHost = (target: URL): boolean => {
  if (target.protocol !== "https:" && target.protocol !== "http:") return false;
  const host = target.hostname.toLowerCase();
  return (
    ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    ) || apiHosts().includes(host)
  );
};
