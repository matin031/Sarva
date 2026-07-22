import type { NextRequest } from "next/server";
import { watermarkImage } from "@/lib/vocab-watermark";

// sharp needs the Node.js runtime (not edge)
export const runtime = "nodejs";

// Only these hosts (and same-origin /public paths) may be proxied, so the
// endpoint can't be abused to fetch arbitrary/internal URLs. Add hosts here if
// you start serving vocab images from another place.
const ALLOWED_HOSTS = new Set([
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "user-images.githubusercontent.com",
  "camo.githubusercontent.com",
  "avatars.githubusercontent.com",
]);

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src) return new Response("missing src", { status: 400 });

  let target: string;
  if (src.startsWith("/") && !src.startsWith("//")) {
    target = `${req.nextUrl.origin}${src}`; // same-origin asset under /public
  } else {
    let u: URL;
    try {
      u = new URL(src);
    } catch {
      return new Response("bad src", { status: 400 });
    }
    if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname)) {
      return new Response("host not allowed", { status: 400 });
    }
    target = u.toString();
  }

  try {
    const res = await fetch(target, { headers: { accept: "image/*" } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    if (!(res.headers.get("content-type") || "").startsWith("image/")) {
      throw new Error("not an image");
    }
    const out = await watermarkImage(Buffer.from(await res.arrayBuffer()));
    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // graceful fallback: if watermarking fails, still show the original image
    return Response.redirect(target, 302);
  }
}
