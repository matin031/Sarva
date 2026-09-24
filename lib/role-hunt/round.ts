import type { GradeKey } from "@/lib/doroos/types";
import type { GrammarCircuitQuestion } from "@/lib/grammar-circuit/types";
import { grammarRoleLabel, isGrammarRoleKey } from "@/lib/grammar-circuit/roles";
import type {
  RoleHuntLine,
  RoleHuntResolvedAnswer,
  RoleHuntRound,
  RoleHuntToken,
} from "./types";

/**
 * تبدیلِ یک پرسشِ «مدارِ دستور» به یک دورِ «شکار نقش‌ها» — منطقِ خالص.
 *
 * ⚠️ بدونِ دیتابیس، بدونِ شبکه، بدونِ React. همان الگوی
 * `lib/grammar-circuit/matching.ts` و `lib/plus/skill-buckets.ts`: قاعده‌ای
 * که تعیین می‌کند «پاسخِ درست کدام است» باید بدونِ بالا آوردنِ یک دیتابیس
 * آزمودنی باشد.
 *
 * =============================================================================
 * ⚠️ همهٔ واژه‌های مصراع در مدار می‌چرخند
 * =============================================================================
 *
 * نسخهٔ اول فقط واژه‌هایی را می‌چرخاند که در «مدارِ دستور» سوکت دارند —
 * یعنی نقششان تأیید شده. استدلالش این بود که واژهٔ بی‌سوکت لزوماً بی‌نقش
 * نیست؛ در یکی از رکوردهای دهم، نویسنده صریح نوشته:
 *
 *     «یکی» با وجود صفت شمارشی بودن عمداً وارد Slotها نشده …
 *
 * ولی نتیجه‌اش یک مصراعِ نصفه بود: از هفت واژه، سه‌تا می‌چرخید و بقیه فقط
 * در متن بودند — که هم بازی را آسان می‌کرد و هم عجیب به نظر می‌رسید.
 *
 * حالا مدار کاملِ مصراع است. `hasConfirmedRole` روی هر توکن می‌ماند تا
 * معلوم باشد کدام واژه نقشِ *تأییدشده* دارد و کدام فقط حواس‌پرت‌کن است.
 *
 * ⚠️ و بهایش را باید صریح نوشت: واژه‌ای که سوکت ندارد ممکن است در واقع
 * همان نقشِ هدف را داشته باشد و ما «غلط» ثبت کنیم. صافیِ «نقشِ هدف باید
 * دقیقاً یک دارنده داشته باشد» این ریسک را کم می‌کند ولی صفر نمی‌کند.
 * راهِ واقعیِ بستنش این است که بانکِ «مدارِ دستور» برای هر واژه سوکت
 * بگذارد — که کارِ محتواست، نه کارِ این فایل.
 *
 * =============================================================================
 * ⚠️ چرا نقشِ هدف *از خودِ پرسش* درمی‌آید و نه از کلاینت
 * =============================================================================
 *
 * اگر مرورگر می‌گفت «نقشِ این دور مسند بود»، کسی که کنسول را باز کند
 * می‌توانست همیشه همان نقشی را بفرستد که واژهٔ کلیک‌شده‌اش دارد و یک
 * تاریخچهٔ بی‌نقصِ ساختگی بسازد. حالا نقش، تابعِ *خالصِ* خودِ پرسش است:
 * سرور همان تابع را دوباره اجرا می‌کند و کلاینت اصلاً حرفی در آن ندارد.
 *
 * قیمتش این است که هر پرسش همیشه همان نقش را می‌پرسد. با بیش از سیصد
 * مصراعِ واجد شرایط، این هزینه‌ای نیست که دانش‌آموز حسش کند — و در عوض دور
 * بازتولیدپذیر است: گزارشِ «این سؤال غلط است» همیشه به همان سؤال می‌رسد.
 */

/** کمینهٔ واژه‌های مدار. زیرِ سه‌تا، بازی به حدس زدن تبدیل می‌شود. */
export const MIN_ORBIT_TOKENS = 3;

/**
 * بیشینهٔ واژه‌های مدار — کرانِ چیدمان، نه کرانِ محتوا.
 *
 * ⚠️ از ۷ به ۱۲ رسید، چون حالا کلِ مصراع می‌چرخد و نه فقط واژه‌های
 * سوکت‌دار. اندازه‌گیریِ بانک: بلندترین مصراعِ واجدِ شرایط ۱۱ واژه دارد.
 */
export const MAX_ORBIT_TOKENS = 12;

/** فقط شعر. جمله‌های درسنامه مدار نمی‌گیرند؛ این بازی دربارهٔ مصراع است. */
const ALLOWED_TYPES = new Set(["hemistich", "verse"]);


