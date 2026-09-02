"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg, enumArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import {
  REPORT_AREAS,
  REPORT_PAGE_SIZE,
  REPORT_STATUSES,
  type ReportArea,
  type ReportReason,
  type ReportStatus,
} from "@/lib/reports/constants";

/**
 * خواندن و رسیدگی به گزارش‌های محتوا.
 *
 * دو چیز که این فایل عمداً *نمی‌کند*:
 *
 *   • خودِ محتوا را ویرایش نمی‌کند. اصلاحِ یک سؤال کارِ صفحهٔ همان بخش است
 *     (پنلِ عروض، پنلِ بازی‌ها، کنسول SQL). این فایل فقط چرخهٔ رسیدگی را
 *     می‌گرداند و راه را نشان می‌دهد.
 *
 *   • ایمیل یا IP گزارش‌دهنده را به پنل نمی‌فرستد. برای رسیدگی لازم نیست
 *     بدانید *چه کسی* گزارش داده؛ فقط «کاربرِ واردشده بوده یا مهمان».
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

export type AdminReport = {
  id: string;
  area: ReportArea;
  targetId: string | null;
  targetRef: Record<string, unknown>;
  snapshot: string | null;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  adminNote: string | null;
  /** فقط «وارد بوده یا نه» — نه ایمیل، نه شناسه. */
  fromMember: boolean;
  requestId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  /** چند گزارشِ دیگر برای همین محتوا ثبت شده. */
  duplicates: number;
};

type Row = {
  id: string;
  area: ReportArea;
  target_id: string | null;
  target_ref: Record<string, unknown> | null;
  snapshot: string | null;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  admin_note: string | null;
  has_user: boolean;
  request_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  duplicates: number;
  total_count: number;
};

export type ReportFilter = {
  area?: string;
  status?: string;
  /** جست‌وجو در متنِ محتوا، توضیح کاربر و یادداشت مدیر. */
  search?: string;
  limit?: number;
  offset?: number;
};

function toAdmin(r: Row): AdminReport {
  return {
    id: r.id,
    area: r.area,
    targetId: r.target_id,
    targetRef: r.target_ref ?? {},
    snapshot: r.snapshot,
    reason: r.reason,
    note: r.note,
    status: r.status,
    adminNote: r.admin_note,
    fromMember: r.has_user,
    requestId: r.request_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
    duplicates: r.duplicates,
  };
}

