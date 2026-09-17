"use server";

import { randomUUID } from "node:crypto";
import { query, queryOne, execute, transaction, isUniqueViolation } from "@/lib/db";
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
  /** نشانیِ نگاره — رشتهٔ خالی یعنی این جفت هنوز نگاره‌ای ندارد. */
  image: string;
  sortIndex: number;
};

/** شمارِ جفت‌های هر دسته، برای نشان دادن «این آزمون چند کارت دارد» کنار
 *  دکمه‌های انتخاب پایه و نوبت. */
export type MemoryDeckCounts = Record<string, number>;

type ActionResult = { ok: true } | { ok: false; error: string };

function deckKey(grade: string, term: string) {
  return `${grade}:${term}`;
}

function readDeck(grade: string, term: string): { grade: MemoryGrade; term: MemoryTerm } {
  if (!isMemoryGrade(grade)) throw new Error("پایهٔ نامعتبر است.");
  if (!isMemoryTerm(term)) throw new Error("نوبت نامعتبر است.");
  return { grade, term };
}

type PairRow = {
  id: string;
  work: string;
  author: string;
  image: string;
  sort_index: number;
};

/** حداکثر طولِ نشانیِ نگاره — همان چیزی که ستونِ `image` جا می‌دهد. */
const MAX_IMAGE_URL = 512;

type ImageCheck = { ok: true; image: string } | { ok: false; error: string };

/**
 * نشانیِ نگاره را می‌پذیرد یا با دلیل رد می‌کند.
 *
 * ⚠️ فهرستِ سفیدِ طرح (`scheme`) اینجا تزئینی نیست. این رشته بی‌هیچ واسطه‌ای
 * در `<img src>` می‌نشیند، و `javascript:` یا `data:text/html` در همان جا یک
 * بردارِ اجرا است. پس فقط سه شکل پذیرفته می‌شود: خالی، مسیرِ نسبیِ خودِ سایت
 * (`/uploads/…` که خروجیِ آپلود است)، و http(s) برای نگاره‌ای که جای دیگری
 * میزبانی می‌شود.
 */
