import { createHash } from "node:crypto";
import { z } from "zod";
import type { NextResponse } from "next/server";
import { transaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { passwordField } from "@/lib/auth/schemas";
import { createSession, findUserById, revokeAllSessions } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { attachUserId, logger } from "@/lib/observability";
import { withRoute } from "@/lib/api/route";

const schema = z.object({
  token: z.string().min(10, "لینک بازنشانی معتبر نیست"),
  password: passwordField,
});

/**
 * POST /api/v1/auth/reset-password — انتخاب رمز تازه با توکن ایمیل.
 *
 * جایگزین چیزی که در Supabase یک سشنِ موقتِ GoTrue بود: صفحهٔ /reset-password
 * منتظر رویداد onAuthStateChange می‌ماند و بعد updateUser({password}) صدا
 * می‌زد. یعنی لینکِ ایمیل عملاً یک ورودِ کامل بود. حالا توکن فقط اجازهٔ همین
 * یک کار را می‌دهد و تا رمز عوض نشود هیچ سشنی صادر نمی‌شود.
 */
export const POST = withRoute("/api/v1/auth/reset-password", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    const limit = rateLimit(`reset-ip:${meta.ip ?? "unknown"}`, 20, 15 * 60);
    if (!limit.allowed) {
      return fail(`تلاش‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const tokenHash = createHash("sha256").update(body.data.token).digest("hex");
    const passwordHash = await hashPassword(body.data.password);

    // در یک تراکنش: مصرف توکن و تغییر رمز باید با هم اتفاق بیفتند. اگر جدا
    // بودند و بین آن دو خطایی می‌آمد، یا رمز عوض می‌شد و توکن همچنان معتبر
    // می‌ماند، یا توکن می‌سوخت و رمز عوض نمی‌شد.
    //
    // شرطِ consumed_at is null داخل خودِ update است و نه یک select جداگانه:
    // دو درخواست همزمان با یک توکن، فقط یکی‌شان ردیف را می‌گیرد.
    const userId = await transaction(async (tx) => {
      const reset = await tx.queryOne<{ user_id: string }>(
        `update password_resets
            set consumed_at = now()
          where token_hash = $1
            and consumed_at is null
            and expires_at > now()
          returning user_id`,
        [tokenHash],
      );

      if (!reset) return null;

      await tx.execute("update users set password_hash = $1 where id = $2", [
        passwordHash,
        reset.user_id,
      ]);

      return reset.user_id;
    });

    if (!userId) {
      // ⚠️ خودِ توکن هرگز لاگ نمی‌شود — نه اینجا و نه جای دیگر.
      logger.info("بازنشانی رمز با توکن نامعتبر", {
        event: "auth.password_reset.rejected",
        reason: "invalid_or_expired_token",
      });
      return fail("لینک بازنشانی نامعتبر یا منقضی شده است. دوباره درخواست کنید.", 400);
    }

    // کسی که رمز را فراموش کرده بود، احتمالاً دلیلی داشته. همهٔ سشن‌های قبلی
    // باطل می‌شوند تا اگر کسی دسترسی داشته، از دست بدهد.
    const revoked = await revokeAllSessions(userId);

    attachUserId(userId);
    logger.info("رمز بازنشانی شد و سشن‌های قبلی باطل شدند", {
      event: "auth.password_reset.completed",
      user_id: userId,
      revoked_sessions: revoked,
    });

    const user = await findUserById(userId);
    if (!user) return fail("حساب کاربری پیدا نشد.", 404);

    const tokens = await createSession(user, meta);

    return withCookies(ok({ user }), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
});
