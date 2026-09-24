import { MIN_EVIDENCE_PER_BUCKET } from "@/lib/plus/skill-buckets";

/**
 * نقشهٔ تسلط — یک کاشی برای هر مهارت (نقشِ دستوری، آرایه، وزن، درس).
 *
 * ⚠️ خالص و بدونِ `server-only`: صفحه‌ها روی سرور ردیف‌ها را به کاشی تبدیل
 * می‌کنند و کامپوننت روی کلاینت فقط `masteryOf` را صدا می‌زند.
 */

export type SkillTile = {
  key: string;
  label: string;
  hint?: string;
  /** رنگِ اختصاصیِ مهارت (مثلاً رنگِ آرایه در رنگ‌آرا). */
  color?: string;
  total: number;
  correct: number;
  /** آخرین پاسخ‌ها، قدیمی به جدید، حداکثر `RECENT`. */
  recent: boolean[];
  sources: { source: string; total: number; correct: number }[];
};

export const RECENT = 10;

export type Mastery = "none" | "weak" | "learning" | "good" | "mastered";

/** برچسب‌ها و رنگ‌ها از ضعیف به قوی؛ ترتیبِ همین آرایه ترتیبِ نوارِ خلاصه است. */
export const MASTERY_STEPS: { key: Mastery; label: string; color: string }[] = [
  { key: "mastered", label: "مسلط", color: "var(--primary)" },
  { key: "good", label: "خوب", color: "color-mix(in oklch, var(--primary) 55%, var(--gold))" },
  { key: "learning", label: "در حال یادگیری", color: "var(--gold)" },
  { key: "weak", label: "ضعیف", color: "var(--destructive)" },
  { key: "none", label: "کم‌تمرین", color: "color-mix(in oklch, var(--muted-foreground) 35%, transparent)" },
];

/**
 * ⚠️ زیرِ کمینهٔ شواهد هیچ قضاوتی نمی‌شود — همان قاعدهٔ `bucketize`. سه
 * پاسخِ درست «مسلط» نیست.
 */
export function masteryOf(total: number, correct: number): Mastery {
  if (total < MIN_EVIDENCE_PER_BUCKET) return "none";
  const a = correct / total;
  return a < 0.5 ? "weak" : a < 0.75 ? "learning" : a < 0.9 ? "good" : "mastered";
}

type Row = { key: string; label: string; correct: boolean; source?: string; at: string };

/**
 * ردیف‌های خام ← کاشی‌ها.
 *
 * `catalog` مهارت‌هایی را که هنوز تمرین نشده‌اند هم می‌آورد تا نقشه کامل
 * دیده شود و جاهای خالی‌اش معلوم باشد. ترتیب: اول ضعیف‌ها، بعد بقیه، آخر
 * کم‌تمرین‌ها.
 */
export function toSkillTiles(
  rows: readonly Row[],
  catalog: readonly { key: string; label: string; hint?: string; color?: string }[] = [],
): SkillTile[] {
  const byKey = new Map<string, SkillTile & { at: { at: number; ok: boolean }[] }>();
  const tile = (key: string, label: string) => {
    let t = byKey.get(key);
    if (!t) {
      t = { key, label, total: 0, correct: 0, recent: [], sources: [], at: [] };
      byKey.set(key, t);
    }
    return t;
  };

  for (const c of catalog) Object.assign(tile(c.key, c.label), c);

  for (const r of rows) {
    const t = tile(r.key, r.label);
    t.total += 1;
    if (r.correct) t.correct += 1;
    t.at.push({ at: Date.parse(r.at) || 0, ok: r.correct });
    if (r.source) {
      const s = t.sources.find((x) => x.source === r.source) ?? { source: r.source, total: 0, correct: 0 };
      if (!s.total) t.sources.push(s);
      s.total += 1;
      if (r.correct) s.correct += 1;
    }
  }

  const rank = (t: SkillTile) => (t.total < MIN_EVIDENCE_PER_BUCKET ? 2 : 0);
  return [...byKey.values()]
    .map(({ at, ...t }) => ({ ...t, recent: at.sort((x, y) => x.at - y.at).slice(-RECENT).map((x) => x.ok) }))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (rank(a) ? 0 : a.correct / a.total - b.correct / b.total) ||
        b.total - a.total,
    );
}
