import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  decodeJwtPayloadUnverified,
  verifyGoogleClaims,
  type VerifiedGoogleUser,
} from "./google-claims";

/**
 * جریانِ ورود با گوگل — «authorization code» با PKCE.
 *
 * سه مقدارِ یک‌بارمصرف در شروع ساخته می‌شوند و در کوکیِ httpOnly می‌نشینند، و
 * هر سه در بازگشت بررسی می‌شوند. هرکدام جلوی حملهٔ متفاوتی را می‌گیرند:
 *
 *   state     بازگشتی که ما شروعش نکرده‌ایم را رد می‌کند (CSRF). بدونش،
 *             مهاجم می‌توانست کاربر را به callback با codeِ *خودش* بفرستد و
 *             حسابِ کاربر را به حسابِ گوگلِ خودش وصل کند.
 *   verifier  (PKCE) اگر code لو برود — در لاگِ پروکسی، در Referer — بدونِ
 *             این مقدار قابل تبدیل به توکن نیست.
 *   nonce     تضمین می‌کند id_tokenِ برگشتی پاسخِ همین درخواست است، نه توکنی
 *             که جای دیگری صادر شده.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const GOOGLE_STATE_COOKIE = "sarva_g_state";
export const GOOGLE_VERIFIER_COOKIE = "sarva_g_verifier";
export const GOOGLE_NONCE_COOKIE = "sarva_g_nonce";

/** کوکی‌های جریان کوتاه‌عمرند: ده دقیقه برای تمام کردنِ ورود کافی است. */
export const GOOGLE_FLOW_TTL_SECONDS = 600;

export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };

/**
 * پیکربندی، یا null اگر تنظیم نشده باشد.
 *
 * ⚠️ null یعنی «این قابلیت خاموش است»، نه خطا. سایت باید بدونِ حسابِ گوگل هم
 * بالا بیاید — همان‌طور که تا امروز می‌آمده — و فقط دکمه‌اش را نشان ندهد.
 */
export function googleConfig(env = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const base = (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return { clientId, clientSecret, redirectUri: `${base}/api/v1/auth/google/callback` };
}

export type FlowSecrets = { state: string; verifier: string; nonce: string };

export function newFlowSecrets(): FlowSecrets {
  return {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    nonce: randomBytes(16).toString("base64url"),
  };
}

/** چالشِ PKCE: گوگل فقط هش را می‌بیند، خودِ verifier در کوکی می‌ماند. */
function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function authorizeUrl(cfg: GoogleConfig, s: FlowSecrets): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", s.state);
  url.searchParams.set("nonce", s.nonce);
  url.searchParams.set("code_challenge", codeChallenge(s.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  // هیچ توکنِ تازه‌سازی‌ای از گوگل نمی‌خواهیم: فقط یک بار هویت را می‌پرسیم و
  // بعد نشستِ خودمان را می‌سازیم. چیزی که ذخیره نمی‌کنیم، لو هم نمی‌رود.
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** مقایسهٔ state در زمانِ ثابت — طولِ نابرابر هم بی‌خطر رد می‌شود. */
export function statesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type ExchangeResult =
  | { ok: true; user: VerifiedGoogleUser }
  | { ok: false; reason: string };

/** code را با گوگل عوض می‌کند و ادعاهای id_token را بررسی می‌کند. */
export async function exchangeCode(
  cfg: GoogleConfig,
  code: string,
  secrets: { verifier: string; nonce: string },
): Promise<ExchangeResult> {
  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
        code_verifier: secrets.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!response.ok) {
    // ⚠️ بدنهٔ پاسخ خوانده نمی‌شود و لاگ نمی‌شود: می‌تواند code یا بخشی از
    // پیکربندی را در خود داشته باشد.
    return { ok: false, reason: "token_endpoint" };
  }

  let payload: { id_token?: unknown };
  try {
    payload = (await response.json()) as { id_token?: unknown };
  } catch {
    return { ok: false, reason: "bad_response" };
  }

  if (typeof payload.id_token !== "string") return { ok: false, reason: "no_id_token" };

  const claims = decodeJwtPayloadUnverified(payload.id_token);
  if (!claims) return { ok: false, reason: "bad_id_token" };

  const verified = verifyGoogleClaims(claims, {
    clientId: cfg.clientId,
    nonce: secrets.nonce,
  });
  if (!verified.ok) return { ok: false, reason: verified.reason };

  return { ok: true, user: verified.user };
}
