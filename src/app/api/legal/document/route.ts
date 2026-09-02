import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedRemoteHost } from "@/utils/remoteHosts";

/**
 * Serves the legal document from /terms/current as HTML the browser can render.
 *
 * The backend publishes it as a .docx on S3, which the browser can neither
 * render nor even fetch (that bucket sends no Access-Control-Allow-Origin — see
 * the image proxy for the same problem). So the conversion happens here: we
 * fetch the bytes server-side, turn them into HTML, and hand back same-origin
 * markup that the consent dialog can put in a scroll container.
 *
 * Rendering it as real DOM rather than in an embedded viewer is what lets the
 * dialog gate "Accept" on the user having scrolled to the end — a cross-origin
 * iframe's scroll position is invisible to us.
 */

// mammoth emits a narrow, attribute-free subset for this document, but a future
// revision may add links, images or tables. Anything outside the list is
// unwrapped to its text, and every attribute is dropped, so nothing that could
// carry script or styling survives into dangerouslySetInnerHTML.
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "b", "i", "u", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ol", "ul", "li",
  "table", "thead", "tbody", "tr", "td", "th",
  "a", "img",
]);

const VOID_TAGS = new Set(["br", "img"]);

/** There is only ever one current document; the cap just bounds memory. */
const MAX_CACHED_VERSIONS = 8;
const htmlCache = new Map<string, string>();

const attribute = (html: string, name: string): string | null => {
  const match = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i").exec(html);
  return match ? match[1] : null;
};

const sanitize = (html: string): string =>
  html
    // Drop these outright: unwrapping them would spill code into the page.
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_match, slash: string, rawTag: string, rest: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";

      if (tag === "a") {
        // Keep only ordinary web links, and never let one navigate the dialog away.
        const href = attribute(rest, "href") ?? "";
        if (slash) return "</a>";
        return /^https?:\/\//i.test(href)
          ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
          : "";
      }

      if (tag === "img") {
        // mammoth inlines embedded images as data URIs; nothing else is fetched.
        const src = attribute(rest, "src") ?? "";
        return src.startsWith("data:image/") ? `<img src="${src}" alt="" />` : "";
      }

      // Everything else keeps its tag and loses its attributes.
      if (VOID_TAGS.has(tag)) return `<${tag} />`;
      return `<${slash}${tag}>`;
    });

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const expectedHash = request.nextUrl.searchParams.get("hash");

  if (!raw || !expectedHash) {
    return NextResponse.json(
      { error: "Both url and hash parameters are required" },
      { status: 400 }
    );
  }

  // The hash is a cache key, so only accept the shape /terms/current produces.
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return NextResponse.json({ error: "Not a valid content hash" }, { status: 400 });
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

  const respond = (html: string) =>
    new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // A hash names one exact set of bytes, so this response can never go
        // stale: a revised document arrives under a different hash and URL.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  const cached = htmlCache.get(expectedHash.toLowerCase());
  if (cached) return respond(cached);

  try {
    const upstream = await fetch(target, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "The document could not be fetched" },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // /terms/current publishes the SHA-256 of the file. Checking it means the
    // text we render is provably the version the user is recorded as accepting,
    // and stops a crafted hash from seeding the cache with other content.
    const actualHash = createHash("sha256").update(buffer).digest("hex");
    if (actualHash !== expectedHash.toLowerCase()) {
      console.error(
        `Legal document hash mismatch for ${target.href}: expected ${expectedHash}, got ${actualHash}`
      );
      return NextResponse.json(
        { error: "The document did not match its published hash" },
        { status: 502 }
      );
    }

    const { value, messages } = await mammoth.convertToHtml({ buffer });

    // Style warnings are normal for a Word document and do not lose text; an
    // error means something did not convert, which is worth knowing about.
    const errors = messages.filter((message) => message.type === "error");
    if (errors.length) {
      console.error("Legal document conversion errors", errors);
    }

    const html = sanitize(value);
    if (!html.trim()) {
      return NextResponse.json(
        { error: "The document converted to an empty page" },
        { status: 502 }
      );
    }

    if (htmlCache.size >= MAX_CACHED_VERSIONS) {
      // Insertion-ordered, so this drops the oldest version held.
      htmlCache.delete(htmlCache.keys().next().value as string);
    }
    htmlCache.set(actualHash, html);

    return respond(html);
  } catch (error) {
    console.error("Failed to convert legal document", target.href, error);
    return NextResponse.json(
      { error: "The document could not be fetched" },
      { status: 502 }
    );
  }
}
