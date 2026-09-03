/**
 * بررسیِ ادعاهای id_token گوگل.
 *
 * عمداً بدونِ `server-only` و بدونِ هیچ ورودی/خروجی: منطقِ خالص است تا بشود
 * مستقیم تستش کرد. کارِ شبکه در google.ts است.
 *
 * ⚠️ چرا امضا اینجا بررسی نمی‌شود: این توکن از تبادلِ مستقیمِ code با
 * googleapis.com روی TLS می‌آید، نه از مرورگرِ کاربر. وقتی توکن را خودمان از
 * کانالِ امنِ خودِ صادرکننده گرفته‌ایم، امضا چیزی به آن اضافه نمی‌کند —
 * خودِ گوگل هم همین را می‌گوید. ولی *ادعاها* همچنان باید بررسی شوند، چون
 * جلوی سوءاستفاده از توکنی که برای اپِ دیگری صادر شده را می‌گیرند.
 */

export type GoogleIdClaims = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  nonce?: unknown;
};

export type VerifiedGoogleUser = {
  /** شناسهٔ پایدار نزد گوگل. کلیدِ ما، نه ایمیل. */
  sub: string;
  email: string;
  /** آیا گوگل خودش این ایمیل را تأیید کرده. */
  emailVerified: boolean;
  name: string | null;
};

export type ClaimsFailure =
  | "bad_issuer"
  | "bad_audience"
  | "expired"
  | "missing_subject"
  | "missing_email"
  | "nonce_mismatch";

/** فقط این دو مقدار برای iss پذیرفته‌اند. */
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export function verifyGoogleClaims(
  claims: GoogleIdClaims,
  expected: { clientId: string; nonce: string; now?: number },
): { ok: true; user: VerifiedGoogleUser } | { ok: false; reason: ClaimsFailure } {
  if (typeof claims.iss !== "string" || !ISSUERS.has(claims.iss)) {
    return { ok: false, reason: "bad_issuer" };
  }

  // ⚠️ مهم‌ترین بررسی. بدونِ آن، توکنی که کاربر برای *اپِ دیگری* گرفته اینجا
  // پذیرفته می‌شد و هرکسی با یک اپِ گوگلِ خودش می‌توانست به‌جای هر کاربری
  // وارد شود.
  if (claims.aud !== expected.clientId) {
    return { ok: false, reason: "bad_audience" };
  }

  const now = expected.now ?? Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp <= now) {
    return { ok: false, reason: "expired" };
  }

  // nonce همان چیزی است که ما در شروعِ جریان ساختیم و در کوکی گذاشتیم.
  // نبودن یا نخواندنش یعنی این توکن پاسخِ درخواستِ ما نیست.
  if (typeof claims.nonce !== "string" || claims.nonce !== expected.nonce) {
    return { ok: false, reason: "nonce_mismatch" };
  }

  if (typeof claims.sub !== "string" || claims.sub === "") {
    return { ok: false, reason: "missing_subject" };
  }

  if (typeof claims.email !== "string" || claims.email === "") {
    return { ok: false, reason: "missing_email" };
  }

  return {
    ok: true,
    user: {
      sub: claims.sub,
      email: claims.email.toLowerCase(),
      // ⚠️ فقط `true`ی واقعی. گوگل گاهی رشتهٔ "true" می‌فرستد؛ هر دو پذیرفته‌اند
      // ولی هر چیزِ دیگری یعنی «تأیید نشده»، و پیش‌فرض باید سخت‌گیرانه باشد.
      emailVerified: claims.email_verified === true || claims.email_verified === "true",
      name: typeof claims.name === "string" && claims.name.trim() !== "" ? claims.name.trim() : null,
    },
  };
}

/**
 * بدنهٔ JWT را بدون بررسی امضا باز می‌کند.
 *
 * نامش صریح است چون کارش خطرناک به نظر می‌رسد؛ توضیحِ بالای فایل می‌گوید چرا
 * در این *یک* مسیر بی‌خطر است. هیچ‌جای دیگری نباید استفاده شود.
 */
export function decodeJwtPayloadUnverified(jwt: string): GoogleIdClaims | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as GoogleIdClaims;
  } catch {
    return null;
  }
}

/**
 * آیا این ورودِ گوگل اجازه دارد به حسابِ *موجودی* با همین ایمیل وصل شود؟
 *
 * ⚠️ این تابع کوچک است ولی جای حساسی را می‌گیرد. بدونِ شرطِ emailVerified،
 * کسی که یک حسابِ گوگل با ایمیلِ تأییدنشدهٔ قربانی بسازد، با یک کلیک واردِ
 * حسابِ او می‌شد — بی‌آنکه رمزی بداند. اتصالِ خودکار فقط وقتی مجاز است که
 * *گوگل* مالکیتِ آن آدرس را تأیید کرده باشد.
 */
export function mayLinkToExistingAccount(user: VerifiedGoogleUser): boolean {
  return user.emailVerified;
}
