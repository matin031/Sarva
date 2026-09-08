"use server";

import { randomUUID } from "node:crypto";
import { query, queryOne, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";

export type AdminVocabWord = {
  id: string;
  word: string;
  meaning: string;
  image: string;
  sortIndex: number;
};

const GRADES = ["dahom", "yazdahom", "davazdahom"] as const;
type Grade = (typeof GRADES)[number];

function isGrade(g: string): g is Grade {
  return (GRADES as readonly string[]).includes(g);
}

type WordRow = { id: string; word: string; meaning: string; image: string | null; sort_index: number };

/** واژه‌های یک درس، برای فهرست پنل. */
export async function vocabAdminList(grade: string, lesson: number): Promise<AdminVocabWord[]> {
  await requireAdmin();
  if (!isGrade(grade)) throw new Error("پایهٔ نامعتبر است.");

  const rows = await query<WordRow>(
    `select id, word, meaning, image, sort_index
       from vocab_words
      where grade = ? and lesson = ?
      order by sort_index`,
    [grade, lesson],
  );

  return rows.map((r) => ({
    id: r.id,
    word: r.word,
    meaning: r.meaning,
    image: r.image ?? "",
    sortIndex: r.sort_index,
  }));
}

export type VocabWordInput = {
  id?: string; // اگر باشد یعنی ویرایش
  grade: string;
  lesson: number;
  word: string;
  meaning: string;
  image: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

/** ساخت واژهٔ تازه یا ویرایش واژهٔ موجود. */
export async function vocabAdminUpsert(input: VocabWordInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!isGrade(input.grade)) return { ok: false, error: "پایهٔ نامعتبر است." };
  if (!Number.isInteger(input.lesson) || input.lesson < 1 || input.lesson > 18) {
    return { ok: false, error: "شمارهٔ درس باید بین ۱ تا ۱۸ باشد." };
  }

  const word = input.word.trim();
  const meaning = input.meaning.trim();
  const image = input.image.trim();
  if (!word) return { ok: false, error: "واژه را وارد کنید." };
  if (!meaning) return { ok: false, error: "معنی را وارد کنید." };

  try {
    if (input.id) {
      const updated = await execute(
        `update vocab_words
            set grade = ?, lesson = ?, word = ?, meaning = ?, image = ?
          where id = ?`,
        [input.grade, input.lesson, word, meaning, image, input.id],
      );
      if (!updated) return { ok: false, error: "واژه پیدا نشد." };

      await recordAudit({
        actor: admin,
        action: "vocab.word_save",
        targetType: "vocab_word",
        targetId: input.id,
        summary: `واژهٔ «${word}» در درس ${input.lesson} ویرایش شد`,
        metadata: { grade: input.grade, lesson: input.lesson },
      });

      return { ok: true };
    }

    // واژهٔ تازه بعد از آخرین واژهٔ همین درس می‌نشیند.
    //
    // خواندن بیشترین sort_index و درج، در یک تراکنش‌اند: قبلاً دو درخواست جدا
    // بودند و دو افزودنِ همزمان می‌توانستند هر دو یک شماره بگیرند.
    await transaction(async (tx) => {
      await tx.execute(
        // جدولِ مشتق، به همان دلیلِ خطای ۱۰۹۳ که در ninja و pairs توضیح
        // داده شده.
        `insert into vocab_words (id, grade, lesson, word, meaning, image, sort_index)
         select ?, ?, ?, ?, ?, ?, coalesce(m, 0) + 1
           from (select max(sort_index) as m from vocab_words
                  where grade = ? and lesson = ?) t`,
        [randomUUID(), input.grade, input.lesson, word, meaning, image,
         input.grade, input.lesson],
      );
    });

    await recordAudit({
      actor: admin,
      action: "vocab.word_save",
      targetType: "vocab_word",
      summary: `واژهٔ «${word}» به درس ${input.lesson} اضافه شد`,
      metadata: { grade: input.grade, lesson: input.lesson },
    });

    return { ok: true };
  } catch (err) {
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "vocabAdminUpsert");
    return { ok: false, error: "ذخیرهٔ واژه ناموفق بود." };
  }
}

export async function vocabAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ واژه نامعتبر است.");

  // قبل از حذف خوانده می‌شود، وگرنه لاگ فقط یک uuid خواهد داشت.
  const target = await queryOne<{ word: string; grade: string; lesson: number }>(
    "select word, grade, lesson from vocab_words where id = ?",
    [id],
  );

  const deleted = await execute("delete from vocab_words where id = ?", [id]);
  if (!deleted) return { ok: false, error: "واژه پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "vocab.word_delete",
    targetType: "vocab_word",
    targetId: id,
    summary: target
      ? `واژهٔ «${target.word}» از درس ${target.lesson} حذف شد`
      : "یک واژه حذف شد",
    metadata: target ? { grade: target.grade, lesson: target.lesson } : {},
  });

  return { ok: true };
}
