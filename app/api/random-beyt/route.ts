import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { logger } from "@/lib/observability";
import { hemistichSchema } from "@/lib/aruz/input";
import { readGanjoorCouplets, type GanjoorMeter } from "@/lib/ganjoor/poem";

/** Random complete couplets with an unambiguous section metre, for reference-based practice. */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RANDOM_POEM_URL = "https://api.ganjoor.net/api/ganjoor/poem/random";
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 8000;

type Couplet = { first: string; second: string };

type RandomBeyt = {
  poet: string;
  book: string;
  poem: string;
  couplet: Couplet;
  url: string;
  poemId: number;
  meter: GanjoorMeter;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Follow a dotted path, returning undefined the moment it leaves an object. */
function at(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const key of path.split(".")) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function firstString(root: unknown, paths: string[]): string {
  for (const p of paths) {
    const v = str(at(root, p));
    if (v) return v;
  }
  return "";
}

function toRandomBeyt(poem: unknown): RandomBeyt | null {
  const couplets = readGanjoorCouplets(poem).filter(c =>
    c.meter && hemistichSchema.safeParse(c.first).success && hemistichSchema.safeParse(c.second).success,
  );
  if (!couplets.length) return null;

  const couplet = couplets[Math.floor(Math.random() * couplets.length)];
  const meter = couplet.meter!;

  return {
    poet: firstString(poem, [
      "category.poet.name",
      "poet.name",
      "poetOrCat.poet.name",
    ]),
    book: firstString(poem, [
      "category.cat.title",
      "category.title",
      "cat.title",
    ]),
    poem: firstString(poem, ["title", "fullTitle"]),
    couplet: { first: couplet.first, second: couplet.second },
    url: meter.url,
    poemId: meter.poemId,
    meter,
  };
}

async function fetchRandomPoem(): Promise<unknown> {
  const res = await fetch(RANDOM_POEM_URL, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ganjoor responded ${res.status}`);
  return res.json();
}

export const GET = withRoute("/api/random-beyt", async (request: NextRequest) => {
  // One call here can mean up to MAX_ATTEMPTS requests to Ganjoor, and the
  // endpoint needs no session. Without a cap it amplifies traffic ~5x against
  // a third party we do not own, and ties up our own connections while doing
  // it. A person clicking «بیت تصادفی» never gets near this.
  const { ip } = requestMeta(request);
  const limit = rateLimit(`random-beyt:${ip ?? "unknown"}`, 30, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کن.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let lastError: unknown = null;
  let lastShape: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const poem = await fetchRandomPoem();
      const beyt = toRandomBeyt(poem);
      if (beyt) return NextResponse.json(beyt);
      // a poem with no complete couplet (a heading, a single line, a قطعه with
      // long hemistichs) — that is ordinary, so just draw again
      lastShape = isRecord(poem) ? Object.keys(poem) : [];
    } catch (err) {
      lastError = err;
    }
  }

  logger.warn("گنجور بیتِ قابل‌استفاده‌ای نداد", {
    event: "ganjoor.no_usable_beyt",
    attempts: MAX_ATTEMPTS,
    err: lastError ?? undefined,
    payload_keys: lastShape.slice(0, 12),
  });

  return NextResponse.json(
    { error: "بیتی از گنجور به دست نیامد. دوباره تلاش کن." },
    { status: 502 },
  );
});
