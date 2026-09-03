import type { JasoosLevel } from "@/lib/jasoos-data";

/**
 * تصمیمِ ثبتِ یک پاسخ در بازی جاسوس — جدا از route تا تست‌پذیر باشد.
 *
 * ⚠️ چرا اصلاً وجود دارد:
 *
 * تا دیروز `/api/v1/jasoos/answer` هم `chosenRole` و هم `correctRole` را از
 * کلاینت می‌گرفت و `is_correct` را از مقایسهٔ همان دو حساب می‌کرد. یعنی هر دو
 * طرفِ مقایسه دستِ کسی بود که پاسخ می‌داد: یک درخواست با
 * `chosenRole = correctRole` همیشه یک پاسخِ «درست» ثبت می‌کرد. دستهٔ سؤال و
 * دو مصراعِ بیت هم متنِ آزاد بودند.
 *
 * حالا تنها ورودی‌ها «کدام پرونده» و «چه کسی را زدی» هستند و بقیه از خودِ
 * پرونده درمی‌آید. این تابع همان استخراج است.
 *
 * (واژه‌یاب عمداً این‌طور نشد — آنجا گزینه‌ها در مرورگر ساخته می‌شوند و هیچ‌جا
 *  ثبت نمی‌شوند، پس سرور مرجعی برای مقایسه ندارد. توضیحش بالای
 *  `app/api/v1/vocab/answer/route.ts` است.)
 */

export type JasoosAnswerResolution =
  | { ok: true; row: {
      levelId: number;
      category: string;
      verseLine1: string;
      verseLine2: string;
      chosenRole: string;
      correctRole: string;
      isCorrect: boolean;
    } }
  | { ok: false; reason: "unknown_level" | "broken_level" | "role_not_in_level" };

export function resolveJasoosAnswer(
  levels: JasoosLevel[],
  levelId: number,
  chosenRole: string,
): JasoosAnswerResolution {
  const level = levels.find((l) => l.id === levelId);
  if (!level) return { ok: false, reason: "unknown_level" };

  const spy = level.suspects.find((s) => s.isSpy);
  // سطحی بدون جاسوس یعنی دادهٔ خراب؛ ثبتِ پاسخ برایش بی‌معنی است.
  if (!spy) return { ok: false, reason: "broken_level" };

  // نقشِ انتخاب‌شده باید یکی از همان چهار مظنونِ همین پرونده باشد — وگرنه
  // ردیفی ثبت می‌شود که به هیچ انتخابِ ممکنی در بازی مربوط نیست.
  if (!level.suspects.some((s) => s.role === chosenRole)) {
    return { ok: false, reason: "role_not_in_level" };
  }

  return {
    ok: true,
    row: {
      levelId: level.id,
      category: level.category,
      verseLine1: level.verseLines[0],
      verseLine2: level.verseLines[1],
      chosenRole,
      correctRole: spy.role,
      isCorrect: chosenRole === spy.role,
    },
  };
}
