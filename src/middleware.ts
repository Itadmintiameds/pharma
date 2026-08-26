import { NextRequest, NextResponse } from "next/server";
import {
  buildPermissionIndex,
  bypassesPermissionChecks,
  canViewModule,
  routeForPath,
} from "@/access/accessControl";
import {
  decodeJwtPayload,
  hasPermissionsClaim,
  readTokenPermissions,
} from "@/utils/jwt";

export function middleware(request: NextRequest) {
  const accessToken =
    request.cookies.get("access_token")?.value ||
    request.cookies.get("token")?.value;
  const refreshToken = request.cookies.get("refresh_token");

  const { pathname } = request.nextUrl;

  // Public Routes
  if (
    pathname === "/login" ||
    pathname === "/registration" ||
    pathname.startsWith("/forgot-password")
  ) {
    const response = NextResponse.next();
    
    // Explicitly delete cookies on the client browser via Set-Cookie headers(Tempreray feat)
    response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("token", "", { path: "/", maxAge: 0 });
    
    return response;
  }

  // Protected Routes
  // The access token is short-lived and expires before the refresh token.
  // If it's gone but the refresh token is still present, let the request
  // through — the client-side axios interceptor will silently refresh it
  // on the first 401. Only force logout once the refresh token is also gone.
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Module access. The role and permissions ride in the JWT, so a URL typed by
  // hand is turned away here — before the page renders — rather than by the
  // screen itself. The signature is not checked: this only decides what to
  // show, and every endpoint behind it verifies the token for real.
  //
  // Only the permission half is enforced here. Whether a module suits the
  // organization (centralizedInventory) is not in the token and cannot be
  // fetched per navigation, so that half is enforced client-side by ModuleGuard.
  const route = routeForPath(pathname);
  if (route) {
    const payload = decodeJwtPayload(accessToken);

    // An expired access token still describes the user, so it is read anyway;
    // a missing one (refresh pending) leaves this to the client-side guard.
    // A Super Admin is not held to the per-module grants — which modules that
    // role may reach is decided client-side, where the organization is known.
    if (hasPermissionsClaim(payload) && !bypassesPermissionChecks(payload?.role)) {
      const index = buildPermissionIndex(readTokenPermissions(payload));
      if (!canViewModule(index, route)) {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = "/dashboard";
        deniedUrl.searchParams.set("denied", route.moduleKey);
        return NextResponse.redirect(deniedUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
  ],
};