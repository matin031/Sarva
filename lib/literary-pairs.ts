// Structure for the "جفت‌های ادبی" memory-match game.
//
// The deck STRUCTURE (three books × two exam terms) lives here as static
// config. The PAIRS themselves live in the database (table `memory_pairs`) so
// they can be added/edited from the admin panel — see lib/pairs-content.ts for
// the loader and lib/admin/pairs-actions.ts for the admin CRUD.
//
// LITERARY_PAIRS below is the fallback that ships in the box: until an admin
// adds a single pair for a deck, that deck is dealt from this list, so the game
// is never empty on a fresh install.
export type LiteraryPair = { work: string; author: string };

export const MEMORY_GRADES = [
  { id: "dahom", title: "دهم" },
  { id: "yazdahom", title: "یازدهم" },
  { id: "davazdahom", title: "دوازدهم" },
] as const;

export type MemoryGrade = (typeof MEMORY_GRADES)[number]["id"];

export const MEMORY_TERMS = [
  { id: "dey", title: "آزمون دی", hint: "نیمهٔ اول کتاب" },
  { id: "khordad", title: "آزمون خرداد", hint: "نیمهٔ دوم کتاب" },
] as const;

export type MemoryTerm = (typeof MEMORY_TERMS)[number]["id"];

/** Every deck, keyed by grade and then term — the shape the game page hands
 *  to the client so switching grade or term needs no extra round-trip. */
export type MemoryDecks = Record<MemoryGrade, Record<MemoryTerm, LiteraryPair[]>>;

export function isMemoryGrade(value: string): value is MemoryGrade {
  return MEMORY_GRADES.some((g) => g.id === value);
}

export function isMemoryTerm(value: string): value is MemoryTerm {
  return MEMORY_TERMS.some((t) => t.id === value);
}

export function memoryGradeTitle(grade: MemoryGrade): string {
  return MEMORY_GRADES.find((g) => g.id === grade)?.title ?? grade;
}

export function memoryTermTitle(term: MemoryTerm): string {
  return MEMORY_TERMS.find((t) => t.id === term)?.title ?? term;
}

export function emptyMemoryDecks(): MemoryDecks {
  return {
    dahom: { dey: [], khordad: [] },
    yazdahom: { dey: [], khordad: [] },
    davazdahom: { dey: [], khordad: [] },
  };
}

// Every author here is unique so each work has exactly one correct author card
// — otherwise a match would be ambiguous.
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

/** Ceiling on how many pairs are dealt into one round.
 *
 *  The board grows with the deck — that is the point — but past this many
 *  pairs a card is too small to read and the round too long to hold in
 *  memory. A bigger deck is not wasted: a different random subset is dealt
 *  each round, so it just means more variety. */
export const MEMORY_MAX_PAIRS = 15;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Deals a round from `pairs`: shuffles, takes at most `maxPairs` of them and
 *  returns their cards (two per pair — the work and its author), shuffled. */
export function buildMemoryDeck(
  pairs: LiteraryPair[],
  maxPairs: number = MEMORY_MAX_PAIRS,
): MemoryCard[] {
  const picked = shuffle(pairs).slice(0, Math.max(1, maxPairs));
  const cards: MemoryCard[] = [];
  picked.forEach((p, pairId) => {
    cards.push({ id: pairId * 2, pairId, kind: "work", text: p.work });
    cards.push({ id: pairId * 2 + 1, pairId, kind: "author", text: p.author });
  });
  return shuffle(cards);
}

/** How many columns a board of `cardCount` cards should use — on a phone
 *  (`base`) and on a wide screen (`wide`).
 *
 *  A fixed 3×4 grid was fine while every round had exactly 12 cards. Now the
 *  deck is whatever the admin entered — five authors or twenty — so the grid
 *  has to follow: roughly square, but never so wide that a card on a phone
 *  becomes a sliver. The card keeps its 3:4 shape and simply gets smaller as
 *  columns grow. */
export function memoryGridColumns(cardCount: number): { base: number; wide: number } {
  const wide = fitColumns(cardCount, 3, 6);
  return { base: fitColumns(cardCount, 2, Math.min(4, wide)), wide };
}

/** The column count closest to a square board — but nudged to one that divides
 *  the deck evenly, when that costs nothing.
 *
 *  Without the nudge, ten cards land in a 4-wide grid whose last row holds two
 *  lonely cards while the rest of it sits empty; five columns fills two rows
 *  exactly. The nudge is refused when it would add a row, because on a phone
 *  more scrolling is a worse trade than a ragged last row — thirty cards stay
 *  four across (eight rows) instead of dropping to three (ten rows). */
function fitColumns(cardCount: number, min: number, max: number): number {
  const ideal = Math.min(max, Math.max(min, Math.round(Math.sqrt(cardCount * 1.4))));
  const idealRows = Math.ceil(cardCount / ideal);

  for (let c = Math.min(max, ideal + 1); c >= Math.max(min, ideal - 1); c--) {
    if (cardCount % c === 0 && Math.ceil(cardCount / c) <= idealRows) return c;
  }
  return ideal;
}
