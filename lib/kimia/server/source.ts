import "server-only";
import { query, queryOne } from "@/lib/db";
import { screenRow, screenRows, type KimiaCandidate, type KimiaSourceRow, type PoolDiagnostics } from "../pool";

/* ═══════════════════════════════════════════════════════════════════════════
   خواندنِ نامزدها — از دو منبعِ جدا.
   ═══════════════════════════════════════════════════════════════════════════

   ۱) بانکِ عروضِ سماعی (`questions`) — مشترک با «آزمون وزن شعر». کیمیا فقط
      *می‌خواندش*؛ هیچ‌چیز از این بازی در آن نوشته نمی‌شود.
   ۲) `kimia_verses` — بیت‌هایی که فقط برای کیمیا آمده‌اند (migration ۰۲۵).
      هیچ بازیِ دیگری این جدول را نمی‌خواند، پس هر چه اینجا باشد واردِ آزمون،
      «کوتاه یا بلند؟» یا «پلِ وزن» نمی‌شود.

   ⚠️ دو کوئریِ جدا و نه یک `union all`: ستون‌های دو جدول نوع و collation ِ
   یکسان ندارند (`poem` در یکی JSON است و در دیگری دو ستونِ متنی)، و
   `union` روی collation‌های ناهمسان در MySQL خطای «Illegal mix» می‌دهد.

   ⚠️ فقط گزینهٔ *درست* ِ بانکِ عروض join می‌شود (`o.is_correct = 1`).
   گزینه‌های نادرستِ آن بازی اینجا هیچ معنایی ندارند.

   ⚠️ `order by rand()` + `limit` جایگزینِ «کلِ مخزن را بخوان و در حافظه
   نمونه بگیر» است: هر منبع حدودِ هزار ردیف است و `rand()` روی این اندازه
   ارزان است. ولی ردیفِ برگشته ممکن است از غربال رد نشود، پس یک *دسته*
   گرفته می‌شود و اولین نامزدهای معتبرش برداشته می‌شوند.
   ═══════════════════════════════════════════════════════════════════════════ */

const BANK_COLUMNS = `
         q.id            as id,
         q.type          as type,
         q.poem          as poem,
         q.audio_url     as audio_url,
         o.poem          as option_poem,
         o.audio_url     as option_audio_url`;

const BANK_FROM = `
    from questions q
    join question_options o
      on o.question_id = q.id
     and o.is_correct = 1
   where q.type in ('audio-to-poem', 'poem-to-audio')`;

type VerseRow = { id: string; line_1: string; line_2: string; meter_ark: string };

const VERSE_COLUMNS = `v.id as id, v.line_1 as line_1, v.line_2 as line_2, v.meter_ark as meter_ark`;
const VERSE_FROM = `from kimia_verses v where v.is_published = 1`;

/**
 * ردیفِ `kimia_verses` → همان شکلی که بیت‌های بانکِ عروض دارند.
 *
 * ⚠️ عمداً از مسیرِ `screenRow` رد می‌شود و نه یک غربالِ دوم: «وزن صدا دارد؟
 * در جدولِ اوزان هست؟ چند رکن؟» یک قاعده است و باید در یک جا بماند. آدرسِ
 * صدا فقط برای همین غربال ساخته می‌شود و هیچ‌وقت به مرورگر نمی‌رود.
 */
function verseToRow(row: VerseRow): KimiaSourceRow {
  return {
    id: row.id,
    source: "kimia",
    type: "poem-to-audio",
    poem: [row.line_1, row.line_2],
    audio_url: null,
    option_poem: null,
    option_audio_url: `/audio/${row.meter_ark.trim().replace(/\s+/g, "-")}.mp3`,
  };
}

function notIn(column: string, ids: readonly string[]): string {
  return ids.length > 0 ? ` and ${column} not in (${ids.map(() => "?").join(", ")})` : "";
}

