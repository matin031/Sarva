"use server";

import { query, queryOne, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";

/**
 * مدیریت محتوای «نینجای دستور زبان».
 *
 * مدل داده عمداً «نقش ← کلمه» است و نه «کلمه با یک برچسبِ نقش»: نقش‌ها کم و
 * ثابت‌اند و کلمه‌ها زیاد، و کارِ روزمرهٔ مدیر این است که یک نقش را باز کند و
 * کلمه‌هایش را بریزد داخلش. جابه‌جا کردن یک کلمه بین دو نقش هم فقط عوض کردن
 * category_id است، نه حذف و ساختِ دوباره.
 */

export type AdminNinjaWord = {
  id: string;
  word: string;
  sortIndex: number;
};

export type AdminNinjaCategory = {
  id: string;
  label: string;
  hint: string;
  enabled: boolean;
  sortIndex: number;
  words: AdminNinjaWord[];
};

type ActionResult = { ok: true } | { ok: false; error: string };

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code?: string }).code === UNIQUE_VIOLATION;
}

type CategoryRow = {
  id: string;
  label: string;
  hint: string;
  enabled: boolean;
  sort_index: number;
  words: { id: string; word: string; sort_index: number }[] | null;
};

/** همهٔ نقش‌ها با کلماتشان — کل محتوای این بازی در یک کوئری. */
export async function ninjaAdminOverview(): Promise<AdminNinjaCategory[]> {
  await requireAdmin();

  const rows = await query<CategoryRow>(
    `select c.id, c.label, c.hint, c.enabled, c.sort_index,
            (select jsonb_agg(jsonb_build_object(
                      'id', w.id, 'word', w.word, 'sort_index', w.sort_index)
                    order by w.sort_index, w.word)
               from ninja_words w
              where w.category_id = c.id) as words
       from ninja_categories c
      order by c.sort_index, c.label`,
  );

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    hint: r.hint,
    enabled: r.enabled,
    sortIndex: r.sort_index,
    words: (r.words ?? []).map((w) => ({
      id: w.id,
      word: w.word,
      sortIndex: w.sort_index,
    })),
  }));
}

export type NinjaCategoryInput = {
  id?: string;
  label: string;
  hint: string;
  enabled: boolean;
};

export async function ninjaCategorySave(
  input: NinjaCategoryInput,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const label = input.label.trim();
  const hint = input.hint.trim();
  if (!label) return { ok: false, error: "نام نقش را وارد کنید." };
  if (label.length > 60) return { ok: false, error: "نام نقش نباید بیشتر از ۶۰ نویسه باشد." };
  if (hint.length > 300) return { ok: false, error: "توضیح نباید بیشتر از ۳۰۰ نویسه باشد." };

  try {
    if (input.id) {
      const id = uuidArg(input.id, "شناسهٔ نقش نامعتبر است.");
      const updated = await execute(
        `update ninja_categories set label = $1, hint = $2, enabled = $3 where id = $4`,
        [label, hint, input.enabled, id],
      );
      if (!updated) return { ok: false, error: "این نقش پیدا نشد." };

      await recordAudit({
        actor: admin,
        action: "ninja.category_save",
        targetType: "ninja_category",
        targetId: id,
        summary: `نقشِ «${label}» ویرایش شد`,
        metadata: { enabled: input.enabled },
      });
      return { ok: true };
    }

    await transaction(async (tx) => {
      await tx.execute(
        `insert into ninja_categories (label, hint, enabled, sort_index)
         values ($1, $2, $3,
                 coalesce((select max(sort_index) from ninja_categories), 0) + 1)`,
        [label, hint, input.enabled],
      );
    });

    await recordAudit({
      actor: admin,
      action: "ninja.category_save",
      targetType: "ninja_category",
      summary: `نقشِ «${label}» ساخته شد`,
      metadata: { enabled: input.enabled },
    });
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `نقشی به نام «${label}» از قبل هست.` };
    }
    console.error("[ninja] ذخیرهٔ نقش ناموفق بود:", err);
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "ninjaCategorySave");
    return { ok: false, error: "ذخیرهٔ نقش ناموفق بود." };
  }
}

/** حذف نقش، همراه با همهٔ کلماتش (on delete cascade). */
export async function ninjaCategoryDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ نقش نامعتبر است.");

  const target = await queryOne<{ label: string; n: number }>(
    `select c.label, (select count(*)::int from ninja_words w where w.category_id = c.id) as n
       from ninja_categories c where c.id = $1`,
    [id],
  );

  const deleted = await execute("delete from ninja_categories where id = $1", [id]);
  if (!deleted) return { ok: false, error: "این نقش پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "ninja.category_delete",
    targetType: "ninja_category",
    targetId: id,
    summary: target
      ? `نقشِ «${target.label}» با ${target.n} کلمه‌اش حذف شد`
      : "یک نقش نینجا حذف شد",
    metadata: target ? { words: target.n } : {},
  });

  return { ok: true };
}

/**
 * افزودن کلمه به یک نقش — یکی یا چندتا با هم.
 *
 * جداکننده هم خط تازه است و هم ویرگول (فارسی و انگلیسی)، چون فهرستِ کلمات را
 * معمولاً یا خط‌به‌خط تایپ می‌کنند یا از یک جملهٔ ویرگول‌دار کپی می‌کنند. کلمهٔ
 * تکراری خطا نمی‌دهد، فقط در شمارش نمی‌آید.
 */
export type NinjaWordsAddResult =
  | { ok: true; added: number; duplicates: number }
  | { ok: false; error: string };

