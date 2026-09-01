export type NinjaRound = {
  id: number;
  category: string;
  hint: string;
  targetWords: string[];
  decoyWords: string[];
};

const QEID = [
  "آهسته",
  "دیروز",
  "امروز",
  "فردا",
  "همیشه",
  "هرگز",
  "ناگهان",
  "اینجا",
  "آنجا",
  "دوباره",
  "مرتباً",
  "کاملاً",
  "بسیار",
  "زود",
  "دیر",
];

const SEFAT = [
  "زیبا",
  "بزرگ",
  "کوچک",
  "بلند",
  "کوتاه",
  "سرد",
  "گرم",
  "شیرین",
  "تلخ",
  "نرم",
  "سخت",
  "شاد",
  "غمگین",
  "مهربان",
  "باهوش",
];

const HARF_RABT = [
  "و",
  "اما",
  "ولی",
  "چون",
  "زیرا",
  "اگر",
  "که",
  "یا",
  "پس",
  "تا",
  "هرچند",
  "بلکه",
  "وگرنه",
  "چنانچه",
];

const ZAMIR = [
  "من",
  "تو",
  "او",
  "ما",
  "شما",
  "آنها",
  "این",
  "آن",
  "خودم",
  "خودت",
  "خودش",
  "کسی",
  "هرکس",
  "چیزی",
];

const FILLER = [
  "کتاب",
  "مدرسه",
  "رفت",
  "خورد",
  "آب",
  "درخت",
  "خورشید",
  "دوست",
  "معلم",
  "شهر",
  "خانه",
  "ماشین",
  "گفت",
  "دید",
  "شنید",
  "نوشت",
  "خواند",
  "دانست",
  "دانش‌آموز",
  "باغ",
  "گل",
  "پرنده",
  "آسمان",
  "دریا",
  "کوه",
  "جنگل",
  "رودخانه",
  "ستاره",
  "ماه",
  "برگ",
  "باران",
  "برف",
  "باد",
  "آتش",
  "سنگ",
  "چوب",
  "فلز",
  "طلا",
  "نقره",
  "روستا",
  "بازار",
  "مغازه",
  "غذا",
  "نان",
  "برنج",
  "میوه",
  "سیب",
  "پرتقال",
  "موز",
  "انگور",
  "هندوانه",
  "توت",
  "آلبالو",
  "گیلاس",
  "گردو",
  "بادام",
  "دفتر",
  "مداد",
  "کلاس",
  "دیوار",
  "پنجره",
  "میز",
  "صندلی",
  "چراغ",
  "کوچه",
  "خیابان",
  "پل",
  "قطار",
  "هواپیما",
  "کشتی",
  "دوچرخه",
];

/** Everything a player could be shown that is *not* one of `targetWords`:
 *  every other category's words, plus FILLER above as a neutral pool so a
 *  round stays busy even when only one category exists.
 *
 *  Exported because the database-backed rounds (lib/ninja-content.ts) must
 *  build their decoys exactly the same way — including from the same filler.
 *
 *  `allCategoryWords` is every category's word list, the target's included;
 *  filtering happens here rather than at the call site, so a word an admin put
 *  in two categories can never show up as its own decoy. */
export function buildNinjaDecoys(
  allCategoryWords: string[][],
  targetWords: string[],
): string[] {
  const excluded = new Set(targetWords);
  const others = allCategoryWords.flat().filter((w) => !excluded.has(w));
  return [...new Set([...others, ...FILLER])];
}

function makeDecoys(...exclude: string[][]) {
  return buildNinjaDecoys([QEID, SEFAT, HARF_RABT, ZAMIR], exclude.flat());
}

// The rounds that ship in the box. They are the fallback: as soon as an admin
// creates a single category in the panel (table `ninja_categories`), the game
// is dealt from the database instead — see lib/ninja-content.ts.
export const NINJA_ROUNDS: NinjaRound[] = [
  {
    id: 1,
    category: "قید",
    hint: "کلماتی که زمان، مکان یا چگونگیِ انجام کار را نشان می‌دهند.",
    targetWords: QEID,
    decoyWords: makeDecoys(QEID),
  },
  {
    id: 2,
    category: "صفت",
    hint: "کلماتی که ویژگی یا حالتِ یک اسم را توصیف می‌کنند.",
    targetWords: SEFAT,
    decoyWords: makeDecoys(SEFAT),
  },
  {
    id: 3,
    category: "حرف ربط",
    hint: "کلماتی که دو جمله یا دو بخش از جمله را به هم پیوند می‌دهند.",
    targetWords: HARF_RABT,
    decoyWords: makeDecoys(HARF_RABT),
  },
  {
    id: 4,
    category: "ضمیر",
    hint: "کلماتی که به‌جای اسم می‌نشینند.",
    targetWords: ZAMIR,
    decoyWords: makeDecoys(ZAMIR),
  },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Deals one playable round: the chosen category with a random subset of
 *  `count` of its target words.
 *
 *  Used to hard-code NINJA_ROUNDS[0] (قید) because that was the only category
 *  the settings screen offered. Now the player picks a category — and which
 *  categories exist is an admin decision, not a code one — so the round to
 *  deal is an argument. */
export function buildNinjaRound(round: NinjaRound, count: number): NinjaRound {
  const targetWords = shuffle(round.targetWords).slice(
    0,
    Math.min(count, round.targetWords.length),
  );
  return { ...round, targetWords };
}
