/**
 * از دادهٔ موجود، به چیزهایی که صفحهٔ خانه نشان می‌دهد.
 *
 * ⚠️ **هیچ‌کدام از این‌ها ستون یا جدولِ تازه‌ای نمی‌خواهند.** همه از همان
 * `dayCounts` و `counts` درمی‌آیند که `getPanelOverview` امروز برمی‌گرداند.
 * این تصمیمِ آگاهانه‌ای است: «از همین‌جا ادامه بده» می‌توانست دقیق‌تر باشد
 * اگر نشستِ نیمه‌کاره ذخیره می‌شد، ولی چیزی که ذخیره نمی‌شود را نباید
 * حدس زد و به کاربر نشان داد. آنچه اینجا ساخته می‌شود همگی **قابلِ اثبات
 * از روی پاسخ‌های واقعی** است.
 *
 * بدونِ `server-only` تا مستقیم قابلِ تست باشد — مثل `day-counts.ts`.
 */

import { tehranDayKey, type DayCount } from "./day-counts";
import { AREA_LABEL, type BookmarkArea, type PanelOverview } from "./types";

const TEHRAN = "Asia/Tehran";

/* ─────────────────────────────── هفتهٔ زنجیره ──────────────────────────── */

export type StreakDay = {
  key: string;
  /** «ش» تا «ج» */
  label: string;
  done: boolean;
  isToday: boolean;
};

/** هفت روزِ گذشته تا امروز — نوارِ زیرِ کارتِ زنجیره. */
export function weekStrip(counts: DayCount[], now: Date = new Date()): StreakDay[] {
  const active = new Set(counts.filter((c) => c.total > 0).map((c) => c.day));
  const weekday = new Intl.DateTimeFormat("fa-IR", { timeZone: TEHRAN, weekday: "narrow" });
  const today = tehranDayKey(now);

  const out: StreakDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = tehranDayKey(d);
    out.push({
      key,
      label: weekday.format(d),
      done: active.has(key),
      isToday: key === today,
    });
  }
  return out;
}

/** بلندترین زنجیرهٔ تاریخِ کاربر — «بهترین رکوردت». */
export function bestStreak(counts: DayCount[]): number {
  const days = [...new Set(counts.filter((c) => c.total > 0).map((c) => c.day))].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;

  for (const day of days) {
    const t = Date.parse(`${day}T00:00:00Z`);
    // ⚠️ فاصله بر حسبِ روزِ تقویمیِ تهران حساب می‌شود چون کلیدها خودشان
    // روزِ تهران‌اند؛ اختلافِ دقیقاً یک روز یعنی پیاپی.
    run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1;
    prev = t;
    if (run > best) best = run;
  }
  return best;
}

/** جمعِ پاسخ‌های `days` روزِ گذشته (شاملِ امروز). */
export function answersInLastDays(
  counts: DayCount[],
  days: number,
  now: Date = new Date(),
): { total: number; correct: number } {
  const window = new Set<string>();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    window.add(tehranDayKey(d));
  }
  let total = 0;
  let correct = 0;
  for (const c of counts) {
    if (window.has(c.day)) {
      total += c.total;
      correct += c.correct;
    }
  }
  return { total, correct };
}

/* ─────────────────────────────── بخش‌ها ────────────────────────────────── */

/** مسیرِ *تمرین کردن* هر بخش — نه صفحهٔ کارنامه‌اش در پنل. */
export const AREA_PRACTICE_HREF: Record<BookmarkArea, string> = {
  aruz: "/aruz",
  vocab: "/game/vocab",
  jasoos: "/game/jasoos",
  exam: "/exam",
};

/** گلیفِ هر بخش — همان‌هایی که پنل امروز هم استفاده می‌کند. */
export const AREA_GLYPH: Record<BookmarkArea, string> = {
  aruz: "🎵",
  vocab: "🖼️",
  jasoos: "🕵️",
  exam: "🏅",
};

/** نامی که در پنل نشان داده می‌شود. `AREA_LABEL` برای «عروض» کوتاه است. */
export const AREA_TITLE: Record<BookmarkArea, string> = {
  aruz: "عروض سماعی",
  vocab: "واژه‌یاب",
  jasoos: "جاسوس",
  exam: "آزمون نهایی",
};

/** آخرین روزی که در هر بخش پاسخی ثبت شده. */
export function lastDayByArea(
  dayCounts: PanelOverview["dayCounts"],
): Partial<Record<BookmarkArea, string>> {
  const out: Partial<Record<BookmarkArea, string>> = {};
  for (const row of dayCounts) {
    if (row.total === 0) continue;
    const seen = out[row.area];
    if (!seen || row.day > seen) out[row.area] = row.day;
  }
  return out;
}