/** متنِ پرسش، دقیقاً همان‌طور که نمایش داده می‌شود. */
export function verseTextOf(question: GrammarCircuitQuestion): string {
  return question.tokens
    .map((t) => t.text + t.separatorAfter)
    .join("")
    .trim();
}

/**
 * متنِ یک دور، از روی خطوطش.
 *
 * ⚠️ همان رشته‌ای را می‌سازد که `verseTextOf` از خودِ پرسش می‌ساخت، ولی
 * کلاینت پرسشِ خام را ندارد — فقط دور را دارد. دو پیاده‌سازی برای یک رشته
 * خطرِ واگرایی دارد، پس هر دو از یک قاعده می‌آیند: متنِ توکن + جداکننده‌اش،
 * و `/` که جای خط را می‌گیرد.
 */
export function verseTextOfRound(round: RoleHuntRound): string {
  return round.lines
    .map((line) => line.map((t, i) => t.text + (i < line.length - 1 ? t.separatorAfter : "")).join("").trim())
    .join(" / ");
}

/** توکن‌ها → مصراع‌ها. جداکنندهٔ « / » یعنی «خطِ بعد». */
function toLines(tokens: readonly RoleHuntToken[], separators: readonly string[]): RoleHuntLine[] {
  const lines: RoleHuntLine[] = [];
  let current: RoleHuntToken[] = [];

  tokens.forEach((token, index) => {
    current.push(token);
    if (separators[index]?.includes("/")) {
      lines.push(current);
      current = [];
    }
  });
  if (current.length > 0) lines.push(current);

  return lines;
}

/**
 * پرسشِ «مدارِ دستور» → دورِ «شکار نقش‌ها»، یا `null` اگر واجد شرایط نیست.
 *
 * شرط‌ها به ترتیبِ ارزانی سنجیده می‌شوند، ولی ترتیبشان معنایی هم دارد:
 * اول «آیا اصلاً شعر است»، بعد «آیا مدار به اندازهٔ کافی گزینه دارد»، و
 * آخر «آیا نقشی هست که پاسخش *یکتا* باشد».
 */
/**
 * چرا یک پرسش به بازی نمی‌رسد.
 *
 * ⚠️ این برای پنلِ مدیریت است و نه برای بازی. نویسندهٔ محتوا باید بتواند
 * بفهمد چرا مصراعی که نوشته در «شکار نقش‌ها» دیده نمی‌شود — وگرنه تنها
 * بازخوردش «نیست» است و هیچ راهی برای درست کردنش ندارد.
 */
export type RoleHuntRejection =
  | "not_poetry"
  | "too_few_words"
  | "too_many_words"
  | "no_unique_role";

export const ROLE_HUNT_REJECTION_LABEL: Record<RoleHuntRejection, string> = {
  not_poetry: "جمله است و نه مصراع",
  too_few_words: "واژه‌های مصراع کم‌اند",
  too_many_words: "مصراع بلندتر از ظرفیتِ مدار است",
  no_unique_role: "هیچ نقشی نیست که فقط یک واژه داشته باشد",
};

export type RoleHuntEligibility =
  | { ok: true; round: RoleHuntRound }
  | { ok: false; reason: RoleHuntRejection; detail: string };

/**
 * سنجشِ واجدِ شرایط بودن — با دلیل.
 *
 * ⚠️ `buildRoleHuntRound` خودش روی همین می‌نشیند و نه برعکس. اگر دو
 * پیاده‌سازی می‌بود، روزی پنل می‌گفت «این مصراع سالم است» و بازی نشانش
 * نمی‌داد — و هیچ‌کس نمی‌فهمید کدام راست می‌گوید.
 */
