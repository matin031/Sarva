/**
 * آزمونِ end-to-endِ تحلیلِ عمیق روی یک دیتابیس واقعی — `npm run db:check-insights`.
 *
 * ⚠️ چرا کنارِ `tests/plus/topics.test.ts` و نه به‌جایش: آن فایل *منطق* را
 * می‌سنجد (پنجره‌های زمانی، پله‌های وضعیت، وزنِ شاخص) و روی هر ماشینی سبز
 * می‌شود. چیزی که اینجا سنجیده می‌شود *رفتارِ دیتابیس* است، و آن کلاسِ
 * خطایی را می‌گیرد که `PREPARE` نمی‌بیند — همان که `AGENTS.md` «معتبر ولی
 * بی‌صدا غلط» می‌نامدش:
 *
 *   • `sum(is_correct = 1)` در mysql2 **رشته** برمی‌گردد، نه عدد. بدونِ
 *     `Number()` جمعِ دو سطل می‌شد `"3" + "4" = "34"`.
 *   • `exam_attempts.question_results` در MariaDB **رشته** برمی‌گردد و در
 *     MySQL شیء. کدی که فقط روی یکی امتحان شده، روی آن یکی بی‌صدا یک
 *     تحلیلِ **خالی** می‌دهد که شبیهِ «کاربر هنوز آزمون نداده» است.
 *   • نگاشتِ «شمارهٔ سؤال → قلمرو» به `exam_id` وابسته است. اگر اشتباه
 *     نوشته شود، نمره‌ها به قلمروِ غلط می‌نشینند و همه‌چیز طبیعی به نظر
 *     می‌رسد.
 *
 * ⚠️ فقط روی دیتابیسِ توسعه. همه‌چیز با پیشوندِ `chkins` ساخته و در پایان
 * پاک می‌شود.
 */
process.loadEnvFile(".env.local");

import { randomUUID } from "node:crypto";

import { execute, query } from "@/lib/db";
import { getConfusions, getErrorShape, getExamTopics, getVocabTopics } from "@/lib/plus/insights";

const TAG = "chkins";
let failures = 0;
let checks = 0;

