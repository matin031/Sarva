"use server";

import { query, queryOne, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import {
  isMemoryGrade,
  isMemoryTerm,
  memoryGradeTitle,
  memoryTermTitle,
  type MemoryGrade,
  type MemoryTerm,
} from "@/lib/literary-pairs";

export type AdminMemoryPair = {
  id: string;
  work: string;
  author: string;
  sortIndex: number;
};

/** شمارِ جفت‌های هر دسته، برای نشان دادن «این آزمون چند کارت دارد» کنار
 *  دکمه‌های انتخاب پایه و نوبت. */
export type MemoryDeckCounts = Record<string, number>;

type ActionResult = { ok: true } | { ok: false; error: string };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code?: string }).code === UNIQUE_VIOLATION;
}

function deckKey(grade: string, term: string) {
  return `${grade}:${term}`;
}

function readDeck(grade: string, term: string): { grade: MemoryGrade; term: MemoryTerm } {
  if (!isMemoryGrade(grade)) throw new Error("پایهٔ نامعتبر است.");
  if (!isMemoryTerm(term)) throw new Error("نوبت نامعتبر است.");
  return { grade, term };
}

type PairRow = { id: string; work: string; author: string; sort_index: number };

/** جفت‌های یک دسته (پایه + نوبت)، به ترتیبی که مدیر چیده. */
export async function pairsAdminList(
  grade: string,
  term: string,
): Promise<AdminMemoryPair[]> {
  await requireAdmin();
  const deck = readDeck(grade, term);

  const rows = await query<PairRow>(
    `select id, work, author, sort_index
       from memory_pairs
      where grade = $1 and term = $2
      order by sort_index, work`,
    [deck.grade, deck.term],
  );

  return rows.map((r) => ({
    id: r.id,
    work: r.work,
    author: r.author,
    sortIndex: r.sort_index,
  }));
}

/** شمارِ همهٔ شش دسته با یک کوئری — تا پنل بدون شش رفت‌وبرگشت بداند کجا خالی است. */
export async function pairsAdminCounts(): Promise<MemoryDeckCounts> {
  await requireAdmin();

  const rows = await query<{ grade: string; term: string; n: number }>(
    `select grade, term, count(*)::int as n
       from memory_pairs
      group by grade, term`,
  );

  const counts: MemoryDeckCounts = {};
  for (const r of rows) counts[deckKey(r.grade, r.term)] = r.n;
  return counts;
}

export type MemoryPairInput = {
  id?: string; // اگر باشد یعنی ویرایش
  grade: string;
  term: string;
  work: string;
  author: string;
};

/** ساخت جفت تازه یا ویرایش جفت موجود. */
export async function pairsAdminUpsert(input: MemoryPairInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!isMemoryGrade(input.grade)) return { ok: false, error: "پایهٔ نامعتبر است." };
  if (!isMemoryTerm(input.term)) return { ok: false, error: "نوبت نامعتبر است." };

  const work = input.work.trim();
  const author = input.author.trim();
  if (!work) return { ok: false, error: "نام اثر را وارد کنید." };
  if (!author) return { ok: false, error: "نام پدیدآورنده را وارد کنید." };
  if (work.length > 120 || author.length > 120) {
    return { ok: false, error: "نام اثر و پدیدآورنده نباید بیشتر از ۱۲۰ نویسه باشد." };
  }

  const where = `${memoryGradeTitle(input.grade)} — ${memoryTermTitle(input.term)}`;

  try {
    if (input.id) {
      const id = uuidArg(input.id, "شناسهٔ جفت نامعتبر است.");
      const updated = await execute(
        `update memory_pairs
            set grade = $1, term = $2, work = $3, author = $4
          where id = $5`,
        [input.grade, input.term, work, author, id],
      );
      if (!updated) return { ok: false, error: "این جفت پیدا نشد." };

      await recordAudit({
        actor: admin,
        action: "pairs.pair_save",
        targetType: "memory_pair",
        targetId: id,
        summary: `جفتِ «${work} ← ${author}» در ${where} ویرایش شد`,
        metadata: { grade: input.grade, term: input.term },
      });

      return { ok: true };
    }

    // جفت تازه بعد از آخرین جفتِ همین دسته می‌نشیند. خواندنِ بیشترین sort_index
    // و درج در یک تراکنش‌اند تا دو افزودنِ همزمان یک شماره نگیرند.
    await transaction(async (tx) => {
      await tx.execute(
        `insert into memory_pairs (grade, term, work, author, sort_index)
         values ($1, $2, $3, $4,
                 coalesce((select max(sort_index) from memory_pairs
                            where grade = $1 and term = $2), 0) + 1)`,
        [input.grade, input.term, work, author],
      );
    });

    await recordAudit({
      actor: admin,
      action: "pairs.pair_save",
      targetType: "memory_pair",
      summary: `جفتِ «${work} ← ${author}» به ${where} اضافه شد`,
      metadata: { grade: input.grade, term: input.term },
    });

    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `«${work}» از قبل در ${where} هست.` };
    }
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "pairsAdminUpsert");
    return { ok: false, error: "ذخیرهٔ جفت ناموفق بود." };
  }
}

