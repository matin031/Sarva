import { NextResponse } from "next/server";
import {
  exchangeCode,
  googleConfig,
  statesMatch,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
} from "@/lib/auth/oauth/google";
import { resolveGoogleUser } from "@/lib/auth/oauth/link-account";
import { createSession } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { cookieSecure } from "@/lib/auth/config";
import { requestMeta } from "@/lib/api/http";
import { attachUserId, logger } from "@/lib/observability";
import { withRoute } from "@/lib/api/route";

/**
 * GET /api/v1/auth/google/callback — بازگشت از گوگل.
 *
 * ⚠️ این مسیر JSON نمی‌دهد، ریدایرکت می‌کند: کاربر با مرورگرش اینجاست، نه با
 * fetch. هر شکستی به /auth با یک کدِ خطا برمی‌گردد تا صفحه پیامِ فارسی
 * مناسب را نشان دهد — و هیچ جزئیاتِ فنی‌ای در URL نمی‌نشیند.
 */

/** کوکی‌های یک‌بارمصرفِ جریان را پاک می‌کند — چه ورود موفق باشد چه نه. */
function clearFlowCookies(response: NextResponse): NextResponse {
  for (const name of [GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, GOOGLE_NONCE_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

export const GET = withRoute("/api/v1/auth/google/callback", async (request: Request) => {
  const url = new URL(request.url);
  const fail = (code: string) =>
    clearFlowCookies(NextResponse.redirect(new URL(`/auth?error=${code}`, request.url)));

  const cfg = googleConfig();
  if (!cfg) return fail("google_disabled");

  // کاربر ممکن است در صفحهٔ گوگل «انصراف» زده باشد — این خطا نیست.
  if (url.searchParams.get("error")) return fail("google_cancelled");

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code || !returnedState) return fail("google_failed");

  // ⚠️ سه کوکیِ جریان. نبودشان یعنی یا وقت گذشته (ده دقیقه)، یا این بازگشت
  // اصلاً از جریانی که ما شروع کردیم نیامده.
  const jar = request.headers.get("cookie") ?? "";
  const read = (name: string) =>
    jar
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1);

  const state = read(GOOGLE_STATE_COOKIE);
  const verifier = read(GOOGLE_VERIFIER_COOKIE);
  const nonce = read(GOOGLE_NONCE_COOKIE);

  // مقایسه در زمانِ ثابت. اگر نخواند، یعنی CSRF یا جریانِ منقضی.
  if (!statesMatch(state, returnedState) || !verifier || !nonce) {
    logger.warn("بازگشتِ گوگل با state ناهماهنگ رد شد", {
      event: "auth.google.state_mismatch",
    });
    return fail("google_expired");
  }

  const exchanged = await exchangeCode(cfg, code, { verifier, nonce });
  if (!exchanged.ok) {
    // ⚠️ فقط دلیلِ دسته‌بندی‌شده. نه code، نه توکن، نه ایمیل.
    logger.warn("تبادلِ کدِ گوگل ناموفق", {
      event: "auth.google.exchange_failed",
      reason: exchanged.reason,
    });
    return fail("google_failed");
  }

  const outcome = await resolveGoogleUser(exchanged.user);
  if (!outcome.ok) {
    if (outcome.reason === "banned") {
      logger.warn("ورودِ گوگلِ حساب مسدود", { event: "auth.google.blocked" });
      return fail("banned");
    }
    // ایمیلی که گوگل تأییدش نکرده، به حسابِ موجود وصل نمی‌شود. توضیحش در
    // lib/auth/oauth/link-account.ts است.
    logger.warn("ورودِ گوگل با ایمیلِ تأییدنشده روی حسابِ موجود", {
      event: "auth.google.unverified_conflict",
    });
    return fail("google_email_unverified");
  }

  const tokens = await createSession(outcome.user, requestMeta(request));

  attachUserId(outcome.user.id);
  logger.info("ورود با گوگل موفق", {
    event: "auth.google.succeeded",
    user_id: outcome.user.id,
    created: outcome.created,
  });

  const response = clearFlowCookies(
    NextResponse.redirect(new URL("/panel/home", request.url)),
  );
  for (const c of [accessCookie(tokens.accessToken), refreshCookie(tokens.refreshToken)]) {
    response.cookies.set(c.name, c.value, c.options);
  }
  return response;
});
