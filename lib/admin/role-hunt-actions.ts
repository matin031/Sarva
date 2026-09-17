"use server";

import { query, queryOne } from "@/lib/db";
import { isMissingTable } from "@/lib/db/errors";
import { requireAdmin } from "@/lib/require-admin";
import { rowsToQuestions, type GrammarCircuitRow } from "@/lib/grammar-circuit/server/rows";
import {
  ROLE_HUNT_REJECTION_LABEL,
  explainRoleHuntEligibility,
  verseTextOfRound,
  type RoleHuntRejection,
} from "@/lib/role-hunt/round";

/**
 * مدیریتِ «شکار نقش‌ها».
 *
 * =============================================================================
 * ⚠️ این بازی بانکِ سؤالِ خودش را ندارد — و این یک نقص نیست، یک تصمیم است
 * =============================================================================
 *
 * هر دور از یک پرسشِ منتشرشدهٔ «مدارِ دستور» ساخته می‌شود. نقشِ دستوریِ یک
 * واژه در یک مصراع، داده‌ای است که یک انسان تأیید کرده؛ نگه داشتنِ دو نسخه
 * از همان مصراع یعنی دو حقیقتِ موازی که روزی با هم اختلاف پیدا می‌کنند و
 * آن روز هیچ‌کس نمی‌داند کدام درست است.
 *
 * پس این صفحه یک *ویرایشگر* نیست، یک **ذره‌بین** است: نشان می‌دهد کدام
 * مصراع‌ها به بازی می‌رسند، هرکدام چه نقشی می‌پرسند و پاسخشان کدام واژه
 * است — و مهم‌تر، کدام‌ها نمی‌رسند و **چرا**.
 *
 * ⚠️ همان دلیلِ آخر تمامِ ارزشِ این صفحه است. بدونش، نویسنده‌ای که مصراعی
 * نوشته و در بازی نمی‌بیندش، هیچ راهی برای فهمیدنِ علت ندارد. ویرایش هم
 * از همین‌جا به ویرایشگرِ «مدارِ دستور» پیوند می‌خورد و نه یک فرمِ دوم.
 *
 * ⚠️ هیچ‌کدام از توابعِ اینجا چیزی نمی‌نویسند. تنها نوشتنِ این بازی، ثبتِ
 * پاسخِ دانش‌آموز است که از مسیرِ خودش می‌رود.
 */

/** سقفِ ردیف‌هایی که یک بار خوانده می‌شود — کوئری باید کران‌دار بماند. */
const SCAN_CAP = 3000;

export type RoleHuntAdminTotals = {
  /** مصراع و بیتِ منتشرشده در «مدارِ دستور». */
  poetry: number;
  /** از آن‌ها، چندتا واقعاً به بازی می‌رسند. */
  eligible: number;
  /** تفکیکِ دلیلِ ردشدن. */
  rejected: Record<RoleHuntRejection, number>;
  /** پاسخ‌های ثبت‌شدهٔ بازی. `null` یعنی جدول روی این دیتابیس نیست. */
  answers: number | null;
  /** نامِ جدولِ گم‌شده، اگر مهاجرت ۰۱۷ اجرا نشده باشد. */
  missingTable: string | null;
};

export type RoleHuntAdminRow = {
  questionId: string;
  sourceId: string | null;
  grade: string | null;
  lesson: number | null;
  verse: string;
  /** واجدِ شرایط؟ */
  eligible: boolean;
  /** نقشی که این مصراع می‌پرسد — فقط وقتی واجد شرایط است. */
  roleKey: string | null;
  roleLabel: string | null;
  /** واژه‌ای که پاسخِ درست است. */
  answer: string | null;
  /** تعدادِ واژه‌های مدار. */
  words: number;
  /** اگر رد شده: دلیل و توضیحش. */
  reason: RoleHuntRejection | null;
  reasonLabel: string | null;
  detail: string | null;
};

