/** Public Ganjoor API parsing. Never infer verse pairing from array parity. */
export interface GanjoorMeter {
  source: "ganjoor";
  rhythm: string;
  poemId: number;
  sectionIndex: number;
  coupletIndex: number;
  url: string;
  title: string;
}

export interface GanjoorCouplet {
  first: string;
  second: string;
  meter: GanjoorMeter | null;
}

type RecordValue = Record<string, unknown>;
export const isRecord = (v: unknown): v is RecordValue =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

// Keep آ and lexical hamza distinct. Match whole hemistichs, never substrings.
export function normalizeGanjoorText(text: string): string {
  return text.normalize("NFC")
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[ۀة]/g, "ه")
    .replace(/[\u064b-\u065f\u0670\u0640\u200c-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[\p{P}\p{Z}\s]/gu, "");
}

export function ganjoorSearchText(text: string): string {
  return text.normalize("NFC")
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[ۀة]/g, "ه")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[\p{P}\u200c-\u200f\u202a-\u202e\u2066-\u2069]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function sourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value, "https://ganjoor.net");
    if (url.origin !== "https://ganjoor.net" || url.username || url.password || url.pathname === "/") return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch { return null; }
}

export function readGanjoorCouplets(poem: unknown): GanjoorCouplet[] {
  // The unauthenticated API returns published:false even for live Hafez pages;
  // it is not a usable validity flag on this public response model.
  if (!isRecord(poem) || !Array.isArray(poem.verses)) return [];
  const sections = new Map<number, RecordValue>();
  for (const section of Array.isArray(poem.sections) ? poem.sections : []) {
    if (isRecord(section) && integer(section.index)) sections.set(section.index, section);
  }
  const rhythmOf = (index: number, visited = new Set<number>()): string | null => {
    if (visited.has(index)) return null;
    visited.add(index);
    const section = sections.get(index);
    if (!section) return null;
    const metre = section.ganjoorMetre;
    if (isRecord(metre) && typeof metre.rhythm === "string" && metre.rhythm.trim()) return metre.rhythm.trim();
    return integer(section.ganjoorMetreRefSectionIndex)
      ? rhythmOf(section.ganjoorMetreRefSectionIndex, visited) : null;
  };
  const indexes = (verse: RecordValue) => [1, 2, 3, 4]
    .map(n => verse[`sectionIndex${n}`]).filter(integer);
  const verses = poem.verses.filter(isRecord)
    .filter(v => integer(v.vOrder)).sort((a, b) => Number(a.vOrder) - Number(b.vOrder));
  const url = sourceUrl(poem.fullUrl);
  const out: GanjoorCouplet[] = [];
  for (let i = 0; i + 1 < verses.length; i++) {
    const a = verses[i], b = verses[i + 1];
    if (a.versePosition !== 0 || b.versePosition !== 1 ||
      !integer(a.coupletIndex) || a.coupletIndex !== b.coupletIndex ||
      Number(b.vOrder) !== Number(a.vOrder) + 1 ||
      typeof a.text !== "string" || typeof b.text !== "string" || !a.text.trim() || !b.text.trim()) continue;
    const common = indexes(a).filter(index => indexes(b).includes(index));
    const candidates = common.map(index => ({ index, rhythm: rhythmOf(index) })).filter(c => c.rhythm);
    const rhythms = new Set(candidates.map(c => normalizeGanjoorText(c.rhythm!.split("(")[0])));
    const candidate = candidates[0];
    const meter: GanjoorMeter | null = candidate && rhythms.size === 1 && url && integer(poem.id) && poem.id > 0 ? {
      source: "ganjoor", rhythm: candidate.rhythm!, poemId: poem.id,
      sectionIndex: candidate.index, coupletIndex: a.coupletIndex,
      url: `${url}#bn${a.coupletIndex + 1}`,
      title: typeof poem.fullTitle === "string" ? poem.fullTitle : "گنجور",
    } : null;
    out.push({ first: a.text.trim(), second: b.text.trim(), meter });
    i++;
  }
  return out;
}

export function matchGanjoorMeter(poem: unknown, first: string, second?: string): GanjoorMeter | null {
  const a = normalizeGanjoorText(first), b = second === undefined ? null : normalizeGanjoorText(second);
  if (!a || b === "") return null;
  const matched = readGanjoorCouplets(poem).filter(c => b === null
    ? [c.first, c.second].some(line => normalizeGanjoorText(line) === a)
    : normalizeGanjoorText(c.first) === a && normalizeGanjoorText(c.second) === b);
  if (!matched.length || matched.some(c => !c.meter)) return null;
  const rhythms = new Set(matched.map(c => normalizeGanjoorText(c.meter!.rhythm.split("(")[0])));
  return rhythms.size === 1 ? matched[0].meter : null;
}
