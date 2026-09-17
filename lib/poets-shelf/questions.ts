/* ═══════════════════════════════════════════════════════════════════════════
   محتوای «قفسهٔ شاعران» — پدیدآورنده‌ها و آثارشان.
   ═══════════════════════════════════════════════════════════════════════════

   پرسش همیشه یک *پدیدآورنده* است و گزینه‌ها *اثر*. بازیکن باید اثری را
   انتخاب کند که از آنِ اوست.

   ⚠️ چرا فهرست اینجاست و نه در پایگاه داده.

   بقیهٔ بازی‌های سروا (جفت‌های ادبی، نینجا) محتوایشان را از پایگاه داده
   می‌گیرند تا از پنل قابلِ ویرایش باشد. این بازی هنوز در فازِ پایه است و
   افزودنِ جدول و کنشِ ادمین یعنی دست‌زدن به بک‌اند — دقیقاً کاری که این فاز
   نباید بکند.

   پس ساختار عمداً *همان شکلی* است که یک بارگذارِ پایگاه داده روزی برمی‌گرداند
   (`PoetsShelfContent`)، و `buildRound` هیچ فرضی دربارهٔ منبع نمی‌کند. وصل‌کردنِ
   پایگاه داده در آینده یعنی عوض‌کردنِ همین یک ثابت، نه بازنویسیِ بازی. */

export interface Author {
  id: string;
  name: string;
  /** برای نمایشِ کمکی در HUD و بازخوردِ پاسخ. */
  era: string;
}

export interface Work {
  id: string;
  title: string;
  authorId: string;
}

export interface PoetsShelfContent {
  authors: Author[];
  works: Work[];
}

const AUTHORS: Author[] = [
  { id: "ferdowsi", name: "فردوسی", era: "سدهٔ چهارم" },
  { id: "saadi", name: "سعدی", era: "سدهٔ هفتم" },
  { id: "hafez", name: "حافظ", era: "سدهٔ هشتم" },
  { id: "molavi", name: "مولوی", era: "سدهٔ هفتم" },
  { id: "nezami", name: "نظامی گنجوی", era: "سدهٔ ششم" },
  { id: "attar", name: "عطار نیشابوری", era: "سدهٔ ششم" },
  { id: "beyhaghi", name: "ابوالفضل بیهقی", era: "سدهٔ پنجم" },
  { id: "keikavus", name: "عنصرالمعالی کیکاووس", era: "سدهٔ پنجم" },
  { id: "khayyam", name: "خیام", era: "سدهٔ پنجم" },
  { id: "naserkhosro", name: "ناصرخسرو", era: "سدهٔ پنجم" },
  { id: "sanai", name: "سنایی غزنوی", era: "سدهٔ ششم" },
  { id: "jami", name: "جامی", era: "سدهٔ نهم" },
  { id: "varavini", name: "سعدالدین وراوینی", era: "سدهٔ هفتم" },
  { id: "gorgani", name: "فخرالدین اسعد گرگانی", era: "سدهٔ پنجم" },
  { id: "aruzi", name: "نظامی عروضی", era: "سدهٔ ششم" },
  { id: "ansari", name: "خواجه عبدالله انصاری", era: "سدهٔ پنجم" },
  { id: "parvin", name: "پروین اعتصامی", era: "سدهٔ چهاردهم" },
  { id: "nima", name: "نیما یوشیج", era: "سدهٔ چهاردهم" },
  { id: "sohrab", name: "سهراب سپهری", era: "سدهٔ چهاردهم" },
  { id: "akhavan", name: "مهدی اخوان ثالث", era: "سدهٔ چهاردهم" },
  { id: "hedayat", name: "صادق هدایت", era: "سدهٔ چهاردهم" },
  { id: "daneshvar", name: "سیمین دانشور", era: "سدهٔ چهاردهم" },
  { id: "jamalzadeh", name: "محمدعلی جمال‌زاده", era: "سدهٔ چهاردهم" },
  { id: "shahriar", name: "شهریار", era: "سدهٔ چهاردهم" },
];