function readImage(value: string | undefined): ImageCheck {
  const image = (value ?? "").trim();
  if (!image) return { ok: true, image: "" };
  if (image.length > MAX_IMAGE_URL) {
    return { ok: false, error: `نشانی تصویر نباید بیشتر از ${MAX_IMAGE_URL} نویسه باشد.` };
  }
  if (image.startsWith("/") && !image.startsWith("//")) return { ok: true, image };
  if (/^https?:\/\//i.test(image)) return { ok: true, image };
  return { ok: false, error: "نشانی تصویر باید با / یا http(s):// شروع شود." };
}

/** جفت‌های یک دسته (پایه + نوبت)، به ترتیبی که مدیر چیده. */
export async function pairsAdminList(
  grade: string,
  term: string,
): Promise<AdminMemoryPair[]> {
  await requireAdmin();
  const deck = readDeck(grade, term);

  const rows = await query<PairRow>(
    `select id, work, author, image, sort_index
       from memory_pairs
      where grade = ? and term = ?
      order by sort_index, work`,
    [deck.grade, deck.term],
  );

  return rows.map((r) => ({
    id: r.id,
    work: r.work,
    author: r.author,
    image: r.image,
    sortIndex: r.sort_index,
  }));
}

/** شمارِ همهٔ شش دسته با یک کوئری — تا پنل بدون شش رفت‌وبرگشت بداند کجا خالی است. */
export async function pairsAdminCounts(): Promise<MemoryDeckCounts> {
  await requireAdmin();

  const rows = await query<{ grade: string; term: string; n: number }>(
    `select grade, term, count(*) as n
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
  /** نشانیِ نگاره؛ نبودنش یعنی «خالی»، نه «دست نزن». */
  image?: string;
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

  const picture = readImage(input.image);
  if (!picture.ok) return { ok: false, error: picture.error };

  const where = `${memoryGradeTitle(input.grade)} — ${memoryTermTitle(input.term)}`;

  try {
    if (input.id) {
      const id = uuidArg(input.id, "شناسهٔ جفت نامعتبر است.");
      const updated = await execute(
        `update memory_pairs
            set grade = ?, term = ?, work = ?, author = ?, image = ?
          where id = ?`,
        [input.grade, input.term, work, author, picture.image, id],
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
        // ⚠️ جدولِ مشتق لازم است: MySQL اجازه نمی‌دهد زیرکوئریِ یک INSERT از
        // جدولِ مقصد بخواند (خطای ۱۰۹۳). و پارامترها تکرار می‌شوند چون در
        // MySQL هر ? یک جاست، بر خلاف $1 که چند بار می‌آمد.
        `insert into memory_pairs (id, grade, term, work, author, image, sort_index)
         select ?, ?, ?, ?, ?, ?, coalesce(m, 0) + 1
           from (select max(sort_index) as m from memory_pairs
                  where grade = ? and term = ?) t`,
        [
          randomUUID(),
          input.grade,
          input.term,
          work,
          author,
          picture.image,
          input.grade,
          input.term,
        ],
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
 * ستونِ سومِ اختیاری هم پذیرفته می‌شود: نشانیِ نگارهٔ همان جفت — که بر خلاف دو
 * ستونِ اول فقط با `|` یا tab جدا می‌شود.
 *
 * خط‌های خراب باعث شکستِ کل عملیات نمی‌شوند؛ شمارشان برگردانده می‌شود تا پنل
 * دقیقاً بگوید چند خط رد شد و چرا.
 */
export type BulkAddResult =
  | { ok: true; added: number; skipped: number; duplicates: number }
  | { ok: false; error: string };

const PAIR_SEPARATOR = /\s*(?:\||\t|—|–|←|<-|-{1,2})\s*/;

/**
 * نشانیِ نگاره، اگر در انتهای خط آمده باشد.
 *
 * ⚠️ این جداگانه و *پیش از* PAIR_SEPARATOR خوانده می‌شود، چون آن الگو روی خطِ
 * تیره هم می‌شکند و یک نشانیِ واقعی پر از خط تیره است:
 * `/uploads/pair-images/1770-9f2c-saadi.png` با آن الگو به چند تکه تبدیل
 * می‌شد و کلِ خط «خوانده‌نشده» شمرده می‌شد.
 *
 * پس ستونِ سوم قاعدهٔ سخت‌گیرانه‌ترِ خودش را دارد: فقط `|` یا tab جدایش
 * می‌کند، و باید *شبیهِ نشانی* باشد. هر چیز دیگری در انتهای خط، بخشی از نامِ
 * پدیدآورنده است و نه نگاره.
 */
const TRAILING_IMAGE = /[|\t]\s*((?:\/|https?:\/\/)\S+)\s*$/i;

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

  const parsed: { work: string; author: string; image: string }[] = [];
  let skipped = 0;

  for (const raw of lines) {
    const hit = TRAILING_IMAGE.exec(raw);
    const picture = readImage(hit?.[1]);
    // نشانیِ بدشکل فقط خطِ خودش را می‌سوزاند و نه کلِ فهرست را — همان رفتاری
    // که بقیهٔ خطاهای این حلقه دارند.
    if (!picture.ok) {
      skipped++;
      continue;
    }

    const line = hit ? raw.slice(0, hit.index) : raw;
    const parts = line.split(PAIR_SEPARATOR).map((p) => p.trim()).filter(Boolean);
    if (parts.length !== 2 || parts[0].length > 120 || parts[1].length > 120) {
      skipped++;
      continue;
    }
    parsed.push({ work: parts[0], author: parts[1], image: picture.image });
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
               from memory_pairs where grade = ? and term = ?`,
            [input.grade, input.term],
          )
        )?.max ?? 0;

      for (const p of parsed) {
        next++;
        // ON DUPLICATE KEY UPDATE با مقدارِ خودش = «هیچ کاری نکن»، ولی بر
        // خلاف INSERT IGNORE فقط نقضِ کلید یکتا را می‌بلعد و بقیهٔ خطاها را
        // بالا می‌فرستد.
        inserted += await tx.execute(
          `insert into memory_pairs (id, grade, term, work, author, image, sort_index)
           values (?, ?, ?, ?, ?, ?, ?)
           on duplicate key update work = work`,
          [randomUUID(), input.grade, input.term, p.work, p.author, p.image, next],
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
    "select work, author, grade, term from memory_pairs where id = ?",
    [id],
  );

  const deleted = await execute("delete from memory_pairs where id = ?", [id]);
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
