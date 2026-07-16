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

function makeDecoys(...exclude: string[][]) {
  const excluded = new Set(exclude.flat());
  const others = [QEID, SEFAT, HARF_RABT, ZAMIR]
    .flat()
    .filter((w) => !excluded.has(w));
  return [...new Set([...others, ...FILLER])];
}

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

// only قید is selectable in the settings screen for now — the rest of
// NINJA_ROUNDS stays defined for when more categories are wired up.
export const SELECTABLE_NINJA_CATEGORIES = [
  { label: "قید", enabled: true },
  { label: "صفت", enabled: false },
  { label: "حروف اضافه", enabled: false },
  { label: "فعل", enabled: false },
  { label: "کلماتِ استعاره‌پذیر", enabled: false },
] as const;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// builds the (currently only قید) round with a random subset of `count`
// target words, used once the player picks a word count in settings.
export function buildNinjaRound(count: number): NinjaRound {
  const base = NINJA_ROUNDS[0];
  const targetWords = shuffle(base.targetWords).slice(
    0,
    Math.min(count, base.targetWords.length),
  );
  return { ...base, targetWords };
}
