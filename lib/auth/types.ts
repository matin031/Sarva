/** نوع‌های احراز هویت.
 *
 *  عمداً بدون "server-only": فرم‌های سمت کلاینت هم باید بتوانند شکل کاربری را
 *  که /api/v1/auth/me برمی‌گرداند تایپ کنند. هیچ‌چیز محرمانه‌ای اینجا نیست —
 *  password_hash عمداً در AuthUser وجود ندارد. */

export type UserRole = "student" | "admin";

/** کاربر، آن‌طور که کد اپلیکیشن می‌بیند. هرگز شامل هش رمز نیست. */
export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  emailVerified: boolean;
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
