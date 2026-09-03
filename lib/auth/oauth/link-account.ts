import "server-only";
import { query, transaction } from "@/lib/db";
import { toAuthUser, type UserRow } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";
import { mayLinkToExistingAccount, type VerifiedGoogleUser } from "./google-claims";

/**
 * از یک هویتِ تأییدشدهٔ گوگل به یک کاربرِ سایت می‌رسد.
 *
 * سه حالت، به همین ترتیب:
 *
 *   ۱. این حسابِ گوگل قبلاً وصل شده  → همان کاربر
 *   ۲. کاربری با همین ایمیل هست      → وصل کن، *اگر* گوگل ایمیل را تأیید کرده
 *   ۳. هیچ‌کدام                       → کاربرِ تازه بساز
 *
 * ⚠️ ترتیب مهم است. جست‌وجو اول با `sub` است نه ایمیل: اگر کاربر ایمیلِ
 * گوگلش را عوض کند، باز هم همان حساب را می‌گیرد. اگر اول با ایمیل می‌گشتیم،
 * یک آدرسِ رهاشده که گوگل به شخصِ دیگری داده، او را به حسابِ قبلی می‌رساند.
 */

export type LinkOutcome =
  | { ok: true; user: AuthUser; created: boolean }
  | { ok: false; reason: "unverified_email_conflict" | "banned" };

export async function resolveGoogleUser(g: VerifiedGoogleUser): Promise<LinkOutcome> {
  // ۱) هویتِ شناخته‌شده
  const existing = await query<UserRow>(
    `select u.id, u.email, u.full_name, u.role, u.email_verified_at,
            u.is_banned, u.created_at
       from user_identities i
       join users u on u.id = i.user_id
      where i.provider = 'google' and i.provider_account_id = $1`,
    [g.sub],
  );
  if (existing.length > 0) {
    const user = toAuthUser(existing[0]);
    if (user.isBanned) return { ok: false, reason: "banned" };
    return { ok: true, user, created: false };
  }

  // ۲) حسابی با همین ایمیل
  const byEmail = await query<UserRow>(`select id, email, full_name, role, email_verified_at, is_banned, created_at
       from users where email = $1`, [g.email]);
  if (byEmail.length > 0) {
    // ⚠️ اینجا حساس‌ترین نقطهٔ کلِ این قابلیت است.
    //
    // اگر گوگل ایمیل را تأیید نکرده باشد، هرکسی می‌تواند یک حسابِ گوگل با
    // آدرسِ قربانی بسازد و با یک کلیک وارد حسابِ او شود — بدونِ دانستنِ رمز.
    // در آن حالت وصل نمی‌کنیم و کاربر باید با رمزِ خودش وارد شود.
    if (!mayLinkToExistingAccount(g)) {
      return { ok: false, reason: "unverified_email_conflict" };
    }

    const user = toAuthUser(byEmail[0]);
    if (user.isBanned) return { ok: false, reason: "banned" };

    await query(
      `insert into user_identities (user_id, provider, provider_account_id, email)
       values ($1, 'google', $2, $3)
       on conflict (provider, provider_account_id) do nothing`,
      [user.id, g.sub, g.email],
    );
    return { ok: true, user, created: false };
  }

  // ۳) کاربرِ تازه
  //
  // ⚠️ ساخت کاربر و ثبتِ هویتش در یک تراکنش‌اند: کاربری که ساخته شود ولی
  // هویتش ثبت نشود، هیچ راهِ ورودی ندارد — نه رمزی دارد نه هویتی — و دفعهٔ
  // بعد به شاخهٔ ۲ می‌افتد و آنجا هم گیر می‌کند.
  const created = await transaction(async (tx) => {
    const inserted = await tx.query<UserRow>(
      `insert into users (email, password_hash, full_name, email_verified_at)
       values ($1, null, $2, $3)
       returning id, email, full_name, role, email_verified_at, is_banned, created_at`,
      [
        g.email,
        g.name,
        // ایمیلی که گوگل تأیید کرده، تأییدشده است. اگر تأیید نکرده باشد،
        // حساب ساخته می‌شود ولی تأییدنشده می‌ماند.
        g.emailVerified ? new Date() : null,
      ],
    );
    await tx.execute(
      `insert into user_identities (user_id, provider, provider_account_id, email)
       values ($1, 'google', $2, $3)`,
      [inserted[0].id, g.sub, g.email],
    );
    return inserted[0];
  });

  return { ok: true, user: toAuthUser(created), created: true };
}
