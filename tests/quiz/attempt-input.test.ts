import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

/**
 * شکلِ ورودیِ `/api/v1/quiz/attempt`.
 *
 * ⚠️ این تست‌ها یک سوءاستفادهٔ واقعی را نگه می‌دارند که بسته شد:
 *
 * آرایهٔ پاسخ‌ها همان‌طور که می‌رسید ثبت می‌شد. فرستادن *یک* سؤالِ درست
 * به‌صورت ۲۰۰ ردیفِ تکراری یک دورِ «۲۰۰ از ۲۰۰» می‌ساخت — روی سرورِ در حال
 * اجرا آزموده شد و دقیقاً `{"total":200,"correct":200}` برگرداند. آمار پنل
 * از همین ردیف‌ها ساخته می‌شود.
 *
 * شِما اینجا آینهٔ همان چیزی است که در route نوشته شده. اگر روزی آنجا عوض
 * شد و اینجا نه، این تست‌ها دیگر چیزی را تضمین نمی‌کنند — ولی شِما عمداً
 * کوچک است تا هم‌گام نگه داشتنش آسان باشد.
 */
const answersSchema = z
  .array(
    z.object({
      questionId: z.uuid(),
      selectedOptionId: z.uuid().nullable(),
    }),
  )
  .min(1, "حداقل یک پاسخ لازم است")
  .max(200, "تعداد پاسخ‌ها بیش از حد است")
  .superRefine((answers, ctx) => {
    const seen = new Set<string>();
    for (const a of answers) {
      if (seen.has(a.questionId)) {
        ctx.addIssue({ code: "custom", message: "هر سؤال فقط یک بار می‌تواند در یک دور بیاید." });
        return;
      }
      seen.add(a.questionId);
    }
  });

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const OPT = "33333333-3333-4333-8333-333333333333";

describe("ورودیِ دورِ عروض سماعی", () => {
  test("یک سؤالِ تکراری ۲۰۰ باره رد می‌شود", () => {
    const answers = Array.from({ length: 200 }, () => ({
      questionId: A,
      selectedOptionId: OPT,
    }));
    const r = answersSchema.safeParse(answers);
    assert.equal(r.success, false);
    assert.match(r.error!.issues[0].message, /فقط یک بار/);
  });

  test("حتی دو تکرار هم رد می‌شود", () => {
    const r = answersSchema.safeParse([
      { questionId: A, selectedOptionId: OPT },
      { questionId: A, selectedOptionId: null },
    ]);
    assert.equal(r.success, false);
  });

  test("سؤال‌های متفاوت پذیرفته می‌شوند", () => {
    const r = answersSchema.safeParse([
      { questionId: A, selectedOptionId: OPT },
      { questionId: B, selectedOptionId: null },
    ]);
    assert.equal(r.success, true);
  });

  test("دورِ خالی رد می‌شود", () => {
    assert.equal(answersSchema.safeParse([]).success, false);
  });

  test("بیش از ۲۰۰ پاسخ رد می‌شود", () => {
    const answers = Array.from({ length: 201 }, (_, i) => ({
      // شناسه‌های یکتا، تا این بار فقط سقفِ تعداد سنجیده شود
      questionId: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
      selectedOptionId: null,
    }));
    assert.equal(answersSchema.safeParse(answers).success, false);
  });

  test("درست تا مرزِ ۲۰۰ پاسخِ یکتا پذیرفته می‌شود", () => {
    const answers = Array.from({ length: 200 }, (_, i) => ({
      questionId: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
      selectedOptionId: null,
    }));
    assert.equal(answersSchema.safeParse(answers).success, true);
  });

  test("شناسهٔ بدشکل رد می‌شود", () => {
    const r = answersSchema.safeParse([{ questionId: "not-a-uuid", selectedOptionId: null }]);
    assert.equal(r.success, false);
  });
});
