import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { accessTtlSeconds, jwtSecret } from "./config";

/**
 * دو توکن، دو نقش کاملاً متفاوت.
 *
 *   • access — یک JWT کوتاه‌عمر. تأییدش فقط یک بررسی امضاست و به دیتابیس نمی‌زند،
 *     برای همین است که proxy.ts می‌تواند روی هر درخواست اجرایش کند.
 *
 *   • refresh — یک رشتهٔ تصادفیِ بی‌معنا که ردیفی در جدول sessions دارد. چون
 *     حالتش در دیتابیس است، می‌شود باطلش کرد — و این تنها دلیل وجودش است.
 *
 * چرا فقط JWT کافی نیست: JWT را نمی‌شود پس گرفت. اگر تنها همان بود، «مسدود کردن
 * کاربر» تا انقضای توکن هیچ اثری نداشت. با این تقسیم، بن کردن refresh را باطل
 * می‌کند و کاربر حداکثر به اندازهٔ عمر access (پیش‌فرض ۱۵ دقیقه) دسترسی
 * باقی‌مانده دارد، نه ۳۰ روز.
 */

export type AccessClaims = {
  /** شناسهٔ کاربر */
  sub: string;
  /** نقش — فقط برای بررسیِ خوش‌بینانه در proxy.ts.
   *
   *  تصمیمِ واقعیِ دسترسی هرگز به این تکیه نمی‌کند: requireAdmin() نقش را از
   *  دیتابیس می‌خواند. اگر ادمینی همین حالا عزل شود، این ادعا تا ۱۵ دقیقه
   *  کهنه می‌ماند — که برای «آیا منوی مدیریت را نشان بدهم» بی‌خطر است و برای
   *  «آیا اجازهٔ حذف کاربر دارد» نیست. */
  role: "student" | "admin";
  /** شناسهٔ سشنی که این توکن از آن زاده شده — برای ردیابی و ابطال */
  sid: string;
};

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: claims.role, sid: claims.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + accessTtlSeconds())
    .sign(jwtSecret());
}

/** ادعاهای معتبر، یا null. توکنِ منقضی/دستکاری‌شده null می‌دهد نه خطا. */
export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] });

    const sub = payload.sub;
    const role = payload.role;
    const sid = payload.sid;

    // یک توکن با امضای درست ولی محتوای ناقص نباید نیمه‌قبول شود.
    if (typeof sub !== "string" || typeof sid !== "string") return null;
    if (role !== "student" && role !== "admin") return null;

    return { sub, role, sid };
  } catch {
    // منقضی، امضای غلط، الگوریتم غلط، JSON خراب — همه یک معنی دارند: نامعتبر.
    return null;
  }
}

// ---------------------------------------------------------------------------
// refresh token
// ---------------------------------------------------------------------------

/** ۳۲ بایت آنتروپیِ رمزنگارانه، base64url تا در کوکی بی‌دردسر بنشیند. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * هشِ توکن، برای ذخیره در دیتابیس.
 *
 * SHA-256 خالی و بدون salt — و این عمدی است، برخلاف رمز عبور. توکن ۲۵۶ بیت
 * آنتروپیِ تصادفی دارد، پس جدول رنگین‌کمانی و brute-force بی‌معنی‌اند و چیزی
 * برای «کند کردن» وجود ندارد. هشِ کند اینجا فقط هر درخواستِ refresh را گران
 * می‌کرد بی‌آنکه یک ذره امنیت اضافه کند.
 *
 * (برخلافش، کد ۶ رقمیِ OTP فقط ۲۰ بیت آنتروپی دارد و دقیقاً به همین دلیل در
 *  فاز ۴ با HMAC و یک pepper مخفی هش می‌شود، نه با SHA-256 خالی.)
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
