import "server-only";
import { query } from "@/lib/db";
import { recordError } from "@/lib/admin/audit";
import {
  JASOOS_LEVELS,
  isSuspectRole,
  shuffleSuspects,
  type JasoosCategory,
  type JasoosContentType,
  type JasoosLevel,
  type Suspect,
} from "@/lib/jasoos-data";

/**
 * سطح‌های بازی «جاسوسِ نقش‌ها» از دیتابیس.
 *
 * فقط سطح‌های منتشرشده و فقط آن‌هایی که دقیقاً چهار مظنون با یک جاسوس دارند
 * برمی‌گردند. سطحِ ناقص در پنل دیده می‌شود ولی به بازی نمی‌رسد — یک پرونده با
 * سه مظنون یا بدون جاسوس، بازی را در همان صفحه گیر می‌اندازد.
 */
export type JasoosLevelData = {
  levels: JasoosLevel[];
  /** false یعنی هنوز سطحی در پنل ساخته نشده و سطح‌های ثابتِ کد نمایش داده می‌شوند. */
  fromDatabase: boolean;
};

type LevelRow = {
  id: number;
  title: string;
  category: string;
  content_type: string;
  verse_line_1: string;
  verse_line_2: string;
  suspects: RawSuspect[] | null;
};

type RawSuspect = {
  role: string;
  is_spy: boolean;
  evidence: string;
  word_in_verse: string;
};

/**
 * فقط *یک* مرحله، با شناسه.
 *
 * ⚠️ چرا جدا از loadJasoosLevels: مسیرِ ثبتِ پاسخ برای هر پاسخ کلِ
 * مرحله‌های منتشرشده را با همهٔ مظنون‌هایشان می‌خواند — یعنی کلِ محتوای
 * بازی، به‌ازای هر کلیکِ کاربر. برای تصمیمی که فقط به یک مرحله نیاز دارد.
 *
 * تضمینِ امنیتی دست‌نخورده می‌ماند: مرجع همچنان دیتابیس است و کلاینت فقط
 * شناسهٔ مرحله و نقشِ انتخابی را می‌فرستد. تفاوت فقط در این است که به‌جای
 * صد ردیف، یک ردیف خوانده می‌شود.
 */

/**
 * ⚠️ مظنون‌ها با JOIN خوانده می‌شوند و در TypeScript گروه می‌شوند، نه با یک
 * تابع تجمعیِ JSON.
 *
 * در PostgreSQL این کار با `jsonb_agg(… order by s.sort_index, s.id)` انجام
 * می‌شد و ترتیب تضمین‌شده بود. معادلِ MySQL یعنی JSON_ARRAYAGG ترتیبش
 * **تضمین نشده** است — امروز ترتیبِ زیرکوئری را نگه می‌دارد (آزموده شد) ولی
 * مستندات چیزی قول نمی‌دهند.
 *
 * و ترتیبِ مظنون‌ها اینجا تزئینی نیست: بازی چهار نقش را به همان ترتیب نشان
 * می‌دهد و toLevel هم روی تعداد و یکتا بودنِ جاسوس شرط می‌گذارد. یک ترتیبِ
 * به‌هم‌ریخته یعنی صورتِ سؤال عوض می‌شود بی‌آنکه چیزی خطا بدهد.
 */
type SuspectJoinRow = {
  id: number;
  title: string;
  category: string;
  content_type: string;
  verse_line_1: string;
  verse_line_2: string;
  s_role: string | null;
  s_is_spy: boolean | null;
  s_evidence: string | null;
  s_word_in_verse: string | null;
};

const LEVEL_SELECT = `
  select l.id, l.title, l.category, l.content_type,
         l.verse_line_1, l.verse_line_2,
         s.role          as s_role,
         s.is_spy        as s_is_spy,
         s.evidence      as s_evidence,
         s.word_in_verse as s_word_in_verse
    from jasoos_levels l
    left join jasoos_suspects s on s.level_id = l.id`;