export async function ninjaWordsAdd(input: {
  categoryId: string;
  text: string;
}): Promise<NinjaWordsAddResult> {
  const admin = await requireAdmin();
  const categoryId = uuidArg(input.categoryId, "شناسهٔ نقش نامعتبر است.");

  const category = await queryOne<{ label: string }>(
    "select label from ninja_categories where id = $1",
    [categoryId],
  );
  if (!category) return { ok: false, error: "این نقش پیدا نشد." };

  const words = [
    ...new Set(
      input.text
        .split(/[\n،,]/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0 && w.length <= 40),
    ),
  ];

  if (words.length === 0) return { ok: false, error: "کلمه‌ای وارد نشده." };
  if (words.length > 200) return { ok: false, error: "هر بار حداکثر ۲۰۰ کلمه." };

  try {
    const added = await transaction(async (tx) => {
      let inserted = 0;
      let next =
        (
          await tx.queryOne<{ max: number }>(
            `select coalesce(max(sort_index), 0) as max
               from ninja_words where category_id = $1`,
            [categoryId],
          )
        )?.max ?? 0;

      for (const word of words) {
        next++;
        inserted += await tx.execute(
          `insert into ninja_words (category_id, word, sort_index)
           values ($1, $2, $3)
           on conflict (category_id, word) do nothing`,
          [categoryId, word, next],
        );
      }
      return inserted;
    });

    await recordAudit({
      actor: admin,
      action: "ninja.word_save",
      targetType: "ninja_word",
      targetId: categoryId,
      summary: `${added} کلمه به نقشِ «${category.label}» اضافه شد`,
      metadata: { category: category.label, added },
    });

    return { ok: true, added, duplicates: words.length - added };
  } catch (err) {
    console.error("[ninja] افزودن کلمه ناموفق بود:", err);
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "ninjaWordsAdd");
    return { ok: false, error: "افزودن کلمه ناموفق بود." };
  }
}

/** تغییر متنِ یک کلمه، بدون عوض شدن نقشش. */
export async function ninjaWordRename(
  id: string,
  word: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ کلمه نامعتبر است.");

  const trimmed = word.trim();
  if (!trimmed) return { ok: false, error: "کلمه را وارد کنید." };
  if (trimmed.length > 40) return { ok: false, error: "کلمه نباید بیشتر از ۴۰ نویسه باشد." };

  try {
    const updated = await execute("update ninja_words set word = $1 where id = $2", [
      trimmed,
      id,
    ]);
    if (!updated) return { ok: false, error: "این کلمه پیدا نشد." };

    await recordAudit({
      actor: admin,
      action: "ninja.word_save",
      targetType: "ninja_word",
      targetId: id,
      summary: `کلمه به «${trimmed}» تغییر کرد`,
    });
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `«${trimmed}» از قبل در همین نقش هست.` };
    }
    console.error("[ninja] ویرایش کلمه ناموفق بود:", err);
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "ninjaWordRename");
    return { ok: false, error: "ویرایش کلمه ناموفق بود." };
  }
}

/**
 * ارجاع دادن یک کلمه به نقشی دیگر.
 *
 * همان کاری که در پنل با یک منوی کشویی کنار هر کلمه انجام می‌شود: «این کلمه
 * قید نبود، صفت بود.» چون فقط یک ستون عوض می‌شود، تاریخچه و شناسهٔ کلمه سر
 * جایش می‌ماند.
 */
export async function ninjaWordMove(
  id: string,
  categoryId: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ کلمه نامعتبر است.");
  categoryId = uuidArg(categoryId, "شناسهٔ نقش نامعتبر است.");

  const target = await queryOne<{ label: string }>(
    "select label from ninja_categories where id = $1",
    [categoryId],
  );
  if (!target) return { ok: false, error: "نقشِ مقصد پیدا نشد." };

  try {
    // کلمه به انتهای نقشِ مقصد می‌رود، وگرنه با sort_index قدیمی وسط فهرستِ
    // تازه می‌نشست و مدیر بعد از جابه‌جایی پیدایش نمی‌کرد.
    const moved = await transaction(async (tx) =>
      tx.execute(
        `update ninja_words
            set category_id = $1,
                sort_index = coalesce(
                  (select max(sort_index) from ninja_words where category_id = $1), 0) + 1
          where id = $2`,
        [categoryId, id],
      ),
    );
    if (!moved) return { ok: false, error: "این کلمه پیدا نشد." };

    await recordAudit({
      actor: admin,
      action: "ninja.word_move",
      targetType: "ninja_word",
      targetId: id,
      summary: `یک کلمه به نقشِ «${target.label}» منتقل شد`,
      metadata: { category: target.label },
    });
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `این کلمه از قبل در «${target.label}» هست.` };
    }
    console.error("[ninja] جابه‌جایی کلمه ناموفق بود:", err);
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("action", err, "ninjaWordMove");
    return { ok: false, error: "جابه‌جایی کلمه ناموفق بود." };
  }
}

export async function ninjaWordDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  id = uuidArg(id, "شناسهٔ کلمه نامعتبر است.");

  const target = await queryOne<{ word: string; label: string }>(
    `select w.word, c.label
       from ninja_words w join ninja_categories c on c.id = w.category_id
      where w.id = $1`,
    [id],
  );

  const deleted = await execute("delete from ninja_words where id = $1", [id]);
  if (!deleted) return { ok: false, error: "این کلمه پیدا نشد." };

  await recordAudit({
    actor: admin,
    action: "ninja.word_delete",
    targetType: "ninja_word",
    targetId: id,
    summary: target
      ? `کلمهٔ «${target.word}» از نقشِ «${target.label}» حذف شد`
      : "یک کلمه حذف شد",
  });

  return { ok: true };
}
