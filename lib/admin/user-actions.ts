"use server";

import { query, queryOne, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { revokeAllSessions } from "@/lib/auth/session";
import { boolArg, enumArg, uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { USER_PAGE_SIZE } from "@/lib/admin/log-constants";

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

/** فارسیِ نقش‌ها، برای خلاصهٔ لاگ. */
const ROLE_LABEL: Record<string, string> = { student: "دانش‌آموز", admin: "مدیر" };

export type UserListParams = {
  /** جست‌وجو در ایمیل و نام */
  query?: string;
  role?: "student" | "admin";
  status?: "active" | "banned" | "unverified";
  limit?: number;
  offset?: number;
};

/**
 * فهرست کاربران — صفحه‌بندی و جست‌وجو، هر دو سمت سرور.
 *
 * ⚠️ نسخهٔ قبلی **همهٔ** کاربران را یکجا می‌کشید و جست‌وجو در مرورگر روی همان
 * آرایه انجام می‌شد. با چند ده کاربر بی‌اشکال بود؛ با چند هزار تا یعنی یک
 * کوئری سنگین، یک پاسخ چندمگابایتی و یک صفحه که روی موبایل باز نمی‌شود. و چون
 * هیچ خطایی نمی‌داد، تا روزی که واقعاً کند می‌شد کسی نمی‌فهمید.
 *
 * جست‌وجو با ILIKE است و نه full-text: الگوی «هر جای ایمیل یا نام» چیزی است
 * که مدیر انتظار دارد، و برای این مقیاس کاملاً کافی است.
 *
 * «آخرین ورود» از جدول sessions می‌آید. GoTrue ستون last_sign_in_at داشت؛
 * معادلش اینجا تازه‌ترین سشنِ ساخته‌شدهٔ کاربر است، که همان معنی را می‌دهد.
 */
export async function adminListUsers(
  params: UserListParams = {},
): Promise<{ users: AdminUserRow[]; total: number }> {
  await requireAdmin();

  const values: unknown[] = [];
  const conditions: string[] = [];

  const search = params.query?.trim();
  if (search) {
    // یک پارامتر، دو ستون. % ها اینجا اضافه می‌شوند و نه در رشتهٔ کوئری، پس
    // ورودی کاربر هرگز بخشی از خودِ SQL نمی‌شود.
    values.push(`%${search}%`);
    conditions.push(`(u.email ilike $${values.length} or u.full_name ilike $${values.length})`);
  }

  if (params.role) {
    values.push(enumArg(params.role, ["student", "admin"], "نقش نامعتبر است."));
    conditions.push(`u.role = $${values.length}`);
  }

  if (params.status === "banned") conditions.push("u.is_banned");
  else if (params.status === "active") conditions.push("not u.is_banned and u.email_verified_at is not null");
  else if (params.status === "unverified") conditions.push("u.email_verified_at is null");

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const limit = Math.min(Math.max(params.limit ?? USER_PAGE_SIZE, 1), 200);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(Math.max(params.offset ?? 0, 0));
  const offsetParam = `$${values.length}`;

  const rows = await query<{
    id: string;
    email: string;
    full_name: string | null;
    role: "student" | "admin";
    created_at: string;
    last_sign_in_at: string | null;
    email_verified_at: string | null;
    is_banned: boolean;
    total_count: number;
  }>(
    `select u.id, u.email, u.full_name, u.role, u.created_at,
            u.email_verified_at, u.is_banned,
            (select max(s.created_at) from sessions s where s.user_id = u.id) as last_sign_in_at,
            count(*) over () as total_count
       from users u
       ${where}
      -- id به‌عنوان شکنندهٔ تساوی: بدون آن، دو کاربر با created_at یکسان
      -- (ثبت‌نام دسته‌جمعی یک کلاس) می‌توانند در دو صفحه تکرار یا جا بیفتند.
      order by u.created_at desc, u.id
      limit ${limitParam} offset ${offsetParam}`,
    values,
  );

  return {
    total: rows[0]?.total_count ?? 0,
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name ?? undefined,
      role: u.role,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? undefined,
      emailConfirmed: u.email_verified_at !== null,
      isBanned: u.is_banned,
    })),
  };
}

/**
 * یک کاربر.
 *
 * تا امروز صفحهٔ جزئیات کاربر، *کل* فهرست کاربران را می‌گرفت و بعد در
 * جاوااسکریپت `.find()` می‌زد. با ده کاربر بی‌اشکال بود؛ با ده هزار تا یعنی
 * کشیدن کل جدول از دیتابیس برای خواندن یک ردیف.
 */
