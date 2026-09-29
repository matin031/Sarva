"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { listActiveSessions, revokeAllSessions } from "@/lib/auth/session";
import { enumArg, uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { userSearchClause } from "@/lib/admin/user-search";
import { adminListAudit, type AuditRow } from "@/lib/admin/log-actions";
import { getPlusStatusFor } from "@/lib/plus/entitlement";
import type { PlusStatus } from "@/lib/plus/types";
import type { UserRole } from "@/lib/auth/types";

/**
 * کنترل‌های صفحهٔ جزئیاتِ یک کاربر.
 *
 * تا امروز صفحهٔ `/admin/users/[id]` فقط کارنامه نشان می‌داد و هر کاری —
 * حتی «از همهٔ دستگاه‌ها خارجش کن» — یا در فهرستِ کاربران بود یا اصلاً
 * نبود. مدیری که تلفنِ دزدیده‌شدهٔ یک دانش‌آموز را گزارش می‌گرفت، تنها
 * ابزارش «مسدود کردن» بود؛ یعنی برای بیرون انداختنِ دزد، صاحبِ حساب هم
 * بیرون می‌ماند.
 *
 * ⚠️ جدا از `user-actions.ts` فقط برای اندازه؛ قاعده‌ها همان‌اند: هر تابع
 * `requireAdmin()` خودش را دارد، هر ورودی در زمانِ اجرا سنجیده می‌شود، و هر
 * تغییری در لاگِ مدیران ثبت می‌شود.
 */

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; errors: string[] };

export type AdminUserProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  desiredRole: "student" | "teacher";
  school: string | null;
  grade: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  profileCompletedAt: string | null;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  counts: {
    clubPosts: number;
    clubComments: number;
    tickets: number;
    contentReports: number;
  };
  plus: PlusStatus;
};

/** پروفایلِ کامل برای سرِ صفحهٔ جزئیات. */
export async function adminGetUserProfile(userId: string): Promise<AdminUserProfile | null> {
  await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  const row = await queryOne<{
    id: string;
    email: string | null;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    desired_role: "student" | "teacher";
    school: string | null;
    grade: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    profile_completed_at: string | null;
    is_banned: boolean;
    created_at: string;
    updated_at: string;
    last_sign_in_at: string | null;
    club_posts: number;
    club_comments: number;
    tickets: number;
    content_reports: number;
  }>(
    // ⚠️ هر زیرکوئری شرطِ `user_id` خودش را دارد و هر `?` یک مقدار
    // مصرف می‌کند — پس همان شناسه شش بار فرستاده می‌شود.
    `select u.id, u.email, u.phone, u.first_name, u.last_name, u.full_name,
            u.avatar_url, u.role, u.desired_role, u.school, u.grade,
            u.email_verified_at, u.phone_verified_at, u.profile_completed_at,
            u.is_banned, u.created_at, u.updated_at,
            (select max(s.created_at) from sessions s where s.user_id = ?)      as last_sign_in_at,
            (select count(*) from club_posts p where p.user_id = ?)            as club_posts,
            (select count(*) from club_comments c where c.user_id = ?)         as club_comments,
            (select count(*) from plus_tickets t where t.user_id = ?)          as tickets,
            (select count(*) from content_reports r where r.user_id = ?)       as content_reports
       from users u
      where u.id = ?`,
    [id, id, id, id, id, id],
  );
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    desiredRole: row.desired_role,
    school: row.school,
    grade: row.grade,
    emailVerifiedAt: row.email_verified_at,
    phoneVerifiedAt: row.phone_verified_at,
    profileCompletedAt: row.profile_completed_at,
    isBanned: row.is_banned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignInAt: row.last_sign_in_at,
    counts: {
      clubPosts: row.club_posts,
      clubComments: row.club_comments,
      tickets: row.tickets,
      contentReports: row.content_reports,
    },
    plus: await getPlusStatusFor(id),
  };
}