export async function reportAdminList(
  filter: ReportFilter = {},
): Promise<{ rows: AdminReport[]; total: number; openCount: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  if (filter.area) {
    if (!(REPORT_AREAS as readonly string[]).includes(filter.area)) {
      return { rows: [], total: 0, openCount: 0 };
    }
    values.push(filter.area);
    conditions.push(`r.area = $${values.length}`);
  }
  if (filter.status) {
    if (!(REPORT_STATUSES as readonly string[]).includes(filter.status)) {
      return { rows: [], total: 0, openCount: 0 };
    }
    values.push(filter.status);
    conditions.push(`r.status = $${values.length}`);
  }

  const search = filter.search?.trim();
  if (search) {
    // ⚠️ ILIKE با پارامتر، نه با چسباندنِ رشته. `%` و `_` کاربر هم به‌عنوان
    // متن رفتار می‌کنند چون escape می‌شوند — وگرنه یک `%` تنها همهٔ ردیف‌ها
    // را برمی‌گرداند.
    const escaped = search.replace(/[\\%_]/g, (c) => `\\${c}`);
    values.push(`%${escaped}%`);
    const p = `$${values.length}`;
    conditions.push(
      `(r.snapshot ilike ${p} escape '\\' or r.note ilike ${p} escape '\\' or r.admin_note ilike ${p} escape '\\' or r.target_id ilike ${p} escape '\\')`,
    );
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const limit = Math.min(Math.max(filter.limit ?? REPORT_PAGE_SIZE, 1), 200);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(Math.max(filter.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const rows = await query<Row>(
    `select r.id, r.area, r.target_id, r.target_ref, r.snapshot, r.reason, r.note,
            r.status, r.admin_note, (r.user_id is not null) as has_user,
            r.request_id, r.created_at, r.updated_at, r.resolved_at,
            coalesce(d.n, 1) - 1 as duplicates,
            count(*) over () as total_count
       from content_reports r
       left join lateral (
         select count(*)::int as n
           from content_reports x
          where x.area = r.area
            and x.target_id is not null
            and x.target_id = r.target_id
       ) d on true
       ${where}
      order by (r.status = 'open') desc, r.created_at desc, r.id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

  const open = await queryOne<{ n: number }>(
    "select count(*) as n from content_reports where status = 'open'",
  );

  return {
    rows: rows.map(toAdmin),
    total: rows[0]?.total_count ?? 0,
    openCount: open?.n ?? 0,
  };
}

/** شمارِ گزارش‌های باز به تفکیک بخش — برای نشان‌های فیلتر. */
export async function reportAdminCounts(): Promise<Record<string, number>> {
  await requireAdmin();
  const rows = await query<{ area: string; n: number }>(
    "select area, count(*)::int as n from content_reports where status = 'open' group by area",
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.area] = r.n;
  return out;
}

/** تعداد گزارش‌های باز — برای نشانِ کنارِ منو و داشبورد. */
export async function openReportCount(): Promise<number> {
  try {
    const row = await queryOne<{ n: number }>(
      "select count(*) as n from content_reports where status = 'open'",
    );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(REPORT_STATUSES),
  adminNote: z.string().trim().max(1000).nullish(),
});

export async function reportAdminSetStatus(
  input: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  const { id, status, adminNote } = parsed.data;

  const closing = status === "resolved" || status === "rejected";
  const row = await queryOne<{ area: string; snapshot: string | null }>(
    `update content_reports
        set status = $1,
            admin_note = coalesce($2, admin_note),
            resolved_at = case when $3 then now() else null end,
            resolved_by = case when $3 then $4::uuid else null end
      where id = $5
    returning area, snapshot`,
    [status, adminNote ?? null, closing, admin.id, id],
  );
  if (!row) return { ok: false, errors: ["این گزارش پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: adminNote ? "report.note" : "report.status",
    targetType: "report",
    targetId: id,
    summary: `گزارشِ «${(row.snapshot ?? row.area).slice(0, 60)}» → ${status}`,
    metadata: { area: row.area, status },
  });

  revalidatePath("/admin/reports");
  return { ok: true, data: null };
}

/**
 * رسیدگیِ گروهی به همهٔ گزارش‌های یک محتوا.
 *
 * وقتی یک سؤالِ خراب را ده نفر گزارش کرده‌اند، بستنِ تک‌تکشان کارِ بی‌معنایی
 * است — اصلاحِ سؤال همهٔ آن ده تا را با هم بی‌موضوع می‌کند.
 */
export async function reportAdminResolveTarget(
  area: string,
  targetId: string,
): Promise<ActionResult<{ count: number }>> {
  const admin = await requireAdmin();
  const a = enumArg(area, REPORT_AREAS, "بخش نامعتبر است.");
  const target = String(targetId).slice(0, 200);
  if (!target) return { ok: false, errors: ["شناسهٔ محتوا خالی است."] };

  const count = await execute(
    `update content_reports
        set status = 'resolved', resolved_at = now(), resolved_by = $1
      where area = $2 and target_id = $3 and status <> 'resolved'`,
    [admin.id, a, target],
  );

  await recordAudit({
    actor: admin,
    action: "report.status",
    targetType: "report",
    targetId: target,
    summary: `${count} گزارشِ همین محتوا یکجا رسیدگی شد`,
    metadata: { area: a, count },
  });

  revalidatePath("/admin/reports");
  return { ok: true, data: { count } };
}

export async function reportAdminDelete(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const reportId = uuidArg(id, "شناسهٔ گزارش نامعتبر است.");

  // متن را *پیش* از حذف می‌خوانیم، وگرنه در لاگ فقط یک uuid می‌ماند.
  const existing = await queryOne<{ area: string; snapshot: string | null }>(
    "select area, snapshot from content_reports where id = $1",
    [reportId],
  );
  if (!existing) return { ok: false, errors: ["این گزارش پیدا نشد."] };

  await execute("delete from content_reports where id = $1", [reportId]);

  await recordAudit({
    actor: admin,
    action: "report.delete",
    targetType: "report",
    targetId: reportId,
    summary: `حذف گزارشِ «${(existing.snapshot ?? existing.area).slice(0, 60)}»`,
    metadata: { area: existing.area },
  });

  revalidatePath("/admin/reports");
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// یافتنِ محتوا از روی متن
// ---------------------------------------------------------------------------

export type ContentHit = {
  area: ReportArea;
  /** شناسه‌ای که در همان بخش معنی دارد. */
  id: string;
  /** خطِ نمایشی — همان چیزی که مدیر برای شناختنش لازم دارد. */
  title: string;
  subtitle: string | null;
  /** چند گزارشِ باز روی همین محتوا هست. */
  openReports: number;
};

/**
 * «این مصراع مالِ کدام سؤال است؟»
 *
 * ⚠️ این تابع دلیلِ وجودِ نصفِ این صفحه است. یک گزارش می‌گوید «پاسخ غلط
 * است» و یک بیت نشان می‌دهد — ولی مدیر باید بتواند همان بیت را در بانکِ
 * سؤال پیدا کند تا اصلاحش کند. بدونِ این، تنها راه گشتنِ دستی در پنلِ هر
 * بخش بود.
 *
 * جست‌وجو در *همهٔ* جدول‌های محتوا انجام می‌شود، نه فقط جدولِ گزارش‌ها — پس
 * حتی سؤالی که هرگز گزارش نشده هم پیدا می‌شود.
 *
 * `union all` و نه چند کوئری: یک رفت‌وبرگشت، و ترتیبِ نهایی یکجا.
 */
export async function adminFindContent(term: string): Promise<ContentHit[]> {
  await requireAdmin();

  const needle = term.trim();
  if (needle.length < 2) return [];

  // `%` و `_` کاربر باید متن بمانند، وگرنه یک `%` تنها کلِ بانک را برمی‌گرداند.
  const pattern = `%${needle.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const rows = await query<{
    area: ReportArea;
    id: string;
    title: string;
    subtitle: string | null;
  }>(
    `
    -- عروض سماعی: هم بیتِ صورتِ سؤال و هم متنِ گزینه‌ها
    select 'quiz'::text as area, q.id::text as id,
           coalesce(array_to_string(q.poem, ' / '), '(سؤال صوتی)') as title,
           'نوع: ' || q.type as subtitle
      from questions q
     where array_to_string(coalesce(q.poem, '{}'), ' ') ilike $1 escape '\\'
    union all
    select 'quiz', o.question_id::text,
           coalesce(o.label, array_to_string(o.poem, ' / '), '(گزینهٔ صوتی)'),
           'گزینه' || case when o.is_correct then ' — پاسخِ درست' else '' end
      from question_options o
     where coalesce(o.label, '') ilike $1 escape '\\'
        or array_to_string(coalesce(o.poem, '{}'), ' ') ilike $1 escape '\\'
    union all
    select 'vocab', v.id::text, v.word, v.grade || ' — درس ' || v.lesson
      from vocab_words v
     where v.word ilike $1 escape '\\' or v.meaning ilike $1 escape '\\'
    union all
    select 'aruz_bridge', b.id::text, b.phrase, 'وزنِ درست: ' || b.correct_pattern
      from aruz_bridge_questions b
     where b.phrase ilike $1 escape '\\'
        or b.correct_pattern ilike $1 escape '\\'
    union all
    select 'grammar_circuit', g.source_id, g.source_id,
           g.grade || ' — درس ' || g.lesson
      from grammar_circuit_questions g
     where g.payload::text ilike $1 escape '\\' or g.source_id ilike $1 escape '\\'
    union all
    select 'jasoos', j.id::text, j.title,
           j.category || ' — ' || left(j.verse_line_1, 50)
      from jasoos_levels j
     where j.title ilike $1 escape '\\'
        or j.verse_line_1 ilike $1 escape '\\'
        or j.verse_line_2 ilike $1 escape '\\'
    union all
    select 'pairs', m.id::text, m.work, 'پدیدآورنده: ' || m.author
      from memory_pairs m
     where m.work ilike $1 escape '\\' or m.author ilike $1 escape '\\'
    union all
    select 'ninja', w.id::text, w.word, 'نقش: ' || c.label
      from ninja_words w join ninja_categories c on c.id = w.category_id
     where w.word ilike $1 escape '\\'
    union all
    select 'exam', p.question_id::text,
           left(p.content::text, 90),
           'بخشی از سؤالِ امتحان'
      from exam_question_parts p
     where p.content::text ilike $1 escape '\\'
    limit 60
    `,
    [pattern],
  );

  if (rows.length === 0) return [];

  // چند گزارشِ بازِ هر محتوا — با یک کوئریِ دوم، نه با یک join روی همهٔ
  // شاخه‌های union.
  const counts = await query<{ area: string; target_id: string; n: number }>(
    `select area, target_id, count(*)::int as n
       from content_reports
      where status = 'open' and target_id = any($1::text[])
      group by area, target_id`,
    [rows.map((r) => r.id)],
  );
  const byKey = new Map(counts.map((c) => [`${c.area}:${c.target_id}`, c.n]));

  return rows.map((r) => ({
    area: r.area,
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    openReports: byKey.get(`${r.area}:${r.id}`) ?? 0,
  }));
}
