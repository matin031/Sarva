/** نوع‌های احراز هویت.
 *
 *  عمداً بدون "server-only": فرم‌های سمت کلاینت هم باید بتوانند شکل کاربری را
 *  که /api/v1/auth/me برمی‌گرداند تایپ کنند. هیچ‌چیز محرمانه‌ای اینجا نیست —
 *  password_hash عمداً در AuthUser وجود ندارد. */

/**
 * نقشِ کاربر — **فقط سرور می‌نویسدش**.
 *
 * ⚠️ `teacher` از مهاجرت ۰۰۹ اضافه شد و تنها راهِ رسیدن به آن، تأییدِ یک
 * درخواست توسط مدیر است (`lib/admin/teacher-actions.ts`). هیچ endpointِ
 * کاربری این ستون را نمی‌نویسد.
 *
 * چیزی که کاربر خودش انتخاب می‌کند `desiredRole` است — یک *خواسته* که هیچ
 * دری را باز نمی‌کند. آن دو را هرگز قاطی نکنید؛ توضیحِ کامل بالای
 * `mysql-migrations/009_profile_teacher_classes.sql`.
 */
export type UserRole = "student" | "teacher" | "admin";

/** پایهٔ تحصیلی — برچسب‌های فارسی‌اش در `lib/profile/schemas.ts`. */
export type UserGrade = "10" | "11" | "12";

/** کاربر، آن‌طور که کد اپلیکیشن می‌بیند. هرگز شامل هش رمز نیست. */
export type AuthUser = {
  id: string;
  /**
   * ⚠️ از زمانِ ثبت‌نام با موبایل (مهاجرت ۰۰۶) می‌تواند `null` باشد.
   *
   * کاربری که فقط با شماره ثبت‌نام کرده ایمیل ندارد، و ستونِ دیتابیس هم
   * دیگر NOT NULL نیست. این nullable بودن عمدی و *مفید* است: کامپایلر هر
   * جایی را که ایمیل را قطعی فرض کرده فهرست می‌کند. گشتن با grep یکی را جا
   * می‌گذاشت و آن یکی در زمانِ اجرا می‌شکست.
   *
   * قاعده: هر کاربر دست‌کم یکی از `email` یا `phone` را دارد — دیتابیس با
   * `users_identity_check` نگهبانش است.
   */
  email: string | null;
  /** شکلِ متعارف: `989123456789`. برای نمایش از `formatPhone` استفاده کنید. */
  phone: string | null;
  /**
   * نامِ نمایشی. از مهاجرت ۰۰۹ **مشتق** است: یک تریگر آن را از
   * `first_name` و `last_name` می‌سازد. مستقیم ننویسیدش — بنویسید و
   * دیتابیس بازنویسی‌اش می‌کند.
   */
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  /** نشانیِ نسبی مثل `/uploads/avatars/…`، یا null. */
  avatarUrl: string | null;
  /** شناسهٔ `IR005`. نامِ نمایشی‌اش با `lib/geo` ساخته می‌شود. */
  provinceId: string | null;
  /** شناسهٔ `IR005001` — همیشه زیرِ همان `provinceId`. */
  cityId: string | null;
  school: string | null;
  grade: UserGrade | null;
  role: UserRole;
  /**
   * ⚠️ «دوست دارم دبیر باشم» — نه «دبیرم».
   *
   * تنها چیزی که این مقدار عوض می‌کند، دیده شدنِ بخشِ «فعال‌سازی حساب دبیر»
   * در پنل است. هیچ قابلیتی به آن وابسته نیست و نباید بشود: برای هر
   * تصمیمِ دسترسی، `role` را بخوانید.
   */
  desiredRole: "student" | "teacher";
  emailVerified: boolean;
  phoneVerified: boolean;
  /** کاربر دستِ‌کم یک بار فرمِ پروفایل را کامل کرده؟ */
  profileCompleted: boolean;
  isBanned: boolean;
  /** رشتهٔ ISO — مبدل نوعِ lib/db این را تضمین می‌کند */
  createdAt: string;
};

/** خطای احراز هویت با پیام فارسیِ قابل نمایش به کاربر.
 *
 *  دلیل وجودش: کد فعلی پنل ادمین انتظار دارد requireAdmin() با throw کار کند و
 *  پیامش را نشان می‌دهد (components/admin/AdminGate.tsx). با یک کلاس اختصاصی،
 *  کدِ فراخوان می‌تواند «دسترسی ندارد» را از «دیتابیس خراب است» تشخیص بدهد —
 *  چیزی که با Error خالی ممکن نبود. */
export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