/**
 * افزودنِ گروهی از یک متنِ چندخطی.
 *
 * وارد کردنِ بیست جفت یکی‌یکی با فرم، بیست بار پر کردن و ذخیره کردن است. اینجا
 * هر خط یک جفت است و جداکننده هر کدام از `|`، `-`، `—`، `←` یا tab می‌تواند
 * باشد — چون کسی که فهرستش را از Word یا اکسل کپی می‌کند، نمی‌داند ما کدام را
 * انتظار داریم.
 *
 * خط‌های خراب باعث شکستِ کل عملیات نمی‌شوند؛ شمارشان برگردانده می‌شود تا پنل
 * دقیقاً بگوید چند خط رد شد و چرا.
 */
export type BulkAddResult =
  | { ok: true; added: number; skipped: number; duplicates: number }
  | { ok: false; error: string };

const PAIR_SEPARATOR = /\s*(?:\||\t|—|–|←|<-|-{1,2})\s*/;

export async function pairsAdminBulkAdd(input: {
  grade: string;
  term: string;
  text: string;
}): Promise<BulkAddResult> {
  const admin = await requireAdmin();

  if (!isMemoryGrade(input.grade)) return { ok: false, error: "پایهٔ نامعتبر است." };
  if (!isMemoryTerm(input.term)) return { ok: false, error: "نوبت نامعتبر است." };

  const lines = input.text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "متنی برای افزودن وارد نشده." };
  if (lines.length > 200) return { ok: false, error: "هر بار حداکثر ۲۰۰ خط." };

  const parsed: { work: string; author: string }[] = [];
  let skipped = 0;

  for (const line of lines) {
    const parts = line.split(PAIR_SEPARATOR).map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 2 || parts[0].length > 120 || parts[1].length > 120) {
      skipped++;
      continue;
    }
    parsed.push({ work: parts[0], author: parts[1] });
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      error: "هیچ خطی خوانده نشد. هر خط باید «نام اثر | نام پدیدآورنده» باشد.",
    };
  }

  try {
    // on conflict do nothing به‌جای خطا: در یک فهرستِ کپی‌شده، تکراری بودنِ یک
    // خط دلیلی نیست که نوزده خطِ دیگر هم وارد نشوند.
    const added = await transaction(async (tx) => {
      let inserted = 0;
      let next =
        (
          await tx.queryOne<{ max: number }>(
            `select coalesce(max(sort_index), 0) as max
               from memory_pairs where grade = $1 and term = $2`,
            [input.grade, input.term],
          )
        )?.max ?? 0;

      for (const p of parsed) {
        next++;
        inserted += await tx.execute(
          `insert into memory_pairs (grade, term, work, author, sort_index)
           values ($1, $2, $3, $4, $5)
           on conflict (grade, term, work) do nothing`,
          [input.grade, input.term, p.work, p.author, next],
        );
      }
      return inserted;
    });

    const where = `${memoryGradeTitle(input.grade)} — ${memoryTermTitle(input.term)}`;
    await recordAudit({
      actor: admin,
      action: "pairs.pair_save",
      targetType: "memory_pair",
      summary: `${added} جفت به‌صورت گروهی به ${where} اضافه شد`,
      metadata: { grade: input.grade, term: input.term, added, skipped },
    });

    return { ok: true, added, skipped, duplicates: parsed.length - added };
  } catch (err) {
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "pairsAdminBulkAdd");
    return { ok: false, error: "افزودن گروهی ناموفق بود." };
  }
}

export async function pairsAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ جفت نامعتبر است.");

  // قبل از حذف خوانده می‌شود، وگرنه لاگ فقط یک uuid خواهد داشت.
  const target = await queryOne<{ work: string; author: string; grade: string; term: string }>(
    "select work, author, grade, term from memory_pairs where id = $1",
    [id],
  );

  const deleted = await execute("delete from memory_pairs where id = $1", [id]);
  if (!deleted) return { ok: false, error: "این جفت پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "pairs.pair_delete",
    targetType: "memory_pair",
    targetId: id,
    summary: target
      ? `جفتِ «${target.work} ← ${target.author}» حذف شد`
      : "یک جفت ادبی حذف شد",
    metadata: target ? { grade: target.grade, term: target.term } : {},
  });

  return { ok: true };
}
