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

export async function loadJasoosLevels(): Promise<JasoosLevelData> {
  let rows: LevelRow[];
  try {
    rows = await query<LevelRow>(
      // مظنون‌ها به‌صورت jsonb برمی‌گردند تا یک کوئری کافی باشد؛ با join معمولی
      // باید هشت ردیف را در کد دوباره گروه‌بندی می‌کردیم.
      `select l.id, l.title, l.category, l.content_type,
              l.verse_line_1, l.verse_line_2,
              (select jsonb_agg(jsonb_build_object(
                        'role', s.role,
                        'is_spy', s.is_spy,
                        'evidence', s.evidence,
                        'word_in_verse', s.word_in_verse)
                      order by s.sort_index, s.id)
                 from jasoos_suspects s
                where s.level_id = l.id) as suspects
         from jasoos_levels l
        where l.is_published
        order by l.sort_index, l.id`,
    );
  } catch (err) {
    console.error("[jasoos] خواندن سطح‌ها ناموفق بود:", err);
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