export async function adminGetUser(userId: string): Promise<AdminUserRow | null> {
  await requireAdmin();
  const id = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  const row = await queryOne<{
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
      where u.id = $1`,
    [id],
  );

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? undefined,
    role: row.role,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? undefined,
    emailConfirmed: row.email_verified_at !== null,
    isBanned: row.is_banned,
  };
}

/** شمارش‌های داشبورد، در یک کوئری — نه با کشیدن همهٔ ردیف‌ها و شمردنشان. */
export async function adminUserCounts(): Promise<{
  total: number;
  admins: number;
  banned: number;
  unverified: number;
}> {
  await requireAdmin();
  const row = await queryOne<{ total: number; admins: number; banned: number; unverified: number }>(
    `select count(*)                                          as total,
            count(*) filter (where role = 'admin')            as admins,
            count(*) filter (where is_banned)                 as banned,
            count(*) filter (where email_verified_at is null) as unverified
       from users`,
  );
  return {
    total: row?.total ?? 0,
    admins: row?.admins ?? 0,
    banned: row?.banned ?? 0,
    unverified: row?.unverified ?? 0,
  };
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

  // ایمیل قبل از تغییر خوانده می‌شود تا خلاصهٔ لاگ نام واقعی را داشته باشد و
  // نه یک uuid که بعداً هیچ معنایی برای خواننده ندارد.
  const target = await queryOne<{ email: string; role: string }>(
    "select email, role from users where id = $1",
    [userId],
  );
  if (!target) return { ok: false, errors: ["کاربر پیدا نشد."] };

  const updated = await execute("update users set role = $1 where id = $2", [role, userId]);
  if (!updated) return { ok: false, errors: ["کاربر پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: "user.role_change",
    targetType: "user",
    targetId: userId,
    summary: `نقش ${target.email} از «${ROLE_LABEL[target.role] ?? target.role}» به «${ROLE_LABEL[role]}» تغییر کرد`,
    metadata: { from: target.role, to: role, email: target.email },
  });

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

  const target = await queryOne<{ email: string }>("select email from users where id = $1", [userId]);
  if (!target) return { ok: false, errors: ["کاربر پیدا نشد."] };

  const updated = await execute("update users set is_banned = $1 where id = $2", [banned, userId]);
  if (!updated) return { ok: false, errors: ["کاربر پیدا نشد."] };

  if (banned) await revokeAllSessions(userId);

  await recordAudit({
    actor: admin,
    action: banned ? "user.ban" : "user.unban",
    targetType: "user",
    targetId: userId,
    summary: banned
      ? `${target.email} مسدود شد و از همهٔ دستگاه‌ها خارج شد`
      : `مسدودی ${target.email} برداشته شد`,
    metadata: { email: target.email },
  });

  return { ok: true, data: null };
}

/** حذف دائمی حساب. همهٔ داده‌های وابسته با cascade می‌روند. */
export async function adminDeleteUser(userId: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  userId = uuidArg(userId, "شناسهٔ کاربر نامعتبر است.");

  if (userId === admin.id) return { ok: false, errors: ["نمی‌توانید حساب خودتان را حذف کنید."] };

  // شمردن مدیرها قبل از حذف: سایتی بدون هیچ مدیری یعنی پنل برای همیشه بسته.
  const target = await queryOne<{ role: string; email: string; full_name: string | null }>(
    "select role, email, full_name from users where id = $1",
    [userId],
  );
  if (!target) return { ok: false, errors: ["کاربر پیدا نشد."] };

  if (target.role === "admin") {
    const count = await queryOne<{ n: number }>("select count(*) as n from users where role = 'admin'");
    if ((count?.n ?? 0) <= 1) {
      return { ok: false, errors: ["این تنها مدیر سایت است و نمی‌تواند حذف شود."] };
    }
  }

  await execute("delete from users where id = $1", [userId]);

  // بعد از حذف، خودِ ردیف کاربر دیگر وجود ندارد — پس هر چیزی که برای فهمیدن
  // «چه کسی حذف شد» لازم است باید در همین خلاصه باشد.
  await recordAudit({
    actor: admin,
    action: "user.delete",
    targetType: "user",
    targetId: userId,
    summary: `حساب ${target.email}${target.full_name ? ` (${target.full_name})` : ""} برای همیشه حذف شد`,
    metadata: { email: target.email, fullName: target.full_name, role: target.role },
  });

  return { ok: true, data: null };
}
