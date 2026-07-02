import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // const accessToken = request.cookies.get("access_token");

  // const { pathname } = request.nextUrl;

  // // Public Routes
  // if (
  //   pathname === "/login" ||
  //   pathname === "/registration" ||
  //   pathname.startsWith("/forgot-password")
  // ) {
  //   return NextResponse.next();
  // }

  // // Protected Routes
  // if (!accessToken) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  // return NextResponse.next();
}

export const config = {
  // matcher: [
  //   "/dashboard/:path*",
  // ],
};