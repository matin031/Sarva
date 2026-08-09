import { z } from "zod";

/**
 * قوانین اعتبارسنجی حساب کاربری — یک نسخه، مشترک بین کلاینت و سرور.
 *
 * عمداً بدون "server-only": فرم‌های SignUp.tsx و MobileLoginForm.tsx در فاز ۷
 * همین‌ها را import می‌کنند. تا امروز هر فرم قوانین خودش را داشت و سرور هیچ
 * اعتبارسنجی‌ای نمی‌کرد — یعنی هر کسی می‌توانست با یک curl مستقیم، رکوردی
 * بسازد که هیچ‌کدام از آن قوانین را رعایت نکند.
 *
 * اعتبارسنجی کلاینت برای تجربهٔ کاربری است؛ همینِ سمت سرور است که واقعاً دروازه
 * است. یکی بودنشان یعنی پیام خطا هم در هر دو طرف یکسان است.
 */

// عمداً یک regex ساده و نه z.email(): این دقیقاً همان الگویی است که فرم‌های
// فعلی استفاده می‌کنند، و سخت‌گیرتر کردنش سمت سرور یعنی فرم قبول کند ولی
// سرور رد کند — بدترین حالت ممکن برای کاربر.
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "ایمیل خیلی بلند است")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "ایمیل معتبر نیست!");

/**
 * رایج‌ترین رمزهایی که هر فهرستِ حملهٔ آماده‌ای با آن‌ها شروع می‌کند.
 *
 * این «چک قدرت رمز» نیست و ادعایش را هم ندارد — فهرست‌های واقعی میلیون‌ها
 * ردیف دارند و جایشان یک سرویس مثل Have I Been Pwned است، نه یک آرایه در کد.
 * کارِ این چند ده ردیف فقط بستنِ درِ جلویی است: رمزهایی که یک اسکریپت در
 * *اولین* تلاش‌هایش امتحان می‌کند.
 *
 * مقایسه با حروف کوچک انجام می‌شود، پس «Password123» هم گرفته می‌شود.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234",
  "passw0rd", "p@ssword", "p@ssw0rd", "12345678", "123456789", "1234567890",
  "1234567890", "987654321", "1234abcd", "abcd1234", "abc12345", "qwerty123",
  "qwertyui", "qwerty12", "asdfghjk", "zxcvbnm1", "1q2w3e4r", "1qaz2wsx",
  "qazwsxedc", "iloveyou", "sunshine", "princess", "football", "baseball",
  "superman", "batman12", "trustno1", "starwars", "welcome1", "welcome123",
  "admin123", "administrator", "letmein1", "letmein123", "monkey12",
  "dragon12", "master12", "shadow12", "michael1", "jennifer", "computer",
  "internet", "whatever", "freedom1", "samsung1", "iphone12", "google12",
  "11111111", "00000000", "88888888", "12341234", "12121212", "asdasdasd",
  "aaaaaaaa", "abcdefgh", "abcdefghij", "iloveyou1", "sarva123", "sarva1234",
]);

/**
 * رمز عبور.
 *
 * ⚠️ دو قانونِ قبلی عوض شده‌اند و هر دو تغییر عمدی است:
 *
 * ۱) **سقف از ۱۶ به ۷۲ رفت.** سقف ۱۶ هیچ توجیه فنی نداشت: argon2id (که
 *    lib/auth/password.ts استفاده می‌کند) هیچ محدودیت طولی ندارد — برخلاف
 *    bcrypt که ورودی را بعد از ۷۲ بایت می‌بُرد و دقیقاً به همین دلیل کنار
 *    گذاشته شده بود. اثرِ عملیِ آن سقف این بود که کاربرِ password manager
 *    نمی‌توانست رمز تصادفیِ ۲۰ نویسه‌ای بسازد و به رمز ضعیف‌تر رانده می‌شد.
 *    (۷۲ به‌عنوان سقف نگه داشته شده تا هزینهٔ هش کردن قابل پیش‌بینی بماند.)
 *
 * ۲) **فاصله و نویسه‌های یونیکد مجاز شدند.** الگوی قبلی فقط ASCII بدون فاصله
 *    را می‌پذیرفت، یعنی passphrase — که امن‌ترین نوعِ رمزِ قابلِ به‌خاطر
 *    سپردن است — ممکن نبود.
 *
 * ⚠️ سازگاری با گذشته: هیچ کاربر فعلی‌ای مجبور به تغییر رمز نمی‌شود. این
 * قوانین فقط هنگام *ساختن* یا *عوض کردن* رمز اجرا می‌شوند؛ ورود از
 * loginSchema رد می‌شود که عمداً هیچ قانون قالبی ندارد.
 */
export const passwordField = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(72, "رمز عبور باید حداکثر ۷۲ کاراکتر باشد")
  // نویسه‌های کنترلی (تب، newline، null) رد می‌شوند: در هیچ رمز واقعی معنی
  // ندارند و معمولاً نشانهٔ کپی/پیستِ خراب یا ورودیِ ساختگی‌اند.
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "رمز عبور شامل نویسه‌های غیرمجاز است")
  .refine(
    (v) => !COMMON_PASSWORDS.has(v.toLowerCase()),
    "این رمز عبور بسیار رایج و قابل حدس است. رمز دیگری انتخاب کنید",
  )
  // یک رمز که فقط یک نویسه دارد («aaaaaaaa») از سقف حداقل رد می‌شود ولی
  // آنتروپی‌اش صفر است.
  .refine((v) => new Set(v).size >= 4, "رمز عبور باید دست‌کم ۴ نویسهٔ متفاوت داشته باشد");

export const nameField = z
  .string()
  .trim()
  .min(3, "نام الزامی است")
  .max(60, "نام خیلی بلند است")
  .regex(/^[\u0600-\u06FF\s]+$/, "نام باید فقط به فارسی وارد شود");

/**
 * توکن کپچا.
 *
 * اختیاری است و این عمدی است: وقتی TURNSTILE_SECRET_KEY تنظیم نشده باشد،
 * کپچا کاملاً خاموش است و فرم اصلاً توکنی تولید نمی‌کند. اگر این فیلد اجباری
 * بود، فعال کردن کپچا نیاز به تغییر کد داشت و — بدتر — فراموش کردنِ کلید،
 * فرم ورود را برای همه می‌شکست.
 *
 * تصمیمِ «این توکن لازم است یا نه» جای دیگری گرفته می‌شود:
 * lib/auth/turnstile.ts، که وقتی کلید هست هیچ توکنی را بدون تأیید Cloudflare
 * نمی‌پذیرد. یعنی خالی بودن این فیلد فقط تا وقتی بی‌خطر است که کپچا خاموش
 * باشد.
 */
export const turnstileField = z.string().max(2048).optional();

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  turnstileToken: turnstileField,
});

export const loginSchema = z.object({
  email: emailField,
  // در ورود، قالبِ رمز بررسی نمی‌شود — فقط خالی نبودنش. اگر همان قوانین
  // ثبت‌نام را اینجا هم می‌گذاشتیم، پیام خطا به مهاجم می‌گفت رمز این حساب
  // چه شکلی نیست.
  password: z.string().min(1, "رمز عبور را وارد کنید"),
  turnstileToken: turnstileField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز فعلی را وارد کنید"),
  newPassword: passwordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
