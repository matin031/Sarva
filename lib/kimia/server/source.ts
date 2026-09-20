import "server-only";
import { query, queryOne } from "@/lib/db";
import { screenRow, screenRows, type KimiaCandidate, type KimiaSourceRow, type PoolDiagnostics } from "../pool";

/* ═══════════════════════════════════════════════════════════════════════════
   خواندنِ نامزدها از بانکِ عروضِ سماعی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ فقط گزینهٔ *درست* join می‌شود (`o.is_correct = 1`). گزینه‌های نادرستِ
   آن بازی اینجا هیچ معنایی ندارند و آوردنشان یعنی چهار برابر ردیف برای
   دور ریختن.

   ⚠️ `limit 1` به‌همراهِ `order by rand()` عمدی است و جایگزینِ «کلِ مخزن
   را بخوان و در حافظه نمونه بگیر»: مخزن هزار و اندی ردیف است و خواندنِ
   همه‌اش در هر دور، هم پهنای باندِ دیتابیس است و هم یک کپیِ کاملِ بانکِ
   پاسخ در حافظهٔ فرایند. `rand()` روی این اندازه ارزان است.

   ⚠️ ولی `limit 1` تنها کافی نیست: ردیفِ برگشته ممکن است از غربال رد نشود
   (وزنی که فایلِ صوتی ندارد، بیتِ ناقص). پس یک *دسته* گرفته می‌شود و
   اولین نامزدِ معتبرش برداشته می‌شود — یک رفت‌وبرگشت، نه یک حلقهٔ تلاش.
   ═══════════════════════════════════════════════════════════════════════════ */

const SELECT_COLUMNS = `
         q.id            as id,
         q.type          as type,
         q.poem          as poem,
         q.audio_url     as audio_url,
         o.poem          as option_poem,
         o.audio_url     as option_audio_url`;

const FROM_JOIN = `
    from questions q
    join question_options o
      on o.question_id = q.id
     and o.is_correct = 1
   where q.type in ('audio-to-poem', 'poem-to-audio')`;

/**
 * چند نامزد را تصادفی می‌آورد و غربال می‌کند.
 *
 * `exclude` شناسهٔ پرسش‌هایی است که همین نشست قبلاً دیده. ⚠️ آمدنش از
 * مرورگر بی‌خطر است: بدترین کاری که یک درخواستِ دستکاری‌شده می‌تواند بکند
 * این است که تکرارِ بیشتری ببیند.
 */
export async function pickCandidates(
  count: number,
  exclude: readonly string[] = [],
): Promise<KimiaCandidate[]> {
  const want = Math.min(Math.max(count, 1), 12);
  /* سه برابرِ نیاز خوانده می‌شود تا ردهای غربال جبران شوند. روی مخزنِ
     امروز (~۹۷٪ قبولی) خیلی بیشتر از کافی است و سقفش هم کوچک می‌ماند. */
  const fetch = Math.min(want * 3 + 6, 64);

  const excluded = exclude.slice(0, 64);
  const notIn =
    excluded.length > 0
      ? ` and q.id not in (${excluded.map(() => "?").join(", ")})`
      : "";

  const rows = await query<KimiaSourceRow>(
    `select ${SELECT_COLUMNS} ${FROM_JOIN}${notIn}
     order by rand()
     limit ?`,
    [...excluded, fetch],
  );

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
 * همین‌جا می‌گیرد و نه از بدنهٔ درخواست. یعنی حتی اگر کسی کنسول را باز کند
 * و `expected` بفرستد، هیچ اثری ندارد چون هیچ‌کس آن را نمی‌خواند.
 */
export async function candidateById(questionId: string): Promise<KimiaCandidate | null> {
  const row = await queryOne<KimiaSourceRow>(
    `select ${SELECT_COLUMNS} ${FROM_JOIN} and q.id = ? limit 1`,
    [questionId],
  );
  if (!row) return null;
  const screened = screenRow(row);
  return screened.ok ? screened.candidate : null;
}

/**
 * سنجه‌های کاملِ مخزن — برای `npm run db:check-kimia` و گزارش.
 *
 * ⚠️ کلِ بانک را می‌خواند و برای همین *فقط* از اسکریپت صدا زده می‌شود و
 * نه از مسیرِ بازی.
 */
export async function poolDiagnostics(): Promise<PoolDiagnostics> {
  const rows = await query<KimiaSourceRow>(
    `select ${SELECT_COLUMNS} ${FROM_JOIN} order by q.id`,
  );
  return screenRows(rows).diagnostics;
}
