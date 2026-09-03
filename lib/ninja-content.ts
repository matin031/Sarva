import "server-only";
import { query } from "@/lib/db";
import { recordError } from "@/lib/admin/audit";
import {
  NINJA_ROUNDS,
  buildNinjaDecoys,
  type NinjaRound,
} from "@/lib/ninja-data";

/**
 * نقش‌های بازی «نینجای دستور زبان» و کلماتِ هر نقش.
 *
 * شکل خروجی دقیقاً همان NinjaRound قدیمی است تا خودِ بازی نفهمد داده از کجا
 * آمده: هر نقشِ فعال یک راند است، کلماتش هدف‌اند و بقیهٔ کلمات (نقش‌های دیگر
 * + مخزن خنثی) طعمه.
 *
 * ⚠️ نقشِ بدون کلمه راند نمی‌شود. یک راند با فهرست هدفِ خالی یعنی صفحه‌ای که
 * هیچ چیزِ درستی برای برش زدن ندارد و بازیکن ناچار است جان بدهد.
 */
export type NinjaRoundData = {
  rounds: NinjaRound[];
  /** false یعنی هنوز نقشی در پنل ساخته نشده و دادهٔ ثابتِ کد نمایش داده می‌شود. */
  fromDatabase: boolean;
};

type RoundRow = {
  id: string;
  label: string;
  hint: string;
  enabled: boolean;
  sort_index: number;
  words: string[] | null;
};

export async function loadNinjaRounds(): Promise<NinjaRoundData> {
  let rows: RoundRow[];
  try {
    rows = await query<RoundRow>(
      // array_agg با order داخلی، تا ترتیبی که مدیر چیده حفظ شود. فیلترِ
      // w.id is not null لازم است وگرنه نقشِ بی‌کلمه یک آرایهٔ [null] می‌گیرد.
      `select c.id, c.label, c.hint, c.enabled, c.sort_index,
              array_agg(w.word order by w.sort_index, w.word)
                filter (where w.id is not null) as words
         from ninja_categories c
         left join ninja_words w on w.category_id = c.id
        group by c.id
        order by c.sort_index, c.label`,
    );
  } catch (err) {
    await recordError("db", err, "loadNinjaRounds");
    rows = [];
  }

  if (rows.length === 0) return { rounds: NINJA_ROUNDS, fromDatabase: false };

  // طعمه‌ها از کلماتِ *همهٔ* نقش‌ها ساخته می‌شوند، حتی نقش‌های غیرفعال: یک نقشِ
  // خاموش هنوز یک کلمهٔ فارسیِ معتبر است و به‌عنوان طعمه بی‌عیب کار می‌کند.
  const allWords = rows.map((r) => r.words ?? []);

  const rounds = rows
    .filter((r) => r.enabled && (r.words?.length ?? 0) > 0)
    .map((r, index) => ({
      // NinjaRound.id عدد است و فقط برای key و بازیابیِ localStorage استفاده
      // می‌شود؛ ترتیبِ همین فهرست کافی است.
      id: index + 1,
      categoryId: r.id,
      category: r.label,
      hint: r.hint,
      targetWords: r.words ?? [],
      decoyWords: buildNinjaDecoys(allWords, r.words ?? []),
    }));

  // جدول ردیف دارد ولی هیچ نقشِ فعالِ کلمه‌داری ندارد — بازی نباید خالی بماند.
  if (rounds.length === 0) return { rounds: NINJA_ROUNDS, fromDatabase: false };

  return { rounds, fromDatabase: true };
}
