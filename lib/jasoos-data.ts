// The roles a suspect can claim. An array rather than a bare union type
// because the admin panel has to *render* the list — a TypeScript union is
// erased at build time and cannot be iterated over.
export const JASOOS_ROLES = [
  "نهاد",
  "متمم",
  "مسند",
  "مفعول",
  "صفت",
  "قید",
  "تشبیه",
  "استعاره",
  "کنایه",
  "تشخیص",
  "مجاز",
  "واو عطف",
  "مضاف‌الیه",
  "معطوف",
  "منادا",
] as const;

export type SuspectRole = (typeof JASOOS_ROLES)[number];

export function isSuspectRole(value: string): value is SuspectRole {
  return (JASOOS_ROLES as readonly string[]).includes(value);
}

/** هر پرونده دقیقاً چهار مظنون دارد — چهار در، چهار ادعا، یک جاسوس. */
export const JASOOS_SUSPECT_COUNT = 4;

export type JasoosCategory = "دستوری" | "آرایه";
export type JasoosContentType = "poem" | "prose";

export type Suspect = {
  role: SuspectRole;
  isSpy: boolean;
  evidence: string;
  // the exact word/phrase from the verse that plays this role; absent for
  // the spy, since that's exactly why they don't belong
  wordInVerse?: string;
};

export type JasoosLevel = {
  id: number;
  title: string;
  category: JasoosCategory;
  // "poem" renders as a two-line couplet; "prose" renders as a single
  // justified paragraph — independent of `category`
  contentType: JasoosContentType;
  verseLines: [string, string];
  suspects: [Suspect, Suspect, Suspect, Suspect];
};