function ok(label: string, condition: boolean, detail = ""): void {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** `daysAgo` روز پیش، به شکلی که MySQL در `DATETIME(6)` می‌پذیرد. */
function ago(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
}

async function main(): Promise<void> {
  const userId = randomUUID();
  const examId = randomUUID();

  await execute(`insert into users (id, email, full_name) values (?, ?, ?)`, [
    userId,
    `${TAG}-${userId}@example.invalid`,
    `${TAG} tester`,
  ]);

  try {
    /* ── قلمروهای آزمون ───────────────────────────────────────────── */
    await execute(`insert into exams (id, subject, grade, title) values (?, ?, ?, ?)`, [
      examId,
      "فارسی",
      12,
      `${TAG} آزمون`,
    ]);

    const sectionA = randomUUID();
    const sectionB = randomUUID();
    await execute(
      `insert into exam_sections (id, exam_id, title, order_index, section_score)
       values (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)`,
      [sectionA, examId, "قلمرو زبانی", 0, 8, sectionB, examId, "قلمرو ادبی", 1, 8],
    );

    /* شماره‌گذاری در برگه پیوسته است: ۱و۲ زبانی، ۳و۴ ادبی. */
    for (const [id, section, number] of [
      [randomUUID(), sectionA, 1],
      [randomUUID(), sectionA, 2],
      [randomUUID(), sectionB, 3],
      [randomUUID(), sectionB, 4],
    ] as [string, string, number][]) {
      await execute(
        `insert into exam_questions (id, exam_section_id, number, order_index)
         values (?, ?, ?, ?)`,
        [id, section, number, number],
      );
    }

    /* ⚠️ شکلِ *امروزیِ* ذخیره‌سازی (`parts`) و نه `{score,max}` — نمرهٔ سؤال
       از جمعِ بخش‌ها درمی‌آید و خواندنِ `raw.score` رویش صفر می‌دهد. */
    const results = {
      1: { number: 1, parts: [{ score: 1, maxScore: 4, status: "partial" }] },
      2: { number: 2, parts: [{ score: 1, maxScore: 4, status: "partial" }] },
      3: { number: 3, parts: [{ score: 4, maxScore: 4, status: "correct" }] },
      4: { number: 4, parts: [{ score: 3, maxScore: 4, status: "partial" }] },
    };
    await execute(
      `insert into exam_attempts (id, user_id, exam_id, total_score, max_score, question_results, answers)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId, examId, 9, 16, JSON.stringify(results), "{}"],
    );

    const examTopics = await getExamTopics(userId);
    const linguistic = examTopics.find((t) => t.label === "قلمرو زبانی");
    const literary = examTopics.find((t) => t.label === "قلمرو ادبی");

    ok("هر دو قلمرو ساخته شدند", examTopics.length === 2, `${examTopics.length}`);
    ok(
      "نمرهٔ «قلمرو زبانی» ۲ از ۸ است",
      linguistic?.evidence === 8 && Math.round(linguistic.accuracy * 100) === 25,
      `${linguistic?.accuracy}`,
    );
    ok("«قلمرو زبانی» ضعیف است", linguistic?.status === "weak");
    ok(
      "نمرهٔ «قلمرو ادبی» ۷ از ۸ است",
      literary?.evidence === 8 && Math.round(literary.accuracy * 100) === 88,
      `${literary?.accuracy}`,
    );
    ok("«قلمرو ادبی» خوب است", literary?.status === "strong");

    /* ── واژگان به تفکیکِ درس ─────────────────────────────────────── */
    for (let i = 0; i < 10; i++) {
      await execute(
        `insert into vocab_answers (id, user_id, grade, lesson, word, meaning, is_correct)
         values (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), userId, "davazdahom", 5, `واژه${i}`, "معنی", i < 3 ? 1 : 0],
      );
    }
    // درسی با شواهدِ کم — نباید بیاید.
    await execute(
      `insert into vocab_answers (id, user_id, grade, lesson, word, meaning, is_correct)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId, "davazdahom", 9, "تک", "معنی", 0],
    );

    const vocabTopics = await getVocabTopics(userId);
    ok("فقط درسِ پرشاهد آمده", vocabTopics.length === 1, `${vocabTopics.length}`);
    ok(
      "۳ از ۱۰ درست — و عدد رشته نشده",
      vocabTopics[0]?.evidence === 10 && Math.round(vocabTopics[0].accuracy * 100) === 30,
      `${vocabTopics[0]?.accuracy}`,
    );
    ok(
      "برچسبِ درس از کاتالوگ آمده",
      vocabTopics[0]?.label.startsWith("دوازدهم · درس 5"),
      vocabTopics[0]?.label,
    );

    /* ── الگوی اشتباه‌ها ──────────────────────────────────────────── */
    for (let i = 0; i < 3; i++) {
      await execute(
        `insert into aruz_bridge_answers
           (id, user_id, phrase, correct_pattern, chosen_pattern, outcome, is_correct, answered_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), userId, "عبارت", "مفاعیلن", "مفتعلن", "wrong", 0, ago(3)],
      );
    }
    // یک اشتباهِ تک — زیرِ حدِ «الگو».
    await execute(
      `insert into aruz_bridge_answers
         (id, user_id, phrase, correct_pattern, chosen_pattern, outcome, is_correct, answered_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId, "عبارت", "فعولن", "فاعلن", "wrong", 0, ago(3)],
    );

    const confusions = await getConfusions(userId);
    ok("فقط اشتباهِ تکرارشونده آمده", confusions.length === 1, `${confusions.length}`);
    ok(
      "جهتِ اشتباه درست است (درست → انتخابِ کاربر)",
      confusions[0]?.expected === "مفاعیلن" && confusions[0]?.chosen === "مفتعلن",
      `${confusions[0]?.expected} → ${confusions[0]?.chosen}`,
    );
    ok("تعداد ۳ است و رشته نیست", confusions[0]?.times === 3, `${confusions[0]?.times}`);

    /* ── جنسِ خطا در کیمیا ────────────────────────────────────────── */
    /* ⚠️ ستون‌های تلاش با هم می‌آیند و جدول با CHECK وادارشان می‌کند:
       دورِ آزموده‌شده باید `attempts_count`، `first_selected`،
       `last_selected` و `answered_at` را **با هم** پر داشته باشد، و دورِ
       رهاشده هر چهار را خالی. همان قاعده‌ای که مانع ثبتِ آمارِ کج می‌شود. */
    const kimia = async (errorType: string | null) =>
      execute(
        `insert into kimia_rounds
           (id, user_id, verse, meter_ark, meter_name, slot_count, attempts_count,
            first_selected, first_correct, first_error_type,
            last_selected, last_correct, last_error_type, answered_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        errorType === null
          ? [randomUUID(), userId, "بیت", "فاعلاتن فاعلاتن فاعلن", "رمل", 3, 0,
             null, null, null, null, null, null, null]
          : [randomUUID(), userId, "بیت", "فاعلاتن فاعلاتن فاعلن", "رمل", 3, 1,
             "فاعلن فاعلاتن فاعلاتن", 0, errorType,
             "فاعلن فاعلاتن فاعلاتن", 0, errorType, ago(2)],
      );

    for (let i = 0; i < 4; i++) await kimia("ORDER_ONLY");
    await kimia("FOOT_CONTENT");
    // دورِ رهاشده — هیچ‌وقت آزمایش نشد، پس شاهد نیست و نباید شمرده شود.
    await kimia(null);

    const shape = await getErrorShape(userId);
    ok("۵ خطا شمرده شد و دورِ رهاشده کنار ماند", shape?.total === 5, `${shape?.total}`);
    ok("۴ خطای ترتیب و ۱ خطای ارکان", shape?.orderOnly === 4 && shape?.footContent === 1);

    /* ── کاربرِ بی‌داده ───────────────────────────────────────────── */
    const empty = randomUUID();
    await execute(`insert into users (id, email, full_name) values (?, ?, ?)`, [
      empty,
      `${TAG}-${empty}@example.invalid`,
      `${TAG} empty`,
    ]);
    try {
      ok("کاربرِ بی‌کارنامه، فهرستِ خالی می‌گیرد", (await getExamTopics(empty)).length === 0);
      ok("کاربرِ بی‌واژه، فهرستِ خالی می‌گیرد", (await getVocabTopics(empty)).length === 0);
      ok("کاربرِ بی‌خطا، null می‌گیرد", (await getErrorShape(empty)) === null);
    } finally {
      await execute(`delete from users where id = ?`, [empty]);
    }
  } finally {
    /* ⚠️ کاربر آخر پاک می‌شود و بقیه با `on delete cascade` می‌روند؛
       آزمون جدا نمی‌ماند حتی اگر وسطِ کار شکسته باشد. */
    await execute(`delete from users where id = ?`, [userId]);
    await execute(`delete from exams where id = ?`, [examId]);

    const leftovers = await query<{ n: number }>(
      `select count(*) as n from users where email like ?`,
      [`${TAG}-%`],
    );
    ok("هیچ دادهٔ آزمونی باقی نماند", Number(leftovers[0]?.n ?? 0) === 0);
  }

  console.log(`\n${checks - failures} از ${checks} بررسی سالم.`);
  if (failures > 0) process.exitCode = 1;
}

void main().then(
  () => process.exit(process.exitCode ?? 0),
  (err: unknown) => {
    console.error(err);
    process.exit(1);
  },
);
