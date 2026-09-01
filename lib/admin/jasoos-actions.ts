"use server";

import { query, queryOne, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { InvalidInputError } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { JASOOS_SUSPECT_COUNT, isSuspectRole } from "@/lib/jasoos-data";

/**
 * مدیریت پرونده‌های «جاسوسِ نقش‌ها».
 *
 * یک «پرونده» یک بیت (یا یک جملهٔ نثر) است با چهار مظنون. سه مظنون نقشی را
 * ادعا می‌کنند که واقعاً در بیت هست و کلمه‌اش را هم نشان می‌دهند؛ یکی — جاسوس
 * — نقشی را ادعا می‌کند که در این بیت وجود ندارد، و دقیقاً به همین دلیل کلمه‌ای
 * برای نشان دادن ندارد.
 *
 * ⚠️ ذخیره همیشه هر چهار مظنون را با هم می‌نویسد و در یک تراکنش. ذخیرهٔ تکیِ
 * مظنون‌ها یعنی امکانِ رسیدن به حالتی با دو جاسوس یا بدون جاسوس — پرونده‌ای که
 * بازی را در همان صفحه گیر می‌اندازد.
 */

export type AdminJasoosSuspect = {
  role: string;
  isSpy: boolean;
  evidence: string;
  wordInVerse: string;
};

export type AdminJasoosLevel = {
  id: number;
  title: string;
  category: string;
  contentType: string;
  verseLines: [string, string];
  isPublished: boolean;
  sortIndex: number;
  suspects: AdminJasoosSuspect[];
};

/** ردیفِ فهرست — بدونِ مظنون‌ها، ولی با آنچه لازم است تا پنل بگوید این پرونده
 *  سالم است یا نه. */
export type AdminJasoosSummary = {
  id: number;
  title: string;
  category: string;
  contentType: string;
  firstLine: string;
  isPublished: boolean;
  suspectCount: number;
  spyCount: number;
};

type ActionResult = { ok: true } | { ok: false; error: string };
type SaveResult = { ok: true; id: number } | { ok: false; error: string };

const CATEGORIES = ["دستوری", "آرایه"] as const;
const CONTENT_TYPES = ["poem", "prose"] as const;

function levelIdArg(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new InvalidInputError("شناسهٔ پرونده نامعتبر است.");
  }
  return value as number;
}

export async function jasoosAdminList(): Promise<AdminJasoosSummary[]> {
  await requireAdmin();

  const rows = await query<{
    id: number;
    title: string;
    category: string;
    content_type: string;
    verse_line_1: string;
    is_published: boolean;
    suspect_count: number;
    spy_count: number;
  }>(
    `select l.id, l.title, l.category, l.content_type, l.verse_line_1, l.is_published,
            (select count(*)::int from jasoos_suspects s where s.level_id = l.id) as suspect_count,
            (select count(*)::int from jasoos_suspects s where s.level_id = l.id and s.is_spy) as spy_count
       from jasoos_levels l
      order by l.sort_index, l.id`,
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    contentType: r.content_type,
    firstLine: r.verse_line_1,
    isPublished: r.is_published,
    suspectCount: r.suspect_count,
    spyCount: r.spy_count,
  }));
}

export async function jasoosAdminGet(id: number): Promise<AdminJasoosLevel | null> {
  await requireAdmin();
  const levelId = levelIdArg(id);

  const level = await queryOne<{
    id: number;
    title: string;
    category: string;
    content_type: string;
    verse_line_1: string;
    verse_line_2: string;
    is_published: boolean;
    sort_index: number;
  }>(
    `select id, title, category, content_type, verse_line_1, verse_line_2,
            is_published, sort_index
       from jasoos_levels where id = $1`,
    [levelId],
  );
  if (!level) return null;

  const suspects = await query<{
    role: string;
    is_spy: boolean;
    evidence: string;
    word_in_verse: string;
  }>(
    `select role, is_spy, evidence, word_in_verse
       from jasoos_suspects where level_id = $1 order by sort_index, id`,
    [levelId],
  );

  return {
    id: level.id,
    title: level.title,
    category: level.category,
    contentType: level.content_type,
    verseLines: [level.verse_line_1, level.verse_line_2],
    isPublished: level.is_published,
    sortIndex: level.sort_index,
    suspects: suspects.map((s) => ({
      role: s.role,
      isSpy: s.is_spy,
      evidence: s.evidence,
      wordInVerse: s.word_in_verse,
    })),
  };
}