/** ردیف‌های JOIN شده را به همان شکلِ LevelRow قبلی برمی‌گرداند. */
function groupLevels(rows: SuspectJoinRow[]): LevelRow[] {
  const out = new Map<number, LevelRow>();
  for (const r of rows) {
    let level = out.get(r.id);
    if (!level) {
      level = {
        id: r.id,
        title: r.title,
        category: r.category,
        content_type: r.content_type,
        verse_line_1: r.verse_line_1,
        verse_line_2: r.verse_line_2,
        suspects: [],
      };
      out.set(r.id, level);
    }
    // مرحلهٔ بدون مظنون از LEFT JOIN یک ردیفِ تهی می‌دهد؛ نباید به یک
    // مظنونِ ساختگی تبدیل شود. (toLevel هم روی طولِ چهار شرط دارد و چنین
    // مرحله‌ای را کنار می‌گذارد — همان رفتار قبلی.)
    if (r.s_role !== null) {
      level.suspects!.push({
        role: r.s_role,
        is_spy: r.s_is_spy!,
        evidence: r.s_evidence!,
        word_in_verse: r.s_word_in_verse!,
      });
    }
  }
  return [...out.values()];
}

export async function loadJasoosLevel(levelId: number): Promise<JasoosLevel | null> {
  let rows: LevelRow[];
  try {
    rows = groupLevels(
      await query<SuspectJoinRow>(
        `${LEVEL_SELECT}
          where l.is_published and l.id = ?
          order by s.sort_index, s.id`,
        [levelId],
      ),
    );
  } catch {
    rows = [];
  }

  const fromDb = rows.length > 0 ? toLevel(rows[0]) : null;
  if (fromDb) return fromDb;

  // ⚠️ همان fallbackِ loadJasoosLevels، و بی‌آن یک رگرسیونِ واقعی بود: وقتی
  // جدولِ مرحله‌ها نباشد یا خالی باشد، نسخهٔ همه‌خوان به محتوای داخلی
  // برمی‌گردد و بازی کار می‌کند. اگر اینجا فقط null می‌دادیم، همان حالت به
  // «این پرونده پیدا نشد» تبدیل می‌شد. روی دیتابیسِ محلی دقیقاً همین دیده شد.
  return JASOOS_LEVELS.find((l) => l.id === levelId) ?? null;
}

export async function loadJasoosLevels(): Promise<JasoosLevelData> {
  let rows: LevelRow[];
  try {
    rows = groupLevels(
      await query<SuspectJoinRow>(
        `${LEVEL_SELECT}
          where l.is_published
          order by l.sort_index, l.id, s.sort_index, s.id`,
      ),
    );
  } catch (err) {
    await recordError("db", err, "loadJasoosLevels");
    rows = [];
  }

  const levels = rows.flatMap((row) => toLevel(row) ?? []);

  if (levels.length === 0) return { levels: JASOOS_LEVELS, fromDatabase: false };
  return { levels, fromDatabase: true };
}

function toLevel(row: LevelRow): JasoosLevel | null {
  const raw = row.suspects ?? [];
  if (raw.length !== 4) return null;
  if (raw.filter((s) => s.is_spy).length !== 1) return null;
  if (!raw.every((s) => isSuspectRole(s.role))) return null;

  const suspects = raw.map<Suspect>((s) => ({
    role: s.role as Suspect["role"],
    isSpy: s.is_spy,
    evidence: s.evidence,
    // جاسوس عمداً wordInVerse ندارد — همان نبودنش است که او را جاسوس می‌کند.
    ...(s.is_spy || !s.word_in_verse ? {} : { wordInVerse: s.word_in_verse }),
  })) as [Suspect, Suspect, Suspect, Suspect];

  return {
    id: row.id,
    title: row.title,
    category: row.category as JasoosCategory,
    contentType: row.content_type as JasoosContentType,
    verseLines: [row.verse_line_1, row.verse_line_2],
    suspects: shuffleSuspects(suspects, row.id),
  };
}
