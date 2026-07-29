import { NextResponse } from "next/server";

/** A random بیت, for the وزن‌یاب's "بیتِ تصادفی" button.
 *
 *  Ganjoor is called from the server, never from the browser: the endpoint is a
 *  fixed URL (nothing the caller sends is interpolated into it), so this cannot
 *  be turned into a proxy for arbitrary hosts, and the page keeps working when
 *  a school network blocks ganjoor.net.
 *
 *  If Ganjoor cannot be reached the route still answers — with a بیت from a
 *  small local shelf, and `source: "local"` so the UI can say so rather than
 *  passing it off as a fresh draw. */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GANJOOR = "https://api.ganjoor.net/api/ganjoor/poem/random?poetId=0";

/** The form only accepts Persian letters, 10–40 characters per hemistich, so a
 *  couplet that would fail validation is no use to us. */
const OK = /^[؀-ۿ‌‎‏\s]+$/;
function usable(line: string): boolean {
  const t = line.trim();
  return t.length >= 10 && t.length <= 40 && OK.test(t);
}

const SHELF: { m1: string; m2: string; poet: string; title: string }[] = [
  {
    m1: "شهر یاران بود و خاک مهربانان این دیار",
    m2: "مهربانی کی سر آمد شهریاران را چه شد",
    poet: "حافظ",
    title: "غزل",
  },
  {
    m1: "یار بارافتاده را در کاروان بگذاشتند",
    m2: "بی‌وفا یاران که بربستند بار خویش را",
    poet: "سعدی",
    title: "غزل",
  },
  {
    m1: "بشنو این نی چون شکایت می‌کند",
    m2: "از جدایی‌ها حکایت می‌کند",
    poet: "مولوی",
    title: "مثنوی",
  },
  {
    m1: "توانا بود هر که دانا بود",
    m2: "ز دانش دل پیر برنا بود",
    poet: "فردوسی",
    title: "شاهنامه",
  },
  {
    m1: "دل من رای تو دارد سر سودای تو دارد",
    m2: "رخ فرسوده زردم غم بالای تو دارد",
    poet: "سعدی",
    title: "غزل",
  },
];

type Verse = { vOrder?: number; versePosition?: number; text?: string };

export async function GET() {
  try {
    const res = await fetch(GANJOOR, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`ganjoor ${res.status}`);
    const poem = await res.json();

    const verses: Verse[] = Array.isArray(poem?.verses) ? poem.verses : [];
    const lines = verses
      .map((v) => (v?.text ?? "").trim())
      .filter((t) => t.length > 0);

    // walk consecutive pairs and take a random couplet that the form will accept
    const pairs: [string, string][] = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      if (usable(lines[i]) && usable(lines[i + 1])) {
        pairs.push([lines[i], lines[i + 1]]);
      }
    }
    if (!pairs.length) throw new Error("no usable couplet");

    const [m1, m2] = pairs[Math.floor(Math.random() * pairs.length)];
    return NextResponse.json({
      source: "ganjoor",
      m1,
      m2,
      poet: poem?.category?.poet?.name ?? poem?.poet?.name ?? "",
      title: poem?.title ?? "",
      url: poem?.fullUrl ? `https://ganjoor.net${poem.fullUrl}` : null,
      // Ganjoor sometimes knows the metre itself — handy as a second opinion
      rhythm: poem?.sections?.[0]?.ganjoorMetre?.rhythm ?? null,
    });
  } catch (err) {
    console.error("random-beyt: falling back to the local shelf —", err);
    const pick = SHELF[Math.floor(Math.random() * SHELF.length)];
    return NextResponse.json({ source: "local", ...pick, url: null, rhythm: null });
  }
}
