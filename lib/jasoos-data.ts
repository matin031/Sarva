export type SuspectRole =
  | "نهاد"
  | "متمم"
  | "مسند"
  | "مفعول"
  | "صفت"
  | "قید"
  | "تشبیه"
  | "استعاره"
  | "کنایه"
  | "تشخیص"
  | "مجاز";

export type JasoosCategory = "دستوری" | "آرایه";

export type Suspect = {
  role: SuspectRole;
  isSpy: boolean;
  evidence: string;
};

export type JasoosLevel = {
  id: number;
  title: string;
  category: JasoosCategory;
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
    verseLines: ["باغ ما در بهار،", "سرسبز و خرم گشت."],
    suspects: [
      { role: "نهاد", isSpy: false, evidence: "«باغ ما» نهادِ جمله است." },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«در بهار» نقشِ متمم را دارد.",
      },
      {
        role: "مسند",
        isSpy: false,
        evidence: "«سرسبز و خرم» پس از فعل ربطیِ «گشت»، مسند است.",
      },
      {
        role: "صفت",
        isSpy: true,
        evidence: "در این بیت هیچ صفتی به‌کار نرفته؛ او جاسوس بود!",
      },
    ],
  },
  {
    id: 2,
    title: "درِ دوم",
    category: "آرایه",
    verseLines: [
      "قامت او همچون سرو بود و دستش هرگز به بدی نرفت،",
      "باد صبحگاهان با گیسوی او نجوا می‌کرد.",
    ],
    suspects: [
      {
        role: "تشبیه",
        isSpy: false,
        evidence: "«قامت او همچون سرو»: قامت به سرو مانند شده است.",
      },
      {
        role: "کنایه",
        isSpy: false,
        evidence: "«دستش به بدی نرفت» کنایه از پاک‌دستی و درستکاری است.",
      },
      {
        role: "تشخیص",
        isSpy: false,
        evidence: "«باد ... نجوا می‌کرد»: رفتاری انسانی به باد نسبت داده شده.",
      },
      {
        role: "استعاره",
        isSpy: true,
        evidence:
          "در این بیت هیچ مشبه‌بهِ تنهایی جای مشبه ننشسته؛ استعاره‌ای در کار نیست. او جاسوس بود!",
      },
    ],
  },
  {
    id: 3,
    title: "درِ سوم",
    category: "دستوری",
    verseLines: ["پدربزرگ نامه‌ای را،", "برای دخترش نوشت."],
    suspects: [
      {
        role: "نهاد",
        isSpy: false,
        evidence: "«پدربزرگ» نهادِ جمله است.",
      },
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«نامه‌ای را» مفعولِ فعل «نوشت» است.",
      },
      {
        role: "متمم",
        isSpy: false,
        evidence: "«برای دخترش» نقشِ متمم را دارد.",
      },
      {
        role: "مسند",
        isSpy: true,
        evidence: "فعل «نوشت» ربطی نیست، پس مسندی وجود ندارد؛ او جاسوس بود!",
      },
    ],
  },
  {
    id: 4,
    title: "درِ چهارم",
    category: "آرایه",
    verseLines: [
      "سرو خرامان به باغ دل ما آمد،",
      "دستش به سوی بدی نرفت و دندانش چو مروارید بود.",
    ],
    suspects: [
      {
        role: "استعاره",
        isSpy: false,
        evidence:
          "«سرو خرامان به باغ دل ما آمد»: مشبه (معشوق) حذف شده و فقط مشبه‌به «سرو» مانده است.",
      },
      {
        role: "کنایه",
        isSpy: false,
        evidence: "«دستش به سوی بدی نرفت» کنایه از پاک‌دستی است.",
      },
      {
        role: "تشبیه",
        isSpy: false,
        evidence: "«دندانش چو مروارید بود»: دندان به مروارید مانند شده است.",
      },
      {
        role: "تشخیص",
        isSpy: true,
        evidence:
          "در این بیت به هیچ چیز بی‌جانی رفتار انسانی نسبت داده نشده؛ او جاسوس بود!",
      },
    ],
  },
  {
    id: 5,
    title: "درِ پنجم",
    category: "دستوری",
    verseLines: ["شاگرد باهوشِ کلاس،", "پاسخ را گفت."],
    suspects: [
      {
        role: "نهاد",
        isSpy: false,
        evidence: "«شاگرد باهوش» نهادِ جمله است.",
      },
      {
        role: "صفت",
        isSpy: false,
        evidence: "«باهوش» صفتِ «شاگرد» است.",
      },
      {
        role: "مفعول",
        isSpy: false,
        evidence: "«پاسخ را» مفعولِ فعل «گفت» است.",
      },
      {
        role: "قید",
        isSpy: true,
        evidence: "در این بیت هیچ قیدی به‌کار نرفته؛ او جاسوس بود!",
      },
    ],
  },
  {
    id: 6,
    title: "درِ ششم",
    category: "آرایه",
    verseLines: [
      "باد سحرگاه با شاخه‌های بید گفت‌وگو می‌کرد،",
      "قامت بلند او همچون صنوبر بود و دلش هرگز نلرزید.",
    ],
    suspects: [
      {
        role: "تشخیص",
        isSpy: false,
        evidence: "«باد با شاخه‌ها گفت‌وگو می‌کرد»: گفت‌وگو کاری انسانی است.",
      },
      {
        role: "تشبیه",
        isSpy: false,
        evidence: "«قامت بلند او همچون صنوبر»: قامت به صنوبر مانند شده است.",
      },
      {
        role: "کنایه",
        isSpy: false,
        evidence: "«دلش هرگز نلرزید» کنایه از نترسیدن و شجاعت است.",
      },
      {
        role: "مجاز",
        isSpy: true,
        evidence:
          "در این بیت واژه‌ای در معنای غیرِ حقیقیِ خود با رابطه‌ی غیرِ شباهت به‌کار نرفته؛ او جاسوس بود!",
      },
    ],
  },
];

export const JASOOS_LEVELS: JasoosLevel[] = rawLevels.map((level) => ({
  ...level,
  suspects: seededShuffle(level.suspects, level.id * 7919) as [
    Suspect,
    Suspect,
    Suspect,
    Suspect,
  ],
}));
