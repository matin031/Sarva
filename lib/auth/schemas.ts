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

export const passwordField = z
  .string()
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(16, "رمز عبور باید حداکثر ۱۶ کاراکتر باشد")
  .regex(
    /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/,
    "رمز عبور فقط می‌تواند شامل حروف انگلیسی، اعداد و علائم باشد",
  );

export const nameField = z
  .string()
  .trim()
  .min(3, "نام الزامی است")
  .max(60, "نام خیلی بلند است")
  .regex(/^[\u0600-\u06FF\s]+$/, "نام باید فقط به فارسی وارد شود");

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: emailField,
  // در ورود، قالبِ رمز بررسی نمی‌شود — فقط خالی نبودنش. اگر همان قوانین
  // ثبت‌نام را اینجا هم می‌گذاشتیم، پیام خطا به مهاجم می‌گفت رمز این حساب
  // چه شکلی نیست.
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "رمز فعلی را وارد کنید"),
  newPassword: passwordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
