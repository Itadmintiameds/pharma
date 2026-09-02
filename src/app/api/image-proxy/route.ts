import { NextRequest, NextResponse } from "next/server";
import { isAllowedRemoteHost } from "@/utils/remoteHosts";

/**
 * Streams a remote image through this app so it is same-origin.
 *
 * The logo and profile pictures live in an S3 bucket that sends no
 * Access-Control-Allow-Origin header. A plain <img> would still display it, but
 * the bill's PDF is rasterised to a canvas and read back with toDataURL — and a
 * cross-origin image without CORS taints the canvas, which makes that read throw.
 * Requesting it with crossOrigin="anonymous" instead fails outright: the browser
 * reports the CORS error and the logo never loads.
 *
 * Fetching it server-side sidesteps both: to the browser the bytes come from our
 * own origin, so nothing is tainted and nothing is blocked.
 */

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "A url parameter is required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Not a valid url" }, { status: 400 });
  }

  if (!isAllowedRemoteHost(target)) {
    return NextResponse.json({ error: "That host is not proxied" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "The image could not be fetched" },
        { status: 502 }
      );
    }

    // Anything but an image would make this a general-purpose proxy.
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        // These URLs carry a timestamp in the filename, so a given one never
        // changes — worth caching for the repeat views and PDF captures.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to proxy image", target.href, error);
    return NextResponse.json({ error: "The image could not be fetched" }, { status: 502 });
  }
}
