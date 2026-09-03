import type { ReportArea } from "@/lib/reports/constants";

/**
 * «رفتن به بخش» باید *همان سؤال* را باز کند، نه فهرستِ بخش را.
 *
 * ⚠️ چرا این یک فایلِ جداست و نه چند رشتهٔ ثابت در `constants`:
 *
 * بیشترِ پنل‌های سروا محدوده‌دارند. `/admin/vocab` بدونِ پایه و درس یعنی
 * «درسِ دومِ دهم»، و `/admin/games/pairs` بدونِ پایه و نوبت یعنی اولین دسته.
 * پس نشانیِ یک واژه فقط شناسه‌اش نیست؛ *محدوده‌اش* هم هست. آن محدوده در
 * خودِ گزارش نیست — در ردیفِ محتوا است — و باید از پایگاه‌داده خوانده شود.
 *
 * این فایل فقط نشانی می‌سازد و به پایگاه‌داده دست نمی‌زند، تا بشود بدونِ
 * دیتابیس آزمودش.
 */

/** ستون‌هایی که برای نشانی‌دادنِ یک محتوا لازم‌اند، هر کدام که وجود داشته باشد. */
export type ContentScope = {
  grade?: string | null;
  lesson?: number | null;
  term?: string | null;
  categoryId?: string | null;
  examId?: string | null;
};

/** پارامتری که همهٔ پنل‌ها با آن «این ردیف را نشانم بده» را می‌فهمند. */
export const FOCUS_PARAM = "focus";

function withParams(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * نشانیِ ویرایشِ یک محتوا، یا `null` اگر آن بخش اصلاً پنلی ندارد.
 *
 * بدونِ `targetId` هم کار می‌کند: آن‌وقت فقط تا صفحهٔ بخش می‌برد، که هنوز از
 * هیچ بهتر است.
 */
export function contentHref(
  area: ReportArea,
  targetId: string | null | undefined,
  scope: ContentScope = {},
): string | null {
  const focus = targetId?.trim() || undefined;
  const grade = scope.grade ?? undefined;
  const lesson = scope.lesson != null ? String(scope.lesson) : undefined;

  switch (area) {
    case "quiz":
      return withParams("/admin/quiz", { [FOCUS_PARAM]: focus });

    case "vocab":
      return withParams("/admin/vocab", { grade, lesson, [FOCUS_PARAM]: focus });

    case "grammar_circuit":
      return withParams("/admin/games/grammar-circuit", {
        grade,
        lesson,
        [FOCUS_PARAM]: focus,
      });

    case "jasoos":
      return withParams("/admin/games/jasoos", { [FOCUS_PARAM]: focus });

    case "ninja":
      return withParams("/admin/games/ninja", {
        category: scope.categoryId ?? undefined,
        [FOCUS_PARAM]: focus,
      });

    case "pairs": {
      /* گزارشِ جفت‌ها روی *دسته* است نه روی یک جفت — کاربر یک تختهٔ کامل
         می‌بیند و نمی‌داند کدام جفت غلط بوده. شناسه‌اش هم به‌شکلِ
         «پایه:نوبت» ساخته می‌شود، پس همان محدوده را از خودش می‌خوانیم و
         `focus` نمی‌فرستیم؛ لینکِ درست همان دستهٔ باز است. */
      const [deckGrade, deckTerm] = (focus ?? "").split(":");
      return withParams("/admin/games/pairs", {
        grade: grade ?? (deckGrade || undefined),
        term: scope.term ?? (deckTerm || undefined),
      });
    }

    case "exam": {
      /* شناسهٔ سؤالِ امتحان «کلیدِ آزمون#شمارهٔ سؤال» است. صفحهٔ آزمون با
         *شماره* کار می‌کند نه با کلید، پس همان نیمهٔ دوم را می‌فرستیم. */
      const number = focus?.split("#")[1];
      return scope.examId
        ? withParams(`/admin/exams/${scope.examId}`, { [FOCUS_PARAM]: number })
        : "/admin/exams";
    }

    case "aruz_bridge":
      /* «پلِ وزن» پنلِ ویرایش ندارد؛ محتوایش فقط از کنسول SQL عوض می‌شود.
         بردنِ مدیر به `/admin/games` — که اصلاً کارتِ این بازی را ندارد — یعنی
         بن‌بست. پس با یک کوئریِ آمادهٔ همان ردیف به کنسول می‌رویم. */
      return withParams("/admin/sql", {
        q: focus
          ? `select * from aruz_bridge_questions where id = '${focus.replace(/'/g, "''")}';`
          : "select * from aruz_bridge_questions order by sort_index limit 50;",
      });

    case "aruz_rapid":
    case "doroos":
    case "other":
      // محتوایشان فایل یا بستهٔ داخلِ کد است — هیچ صفحه‌ای در پنل ویرایششان
      // نمی‌کند، و لینکی که به جای بی‌ربط برود بدتر از نبودنِ لینک است.
      return null;
  }
}