function daysSince(day: string, now: Date): number {
  return Math.round((Date.parse(`${tehranDayKey(now)}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
}

/* ───────────────────────── از همین‌جا ادامه بده ───────────────────────── */

export type ResumeItem = {
  area: BookmarkArea;
  title: string;
  /** چرا این مورد اینجاست — به زبانِ کاربر، و همیشه از روی عدد. */
  reason: string;
  href: string;
  glyph: string;
  /** درصدِ دقت؛ نوارِ زیرِ آیتم. `null` یعنی هنوز داده‌ای نیست. */
  percent: number | null;
  cta: string;
};

/**
 * حداکثر سه مورد، هر کدام با یک دلیلِ متفاوت و بدونِ تکرارِ بخش:
 *
 *   ۱. جایی که آخرین بار تمرین کرده — ادامهٔ طبیعیِ کار.
 *   ۲. پایین‌ترین دقت (با دستِ‌کم ۲۰ پاسخ، وگرنه عدد معنایی ندارد).
 *   ۳. بخشی که مدتی سراغش نرفته یا هرگز نرفته.
 *
 * ⚠️ اگر کاربر تازه‌وارد است و هیچ پاسخی ندارد، فهرست خالی برنمی‌گردد —
 * سه بخشِ آغازین با متنِ «شروع کن» برمی‌گردد. صفحهٔ خانهٔ خالی، بدترین
 * چیزی است که یک تازه‌وارد می‌تواند ببیند.
 */
export function resumeItems(overview: PanelOverview, now: Date = new Date()): ResumeItem[] {
  const { counts, dayCounts, exams } = overview;
  const last = lastDayByArea(dayCounts);
  const areas: BookmarkArea[] = ["aruz", "vocab", "jasoos", "exam"];

  const accuracy = (a: BookmarkArea): number | null => {
    if (a === "exam") return exams.attempts > 0 ? exams.average : null;
    const c = counts[a];
    return c.total > 0 ? Math.round((c.correct / c.total) * 100) : null;
  };

  /* ⚠️ «آیا سراغش رفته» را نمی‌شود از `last[area]` فهمید.
     `dayCounts` فقط عروض، واژه‌یاب و جاسوس را دارد — آزمون نهایی جدولِ
     خودش را دارد و در شمارشِ روزانه نمی‌آید. بدونِ این تفکیک، به کسی که
     چهار کارنامه دارد نوشته می‌شد «هنوز سراغش نرفته‌ای» و درست کنارش
     «۷۶٪ دقت». */
  const hasEvidence = (a: BookmarkArea) =>
    a === "exam" ? exams.attempts > 0 : counts[a].total > 0;

  const answered = areas.some(hasEvidence);

  if (!answered) {
    return (["aruz", "vocab", "jasoos"] as BookmarkArea[]).map((area) => ({
      area,
      title: AREA_TITLE[area],
      reason: "هنوز شروعش نکرده‌ای — چند دقیقه برای اولین تمرین کافی است.",
      href: AREA_PRACTICE_HREF[area],
      glyph: AREA_GLYPH[area],
      percent: null,
      cta: "شروع کن",
    }));
  }

  const picked = new Set<BookmarkArea>();
  const out: ResumeItem[] = [];

  const push = (area: BookmarkArea, reason: string, cta: string) => {
    if (picked.has(area) || out.length >= 3) return;
    picked.add(area);
    out.push({
      area,
      title: AREA_TITLE[area],
      reason,
      href: AREA_PRACTICE_HREF[area],
      glyph: AREA_GLYPH[area],
      percent: accuracy(area),
      cta,
    });
  };

  // ۱) تازه‌ترین بخش
  const recent = areas
    .filter((a) => last[a])
    .sort((x, y) => (last[y] as string).localeCompare(last[x] as string))[0];
  if (recent) {
    const gap = daysSince(last[recent] as string, now);
    push(
      recent,
      gap <= 0
        ? "امروز همین‌جا بودی — همین‌جا ادامه بده."
        : gap === 1
          ? "آخرین تمرینت دیروز اینجا بود."
          : `آخرین تمرینت ${faNum(gap)} روز پیش اینجا بود.`,
      "ادامه بده",
    );
  }

  // ۲) ضعیف‌ترین بخش با شواهدِ کافی
  const weakest = areas
    .filter((a) => (a === "exam" ? exams.attempts >= 2 : counts[a].total >= 20))
    .map((a) => ({ a, p: accuracy(a) ?? 100 }))
    .sort((x, y) => x.p - y.p)[0];
  if (weakest && weakest.p < 80) {
    push(weakest.a, `پایین‌ترین دقتت اینجاست — ${faNum(weakest.p)}٪. با تمرین بالا می‌آید.`, "تمرین کن");
  }

  // ۳) بخشی که رها شده — یا هرگز شروع نشده
  for (const area of areas) {
    if (!hasEvidence(area)) {
      push(
        area,
        area === "exam" ? "هنوز آزمونی نداده‌ای." : "هنوز سراغش نرفته‌ای.",
        area === "exam" ? "یک نوبت بده" : "امتحانش کن",
      );
      continue;
    }
    // ⚠️ برای آزمون نهایی *تاریخی* در دست نیست، پس ادعای «چند روز است
    // نیامده‌ای» دربارهٔ آن زده نمی‌شود.
    const day = last[area];
    if (!day) continue;
    const gap = daysSince(day, now);
    if (gap >= 7) push(area, `${faNum(gap)} روز است اینجا نیامده‌ای.`, "برگرد سراغش");
  }

  // اگر هنوز جا هست، بخش‌های باقی‌مانده با متنِ ساده پر می‌کنند.
  for (const area of areas) {
    push(
      area,
      hasEvidence(area)
        ? area === "exam"
          ? `${faNum(exams.attempts)} کارنامه داری — یک نوبت تازه بده.`
          : "یک دور تمرینِ تازه."
        : "هنوز سراغش نرفته‌ای.",
      "تمرین کن",
    );
  }

  return out.slice(0, 3);
}

/* ────────────────────────────────── نشان‌ها ─────────────────────────────── */

export type Badge = {
  id: string;
  title: string;
  glyph: string;
  earned: boolean;
  /** وقتی گرفته شده: چه چیزی آن را ثابت می‌کند. وقتی نه: چقدر مانده. */
  detail: string;
};

/**
 * نشان‌ها، همه از روی همان اعدادِ موجود.
 *
 * ⚠️ تاریخِ گرفتنِ نشان نشان داده نمی‌شود، چون ذخیره نمی‌شود. نوشتنِ یک
 * تاریخِ حدسی زیرِ نشان، دقیقاً همان جعلی است که کاربر متوجهش می‌شود.
 */
export function badges({
  streak,
  best,
  total,
  bookmarks,
  examBest,
}: {
  streak: number;
  best: number;
  total: number;
  bookmarks: number;
  examBest: number;
}): Badge[] {
  const milestone = (value: number, steps: number[]) =>
    steps.find((s) => value < s) ?? steps[steps.length - 1];

  const streakGoal = milestone(best, [3, 7, 14, 30, 100]);
  const answersGoal = milestone(total, [50, 200, 500, 1000, 5000]);

  return [
    {
      id: "streak",
      title: `${faNum(streakGoal)} روز پیاپی`,
      glyph: "🔥",
      earned: best >= streakGoal,
      detail:
        best >= streakGoal
          ? `رکوردت ${faNum(best)} روز است`
          : `${faNum(streakGoal - streak)} روز دیگر تا این نشان`,
    },
    {
      id: "answers",
      title: `${faNum(answersGoal)} پاسخ`,
      glyph: "📜",
      earned: total >= answersGoal,
      detail:
        total >= answersGoal
          ? `${faNum(total)} پاسخ ثبت کرده‌ای`
          : `${faNum(answersGoal - total)} پاسخ دیگر`,
    },
    {
      id: "exam",
      title: "کارنامهٔ بالای ۸۰",
      glyph: "🏅",
      earned: examBest >= 80,
      detail: examBest > 0 ? `بهترین کارنامه‌ات ${faNum(examBest)}٪` : "هنوز آزمونی نداده‌ای",
    },
    {
      id: "bookmarks",
      title: "ده نشان‌شده",
      glyph: "🔖",
      earned: bookmarks >= 10,
      detail:
        bookmarks >= 10
          ? `${faNum(bookmarks)} مورد نشان کرده‌ای`
          : `${faNum(10 - bookmarks)} مورد دیگر نشان کن`,
    },
  ];
}

/** رقم فارسی — نسخهٔ محلیِ `fa` تا این ماژول به format.ts وابسته نشود. */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export { AREA_LABEL };