export type JasoosLevelInput = {
  id?: number;
  title: string;
  category: string;
  contentType: string;
  verseLines: [string, string];
  isPublished: boolean;
  suspects: AdminJasoosSuspect[];
};

/** همهٔ چیزهایی که یک پرونده باید داشته باشد تا قابل بازی کردن باشد.
 *  خروجی پیامِ فارسیِ آمادهٔ نمایش است، نه یک boolean — مدیر باید بداند
 *  *کدام* شرط برقرار نیست. */
function validate(input: JasoosLevelInput): string | null {
  const title = input.title.trim();
  if (!title) return "عنوان پرونده را وارد کنید.";
  if (title.length > 80) return "عنوان نباید بیشتر از ۸۰ نویسه باشد.";

  if (!(CATEGORIES as readonly string[]).includes(input.category)) {
    return "دستهٔ پرونده نامعتبر است.";
  }
  if (!(CONTENT_TYPES as readonly string[]).includes(input.contentType)) {
    return "نوع متن نامعتبر است.";
  }

  const [line1, line2] = input.verseLines.map((l) => l.trim());
  if (!line1) return "مصرع اول (یا متن) را وارد کنید.";
  if (input.contentType === "poem" && !line2) return "برای شعر، مصرع دوم هم لازم است.";
  if (line1.length > 300 || line2.length > 300) {
    return "هر مصرع نباید بیشتر از ۳۰۰ نویسه باشد.";
  }

  if (input.suspects.length !== JASOOS_SUSPECT_COUNT) {
    return "هر پرونده باید دقیقاً چهار مظنون داشته باشد.";
  }

  const spies = input.suspects.filter((s) => s.isSpy);
  if (spies.length !== 1) return "دقیقاً یکی از چهار مظنون باید جاسوس باشد.";

  const roles = input.suspects.map((s) => s.role.trim());
  if (roles.some((r) => !isSuspectRole(r))) return "نقشِ یکی از مظنون‌ها نامعتبر است.";
  if (new Set(roles).size !== roles.length) {
    return "دو مظنون نمی‌توانند یک نقش را ادعا کنند.";
  }

  for (const s of input.suspects) {
    if (!s.evidence.trim()) return `برای نقشِ «${s.role}» توضیح را وارد کنید.`;
    if (s.evidence.trim().length > 400) return "توضیح نباید بیشتر از ۴۰۰ نویسه باشد.";
    // مظنونِ بی‌گناه باید کلمه‌اش را نشان بدهد؛ همان است که ادعایش را ثابت
    // می‌کند. جاسوس نباید — نبودنِ کلمه خودِ جرم است.
    if (!s.isSpy && !s.wordInVerse.trim()) {
      return `برای نقشِ «${s.role}» باید کلمهٔ مربوط در بیت را مشخص کنی.`;
    }
    if (s.wordInVerse.trim().length > 80) return "کلمهٔ بیت نباید بیشتر از ۸۰ نویسه باشد.";
  }

  return null;
}

