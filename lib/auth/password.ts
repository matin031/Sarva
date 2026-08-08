import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * هش رمز عبور.
 *
 * argon2id و نه bcrypt: bcrypt ورودی را بعد از ۷۲ بایت می‌بُرد (یک رمز عبورِ
 * فارسیِ بلند می‌تواند به آن برسد، چون هر حرف در UTF-8 دو بایت است) و در برابر
 * حمله با GPU مقاومت کمتری دارد.
 *
 * از @node-rs/argon2 استفاده می‌شود نه بستهٔ argon2: این یکی باینریِ از پیش
 * ساخته دارد، پس build داکر به node-gyp و کامپایلر C نیاز ندارد.
 */

// پارامترهای پیشنهادی OWASP برای argon2id: ۱۹ مگابایت حافظه، ۲ گذر، بدون
// موازی‌سازی. همین مقادیر در scripts/seed-admin.mjs هم هست — اگر اینجا عوض
// شدند آنجا هم باید عوض شوند، وگرنه رمزِ ساخته‌شدهٔ آن اسکریپت با این کد قابل
// تأیید نیست.
//
// (دقیق‌تر: خودِ رشتهٔ خروجی argon2 پارامترهایش را در خودش دارد، پس تأییدِ
//  هش‌های قدیمی حتی بعد از تغییر پارامترها کار می‌کند. یکی نگه داشتنشان برای
//  این است که هش‌های تازه هزینهٔ یکسانی داشته باشند.)
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

/**
 * تأیید رمز.
 *
 * هرگز throw نمی‌کند. یک هشِ خراب یا با فرمت ناشناخته در دیتابیس باید «رمز
 * اشتباه است» بدهد، نه ۵۰۰ — وگرنه یک ردیفِ خراب، صفحهٔ ورود را برای همه
 * می‌شکند و پیام خطا هم به مهاجم می‌گوید این حساب چیز غیرعادی‌ای دارد.
 */
export async function verifyPassword(hashString: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashString, plain, OPTIONS);
  } catch {
    return false;
  }
}
