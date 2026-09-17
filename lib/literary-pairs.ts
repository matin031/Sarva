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
export type LiteraryPair = {
  work: string;
  author: string;
  /** نشانیِ نگارهٔ این جفت — خالی یعنی هنوز نگاره‌ای ندارد. */
  image?: string;
};

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
  /** نگارهٔ جفت — روی هر دو کارتِ یک جفت یکسان است. */
  image: string;
};


/** بیشترین جفت در یک «دست».
 *
 *  ⚠️ این عدد از ۱۵ به ۶ آمد، و تغییرش یک تنظیمِ سلیقه‌ای نیست.
 *
 *  پانزده جفت یعنی سی کارت: زمینی که روی موبایل یک‌جا دیده نمی‌شود و دوری
 *  که آن‌قدر طول می‌کشد که نیمه‌کاره رها شود. شش جفت یعنی دوازده کارت — سه
 *  ردیفِ چهارتایی، یک صفحه، یک نفس.
 *
 *  و «بقیهٔ دسته چه می‌شود» جوابِ تازه‌ای گرفت: به‌جای اینکه هر دور یک
 *  زیرمجموعهٔ تصادفی باشد و باقی جفت‌ها شانسی دیده شوند، کلِ دسته به چند
 *  **دستِ پشتِ‌هم** تقسیم می‌شود. ← memoryRoundSizes */
export const MEMORY_ROUND_PAIRS = 6;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * یک دسته با `total` جفت، به چند دست و هرکدام با چند جفت.
 *
 * ⚠️ دست‌ها **هم‌اندازه** بسته می‌شوند و نه «شش‌تا شش‌تا تا هرچه ماند».
 *
 * هجده جفت در هر دو حالت سه دست است، ولی هفت جفت با تقسیمِ ساده می‌شد
 * ۶ + ۱: یک دستِ کامل و بعد یک دستِ تک‌جفتی که نه بازی است و نه آزمون.
 * تقسیمِ متوازن همان را ۴ + ۳ می‌کند. `splitEvenly` باقی‌مانده را بین
 * دست‌های اول پخش می‌کند، پس هیچ دستی بیش از یکی از بقیه کوچک‌تر نیست.
 *
 * ⚠️ و هر اندازه‌ای پذیرفته نمی‌شود: اگر تقسیمِ متوازن دستی بسازد که
 * زمینش ردیفِ ناقص بدهد، یک دستِ بیشتر امتحان می‌شود. قاعدهٔ «کارتِ تنها
 * ممنوع» بالاتر از تعدادِ دست‌هاست.
 */
export function memoryRoundSizes(total: number): number[] {
  const n = Math.max(0, Math.floor(total));
  if (n === 0) return [];

  for (let rounds = Math.ceil(n / MEMORY_ROUND_PAIRS); rounds < n; rounds++) {
    // دو نامزد با *همان* تعداد دست: تقسیمِ متوازن، و پر کردنِ دست‌ها تا سقف
    // و ریختنِ باقی در آخری. هیچ‌کدام همیشه بهتر نیست —
    //   ۷ جفت:  متوازن ۴+۳   ولی پرکردن ۶+۱  (دستِ تک‌جفتی، بی‌معنا)
    //   ۱۰ جفت: متوازن ۵+۵   ولی پرکردن ۶+۴  (هر دو زمینِ چهارستونی)
    // پس هر دو ساخته می‌شوند و کم‌هزینه‌ترین برنده است.
    const candidates = [splitEvenly(n, rounds), splitToFull(n, rounds)];
    const usable = candidates.filter((s) => s.length === rounds && s.every(fitsMemoryGrid));
    if (usable.length === 0) continue;

    return usable.reduce((best, s) => (sizeCost(s) < sizeCost(best) ? s : best));
  }
  // نگهبانِ آخر: هر دست یک جفت. دو کارت همیشه یک ردیفِ کامل است، پس این
  // شاخه هرگز ردیفِ ناقص نمی‌دهد — و عملاً هم هرگز به آن نمی‌رسیم.
  return splitEvenly(n, n);
}

function splitEvenly(total: number, rounds: number): number[] {
  const base = Math.floor(total / rounds);
  const extra = total % rounds;
  return Array.from({ length: rounds }, (_, i) => base + (i < extra ? 1 : 0));
}

/** دست‌ها تا سقف پر می‌شوند و باقی‌مانده دستِ آخر است. */
function splitToFull(total: number, rounds: number): number[] {
  const rest = total - MEMORY_ROUND_PAIRS * (rounds - 1);
  if (rest < 1) return [];
  return [...Array.from({ length: rounds - 1 }, () => MEMORY_ROUND_PAIRS), rest];
}

/** هزینهٔ یک اندازه، از نگاهِ کسی که زمین را می‌بیند.
 *
 *  شش و چهار جفت هر دو زمینِ چهارستونی می‌دهند و بی‌هزینه‌اند. پنج و سه
 *  کار می‌کنند ولی ستون‌بندیِ دیگری دارند، پس در یک نشست کنارِ دستِ
 *  شش‌تایی ناهماهنگ به نظر می‌رسند. یک و دو جفت اصلاً «دست» نیستند: چهار
 *  کارت را کسی به‌خاطر نمی‌سپارد، نگاه می‌کند. */
const SIZE_COST: Record<number, number> = { 1: 6, 2: 5, 3: 1, 4: 0, 5: 1, 6: 0 };