/** نامِ نمایشیِ کاربر برای خلاصهٔ لاگ — ایمیل، یا موبایل، یا شناسه. */
async function describeUser(id: string): Promise<{ label: string; email: string | null; phone: string | null } | null> {
  const row = await queryOne<{ email: string | null; phone: string | null; full_name: string | null }>(
    "select email, phone, full_name from users where id = ?",
    [id],
  );
  if (!row) return null;
  return { label: row.email || row.phone || row.full_name || id, email: row.email, phone: row.phone };
}

// ---------------------------------------------------------------------------
// دستگاه‌ها
// ---------------------------------------------------------------------------

export type AdminUserSession = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

/**
 * دستگاه‌های واردشدهٔ کاربر.
 *
 * ⚠️ `refreshTokenHash` عمداً اینجا نیست. `listActiveSessions` آن را برای
 * تشخیصِ «همین دستگاه» برمی‌گرداند؛ فرستادنش به مرورگرِ مدیر هیچ فایده‌ای
 * ندارد و فقط یک هشِ توکنِ زنده را در یک پاسخِ شبکه می‌گذارد.
 */
export async function adminListUserSessions(userId: string): Promise<AdminUserSession[]> {
  await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");
  const sessions = await listActiveSessions(id);
  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
  }));
}

/** خروجِ کاربر از یک دستگاهِ مشخص. */
export async function adminRevokeUserSession(userId: string, sessionId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");
  const sid = uuidArg(sessionId, "شناسهٔ نشست نامعتبر است.");

  const who = await describeUser(id);
  if (!who) return { ok: false, errors: ["کاربر پیدا نشد."] };

  // ⚠️ شرطِ `user_id` لازم است و نه تزئینی: بدون آن، شناسهٔ نشستِ هر کسی
  // با شناسهٔ کاربرِ دیگری در همین تابع باطل می‌شد و لاگ نامِ اشتباهی را
  // ثبت می‌کرد.
  const affected = await execute(
    `update sessions set revoked_at = now(6)
      where id = ? and user_id = ? and revoked_at is null`,
    [sid, id],
  );
  if (!affected) return { ok: false, errors: ["این نشست پیش‌تر بسته شده یا پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: "user.session_revoke",
    targetType: "user",
    targetId: id,
    summary: `${who.label} از یک دستگاه خارج شد`,
    metadata: { sessionId: sid },
  });

  return { ok: true, data: null };
}

/**
 * خروج از همهٔ دستگاه‌ها **بدونِ** مسدود کردن.
 *
 * برای «رمزم لو رفته» یا «گوشی‌ام گم شده»: هرکسی که الان وارد است بیرون
 * می‌رود، ولی صاحبِ حساب می‌تواند همین الان دوباره وارد شود.
 */
export async function adminRevokeUserSessions(userId: string): Promise<ActionResult<{ count: number }>> {
  const admin = await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  const who = await describeUser(id);
  if (!who) return { ok: false, errors: ["کاربر پیدا نشد."] };

  const count = await revokeAllSessions(id);

  await recordAudit({
    actor: admin,
    action: "user.sessions_revoke",
    targetType: "user",
    targetId: id,
    summary: `${who.label} از همهٔ دستگاه‌ها خارج شد (${count} نشست)`,
    metadata: { count },
  });

  return { ok: true, data: { count } };
}

// ---------------------------------------------------------------------------
// ویرایش و تأیید
// ---------------------------------------------------------------------------

/** همان سقفی که ستون‌های `first_name` و `last_name` دارند. */
const NAME_MAX = 40;

