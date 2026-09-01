import "server-only";
import { query } from "@/lib/db";
import { recordError } from "@/lib/admin/audit";
import {
  LITERARY_PAIRS,
  emptyMemoryDecks,
  isMemoryGrade,
  isMemoryTerm,
  type MemoryDecks,
} from "@/lib/literary-pairs";

/**
 * دسته‌کارت‌های بازی «جفت‌های ادبی» — همهٔ شش دسته (سه پایه × دو نوبت) با هم.
 *
 * چرا هر شش تا با هم و نه فقط دستهٔ انتخاب‌شده: کل داده چند ده ردیف است، و
 * انتخابِ پایه و نوبت روی خودِ صفحهٔ بازی انجام می‌شود. اگر هر انتخاب یک رفت و
 * برگشت لازم داشت، دانش‌آموز بین دو کلیک منتظر می‌ماند — برای داده‌ای که از
 * یک عکسِ همان صفحه کوچک‌تر است.
 */
export type MemoryDeckData = {
  decks: MemoryDecks;
  /** false یعنی جدول خالی بود و دارد از دادهٔ ثابتِ داخل کد استفاده می‌شود. */
  fromDatabase: boolean;
};

type PairRow = { grade: string; term: string; work: string; author: string };

export async function loadMemoryDecks(): Promise<MemoryDeckData> {
  const decks = emptyMemoryDecks();

  let rows: PairRow[];
  try {
    rows = await query<PairRow>(
      `select grade, term, work, author
         from memory_pairs
        order by grade, term, sort_index, work`,
    );
  } catch (err) {
    // خواندنِ ناموفق نباید صفحهٔ بازی را از کار بیندازد؛ دادهٔ ثابت همیشه هست.
    await recordError("db", err, "loadMemoryDecks");
    rows = [];
  }

  for (const r of rows) {
    if (!isMemoryGrade(r.grade) || !isMemoryTerm(r.term)) continue;
    decks[r.grade][r.term].push({ work: r.work, author: r.author });
  }

  // ⚠️ fallback عمداً «همه یا هیچ» است.
  //
  // اگر هر دستهٔ خالی به‌تنهایی به دادهٔ ثابت برمی‌گشت، مدیری که فقط دهم/دی را
  // پر کرده بود، در پنج دستهٔ دیگر همان ده جفتِ کتابیِ تکراری را می‌دید و
  // هیچ‌وقت نمی‌فهمید که هنوز چیزی وارد نکرده. حالا به‌محض ثبت اولین جفت،
  // دسته‌های خالی واقعاً خالی دیده می‌شوند و بازی همان‌جا می‌گوید هنوز آماده
  // نیست.
  if (rows.length === 0) {
    for (const grade of Object.keys(decks) as (keyof MemoryDecks)[]) {
      decks[grade].dey = [...LITERARY_PAIRS];
      decks[grade].khordad = [...LITERARY_PAIRS];
    }
    return { decks, fromDatabase: false };
  }

  return { decks, fromDatabase: true };
}