/** همهٔ شعرهای منتشرشده، یک بار خوانده و یک بار سنجیده. */
async function scan(): Promise<RoleHuntAdminRow[]> {
  const rows = await query<GrammarCircuitRow>(
    `select id, source_id, grade, lesson, question_type, payload,
            difficulty, explanation, attribution
       from grammar_circuit_questions
      where is_published
        and question_type in ('hemistich', 'verse')
      order by grade, lesson, sort_index
      limit ?`,
    [SCAN_CAP],
  );

  /* ⚠️ همان تبدیل و اعتبارسنجی‌ای که خودِ بازی از آن استفاده می‌کند.
     payloadِ خراب اینجا هم باید همان‌طور رد شود که آنجا می‌شود، وگرنه پنل
     چیزی را «سالم» نشان می‌دهد که بازیکن هرگز نمی‌بیند. */
  const { questions } = rowsToQuestions(rows);

  return questions.map((q) => {
    const result = explainRoleHuntEligibility(q);
    if (result.ok) {
      const { round } = result;
      return {
        questionId: q.id,
        sourceId: q.sourceId ?? null,
        grade: q.grade ?? null,
        lesson: q.lesson ?? null,
        verse: verseTextOfRound(round),
        eligible: true,
        roleKey: round.roleKey,
        roleLabel: round.roleLabel,
        answer: round.orbit.find((t) => t.id === round.correctTokenId)?.text ?? null,
        words: round.orbit.length,
        reason: null,
        reasonLabel: null,
        detail: null,
      };
    }
    return {
      questionId: q.id,
      sourceId: q.sourceId ?? null,
      grade: q.grade ?? null,
      lesson: q.lesson ?? null,
      verse: q.tokens.map((t) => t.text + t.separatorAfter).join("").trim(),
      eligible: false,
      roleKey: null,
      roleLabel: null,
      answer: null,
      words: q.tokens.length,
      reason: result.reason,
      reasonLabel: ROLE_HUNT_REJECTION_LABEL[result.reason],
      detail: result.detail,
    };
  });
}

export async function roleHuntAdminTotals(): Promise<RoleHuntAdminTotals> {
  await requireAdmin();
  const all = await scan();

  const rejected: Record<RoleHuntRejection, number> = {
    not_poetry: 0,
    too_few_words: 0,
    too_many_words: 0,
    no_unique_role: 0,
  };
  for (const r of all) if (r.reason) rejected[r.reason] += 1;

  /* ⚠️ «جدول نیست» با «خالی است» یکی نیست و نباید یک پیام بگیرند — همان
     درسی که کارتِ «کوتاه یا بلند؟» در `app/admin/games/page.tsx` داد. اگر
     مهاجرت ۰۱۷ روی هاست اجرا نشده باشد، هیچ کاری از داخلِ پنل درستش
     نمی‌کند و مدیر باید بداند مشکل کجاست. */
  let answers: number | null = null;
  let missingTable: string | null = null;
  try {
    const row = await queryOne<{ n: number }>(`select count(*) as n from role_hunt_answers`);
    answers = Number(row?.n ?? 0);
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    missingTable = "role_hunt_answers";
  }

  return {
    poetry: all.length,
    eligible: all.filter((r) => r.eligible).length,
    rejected,
    answers,
    missingTable,
  };
}

export type RoleHuntAdminFilter = {
  /** `"eligible"` | `"rejected"` | `"all"` */
  status?: string;
  /** کلیدِ نقش، یا خالی برای همه. */
  role?: string;
  /** جست‌وجو در متنِ مصراع. */
  search?: string;
};

export type RoleHuntAdminList = {
  rows: RoleHuntAdminRow[];
  /** چند مصراع به‌ازای هر نقش — برای دیدنِ توزیعِ بانک. */
  byRole: { roleKey: string; roleLabel: string; count: number }[];
  total: number;
};

/** سقفِ ردیف‌های نمایشی. فهرستِ هزارتایی را کسی نمی‌خواند. */
const PAGE = 150;

export async function roleHuntAdminList(
  filter: RoleHuntAdminFilter = {},
): Promise<RoleHuntAdminList> {
  await requireAdmin();
  const all = await scan();

  const byRoleMap = new Map<string, { roleLabel: string; count: number }>();
  for (const r of all) {
    if (!r.eligible || !r.roleKey) continue;
    const entry = byRoleMap.get(r.roleKey) ?? { roleLabel: r.roleLabel ?? r.roleKey, count: 0 };
    entry.count += 1;
    byRoleMap.set(r.roleKey, entry);
  }

  const needle = (filter.search ?? "").trim();
  const filtered = all.filter((r) => {
    if (filter.status === "eligible" && !r.eligible) return false;
    if (filter.status === "rejected" && r.eligible) return false;
    if (filter.role && r.roleKey !== filter.role) return false;
    if (needle && !r.verse.includes(needle)) return false;
    return true;
  });

  return {
    rows: filtered.slice(0, PAGE),
    byRole: [...byRoleMap.entries()]
      .map(([roleKey, v]) => ({ roleKey, ...v }))
      .sort((a, b) => b.count - a.count),
    total: filtered.length,
  };
}
