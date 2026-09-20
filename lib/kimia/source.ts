"use client";

import { apiPost } from "@/lib/api/client";
import type { FootKey, KimiaRound, KimiaVerdict } from "./types";

/** خطای قابلِ نمایش — بازی باید بتواند صادقانه بگوید چه شد. */
export class KimiaSourceError extends Error {}

/**
 * ⚠️ هیچ عقب‌نشینی‌ای به دادهٔ ساختگی ندارد، به همان دلیلی که
 * `lib/role-hunt/source.ts` و `lib/grammar-circuit/source.ts` ندارند:
 * تمرینی که دانش‌آموز فکر کند محتوای درسی است ولی نباشد — و در عروض یعنی
 * تقطیعِ حدسی — از یک پیام خطا بدتر است.
 */
export async function startKimiaRound(
  exclude: readonly string[],
  signal?: AbortSignal,
): Promise<KimiaRound> {
  const result = await apiPost<{ round: KimiaRound; persisted: boolean }>(
    "/api/v1/kimia/rounds",
    { exclude: exclude.slice(-32) },
  );
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  if (!result.ok) {
    throw new KimiaSourceError(result.errors.join(" ") || "شروعِ آزمایش ممکن نشد.");
  }
  return result.data.round;
}

/**
 * ثبتِ یک «آزمایش ترکیب».
 *
 * ⚠️ `attemptId` را *فراخواننده* می‌سازد و نه این تابع، و این تفاوت مهم
 * است: تلاشِ دوبارهٔ شبکه باید همان شناسه را بفرستد (تا دوبار شمرده نشود)
 * و تلاشِ دوبارهٔ کاربر باید شناسهٔ تازه بفرستد (تا واقعاً شمرده شود). اگر
 * شناسه اینجا ساخته می‌شد، هر retry یک تلاشِ تازه می‌شد و آمار با هر
 * لرزشِ شبکه باد می‌کرد.
 */
export async function submitKimiaAttempt(input: {
  roundId: string;
  questionId: string;
  attemptId: string;
  selected: readonly FootKey[];
  responseMs: number | null;
}): Promise<KimiaVerdict> {
  const result = await apiPost<KimiaVerdict>("/api/v1/kimia/attempts", {
    roundId: input.roundId,
    questionId: input.questionId,
    attemptId: input.attemptId,
    selected: [...input.selected],
    responseMs: input.responseMs,
  });
  if (!result.ok) {
    throw new KimiaSourceError(result.errors.join(" ") || "نتیجه ثبت نشد؛ دوباره امتحان کن.");
  }
  return result.data;
}

/* ═══════════════════════════════════════════════════════════════════════════
   تزریقِ منبع — فقط برای پیش‌نمایشِ توسعه
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ این *عقب‌نشینی به دادهٔ ساختگی نیست* و نباید بشود. مسیرِ واقعیِ بازی
   همیشه `liveKimiaSource` است و هیچ شرطی — نه متغیرِ محیطی، نه پارامترِ
   آدرس، نه `NODE_ENV` — آن را عوض نمی‌کند. تنها راهِ دادنِ منبعِ دیگر این
   است که *فراخواننده* صریحاً یکی بدهد، و تنها فراخوانندهٔ این‌کار
   `app/game/kimia/preview` است که در production اصلاً رندر نمی‌شود.

   دلیلِ وجودش: بدونِ دیتابیسِ محلی، تنها راهِ دیدن و تنظیمِ انیمیشن‌ها
   همین است — و بدیلش (یک کپیِ دوم از صحنه در یک فایلِ HTML) یعنی همان
   چیزی که این بازطراحی از آن فرار می‌کند: دو نسخه از یک بازی.
   ═══════════════════════════════════════════════════════════════════════════ */

export type KimiaAttemptInput = {
  roundId: string;
  questionId: string;
  attemptId: string;
  selected: readonly FootKey[];
  responseMs: number | null;
};

export type KimiaSource = {
  startRound(exclude: readonly string[]): Promise<KimiaRound>;
  submitAttempt(input: KimiaAttemptInput): Promise<KimiaVerdict>;
};

export const liveKimiaSource: KimiaSource = {
  startRound: (exclude) => startKimiaRound(exclude),
  submitAttempt: (input) => submitKimiaAttempt(input),
};