// deterministic PRNG so suspect order differs per level but stays
// identical between server and client renders (no hydration mismatch)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const rawLevels: JasoosLevel[] = [
  {
    id: 1,
    title: "درِ یکم",
    category: "دستوری",
    contentType: "poem",
    verseLines: [
      "عافیت خواهی نظر در منظر خوبان مکن،",
      "ور کنی بدرود کن خواب و قرار خویش را.",
    ],
    suspects: [
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«عافیت» مفعولِ فعلِ «خواهی» است؛ یعنی «عافیت را می‌خواهی».",
        wordInVerse: "عافیت",
      },
      {
        role: "صفت",
        isSpy: true,
        evidence: "در این بیت هیچ صفتی به‌کار نرفته؛ او جاسوس بود!",
      },
      {
        role: "واو عطف",
        isSpy: false,
        evidence: "«و» در «خواب و قرار» دو واژه را به هم پیوند می‌دهد؛ واو عطف است.",
        wordInVerse: "و",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«در منظر خوبان» با حرفِ اضافه‌ی «در» متممِ فعلِ «نظر ... مکن» است.",
        wordInVerse: "منظر",
      },
    ],
  },
  {
    id: 2,
    title: "درِ دوم",
    category: "دستوری",
    contentType: "poem",
    verseLines: [
      "چه خوش فرمود آن پیر خردمند،",
      "وزین خوش‌تر نباشد در جهان پند.",
    ],
    suspects: [
      {
        role: "قید",
        isSpy: false,
        evidence: "«خوش» در «چه خوش فرمود» قیدِ حالت برای فعلِ «فرمود» است.",
        wordInVerse: "خوش",
      },
      {
        role: "نهاد",
        isSpy: false,
        evidence: "«آن پیر خردمند» نهادِ جمله و انجام‌دهنده‌ی «فرمود» است.",
        wordInVerse: "پیر خردمند",
      },
      {
        role: "صفت",
        isSpy: false,
        evidence: "«خردمند» صفتِ «پیر» است.",
        wordInVerse: "خردمند",
      },
      {
        role: "متمم",
        isSpy: true,
        evidence: "«جهان» در این بیت نقشِ متمم را ندارد؛ او جاسوس بود!",
      },
    ],
  },
  {
    id: 3,
    title: "درِ سوم",
    category: "دستوری",
    contentType: "poem",
    verseLines: ["گر خونین دلی از جور ایام،", "لب خندان بیاور چون لب جام."],
    suspects: [
      {
        role: "صفت",
        isSpy: false,
        evidence: "«خونین» صفتِ «دل» است.",
        wordInVerse: "خونین",
      },
      {
        role: "نهاد",
        isSpy: true,
        evidence: "«دل» در این بیت نقشِ نهاد را ندارد؛ او جاسوس بود!",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«از جور ایام» با حرفِ اضافه‌ی «از» متمم است.",
        wordInVerse: "جور",
      },
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«لب خندان» مفعولِ فعلِ «بیاور» است.",
        wordInVerse: "لب",
      },
    ],
  },
  {
    id: 4,
    title: "درِ چهارم",
    category: "دستوری",
    contentType: "poem",
    verseLines: [
      "مکن ما ناقصان را یا رب از سنگ محک رسوا،",
      "که این به بوته را کامل عیاری نیست غیر از تو.",
    ],
    suspects: [
      {
        role: "مضاف‌الیه",
        isSpy: true,
        evidence: "«ناقصان» در این بیت نقشِ مضاف‌الیه را ندارد؛ او جاسوس بود!",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«از سنگ محک» با حرفِ اضافه‌ی «از» متمم است.",
        wordInVerse: "سنگ محک",
      },
      {
        role: "مسند",
        isSpy: false,
        evidence: "«کامل» پس از فعلِ ربطیِ «نیست»، مسند است.",
        wordInVerse: "کامل",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«غیر از تو» با حرفِ اضافه‌ی «از» متمم است.",
        wordInVerse: "تو",
      },
    ],
  },
  {
    id: 5,
    title: "درِ پنجم",
    category: "دستوری",
    contentType: "poem",
    verseLines: [
      "دل اگر خداشناسی همه در رخ علی بین،",
      "به علی شناختم من به خدا قسم خدا را.",
    ],
    suspects: [
      {
        role: "مسند",
        isSpy: true,
        evidence: "«خداشناسی» در این بیت نقشِ مسند را ندارد؛ او جاسوس بود!",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«در رخ علی» با حرفِ اضافه‌ی «در» متمم است.",
        wordInVerse: "رخ",
      },
      {
        role: "نهاد",
        isSpy: false,
        evidence: "«من» نهادِ فعلِ «شناختم» است.",
        wordInVerse: "من",
      },
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«خدا را» مفعولِ فعلِ «قسم» است.",
        wordInVerse: "خدا را",
      },
    ],
  },
  {
    id: 6,
    title: "درِ ششم",
    category: "دستوری",
    contentType: "poem",
    verseLines: ["چو صبرش نماند از ضعیفی و هوش،", "ز دیوار محرابش آمد به گوش."],
    suspects: [
      {
        role: "نهاد",
        isSpy: false,
        evidence: "«صبرش» نهادِ فعلِ «نماند» است.",
        wordInVerse: "صبرش",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«از ضعیفی» با حرفِ اضافه‌ی «از» متمم است.",
        wordInVerse: "ضعیفی",
      },
      {
        role: "معطوف",
        isSpy: false,
        evidence: "«هوش» با واوِ عطف به «ضعیفی» پیوند خورده و معطوف است.",
        wordInVerse: "هوش",
      },
      {
        role: "مفعول",
        isSpy: true,
        evidence: "«گوش» در این بیت نقشِ مفعول را ندارد؛ او جاسوس بود!",
      },
    ],
  },
  {
    id: 7,
    title: "درِ هفتم",
    category: "دستوری",
    contentType: "poem",
    verseLines: ["فلک در شگفتی ز عزم شماست،", "ملک آفرین‌گوی رزم شماست."],
    suspects: [
      {
        role: "متمم",
        isSpy: false,
        evidence: "«در شگفتی» با حرفِ اضافه‌ی «در» متمم است.",
        wordInVerse: "شگفتی",
      },
      {
        role: "مضاف‌الیه",
        isSpy: true,
        evidence: "«عزم» در این بیت نقشِ مضاف‌الیه را ندارد؛ او جاسوس بود!",
      },
      {
        role: "نهاد",
        isSpy: false,
        evidence: "«ملک» نهادِ جمله‌ی دوم است.",
        wordInVerse: "ملک",
      },
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«آفرین‌گوی» ترکیبی است که در آن «گوی» مفعولِ «آفرین» به‌شمار می‌آید.",
        wordInVerse: "گوی",
      },
    ],
  },
  {
    id: 8,
    title: "درِ هشتم",
    category: "دستوری",
    contentType: "poem",
    verseLines: [
      "ای روی تو آرام دل خلق جهانی،",
      "بی روی تو شاید که نبیند جهان را.",
    ],
    suspects: [
      {
        role: "منادا",
        isSpy: false,
        evidence: "«ای روی» ندا است؛ «روی» منادا و موردِ خطاب است.",
        wordInVerse: "روی",
      },
      {
        role: "مسند",
        isSpy: true,
        evidence: "«آرام» در این بیت نقشِ مسند را ندارد؛ او جاسوس بود!",
      },
      {
        role: "مضاف‌الیه",
        isSpy: false,
        evidence: "«خلق» در «آرامِ دلِ خلقِ جهان» مضاف‌الیه است.",
        wordInVerse: "خلق",
      },
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«جهان را» مفعولِ فعلِ «نبیند» است.",
        wordInVerse: "جهان را",
      },
    ],
  },
];

/** The levels that ship in the box — the fallback used until an admin
 *  creates the first level in the panel (table `jasoos_levels`). */
export const JASOOS_LEVELS: JasoosLevel[] = rawLevels.map((level) => ({
  ...level,
  suspects: shuffleSuspects(level.suspects, level.id),
}));

/** Shuffles a level's four suspects into a stable display order.
 *
 *  Deterministic on purpose: the same level must lay out identically on the
 *  server and on the client, or hydration mismatches. Levels coming from the
 *  database go through this too (lib/jasoos-content.ts) — otherwise the spy
 *  would always sit wherever the admin happened to type them. */
export function shuffleSuspects(
  suspects: [Suspect, Suspect, Suspect, Suspect],
  levelId: number,
): [Suspect, Suspect, Suspect, Suspect] {
  return seededShuffle(suspects, levelId * 7919) as [
    Suspect,
    Suspect,
    Suspect,
    Suspect,
  ];
}

// picks `count` levels at random for a run; called client-side after the
// player chooses a question count, so real randomness (not the deterministic
// seed above) is fine here — no SSR/hydration mismatch risk.
//
// `levels` is passed in rather than read from JASOOS_LEVELS: which levels a
// run draws from is now a server decision (the database, falling back to
// JASOOS_LEVELS when it holds nothing).
export function pickJasoosLevels(
  levels: JasoosLevel[],
  count: number,
): JasoosLevel[] {
  const shuffled = [...levels];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
