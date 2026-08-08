"use server";

import { query, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

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
      where grade = $1 and lesson = $2
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
  await requireAdmin();

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
            set grade = $1, lesson = $2, word = $3, meaning = $4, image = $5
          where id = $6`,
        [input.grade, input.lesson, word, meaning, image, input.id],
      );
      if (!updated) return { ok: false, error: "واژه پیدا نشد." };
      return { ok: true };
    }

    // واژهٔ تازه بعد از آخرین واژهٔ همین درس می‌نشیند.
    //
    // خواندن بیشترین sort_index و درج، در یک تراکنش‌اند: قبلاً دو درخواست جدا
    // بودند و دو افزودنِ همزمان می‌توانستند هر دو یک شماره بگیرند.
    await transaction(async (tx) => {
      await tx.execute(
        `insert into vocab_words (grade, lesson, word, meaning, image, sort_index)
         values ($1, $2, $3, $4, $5,
                 coalesce((select max(sort_index) from vocab_words
                            where grade = $1 and lesson = $2), 0) + 1)`,
        [input.grade, input.lesson, word, meaning, image],
      );
    });

    return { ok: true };
  } catch (err) {
    console.error("[vocab] ذخیرهٔ واژه ناموفق بود:", err);
    return { ok: false, error: "ذخیرهٔ واژه ناموفق بود." };
  }
}

export async function vocabAdminDelete(id: string): Promise<ActionResult> {
  await requireAdmin();

  const deleted = await execute("delete from vocab_words where id = $1", [id]);
  if (!deleted) return { ok: false, error: "واژه پیدا نشد." };
  return { ok: true };
}