export function explainRoleHuntEligibility(
  question: GrammarCircuitQuestion,
): RoleHuntEligibility {
  if (!ALLOWED_TYPES.has(question.type)) {
    return {
      ok: false,
      reason: "not_poetry",
      detail: `نوعِ این پرسش «${question.type}» است؛ این بازی فقط مصراع و بیت می‌گیرد.`,
    };
  }

  const tokens: RoleHuntToken[] = question.tokens.map((t) => ({
    id: t.id,
    text: t.text,
    separatorAfter: t.separatorAfter,
    hasConfirmedRole: Boolean(t.roleSlot),
  }));

  // کلِ مصراع می‌چرخد — نه فقط واژه‌هایی که سوکت دارند.
  const orbit = tokens;
  if (orbit.length < MIN_ORBIT_TOKENS) {
    return {
      ok: false,
      reason: "too_few_words",
      detail: `${orbit.length} واژه دارد و کمینه ${MIN_ORBIT_TOKENS} لازم است.`,
    };
  }
  if (orbit.length > MAX_ORBIT_TOKENS) {
    return {
      ok: false,
      reason: "too_many_words",
      detail: `${orbit.length} واژه دارد و بیشینه ${MAX_ORBIT_TOKENS} در مدار جا می‌شود.`,
    };
  }

  /* چند واژهٔ مدار هر نقش را می‌پذیرند. `Set` به‌ازای هر سوکت، چون یک سوکت
     می‌تواند یک کلید را دو بار فهرست کرده باشد و آن نباید دو بار شمرده شود. */
  const holders = new Map<string, string[]>();
  for (const token of question.tokens) {
    if (!token.roleSlot) continue;
    for (const key of new Set(token.roleSlot.acceptedRoleKeys)) {
      const list = holders.get(key);
      if (list) list.push(token.id);
      else holders.set(key, [token.id]);
    }
  }

  /* ⚠️ دو صافی، و هر دو دربارهٔ کیفیت‌اند و نه دربارهٔ کد:
       • `length === 1` → پاسخ یکتاست. نقشی که دو واژه دارند، یا بازی را
         بی‌معنی می‌کند (دو گزینه از سه گزینه درست) یا ما را مجبور به
         «چند پاسخِ درست» می‌کند که سنجشِ مهارت را مبهم می‌کند.
       • `isGrammarRoleKey` → نقش در کاتالوگِ متعارف هست. محتوا چند کلیدِ
         محلی دارد (`copular_verb`، `preposition`) که برچسبِ فارسی ندارند؛
         نشان دادنِ `copular_verb` به دانش‌آموز بدتر از نپرسیدن است. */
  const candidates = [...holders.entries()]
    .filter(([key, ids]) => ids.length === 1 && isGrammarRoleKey(key))
    .map(([key, ids]) => ({ key, tokenId: ids[0]! }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  if (candidates.length === 0) {
    const shared = [...holders.entries()].filter(([, ids]) => ids.length > 1).length;
    return {
      ok: false,
      reason: "no_unique_role",
      detail: holders.size === 0
        ? "هیچ واژه‌ای نقشِ تأییدشده ندارد."
        : shared > 0
          ? `${shared} نقش بیش از یک دارنده دارد، پس پاسخ یکتا نیست.`
          : "نقش‌های موجود در کاتالوگِ متعارف نیستند.",
    };
  }

  /* ⚠️ *همهٔ* نقش‌های یکتا پرسیده می‌شوند و نه یکی.

     نسخهٔ قبلی با یک هش یکی را برمی‌داشت و بقیه دور ریخته می‌شدند — یعنی
     از مصراعی که چهار نقشِ تأییدشده داشت، سه‌تایش هیچ‌وقت تمرین نمی‌شد.
     حالا بازیکن بیت را یک بار می‌خواند و پشتِ هم به همه جواب می‌دهد.

     ⚠️ ترتیب قطعی است (`candidates` از قبل بر اساسِ کلید مرتب شده) و همین
     قطعیت است که اجازه می‌دهد سرور از روی *اندیس* بفهمد کدام نقش پرسیده
     شده. اگر ترتیب تصادفی بود، مرورگر باید نقش را می‌فرستاد و آن‌وقت
     می‌توانست دروغ بگوید. */
  const asks = candidates.map((c) => ({
    roleKey: c.key,
    roleLabel: grammarRoleLabel(c.key),
    correctTokenId: c.tokenId,
  }));

  return {
    ok: true,
    round: {
      questionId: question.id,
      sourceId: question.sourceId ?? null,
      grade: (question.grade as GradeKey | undefined) ?? null,
      lesson: question.lesson ?? null,
      lines: toLines(tokens, question.tokens.map((t) => t.separatorAfter)),
      orbit,
      asks,
    },
  };
}

/** پرسشِ «مدارِ دستور» → دورِ «شکار نقش‌ها»، یا `null` اگر واجد شرایط نیست. */
export function buildRoleHuntRound(question: GrammarCircuitQuestion): RoleHuntRound | null {
  const result = explainRoleHuntEligibility(question);
  return result.ok ? result.round : null;
}

/**
 * سنجشِ یک پاسخ روی سرور.
 *
 * ⚠️ ورودیِ کلاینت فقط `selectedTokenId` است. نقشِ هدف، پاسخِ درست و متنِ
 * مصراع همگی از دیتابیس و از همین تابع درمی‌آیند — پس هیچ ادعایی دربارهٔ
 * درست/غلط، نه صریح و نه ضمنی، از مرورگر پذیرفته نمی‌شود.
 */
export function resolveRoleHuntAnswer(
  question: GrammarCircuitQuestion,
  askIndex: number,
  selectedTokenId: string,
): RoleHuntResolvedAnswer | null {
  const round = buildRoleHuntRound(question);
  if (!round) return null;

  /* ⚠️ اندیس از مرورگر می‌آید ولی *معنایش* را سرور می‌سازد: همان تابعِ
     خالص دوباره اجرا شده و `asks` را با همان ترتیب ساخته. پس مرورگر فقط
     می‌گوید «چندمین پرسش» و نمی‌تواند نقش یا پاسخِ درست را جعل کند. */
  const ask = round.asks[askIndex];
  if (!ask) return null;

  /* فقط واژه‌های مدار قابلِ انتخاب‌اند. شناسه‌ای بیرونِ مدار یعنی یا کلاینتِ
     کهنه است یا کسی دارد امتحان می‌کند؛ هر دو حالت «ثبت نکن». */
  const chosenToken = round.orbit.find((t) => t.id === selectedTokenId);
  if (!chosenToken) return null;

  const correctToken = round.orbit.find((t) => t.id === ask.correctTokenId);
  if (!correctToken) return null;

  return {
    round,
    ask,
    chosenToken,
    correctToken,
    isCorrect: chosenToken.id === correctToken.id,
    verse: verseTextOf(question),
  };
}

/** خلاصهٔ یک نشست — همان چیزی که صفحهٔ نتیجه نشان می‌دهد. */
export interface RoleHuntSummary {
  total: number;
  correct: number;
  wrong: number;
  /** بین ۰ و ۱؛ با صفر پاسخ، صفر. */
  accuracy: number;
  bestStreak: number;
  /** ضعیف‌ترین نقش‌های همین نشست — فقط نقش‌هایی که غلطی در آن‌ها بوده. */
  weakRoles: { roleKey: string; roleLabel: string; total: number; wrong: number }[];
  /**
   * *همهٔ* نقش‌های این نشست، ضعیف‌ترین اول.
   *
   * ⚠️ جدا از `weakRoles` و نه جایگزینش: صفحهٔ نتیجه باید نقش‌هایی را هم که
   * کامل درست زده شده‌اند نشان بدهد، وگرنه بعد از یک نشستِ خوب هم فقط
   * فهرستِ شکست دیده می‌شود. `weakRoles` جای خودش را دارد (پیشنهادِ تمرین).
   */
  roleBreakdown: { roleKey: string; roleLabel: string; total: number; correct: number }[];
}

/**
 * جمع‌بندیِ نشست از روی پاسخ‌های همین نشست.
 *
 * ⚠️ عمداً جای «تحلیل» را نمی‌گیرد: این فقط گزارشِ یک نشستِ هشت‌دوری است و
 * صفحهٔ نتیجه هم همین را می‌گوید. تحلیلِ واقعیِ نقش‌ها روی *همهٔ* بازی‌ها و
 * همهٔ تاریخچه در `lib/plus/analysis.ts` انجام می‌شود، و دکمهٔ صفحهٔ نتیجه
 * به همان‌جا می‌برد.
 */
export function summarizeRoleHuntSession(
  answers: readonly { roleKey: string; roleLabel: string; isCorrect: boolean }[],
): RoleHuntSummary {
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  const byRole = new Map<string, { roleLabel: string; total: number; wrong: number }>();

  for (const answer of answers) {
    if (answer.isCorrect) {
      correct += 1;
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }

    const entry = byRole.get(answer.roleKey) ?? { roleLabel: answer.roleLabel, total: 0, wrong: 0 };
    entry.total += 1;
    if (!answer.isCorrect) entry.wrong += 1;
    byRole.set(answer.roleKey, entry);
  }

  const total = answers.length;

  return {
    total,
    correct,
    wrong: total - correct,
    accuracy: total === 0 ? 0 : correct / total,
    bestStreak,
    weakRoles: [...byRole.entries()]
      .filter(([, v]) => v.wrong > 0)
      .map(([roleKey, v]) => ({ roleKey, roleLabel: v.roleLabel, total: v.total, wrong: v.wrong }))
      .sort((a, b) => b.wrong - a.wrong || b.total - a.total),
    roleBreakdown: [...byRole.entries()]
      .map(([roleKey, v]) => ({
        roleKey,
        roleLabel: v.roleLabel,
        total: v.total,
        correct: v.total - v.wrong,
      }))
      // ضعیف‌ترین اول: همان چیزی که باید اول دیده شود.
      .sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total),
  };
}
