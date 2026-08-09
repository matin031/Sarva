"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { uuidArg, enumArg } from "@/lib/api/action-input";
import {
  AUDIT_ACTION_LABELS,
  DESTRUCTIVE_ACTIONS,
  recordAudit,
  type AuditAction,
} from "@/lib/admin/audit";
import { AUDIT_PAGE_SIZE, ERROR_PAGE_SIZE } from "@/lib/admin/log-constants";

/**
 * خواندن لاگ فعالیت و لاگ خطا برای پنل.
 *
 * جدا از lib/admin/audit.ts نگه داشته شده و دلیلش فنی است: آن فایل از خیلی
 * جاها import می‌شود (هر اکشن مدیریتی)، و اگر "use server" داشت، Next هر
 * تابعِ export شده‌اش را به یک endpoint تبدیل می‌کرد — از جمله recordAudit را،
 * که آن‌وقت هر کسی می‌توانست ردیف جعلی در لاگ بنویسد.
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

// ---------------------------------------------------------------------------
// لاگ فعالیت
// ---------------------------------------------------------------------------

export type AuditRow = {
  id: string;
  actorEmail: string;
  actorId: string | null;
  action: AuditAction;
  actionLabel: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
  destructive: boolean;
};

export type AuditFilter = {
  /** فقط کارهای این مدیر */
  actorId?: string;
  /** فقط این نوع عمل */
  action?: string;
  /** فقط عملیات برگشت‌ناپذیر */
  destructiveOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function adminListAudit(
  filter: AuditFilter = {},
): Promise<{ rows: AuditRow[]; total: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  if (filter.actorId) {
    values.push(uuidArg(filter.actorId, "شناسهٔ مدیر نامعتبر است."));
    conditions.push(`actor_id = $${values.length}`);
  }
  if (filter.action) {
    // فهرست بسته است، پس هر رشتهٔ ناشناخته‌ای رد می‌شود.
    if (!(filter.action in AUDIT_ACTION_LABELS)) {
      return { rows: [], total: 0 };
    }
    values.push(filter.action);
    conditions.push(`action = $${values.length}`);
  }
  if (filter.destructiveOnly) {
    values.push([...DESTRUCTIVE_ACTIONS]);
    conditions.push(`action = any($${values.length}::text[])`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const limit = Math.min(Math.max(filter.limit ?? AUDIT_PAGE_SIZE, 1), 200);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(Math.max(filter.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const rows = await query<{
    id: string;
    actor_id: string | null;
    actor_email: string;
    action: string;
    target_type: string;
    target_id: string | null;
    summary: string;
    metadata: Record<string, unknown> | null;
    ip: string | null;
    created_at: string;
    total_count: number;
  }>(
    `select id, actor_id, actor_email, action, target_type, target_id,
            summary, metadata, host(ip) as ip, created_at,
            count(*) over () as total_count
       from admin_audit_log
       ${where}
      order by created_at desc, id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

  return {
    total: rows[0]?.total_count ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      action: r.action as AuditAction,
      actionLabel: AUDIT_ACTION_LABELS[r.action as AuditAction] ?? r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      summary: r.summary,
      metadata: r.metadata ?? {},
      ip: r.ip,
      createdAt: r.created_at,
      destructive: DESTRUCTIVE_ACTIONS.has(r.action as AuditAction),
    })),
  };
}

/** فهرست مدیرانی که در لاگ فعالیت دارند — برای پرکردن فیلتر. */
export async function adminAuditActors(): Promise<{ id: string; email: string }[]> {
  await requireAdmin();
  const rows = await query<{ actor_id: string | null; actor_email: string }>(
    `select distinct actor_id, actor_email
       from admin_audit_log
      where actor_id is not null
      order by actor_email`,
  );
  return rows.map((r) => ({ id: r.actor_id!, email: r.actor_email }));
}

/** فهرست عمل‌هایی که واقعاً در لاگ هستند — تا فیلتر پر از گزینهٔ بی‌نتیجه نشود. */
export async function adminAuditActions(): Promise<{ action: string; label: string; count: number }[]> {
  await requireAdmin();
  const rows = await query<{ action: string; n: number }>(
    `select action, count(*) as n from admin_audit_log group by action order by n desc`,
  );
  return rows
    .filter((r) => r.action in AUDIT_ACTION_LABELS)
    .map((r) => ({
      action: r.action,
      label: AUDIT_ACTION_LABELS[r.action as AuditAction],
      count: r.n,
    }));
}

// ---------------------------------------------------------------------------
// لاگ خطا
// ---------------------------------------------------------------------------

export type ErrorRow = {
  id: string;
  source: string;
  message: string;
  context: string | null;
  detail: string | null;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
};

export async function adminListErrors(
  options: { includeResolved?: boolean; limit?: number; offset?: number } = {},
): Promise<{ rows: ErrorRow[]; total: number; openCount: number }> {
  await requireAdmin();

  const limit = Math.min(Math.max(options.limit ?? ERROR_PAGE_SIZE, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const where = options.includeResolved ? "" : "where resolved_at is null";

  const rows = await query<{
    id: string;
    source: string;
    message: string;
    context: string | null;
    detail: string | null;
    occurrences: number;
    first_seen_at: string;
    last_seen_at: string;
    resolved_at: string | null;
    total_count: number;
  }>(
    `select id, source, message, context, detail, occurrences,
            first_seen_at, last_seen_at, resolved_at,
            count(*) over () as total_count
       from app_error_log
       ${where}
      order by last_seen_at desc, id
      limit $1 offset $2`,
    [limit, offset],
  );

  const open = await queryOne<{ n: number }>(
    "select count(*) as n from app_error_log where resolved_at is null",
  );

  return {
    total: rows[0]?.total_count ?? 0,
    openCount: open?.n ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      source: r.source,
      message: r.message,
      context: r.context,
      detail: r.detail,
      occurrences: r.occurrences,
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      resolvedAt: r.resolved_at,
    })),
  };
}

/**
 * «رسیدگی شد» — خطا از فهرست فعال بیرون می‌رود.
 *
 * حذف نمی‌شود: اگر همان خطا دوباره رخ بدهد باید ردیف تازه‌ای بسازد و دوباره
 * دیده شود، و داشتن تاریخچهٔ قبلی کنارش کمک می‌کند بفهمید برگشته است.
 */
export async function adminResolveError(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const errorId = uuidArg(id, "شناسهٔ خطا نامعتبر است.");

  const updated = await execute(
    `update app_error_log set resolved_at = now(), resolved_by = $1
      where id = $2 and resolved_at is null`,
    [admin.id, errorId],
  );

  if (!updated) return { ok: false, errors: ["این خطا پیدا نشد یا قبلاً رسیدگی شده."] };

  revalidatePath("/admin/activity");
  return { ok: true, data: null };
}

/** رسیدگی به همهٔ خطاهای باز، یکجا. */
export async function adminResolveAllErrors(): Promise<ActionResult<{ count: number }>> {
  const admin = await requireAdmin();
  const count = await execute(
    "update app_error_log set resolved_at = now(), resolved_by = $1 where resolved_at is null",
    [admin.id],
  );
  revalidatePath("/admin/activity");
  return { ok: true, data: { count } };
}

// ---------------------------------------------------------------------------
// فعالیت اخیر — برای داشبورد
// ---------------------------------------------------------------------------

export type RecentActivity = {
  newUsersToday: number;
  newUsersWeek: number;
  quizAttemptsWeek: number;
  examAttemptsWeek: number;
  clubPostsWeek: number;
  latestUsers: { id: string; name: string | null; email: string; createdAt: string }[];
  latestAudit: AuditRow[];
  openErrors: number;
};

/**
 * نمای «چه خبر بوده» برای داشبورد.
 *
 * تا امروز داشبورد فقط شمارشِ کل را نشان می‌داد — عددی که هر روز کمی بزرگ‌تر
 * می‌شود و هیچ‌وقت چیزی نمی‌گوید. چیزی که واقعاً به درد می‌خورد این است که
 * «این هفته چه اتفاقی افتاد».
 */
export async function adminRecentActivity(): Promise<RecentActivity> {
  await requireAdmin();

  const counts = await queryOne<{
    users_today: number;
    users_week: number;
    quiz_week: number;
    exam_week: number;
    club_week: number;
    open_errors: number;
  }>(
    `select
       (select count(*) from users
         where created_at > date_trunc('day', now()))              as users_today,
       (select count(*) from users
         where created_at > now() - interval '7 days')             as users_week,
       (select count(*) from quiz_attempts
         where created_at > now() - interval '7 days')             as quiz_week,
       (select count(*) from exam_attempts
         where created_at > now() - interval '7 days')             as exam_week,
       (select count(*) from club_posts
         where created_at > now() - interval '7 days')             as club_week,
       (select count(*) from app_error_log
         where resolved_at is null)                                as open_errors`,
  );

  const latestUsers = await query<{
    id: string;
    full_name: string | null;
    email: string;
    created_at: string;
  }>(`select id, full_name, email, created_at from users order by created_at desc limit 5`);

  const { rows: latestAudit } = await adminListAudit({ limit: 6 });

  return {
    newUsersToday: counts?.users_today ?? 0,
    newUsersWeek: counts?.users_week ?? 0,
    quizAttemptsWeek: counts?.quiz_week ?? 0,
    examAttemptsWeek: counts?.exam_week ?? 0,
    clubPostsWeek: counts?.club_week ?? 0,
    openErrors: counts?.open_errors ?? 0,
    latestUsers: latestUsers.map((u) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      createdAt: u.created_at,
    })),
    latestAudit,
  };
}

/** فقط برای تست دستیِ لاگ خطا از پنل — تا مدیر ببیند این بخش واقعاً کار می‌کند. */
export async function adminTestErrorLog(kind: "info" | "error" = "error"): Promise<ActionResult> {
  const admin = await requireAdmin();
  const which = enumArg(kind, ["info", "error"], "نوع نامعتبر است.");

  const { recordError } = await import("@/lib/admin/audit");
  await recordError(
    "other",
    new Error(
      which === "error"
        ? "این یک خطای آزمایشی از پنل مدیریت است."
        : "این یک پیام آزمایشی از پنل مدیریت است.",
    ),
    "آزمایش دستی از /admin/activity",
  );

  await recordAudit({
    actor: admin,
    action: "setting.test_email",
    targetType: "setting",
    targetId: "error-log-test",
    summary: "ثبت یک خطای آزمایشی برای بررسی کارکرد لاگ",
  });

  revalidatePath("/admin/activity");
  return { ok: true, data: null };
}
