// Work ↔ author pairs for the "جفت‌های ادبی" memory-match game. Every
// author here is unique so each work has exactly one correct author card —
// otherwise a match would be ambiguous. Reinforces the same knowledge the
// final exam tests (matching a work to its creator).
export type LiteraryPair = { work: string; author: string };

export const LITERARY_PAIRS: LiteraryPair[] = [
  { work: "شاهنامه", author: "فردوسی" },
  { work: "مثنوی معنوی", author: "مولوی" },
  { work: "گلستان", author: "سعدی" },
  { work: "منطق‌الطیر", author: "عطار" },
  { work: "خمسه", author: "نظامی" },
  { work: "کلیله و دمنه", author: "نصرالله منشی" },
  { work: "تاریخ بیهقی", author: "ابوالفضل بیهقی" },
  { work: "رباعیات", author: "خیام" },
  { work: "سفرنامه", author: "ناصرخسرو" },
  { work: "حدیقةالحقیقه", author: "سنایی" },
];

export type MemoryCard = {
  id: number;
  pairId: number;
  kind: "work" | "author";
  text: string;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Picks `pairCount` random pairs and returns their shuffled cards
 *  (two per pair: the work and its author). */
export function buildMemoryDeck(pairCount: number): MemoryCard[] {
  const picked = shuffle(LITERARY_PAIRS).slice(0, pairCount);
  const cards: MemoryCard[] = [];
  picked.forEach((p, pairId) => {
    cards.push({ id: pairId * 2, pairId, kind: "work", text: p.work });
    cards.push({ id: pairId * 2 + 1, pairId, kind: "author", text: p.author });
  });
  return shuffle(cards);
}