const WORKS: Work[] = [
  { id: "shahnameh", title: "شاهنامه", authorId: "ferdowsi" },
  { id: "golestan", title: "گلستان", authorId: "saadi" },
  { id: "bustan", title: "بوستان", authorId: "saadi" },
  { id: "divan-hafez", title: "دیوان حافظ", authorId: "hafez" },
  { id: "masnavi", title: "مثنوی معنوی", authorId: "molavi" },
  { id: "divan-shams", title: "دیوان شمس", authorId: "molavi" },
  { id: "fihe-ma-fih", title: "فیه ما فیه", authorId: "molavi" },
  { id: "khamse", title: "خمسه", authorId: "nezami" },
  { id: "leyli-majnun", title: "لیلی و مجنون", authorId: "nezami" },
  { id: "khosro-shirin", title: "خسرو و شیرین", authorId: "nezami" },
  { id: "manteq", title: "منطق‌الطیر", authorId: "attar" },
  { id: "tazkerat", title: "تذکرةالاولیا", authorId: "attar" },
  { id: "tarikh-beyhaghi", title: "تاریخ بیهقی", authorId: "beyhaghi" },
  { id: "qabusnameh", title: "قابوس‌نامه", authorId: "keikavus" },
  { id: "robaiyat", title: "رباعیات", authorId: "khayyam" },
  { id: "safarnameh", title: "سفرنامه", authorId: "naserkhosro" },
  { id: "hadiqe", title: "حدیقةالحقیقه", authorId: "sanai" },
  { id: "baharestan", title: "بهارستان", authorId: "jami" },
  { id: "haft-owrang", title: "هفت اورنگ", authorId: "jami" },
  { id: "marzbannameh", title: "مرزبان‌نامه", authorId: "varavini" },
  { id: "veys-ramin", title: "ویس و رامین", authorId: "gorgani" },
  { id: "chahar-maqale", title: "چهار مقاله", authorId: "aruzi" },
  { id: "monajat", title: "مناجات‌نامه", authorId: "ansari" },
  { id: "divan-parvin", title: "دیوان پروین", authorId: "parvin" },
  { id: "afsaneh", title: "افسانه", authorId: "nima" },
  { id: "hasht-ketab", title: "هشت کتاب", authorId: "sohrab" },
  { id: "seda-pa-ab", title: "صدای پای آب", authorId: "sohrab" },
  { id: "zemestan", title: "زمستان", authorId: "akhavan" },
  { id: "buf-kur", title: "بوف کور", authorId: "hedayat" },
  { id: "savushun", title: "سووشون", authorId: "daneshvar" },
  { id: "yeki-bud", title: "یکی بود یکی نبود", authorId: "jamalzadeh" },
  { id: "heydar-baba", title: "حیدربابا", authorId: "shahriar" },
];

export const poetsShelfContent: PoetsShelfContent = { authors: AUTHORS, works: WORKS };

/* ── ساختِ دور ─────────────────────────────────────────────────────────── */

export interface RoundOption {
  work: Work;
  correct: boolean;
}

export interface Round {
  author: Author;
  options: RoundOption[];
  /** اثرِ درست — برای صفحهٔ بازخورد، بدونِ جست‌وجوی دوباره. */
  answer: Work;
}

/** مولدِ عددِ تصادفی که می‌شود جایش را گرفت.
 *  آزمون‌ها یک مولدِ قطعی می‌دهند و همان دورِ هر بار یکسان را می‌گیرند. */
export type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface BuildRoundOptions {
  optionCount: number;
  rng?: Rng;
  /** شناسهٔ پدیدآورنده‌هایی که تازه آمده‌اند — برای پرهیز از تکرارِ پشتِ‌هم. */
  avoidAuthorIds?: readonly string[];
  content?: PoetsShelfContent;
}

/**
 * یک دور می‌سازد: یک پدیدآورنده، یک اثرِ درست، و بقیه از پدیدآورنده‌های *دیگر*.
 *
 * ⚠️ نکتهٔ اصلی: گزینه‌های نادرست بر اساسِ `authorId` کنار گذاشته می‌شوند و
 * نه بر اساسِ `work.id`. اگر بر اساسِ اثر بود، دورِ «مولوی» می‌توانست هم
 * «مثنوی» و هم «دیوان شمس» را نشان بدهد — یعنی دو پاسخِ درست و یک بازیِ
 * خراب. این تنها قاعده‌ای است که نباید شکسته شود.
 */
export function buildRound({
  optionCount,
  rng = Math.random,
  avoidAuthorIds = [],
  content = poetsShelfContent,
}: BuildRoundOptions): Round {
  const byAuthor = new Map<string, Work[]>();
  for (const work of content.works) {
    const list = byAuthor.get(work.authorId);
    if (list) list.push(work);
    else byAuthor.set(work.authorId, [work]);
  }

  const eligible = content.authors.filter((a) => byAuthor.has(a.id));
  if (eligible.length < 2) throw new Error("قفسهٔ شاعران: دستِ‌کم دو پدیدآورنده لازم است.");

  /* پرهیز از تکرار «نرم» است: اگر همهٔ پدیدآورنده‌ها تازه آمده باشند، باز هم
     یک دور ساخته می‌شود. یک بازیِ تکراری بهتر از یک بازیِ متوقف است. */
  const fresh = eligible.filter((a) => !avoidAuthorIds.includes(a.id));
  const pool = fresh.length ? fresh : eligible;
  const author = pool[Math.floor(rng() * pool.length)];

  const own = byAuthor.get(author.id)!;
  const answer = own[Math.floor(rng() * own.length)];

  const distractors = shuffle(
    content.works.filter((w) => w.authorId !== author.id),
    rng,
  ).slice(0, Math.max(0, optionCount - 1));

  const options = shuffle(
    [{ work: answer, correct: true }, ...distractors.map((work) => ({ work, correct: false }))],
    rng,
  );

  return { author, options, answer };
}
