import { readCappedText } from "./api/read-capped";
import { ganjoorSearchText, isRecord, matchGanjoorMeter, normalizeGanjoorText, type GanjoorMeter } from "./ganjoor/poem";

const API = "https://api.ganjoor.net/api/ganjoor";
const PAGE_SIZE = 20;
const MAX_MATCHES = 4;
const TIMEOUT_MS = 6500;

/** Search supplies candidates only. Verify the full pair and its section.
 * Network failures and ambiguous matches return no reference. */
export async function findGanjoorMeter(
  first: string,
  second?: string,
  options: { poemId?: number; fetcher?: typeof fetch } = {},
): Promise<GanjoorMeter | null> {
  const fetcher = options.fetcher ?? fetch;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const get = async (url: string) => {
    const response = await fetcher(url, { signal, cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Ganjoor unavailable");
    const text = await readCappedText(response, 2 * 1024 * 1024);
    if (text === null) throw new Error("Ganjoor response too large");
    return { data: JSON.parse(text) as unknown, response };
  };
  const getPoem = async (id: number) => {
    const flags = new URLSearchParams(Object.fromEntries([
      "catInfo", "catPoems", "rhymes", "recitations", "images", "songs", "comments", "verseDetails", "navigation", "relatedpoems",
    ].map(k => [k, "false"])));
    // In the live API, false removes `verses` entirely, including section ids.
    flags.set("verseDetails", "true");
    const { data } = await get(`${API}/poem/${id}?${flags}`);
    if (!isRecord(data) || data.id !== id) return null;
    return matchGanjoorMeter(data, first, second);
  };
  try {
    const term = ganjoorSearchText(first);
    if (term.length < 8 || first.length > 160 || (second !== undefined && (!normalizeGanjoorText(second) || second.length > 160))) return null;
    if (Number.isSafeInteger(options.poemId) && options.poemId! > 0) {
      // An id is only a hint: it must still match both submitted hemistichs.
      return await getPoem(options.poemId!);
    }
    const query = new URLSearchParams({ term: `"${term}"`, PageNumber: "1", PageSize: String(PAGE_SIZE) });
    const { data, response } = await get(`${API}/poems/search?${query}`);
    if (!Array.isArray(data)) return null;
    const header = response.headers.get("paging-headers");
    const paging: unknown = header ? JSON.parse(header) : null;
    if ((isRecord(paging) && (paging.hasNextPage === true || Number(paging.totalCount) > PAGE_SIZE)) || (!paging && data.length >= PAGE_SIZE)) return null;
    const a = normalizeGanjoorText(first), b = second === undefined ? null : normalizeGanjoorText(second);
    const ids = [...new Set(data.filter(isRecord).filter(p => {
      if (!Number.isSafeInteger(p.id) || Number(p.id) <= 0 || typeof p.plainText !== "string") return false;
      const lines = p.plainText.split(/\r?\n/).map(normalizeGanjoorText);
      return lines.some((line, i) => line === a && (b === null || lines[i + 1] === b));
    }).map(p => Number(p.id)))];
    if (!ids.length || ids.length > MAX_MATCHES) return null;
    const matches = await Promise.all(ids.map(getPoem));
    if (matches.some(m => !m)) return null;
    const rhythms = new Set(matches.map(m => normalizeGanjoorText(m!.rhythm.split("(")[0])));
    return rhythms.size === 1 ? matches[0] : null;
  } catch { return null; }
}

export async function findMeterOnGanjoor(first: string, second?: string): Promise<string | undefined> {
  return (await findGanjoorMeter(first, second))?.rhythm;
}