/** Fisher–Yates. ترتیبِ دو دسته نباید «اول همهٔ بانک، بعد همهٔ کیمیا» باشد. */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * چند نامزد را تصادفی می‌آورد و غربال می‌کند.
 *
 * `exclude` شناسهٔ پرسش‌هایی است که همین نشست قبلاً دیده. ⚠️ آمدنش از
 * مرورگر بی‌خطر است: بدترین کاری که یک درخواستِ دستکاری‌شده می‌تواند بکند
 * این است که تکرارِ بیشتری ببیند.
 *
 * ⚠️ از هر منبع یک دستهٔ تصادفیِ هم‌اندازه گرفته و بعد درهم ریخته می‌شود؛
 * یعنی هر دور تقریباً به یک اندازه ممکن است از هر منبع بیاید. دو منبع امروز
 * هم‌اندازه‌اند (~۱۱۰۰ و ~۱۲۰۰) و این سادگی ارزشِ یک کوئریِ شمارشِ اضافه در
 * هر دور را ندارد.
 */
export async function pickCandidates(
  count: number,
  exclude: readonly string[] = [],
): Promise<KimiaCandidate[]> {
  const want = Math.min(Math.max(count, 1), 12);
  /* سه برابرِ نیاز خوانده می‌شود تا ردهای غربال جبران شوند. */
  const fetch = Math.min(want * 3 + 6, 64);
  const excluded = exclude.slice(0, 64);

  /* ⚠️ هر کوئری فهرستِ `excluded` ِ خودش را می‌گیرد: جای‌نگهدارهای `?`
     موضعی‌اند و مقدارِ تکراری باید دوباره فرستاده شود (AGENTS.md). */
  const [bank, verses] = await Promise.all([
    query<KimiaSourceRow>(
      `select ${BANK_COLUMNS} ${BANK_FROM}${notIn("q.id", excluded)}
       order by rand()
       limit ?`,
      [...excluded, fetch],
    ),
    query<VerseRow>(
      `select ${VERSE_COLUMNS} ${VERSE_FROM}${notIn("v.id", excluded)}
       order by rand()
       limit ?`,
      [...excluded, fetch],
    ),
  ]);

  const rows = shuffle([...bank, ...verses.map(verseToRow)]);
  const out: KimiaCandidate[] = [];
  for (const row of rows) {
    const screened = screenRow(row);
    if (screened.ok) out.push(screened.candidate);
    if (out.length === want) break;
  }
  return out;
}

/**
 * یک پرسشِ مشخص → نامزد، یا `null`.
 *
 * ⚠️ این تابع مرجعِ *داوری* است: سرور هنگامِ سنجشِ پاسخ، ارکانِ درست را از
 * همین‌جا می‌گیرد و نه از بدنهٔ درخواست.
 *
 * شناسه‌ها UUID‌اند و دو منبع هیچ‌وقت شناسهٔ مشترک ندارند، پس اول بانکِ عروض
 * و بعد `kimia_verses` نگاه می‌شود.
 */
export async function candidateById(questionId: string): Promise<KimiaCandidate | null> {
  const bank = await queryOne<KimiaSourceRow>(
    `select ${BANK_COLUMNS} ${BANK_FROM} and q.id = ? limit 1`,
    [questionId],
  );
  if (bank) {
    const screened = screenRow(bank);
    return screened.ok ? screened.candidate : null;
  }

  const verse = await queryOne<VerseRow>(
    `select ${VERSE_COLUMNS} ${VERSE_FROM} and v.id = ? limit 1`,
    [questionId],
  );
  if (!verse) return null;
  const screened = screenRow(verseToRow(verse));
  return screened.ok ? screened.candidate : null;
}

/**
 * سنجه‌های کاملِ مخزن — هر دو منبع، برای اسکریپت و گزارش.
 *
 * ⚠️ کلِ هر دو جدول را می‌خواند و برای همین *فقط* از اسکریپت صدا زده می‌شود
 * و نه از مسیرِ بازی.
 */
export async function poolDiagnostics(): Promise<PoolDiagnostics> {
  const [bank, verses] = await Promise.all([
    query<KimiaSourceRow>(`select ${BANK_COLUMNS} ${BANK_FROM} order by q.id`),
    query<VerseRow>(`select ${VERSE_COLUMNS} ${VERSE_FROM} order by v.id`),
  ]);
  return screenRows([...bank, ...verses.map(verseToRow)]).diagnostics;
}
