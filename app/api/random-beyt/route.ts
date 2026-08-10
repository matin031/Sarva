import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";

/** A random بیت from گنجور, for the وزن‌یاب's "بیتِ تصادفی" button.
 *
 *  Ganjoor is called from the server, never from the browser: the URL is a
 *  constant (nothing a caller sends is interpolated into it), so this endpoint
 *  cannot be turned into a proxy for arbitrary hosts, and the browser never
 *  meets a cross-origin request.
 *
 *  Ganjoor's payload is not identical across poems — some carry `verses`, some
 *  nest them under a section, and hemistichs are sometimes marked by
 *  `versePosition` and sometimes only by their order. Rather than commit to one
 *  shape, `readVerses` probes for the array and `toCouplets` handles both the
 *  marked and the unmarked case. When nothing usable comes back the observed
 *  top-level keys are logged, which is the fastest way to learn about a shape
 *  this code has not met yet. */

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

type RawVerse = { text: string; position: number | null };

/** Ganjoor has moved the verse array around between shapes; look where it has
 *  actually been seen rather than assuming one. */
function readVerses(poem: unknown): RawVerse[] {
  const candidates: unknown[] = [
    at(poem, "verses"),
    at(poem, "poem.verses"),
    at(poem, "sections.0.verses"),
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;
    const verses = candidate
      .map((v): RawVerse => {
        const text = firstString(v, ["text", "verseText", "title"]);
        const rawPos = isRecord(v) ? v.versePosition : undefined;
        return {
          text,
          position: typeof rawPos === "number" ? rawPos : null,
        };
      })
      .filter((v) => v.text.length > 0);
    if (verses.length) return verses;
  }
  return [];
}

/** The وزن‌یاب form only accepts Persian letters and 10–40 characters per
 *  hemistich, so a couplet it would reject is no use to us. */
const PERSIAN_ONLY = /^[؀-ۿ‌‎‏\s]+$/;

function usableHemistich(line: string): boolean {
  return line.length >= 10 && line.length <= 40 && PERSIAN_ONLY.test(line);
}

/** Pair hemistichs into couplets.
 *
 *  `versePosition` is Ganjoor's own marker — 0 opens a بیت and 1 closes it —
 *  and when it is present it is the truth, because a poem can carry headings
 *  and single lines that would break naive pairing. When it is absent the only
 *  thing left is consecutive order. */
function toCouplets(verses: RawVerse[]): Couplet[] {
  const marked = verses.some((v) => v.position !== null);
  const couplets: Couplet[] = [];

  if (marked) {
    for (let i = 0; i < verses.length - 1; i++) {
      if (verses[i].position === 0 && verses[i + 1].position === 1) {
        couplets.push({ first: verses[i].text, second: verses[i + 1].text });
      }
    }
  } else {
    for (let i = 0; i + 1 < verses.length; i += 2) {
      couplets.push({ first: verses[i].text, second: verses[i + 1].text });
    }
  }

  return couplets.filter(
    (c) => usableHemistich(c.first) && usableHemistich(c.second),
  );
}

function buildUrl(poem: unknown): string {
  const full = firstString(poem, ["fullUrl", "urlSlug"]);
  if (!full) return "";
  if (full.startsWith("http")) return full;
  return `https://ganjoor.net${full.startsWith("/") ? "" : "/"}${full}`;
}

function toRandomBeyt(poem: unknown): RandomBeyt | null {
  const couplets = toCouplets(readVerses(poem));
  if (!couplets.length) return null;

  const couplet = couplets[Math.floor(Math.random() * couplets.length)];
  const idRaw = at(poem, "id") ?? at(poem, "poemId");

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
    couplet,
    url: buildUrl(poem),
    poemId: typeof idRaw === "number" ? idRaw : 0,
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

export async function GET(request: NextRequest) {
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

  console.error(
    `random-beyt: no usable couplet after ${MAX_ATTEMPTS} draws.`,
    lastError ? `last error: ${String(lastError)}` : "",
    lastShape.length ? `last payload keys: ${lastShape.join(", ")}` : "",
  );

  return NextResponse.json(
    { error: "بیتی از گنجور به دست نیامد. دوباره تلاش کن." },
    { status: 502 },
  );
}
