import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import type { NextRequest } from "next/server";
import { watermarkImage } from "@/lib/vocab-watermark";
import { requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { logger, sanitizeUrl } from "@/lib/observability";

// sharp needs the Node.js runtime (not edge)
export const runtime = "nodejs";

// Only these hosts may be proxied, so the endpoint can't be abused to fetch
// arbitrary/internal URLs. Add hosts here if you start serving vocab images
// from another place.
const ALLOWED_HOSTS = new Set([
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "user-images.githubusercontent.com",
  "camo.githubusercontent.com",
  "avatars.githubusercontent.com",
]);

/** Nothing upstream is expected to be big, and sharp has to hold the whole
 *  thing in memory. A 100 MB "image" would not be a vocab picture. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 8000;

/** Watermarking one picture costs real CPU (sharp decodes, composites and
 *  re-encodes it), and this endpoint needs no session at all — so without a
 *  cap, a single client could pin every core on the box. Generous enough that
 *  a game round, which pulls a dozen or so pictures, never notices. */
const RATE_LIMIT = Number(process.env.VOCAB_IMAGE_RATE_LIMIT ?? 60);
const RATE_WINDOW_SECONDS = 60;

/** Same-origin `/foo.png` used to be resolved against `req.nextUrl.origin`, and
 *  that origin comes from the request's own Host header.
 *
 *  That was an SSRF: a caller sending `Host: 169.254.169.254` (a cloud metadata
 *  service, an internal admin panel, anything reachable from the container)
 *  made the server fetch that host and hand the bytes back, watermarked. The
 *  host allowlist above never applied, because this branch never looked at it.
 *
 *  There is no reason to go over the network for our own files at all: they sit
 *  on this very disk under public/. Reading them directly removes the whole
 *  class of problem — no Host header, no URL, no request to be redirected. */
async function readPublicAsset(pathname: string): Promise<Buffer | null> {
  // Query string and fragment are not part of a file name.
  const clean = decodeURIComponent(pathname.split(/[?#]/)[0]);

  const root = join(process.cwd(), "public");
  const target = normalize(join(root, clean));

  // normalize() has already collapsed any `..`; this checks where it landed.
  if (target !== root && !target.startsWith(root + sep)) return null;

  try {
    return await readFile(target);
  } catch {
    return null;
  }
}

/** Read at most `limit` bytes, aborting a response that keeps coming. Reading
 *  `arrayBuffer()` first and checking the length afterwards would mean the
 *  oversized body is already in memory — which is the thing being prevented. */
async function readCapped(res: Response, limit: number): Promise<Buffer | null> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > limit) return null;

  const reader = res.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

const IMAGE_HEADERS = {
  "Content-Type": "image/webp",
  "Cache-Control": "public, max-age=31536000, immutable",
  // The response is attacker-influenced bytes; never let a browser sniff it
  // into something executable.
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET(req: NextRequest) {
  const { ip } = requestMeta(req);
  const limit = rateLimit(`vocab-image:${ip ?? "unknown"}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return new Response("too many requests", {
      status: 429,
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  const src = req.nextUrl.searchParams.get("src");
  if (!src) return new Response("missing src", { status: 400 });

  // ---- same-origin asset: straight off the disk, no network at all --------
  if (src.startsWith("/") && !src.startsWith("//")) {
    const raw = await readPublicAsset(src);
    if (!raw) return new Response("not found", { status: 404 });

    try {
      const out = await watermarkImage(raw);
      return new Response(new Uint8Array(out), { headers: IMAGE_HEADERS });
    } catch (err) {
      // Watermarking failed on a file we own — serve it unmarked rather than
      // showing the student a broken image. It is still worth a log line:
      // silently un-watermarked pictures are exactly the kind of failure that
      // goes unnoticed for months.
      logger.warn("واترمارک زدن روی فایل محلی شکست خورد", {
        event: "image.watermark.failed",
        err,
        image_origin: "local",
      });
      return new Response(new Uint8Array(raw), {
        headers: { "Cache-Control": IMAGE_HEADERS["Cache-Control"], "X-Content-Type-Options": "nosniff" },
      });
    }
  }

  // ---- remote asset: allowlisted hosts only ------------------------------
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return new Response("bad src", { status: 400 });
  }
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname)) {
    return new Response("host not allowed", { status: 400 });
  }
  const target = u.toString();

  try {
    const res = await fetch(target, {
      headers: { accept: "image/*" },
      // A redirect could take us off the allowlist — GitHub's own asset URLs
      // do redirect, but only to hosts that are themselves on the list, so
      // following them manually is not worth it. `error` fails loudly instead
      // of quietly fetching somewhere unvetted.
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    if (!(res.headers.get("content-type") || "").startsWith("image/")) {
      throw new Error("not an image");
    }

    const raw = await readCapped(res, MAX_IMAGE_BYTES);
    if (!raw) throw new Error("too large");

    const out = await watermarkImage(raw);
    return new Response(new Uint8Array(out), { headers: IMAGE_HEADERS });
  } catch (err) {
    logger.warn("واکشی یا واترمارک تصویر بیرونی شکست خورد", {
      event: "image.watermark.failed",
      err,
      image_origin: "remote",
      image_host: u.hostname,
      image_url: sanitizeUrl(target),
    });
    // Graceful fallback: if watermarking fails, still show the original image.
    // Safe to redirect to — `target` was checked against ALLOWED_HOSTS above,
    // so this can never become an open redirect.
    return Response.redirect(target, 302);
  }
}