function nameArg(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${label} نامعتبر است.`);
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if ([...trimmed].length > NAME_MAX) throw new Error(`${label} حداکثر ${NAME_MAX} حرف است.`);
  return trimmed;
}

/**
 * ویرایشِ نام به دستِ مدیر — برای نامِ توهین‌آمیز یا غلطِ تایپی.
 *
 * ⚠️ `full_name` نوشته نمی‌شود: تریگرِ `users_full_name_bu` از روی نام و
 * نام خانوادگی می‌سازدش (همان قاعدهٔ `lib/profile/queries.ts`).
 *
 * ⚠️ و `profile_completed_at` هم دست نمی‌خورد: «پروفایلِ کامل» استان و
 * مدرسه و پایه هم لازم دارد و مدیر فقط نام را عوض کرده.
 */
export async function adminUpdateUserName(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  let first: string | null;
  let last: string | null;
  try {
    first = nameArg(firstName, "نام");
    last = nameArg(lastName, "نام خانوادگی");
  } catch (err) {
    return { ok: false, errors: [(err as Error).message] };
  }
  if (!first && !last) return { ok: false, errors: ["دست‌کم یکی از نام یا نام خانوادگی لازم است."] };

  const before = await queryOne<{ full_name: string | null; email: string | null; phone: string | null }>(
    "select full_name, email, phone from users where id = ?",
    [id],
  );
  if (!before) return { ok: false, errors: ["کاربر پیدا نشد."] };

  await execute("update users set first_name = ?, last_name = ?, updated_at = now(6) where id = ?", [
    first,
    last,
    id,
  ]);

  const after = [first, last].filter(Boolean).join(" ");
  await recordAudit({
    actor: admin,
    action: "user.profile_update",
    targetType: "user",
    targetId: id,
    summary: `نام ${before.email || before.phone || id} از «${before.full_name ?? "—"}» به «${after}» تغییر کرد`,
    metadata: { from: before.full_name, to: after },
  });

  revalidatePath(`/admin/users/${id}`);
  return { ok: true, data: null };
}

/**
 * تأییدِ دستیِ ایمیل یا موبایل.
 *
 * برای کاربری که کدِ تأییدش هیچ‌وقت نمی‌رسد (ایمیلِ مدرسه‌ای که اسپم
 * می‌گیرد، اپراتوری که پیامکِ خدماتی را بسته) و از پشتیبانی کمک خواسته.
 *
 * ⚠️ فقط وقتی آن نشانی واقعاً ثبت شده باشد: «موبایلِ تأییدشده» برای حسابی
 * که موبایل ندارد، یک وضعیتِ ناممکن در دیتابیس می‌ساخت.
 */
export async function adminVerifyUserContact(
  userId: string,
  kind: "email" | "phone",
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");
  const which = enumArg(kind, ["email", "phone"], "نوع نامعتبر است.");

  const who = await describeUser(id);
  if (!who) return { ok: false, errors: ["کاربر پیدا نشد."] };

  // ⚠️ نامِ ستون از یک شاخهٔ ثابت می‌آید و نه از ورودی — `enumArg` بالا
  // فقط دو مقدار را می‌پذیرد و هر دو اینجا به رشتهٔ ثابتِ خودشان نگاشته
  // می‌شوند.
  const affected =
    which === "email"
      ? await execute(
          `update users set email_verified_at = now(6), updated_at = now(6)
            where id = ? and email is not null and email_verified_at is null`,
          [id],
        )
      : await execute(
          `update users set phone_verified_at = now(6), updated_at = now(6)
            where id = ? and phone is not null and phone_verified_at is null`,
          [id],
        );

  if (!affected) {
    const has = which === "email" ? who.email : who.phone;
    return {
      ok: false,
      errors: [
        has
          ? which === "email"
            ? "ایمیلِ این کاربر پیش‌تر تأیید شده."
            : "موبایلِ این کاربر پیش‌تر تأیید شده."
          : which === "email"
            ? "این کاربر ایمیلی ثبت نکرده."
            : "این کاربر موبایلی ثبت نکرده.",
      ],
    };
  }

  await recordAudit({
    actor: admin,
    action: "user.verify_contact",
    targetType: "user",
    targetId: id,
    summary:
      which === "email"
        ? `ایمیلِ ${who.email} به‌دستِ مدیر تأیید شد`
        : `موبایلِ ${who.phone} به‌دستِ مدیر تأیید شد`,
    metadata: { kind: which },
  });

  revalidatePath(`/admin/users/${id}`);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// تاریخچه
// ---------------------------------------------------------------------------

/** کارهایی که مدیران روی این کاربر انجام داده‌اند. */
export async function adminUserAuditTrail(userId: string): Promise<AuditRow[]> {
  await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");
  const { rows } = await adminListAudit({ target: { type: "user", id }, limit: 30 });
  return rows;
}

// ---------------------------------------------------------------------------
// خروجی CSV
// ---------------------------------------------------------------------------

/** سقفِ ردیف در یک خروجی — بیشتر از این یعنی کارِ `mysqldump`، نه پنل. */
const EXPORT_MAX = 20000;

/**
 * سلولِ CSV.
 *
 * ⚠️ دو خطر، نه یکی:
 *   ۱) ویرگول و گیومه و خطِ تازه — با دوتایی کردنِ گیومه و محصور کردن.
 *   ۲) **تزریقِ فرمول**: نامی که با `=` یا `+` یا `-` یا `@` شروع شود، در
 *      اکسل به‌عنوانِ فرمول اجرا می‌شود. نامِ کاربر را خودِ کاربر می‌نویسد،
 *      پس یک آپاستروفِ پیشوند آن را متن نگه می‌دارد.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * فهرستِ کاربرانِ فیلترشده به‌صورتِ CSV.
 *
 * همان فیلترهای صفحهٔ کاربران (جست‌وجو، نقش، وضعیت)، ولی بدونِ صفحه‌بندی.
 * رمز، توکن و هر چیزِ حساسِ دیگری در ستون‌ها نیست؛ ولی چون خودِ فهرست
 * اطلاعاتِ شخصی است، هر خروجی در لاگِ مدیران ثبت می‌شود.
 */
export async function adminExportUsersCsv(params: {
  query?: string;
  role?: UserRole;
  status?: "active" | "banned" | "unverified";
}): Promise<ActionResult<{ csv: string; count: number; truncated: boolean }>> {
  const admin = await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  const search = typeof params.query === "string" ? params.query.trim() : "";
  if (search) {
    const clause = userSearchClause(search);
    values.push(...clause.values);
    conditions.push(clause.sql);
  }
  if (params.role) {
    values.push(enumArg(params.role, ["student", "teacher", "admin"], "نقش نامعتبر است."));
    conditions.push("u.role = ?");
  }
  if (params.status) {
    const status = enumArg(params.status, ["active", "banned", "unverified"], "وضعیت نامعتبر است.");
    if (status === "banned") conditions.push("u.is_banned");
    else if (status === "active") conditions.push("not u.is_banned and u.email_verified_at is not null");
    else conditions.push("u.email_verified_at is null");
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  values.push(EXPORT_MAX + 1);

  const rows = await query<{
    id: string;
    email: string | null;
    phone: string | null;
    full_name: string | null;
    role: string;
    school: string | null;
    grade: string | null;
    email_verified_at: string | null;
    phone_verified_at: string | null;
    is_banned: boolean;
    created_at: string;
  }>(
    `select u.id, u.email, u.phone, u.full_name, u.role, u.school, u.grade,
            u.email_verified_at, u.phone_verified_at, u.is_banned, u.created_at
       from users u
       ${where}
      order by u.created_at desc, u.id
      limit ?`,
    values,
  );

  const truncated = rows.length > EXPORT_MAX;
  const list = truncated ? rows.slice(0, EXPORT_MAX) : rows;

  const header = ["id", "email", "phone", "full_name", "role", "school", "grade", "email_verified", "phone_verified", "banned", "created_at"];
  const lines = [header.join(",")];
  for (const r of list) {
    lines.push(
      [
        r.id,
        r.email,
        r.phone,
        r.full_name,
        r.role,
        r.school,
        r.grade,
        r.email_verified_at ? "yes" : "no",
        r.phone_verified_at ? "yes" : "no",
        r.is_banned ? "yes" : "no",
        new Date(r.created_at).toISOString(),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  await recordAudit({
    actor: admin,
    action: "user.export",
    targetType: "user",
    targetId: null,
    summary: `خروجیِ CSV از ${list.length} کاربر گرفته شد`,
    metadata: { count: list.length, truncated, query: search || null, role: params.role ?? null, status: params.status ?? null },
  });

  // BOM تا اکسل فارسی را درست باز کند.
  return { ok: true, data: { csv: `﻿${lines.join("\r\n")}`, count: list.length, truncated } };
}