function sizeCost(sizes: number[]): number {
  return sizes.reduce((sum, s) => sum + (SIZE_COST[s] ?? 0), 0);
}

/** آیا دستی با `pairs` جفت، زمینی با ردیف‌های پر می‌سازد؟ */
export function fitsMemoryGrid(pairs: number): boolean {
  const cards = pairs * 2;
  const { base, wide } = memoryGridColumns(cards);
  return fillsRows(cards, base) && fillsRows(cards, wide);
}

/**
 * دسته را به دست‌های این نشست تقسیم می‌کند.
 *
 * ⚠️ این یک **افراز** است و نه چند نمونه‌گیریِ مستقل: کل دسته یک بار بُر
 * می‌خورد و بعد تکه‌تکه می‌شود، پس هر جفت دقیقاً در یکی از دست‌ها می‌آید.
 *
 * دلیلش مستقیماً آموزشی است: وقتی به دانش‌آموز می‌گوییم «این آزمون سه دست
 * است»، آن جمله فقط وقتی راست است که سه دست *همهٔ* آزمون باشند. با
 * نمونه‌گیریِ تصادفی ممکن بود یک جفت سه بار بیاید و جفتِ دیگری هیچ‌وقت.
 */
export function buildMemoryRounds(pairs: LiteraryPair[]): LiteraryPair[][] {
  const shuffled = shuffle(pairs);
  const rounds: LiteraryPair[][] = [];
  let at = 0;
  for (const size of memoryRoundSizes(shuffled.length)) {
    rounds.push(shuffled.slice(at, at + size));
    at += size;
  }
  return rounds;
}

/** کارت‌های یک دست: هر جفت دو کارت — اثر و پدیدآورنده — بُرخورده.
 *
 *  اینجا دیگر هیچ چیزی کنار گذاشته نمی‌شود؛ اندازهٔ دست را
 *  `buildMemoryRounds` از قبل تعیین کرده است. */
export function buildMemoryDeck(pairs: LiteraryPair[]): MemoryCard[] {
  const cards: MemoryCard[] = [];
  pairs.forEach((p, pairId) => {
    // تصویر روی *هر دو* کارتِ یک جفت می‌نشیند، نه فقط کارتِ پدیدآورنده: صفحهٔ
    // مرور جفت‌ها را از روی همین دسته بازسازی می‌کند، و این‌طور هر کدام از دو
    // کارت که اول دیده شود، نگاره‌اش را همراه دارد.
    cards.push({ id: pairId * 2, pairId, kind: "work", text: p.work, image: p.image ?? "" });
    cards.push({ id: pairId * 2 + 1, pairId, kind: "author", text: p.author, image: p.image ?? "" });
  });
  return shuffle(cards);
}

/** آیا `cardCount` کارت در `cols` ستون، ردیف‌های پر می‌سازد؟
 *
 *  یک ردیفِ ناقص وقتی *تنها ردیف* است اشکالی ندارد — چهار کارت در شش ستون
 *  یک خطِ کوتاه است، نه یک دُمِ سرگردان. */
function fillsRows(cardCount: number, cols: number): boolean {
  return cardCount % cols === 0 || cardCount <= cols;
}

/** چند ستون برای زمینی با `cardCount` کارت — روی موبایل (`base`) و روی صفحهٔ
 *  بزرگ (`wide`).
 *
 *  کارت نسبتِ ۳:۴ خودش را نگه می‌دارد و با زیاد شدنِ ستون‌ها فقط کوچک‌تر
 *  می‌شود. */
export function memoryGridColumns(cardCount: number): { base: number; wide: number } {
  const wide = fitColumns(cardCount, 3, 6);
  return { base: fitColumns(cardCount, 2, Math.min(4, wide)), wide };
}

/** نزدیک‌ترین ستون‌بندی به یک زمینِ مربع — ولی **فقط از میان مقسوم‌علیه‌های**
 *  تعداد کارت.
 *
 *  ⚠️ نسخهٔ پیشین برعکس کار می‌کرد: اول عددِ مربع‌ساز را حساب می‌کرد و بعد
 *  «اگر ارزان بود» آن را به یک مقسوم‌علیه هُل می‌داد. یعنی راگی بودنِ ردیفِ
 *  آخر یک خروجیِ ممکن بود. حالا نیست؛ و چون `memoryRoundPairs` تعداد کارت را
 *  طوری انتخاب می‌کند که همیشه مقسوم‌علیهِ خوبی داشته باشد، آن `ideal` انتهای
 *  تابع فقط برای دسته‌های خیلی کوچک می‌ماند (مثلاً دو کارت، که یک ردیفِ
 *  کوتاه است و نه یک دُم).
 *
 *  گره‌ها به نفعِ ستونِ بیشتر باز می‌شوند، یعنی ردیفِ کمتر. */
function fitColumns(cardCount: number, min: number, max: number): number {
  const ideal = Math.min(max, Math.max(min, Math.round(Math.sqrt(cardCount * 1.4))));

  let best: number | null = null;
  for (let c = min; c <= max; c++) {
    if (cardCount % c !== 0) continue;
    if (
      best === null ||
      Math.abs(c - ideal) < Math.abs(best - ideal) ||
      (Math.abs(c - ideal) === Math.abs(best - ideal) && c > best)
    ) {
      best = c;
    }
  }

  return best ?? ideal;
}