export async function jasoosAdminSave(input: JasoosLevelInput): Promise<SaveResult> {
  const admin = await requireAdmin();

  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const title = input.title.trim();
  const line1 = input.verseLines[0].trim();
  const line2 = input.verseLines[1].trim();

  try {
    const levelId = await transaction(async (tx) => {
      let id: number;

      if (input.id) {
        id = levelIdArg(input.id);
        const updated = await tx.execute(
          `update jasoos_levels
              set title = $1, category = $2, content_type = $3,
                  verse_line_1 = $4, verse_line_2 = $5, is_published = $6
            where id = $7`,
          [title, input.category, input.contentType, line1, line2, input.isPublished, id],
        );
        if (!updated) throw new InvalidInputError("این پرونده پیدا نشد.");

        // هر چهار مظنون با هم جایگزین می‌شوند. تطبیق ردیف‌به‌ردیف اینجا هیچ
        // چیزی نمی‌خرد (مظنون‌ها شناسه‌ای ندارند که جایی به آن ارجاع بدهد) و
        // در عوض راه‌های تازه‌ای برای رسیدن به حالتِ ناسازگار باز می‌کند.
        await tx.execute("delete from jasoos_suspects where level_id = $1", [id]);
      } else {
        const row = await tx.queryOne<{ id: number }>(
          `insert into jasoos_levels
             (title, category, content_type, verse_line_1, verse_line_2, is_published, sort_index)
           values ($1, $2, $3, $4, $5, $6,
                   coalesce((select max(sort_index) from jasoos_levels), 0) + 1)
           returning id`,
          [title, input.category, input.contentType, line1, line2, input.isPublished],
        );
        if (!row) throw new Error("درج پرونده ناموفق بود.");
        id = row.id;
      }

      for (const [index, s] of input.suspects.entries()) {
        await tx.execute(
          `insert into jasoos_suspects
             (level_id, role, is_spy, evidence, word_in_verse, sort_index)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            s.role.trim(),
            s.isSpy,
            s.evidence.trim(),
            s.isSpy ? "" : s.wordInVerse.trim(),
            index,
          ],
        );
      }

      return id;
    });

    await recordAudit({
      actor: admin,
      action: "jasoos.level_save",
      targetType: "jasoos_level",
      targetId: String(levelId),
      summary: input.id
        ? `پروندهٔ «${title}» ویرایش شد`
        : `پروندهٔ «${title}» ساخته شد`,
      metadata: { category: input.category, published: input.isPublished },
    });

    return { ok: true, id: levelId };
  } catch (err) {
    if (err instanceof InvalidInputError) return { ok: false, error: err.message };
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "jasoosAdminSave");
    return { ok: false, error: "ذخیرهٔ پرونده ناموفق بود." };
  }
}

export async function jasoosAdminSetPublished(
  id: number,
  published: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const levelId = levelIdArg(id);
  if (typeof published !== "boolean") {
    return { ok: false, error: "مقدار انتشار نامعتبر است." };
  }

  const target = await queryOne<{ title: string; suspects: number; spies: number }>(
    `select l.title,
            (select count(*)::int from jasoos_suspects s where s.level_id = l.id) as suspects,
            (select count(*)::int from jasoos_suspects s where s.level_id = l.id and s.is_spy) as spies
       from jasoos_levels l where l.id = $1`,
    [levelId],
  );
  if (!target) return { ok: false, error: "این پرونده پیدا نشد." };

  // منتشر کردنِ پروندهٔ ناقص یعنی سطحی که در بازی رد می‌شود ولی مدیر فکر
  // می‌کند منتشرش کرده. جلویش همین‌جا گرفته می‌شود، نه در سکوت.
  if (published && (target.suspects !== JASOOS_SUSPECT_COUNT || target.spies !== 1)) {
    return {
      ok: false,
      error: "پروندهٔ ناقص منتشر نمی‌شود؛ باید چهار مظنون با دقیقاً یک جاسوس داشته باشد.",
    };
  }

  await execute("update jasoos_levels set is_published = $1 where id = $2", [
    published,
    levelId,
  ]);

  await recordAudit({
    actor: admin,
    action: "jasoos.level_publish",
    targetType: "jasoos_level",
    targetId: String(levelId),
    summary: published
      ? `پروندهٔ «${target.title}» منتشر شد`
      : `پروندهٔ «${target.title}» از دسترس دانش‌آموزان خارج شد`,
  });

  return { ok: true };
}

export async function jasoosAdminDelete(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const levelId = levelIdArg(id);

  const target = await queryOne<{ title: string }>(
    "select title from jasoos_levels where id = $1",
    [levelId],
  );

  const deleted = await execute("delete from jasoos_levels where id = $1", [levelId]);
  if (!deleted) return { ok: false, error: "این پرونده پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "jasoos.level_delete",
    targetType: "jasoos_level",
    targetId: String(levelId),
    summary: target ? `پروندهٔ «${target.title}» حذف شد` : "یک پروندهٔ جاسوس حذف شد",
  });

  return { ok: true };
}
