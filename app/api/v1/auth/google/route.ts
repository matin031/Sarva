import { NextResponse } from "next/server";
import {
  authorizeUrl,
  googleConfig,
  newFlowSecrets,
  GOOGLE_FLOW_TTL_SECONDS,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
} from "@/lib/auth/oauth/google";
import { cookieSecure } from "@/lib/auth/config";
import { rateLimit } from "@/lib/api/rate-limit";
import { requestMeta } from "@/lib/api/http";
import { logger } from "@/lib/observability";
import { withRoute } from "@/lib/api/route";

/** GET /api/v1/auth/google — شروعِ جریانِ ورود با گوگل. */
export const GET = withRoute("/api/v1/auth/google", async (request: Request) => {
  const cfg = googleConfig();
  if (!cfg) {
    // قابلیت خاموش است. کاربر نباید صفحهٔ خطای فنی ببیند — به صفحهٔ ورود
    // برمی‌گردد با پیامی که دکمه را توضیح می‌دهد.
    logger.warn("ورود با گوگل درخواست شد ولی پیکربندی نشده", {
      event: "auth.google.not_configured",
    });
    return NextResponse.redirect(new URL("/auth?error=google_disabled", request.url));
  }

  // شروعِ جریان ارزان است ولی رایگان نیست (یک ریدایرکت و سه کوکی). سقف
  // می‌گذارد تا کسی نتواند با تکرارِ آن سرور را مشغول کند.
  const meta = requestMeta(request);
  const limit = rateLimit(`google-start:${meta.ip ?? "unknown"}`, 20, 10 * 60);
  if (!limit.allowed) {
    return NextResponse.redirect(new URL("/auth?error=too_many", request.url));
  }

  const secrets = newFlowSecrets();
  const response = NextResponse.redirect(authorizeUrl(cfg, secrets));

  // ⚠️ هر سه httpOnly: هیچ اسکریپتی در صفحه نباید بتواند بخواندشان، وگرنه یک
  // XSS کافی است تا مهاجم جریان را بدزدد.
  //
  // sameSite: "lax" و نه "strict". بازگشت از گوگل یک پیمایشِ بین‌سایتی است؛
  // با strict مرورگر کوکی‌ها را نمی‌فرستد و ورود همیشه شکست می‌خورد.
  const base = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: GOOGLE_FLOW_TTL_SECONDS,
  };
  response.cookies.set(GOOGLE_STATE_COOKIE, secrets.state, base);
  response.cookies.set(GOOGLE_VERIFIER_COOKIE, secrets.verifier, base);
  response.cookies.set(GOOGLE_NONCE_COOKIE, secrets.nonce, base);

  return response;
});
