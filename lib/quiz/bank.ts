import "server-only";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import type { Question } from "@/app/quiz/page";
import { placeholders, query } from "@/lib/db";
import { memo } from "@/lib/cache/memo";
import { PUBLIC_TTL_MS, publicKey } from "@/lib/cache/public";

/**
 * بانکِ سؤالِ «آزمون وزن شعر» (/quiz).
 *
 * تا پیش از این، خودِ صفحه همهٔ سؤال‌ها را می‌خواند و در HTML می‌گذاشت. با
 * ۱۱۳۹ سؤال و ۴۵۵۶ گزینه، هر بازدید حدود ۱٫۴ مگابایت HTML (۳۱۸ کیلوبایت فشرده)
 * می‌ساخت و سریالایز کردنش کلِ پروسه را می‌گرفت: زیرِ ۵۰ کاربرِ هم‌زمان فقط ۷
 * درخواست در ثانیه، با میانهٔ تأخیرِ ۵ ثانیه.
 *
 * حالا صفحه فقط پوسته است و بانک از `/api/v1/quiz/bank` می‌آید:
 *   • روی سرور یک بار در دقیقه خوانده، *یک بار* به JSON تبدیل و فشرده
 *     می‌شود (`quizBankPayload`) و همان بایت‌ها به همه داده می‌شوند.
 *   • مرورگر هم نگهش می‌دارد، پس بازگشت به آزمون دوباره دانلودش نمی‌کند.
 *
 * ⚠️ آزمونِ دبیر (`?assignment=`) همچنان از `loadQuestions(ids)` در خودِ
 * صفحه می‌خواند — آن فقط چند سؤال است و به کاربر وابسته.
 */

type Row = {
  id: string;
  type: string;
  poem: string[] | null;
  audio_url: string | null;
  option_id: string | null;
  option_label: string | null;
  option_poem: string[] | null;
  option_audio_url: string | null;
  option_is_correct: boolean | null;
  option_x: number | null;
};

export async function loadQuestions(ids?: readonly string[]): Promise<Question[]> {
  // یک JOIN به‌جای کوئری تودرتوی PostgREST. ترتیب گزینه‌ها با x و بعد id
  // تثبیت شده تا چیدمان بین بارگذاری‌ها نپرد — قبلاً ترتیبی تعریف نشده بود و
  // به هرچه دیتابیس برمی‌گرداند وابسته بود.
  if (ids && ids.length === 0) return [];
  const rows = await query<Row>(
    `select q.id, q.type, q.poem, q.audio_url,
            o.id as option_id, o.label as option_label, o.poem as option_poem,
            o.audio_url as option_audio_url, o.is_correct as option_is_correct, o.x as option_x
       from questions q
       left join question_options o on o.question_id = q.id
      ${ids ? `where q.id in (${placeholders(ids.length)})` : ""}
      order by q.created_at, q.id, o.x, o.id`,
    ids ? [...ids] : [],
  );

  const byQuestion = new Map<string, Question>();

  for (const r of rows) {
    let question = byQuestion.get(r.id);
    if (!question) {
      question = {
        id: r.id,
        type: r.type as Question["type"],
        poem: r.poem ?? undefined,
        audioSrc: r.audio_url ?? undefined,
        options: [],
      };
      byQuestion.set(r.id, question);
    }

    // left join یعنی سؤالِ بی‌گزینه هم یک ردیف با ستون‌های null می‌دهد؛
    // نباید به یک گزینهٔ خالی تبدیل شود.
    if (r.option_id) {
      question.options.push({
        id: r.option_id,
        label: r.option_label ?? undefined,
        poem: r.option_poem ?? undefined,
        audioSrc: r.option_audio_url ?? undefined,
        isCorrect: r.option_is_correct ?? false,
        x: r.option_x ?? 30,
      });
    }
  }

  return [...byQuestion.values()];
}

export type QuizBankPayload = {
  /** JSONِ خام، برای کلاینتی که فشرده‌سازی نمی‌پذیرد. */
  json: Uint8Array<ArrayBuffer>;
  /** همان، gzip شده. */
  gzip: Uint8Array<ArrayBuffer>;
  etag: string;
};

/**
 * کلِ بانک، آمادهٔ ارسال: یک بار JSON، یک بار gzip، یک ETag.
 *
 * ⚠️ چرا فشرده‌سازی اینجا و نه جای دیگر: Next پاسخِ صفحه‌ها را gzip می‌کند
 * ولی پاسخِ Route Handler ها را *نه* (اندازه گرفته شد: بدونِ
 * Content-Encoding). این بانک حدود یک مگابایت JSON است؛ فشرده‌اش حدود ۱۰۰
 * کیلوبایت. سپردنش به سرورِ جلویی هم قابلِ اتکا نیست — Caddy در داکر فشرده
 * می‌کند ولی روی هاستِ cPanel معلوم نیست. و فشرده کردنِ یک مگابایت در *هر*
 * درخواست خودش گلوگاهِ CPU می‌شد؛ اینجا هر پروسه دقیقه‌ای یک بار این کار را
 * می‌کند.
 */
export function quizBankPayload(): Promise<QuizBankPayload> {
  return memo(publicKey("quiz", "bank"), PUBLIC_TTL_MS.content, async () => {
    const json = new TextEncoder().encode(
      JSON.stringify({ ok: true, data: { questions: await loadQuestions() } }),
    );
    return {
      json,
      gzip: new Uint8Array(gzipSync(json)),
      etag: `"${createHash("sha1").update(json).digest("base64url")}"`,
    };
  });
}
