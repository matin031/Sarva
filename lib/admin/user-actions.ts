"use server";

import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { revokeAllSessions } from "@/lib/auth/session";
import { boolArg, enumArg, uuidArg } from "@/lib/api/action-input";

export type AdminUserRow = {
  id: string;
  email: string | undefined;
  fullName: string | undefined;
  role: "student" | "admin";
  createdAt: string;
  lastSignInAt: string | undefined;
  emailConfirmed: boolean;
  isBanned: boolean;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

/**
 * فهرست کاربران.
 *
 * قبلاً دو منبع لازم بود — GoTrue برای خودِ حساب‌ها و جدول profiles برای نقش —
 * چون auth.users از PostgREST دیده نمی‌شد. حالا هر دو یک جدول‌اند و این یک
 * کوئری است.
 *
 * «آخرین ورود» از جدول sessions می‌آید. GoTrue ستون last_sign_in_at داشت؛
 * معادلش اینجا تازه‌ترین سشنِ ساخته‌شدهٔ کاربر است، که همان معنی را می‌دهد.
 */
export async function adminListUsers(): Promise<AdminUserRow[]> {
  await requireAdmin();

  const rows = await query<{
    id: string;
    email: string;
    full_name: string | null;
    role: "student" | "admin";
    created_at: string;
    last_sign_in_at: string | null;
    email_verified_at: string | null;
    is_banned: boolean;
  }>(
    `select u.id, u.email, u.full_name, u.role, u.created_at,
            u.email_verified_at, u.is_banned,
            (select max(s.created_at) from sessions s where s.user_id = u.id) as last_sign_in_at
       from users u
      order by u.created_at desc`,
  );

  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name ?? undefined,
    role: u.role,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? undefined,
    emailConfirmed: u.email_verified_at !== null,
    isBanned: u.is_banned,
  }));
}

export async function adminSetUserRole(
  userId: string,
  role: "student" | "admin",
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  // تایپ‌های بالا در زمان اجرا وجود ندارند؛ این خط‌ها همان ادعا را واقعاً
  // بررسی می‌کنند. توضیح کامل در lib/api/action-input.ts.
  userId = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");
  role = enumArg(role, ["student", "admin"], "نقش نامعتبر است.");

  // بدون این، آخرین مدیرِ سایت می‌توانست خودش را دانش‌آموز کند و بعد هیچ‌کس
  // نمی‌توانست به پنل برگردد — تنها راه چاره اجرای دستی SQL روی سرور بود.
  if (userId === admin.id && role !== "admin") {
    return { ok: false, errors: ["نمی‌توانید نقش مدیریت خودتان را بردارید."] };
  }

  const updated = await execute("update users set role = $1 where id = $2", [role, userId]);
  if (!updated) return { ok: false, errors: ["کاربر پیدا نشد."] };
  return { ok: true, data: null };
}

/**
 * مسدود کردن کاربر.
 *
 * در نسخهٔ Supabase یک بازهٔ زمانی به GoTrue داده می‌شد («876000h» یعنی صد
 * سال) و — طبق کامنت خودِ همان کد — سشن‌های فعلیِ کاربر تا انقضا معتبر
 * می‌ماندند. حالا یک پرچم بولی است و سشن‌ها همان لحظه باطل می‌شوند، پس بن
 * کردن بلافاصله اثر می‌کند.
 */
export async function adminSetUserBanned(
  userId: string,
  banned: boolean,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  userId = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");
  banned = boolArg(banned, "مقدار مسدودی نامعتبر است.");

  if (userId === admin.id) return { ok: false, errors: ["نمی‌توانید حساب خودتان را بن کنید."] };

  const updated = await execute("update users set is_banned = $1 where id = $2", [banned, userId]);
  if (!updated) return { ok: false, errors: ["کاربر پیدا نشد."] };

  if (banned) await revokeAllSessions(userId);

  return { ok: true, data: null };
}

/** حذف دائمی حساب. همهٔ داده‌های وابسته با cascade می‌روند. */
export async function adminDeleteUser(userId: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  userId = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  if (userId === admin.id) return { ok: false, errors: ["نمی‌توانید حساب خودتان را حذف کنید."] };

  // شمردن مدیرها قبل از حذف: سایتی بدون هیچ مدیری یعنی پنل برای همیشه بسته.
  const target = await queryOne<{ role: string }>("select role from users where id = $1", [userId]);
  if (!target) return { ok: false, errors: ["کاربر پیدا نشد."] };

  if (target.role === "admin") {
    const count = await queryOne<{ n: number }>("select count(*) as n from users where role = 'admin'");
    if ((count?.n ?? 0) <= 1) {
      return { ok: false, errors: ["این تنها مدیر سایت است و نمی‌تواند حذف شود."] };
    }
  }

  await execute("delete from users where id = $1", [userId]);
  return { ok: true, data: null };
}
