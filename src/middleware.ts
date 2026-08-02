import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token") || request.cookies.get("token");
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
  ],
};