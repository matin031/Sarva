import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./config";
import { verifyAccessToken } from "./tokens";
import { findUserById } from "./session";
import { AuthError, type AuthUser } from "./types";

/**
 * «چه کسی این درخواست را فرستاده؟» — جایگزین supabase.auth.getUser().
 *
 * دو مرحله دارد و هر دو لازم‌اند:
 *
 *   ۱) تأیید امضای JWT. بدون این، هرکسی می‌توانست شناسهٔ دلخواهی را در کوکی
 *      بگذارد.
 *   ۲) خواندن ردیف کاربر از دیتابیس. بدون این، نقش و وضعیت مسدودی تا انقضای
 *      توکن کهنه می‌ماندند — یعنی ادمینِ عزل‌شده تا ۱۵ دقیقه ادمین می‌ماند.
 *
 * مرحلهٔ ۲ یک کوئری روی کلید اصلی است؛ در ازای آن، تصمیم‌های دسترسی هرگز به
 * ادعای داخل توکن تکیه نمی‌کنند.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const user = await findUserById(claims.sub);
  if (!user) return null;

  // کاربری که بعد از صدور توکن مسدود شده، لاگین‌نشده حساب می‌شود.
  if (user.isBanned) return null;

  return user;
}

/** مثل getCurrentUser ولی به‌جای null، خطا می‌دهد. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("باید وارد حساب کاربری خود شوید.", 401);
  return user;
}

/**
 * گیت مدیریت.
 *
 * پیام‌های خطا کلمه‌به‌کلمه همان چیزی است که lib/require-admin.ts نسخهٔ
 * Supabase می‌داد، چون components/admin/AdminGate.tsx همان‌ها را نمایش می‌دهد.
 *
 * این تابع تنها دروازهٔ جدول‌های بانک آزمون است: آن جدول‌ها در دنیای Supabase
 * هیچ policy ای برای کاربر عادی نداشتند و امنیتشان از همین‌جا می‌آمد. حالا که
 * RLS ای در کار نیست، این جمله دربارهٔ *همهٔ* جدول‌ها صادق است.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("باید وارد حساب کاربری خود شوید.", 401);
  if (user.role !== "admin") throw new AuthError("شما دسترسی مدیریت ندارید.", 403);
  return user;
}
