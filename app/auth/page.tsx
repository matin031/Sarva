import Auth from "@/components/UI/Auth";
import { googleConfig } from "@/lib/auth/oauth/google";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ورود / ثبت‌نام",
  robots: { index: false, follow: false },
};

/**
 * پیام‌های بازگشت از جریانِ گوگل.
 *
 * ⚠️ کدها از URL می‌آیند، پس هرکسی می‌تواند هر رشته‌ای بگذارد. فقط کلیدهای
 * شناخته‌شده پیام می‌گیرند و بقیه نادیده گرفته می‌شوند — هیچ متنی از URL روی
 * صفحه نمی‌نشیند.
 */
const AUTH_ERRORS: Record<string, string> = {
  google_disabled: "ورود با گوگل روی این سایت فعال نیست.",
  google_cancelled: "ورود با گوگل نیمه‌کاره ماند.",
  google_expired: "مهلت ورود با گوگل تمام شد. دوباره تلاش کنید.",
  google_failed: "ورود با گوگل انجام نشد. دوباره تلاش کنید.",
  google_email_unverified:
    "این ایمیل قبلاً در سروا حساب دارد و گوگل مالکیتش را تأیید نکرده است. با رمز عبور وارد شوید.",
  banned: "حساب شما مسدود شده است. با پشتیبانی تماس بگیرید.",
  too_many: "تلاش‌های زیاد. کمی بعد دوباره امتحان کنید.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? AUTH_ERRORS[error] : undefined;

  // پیکربندیِ گوگل فقط روی سرور خوانده می‌شود؛ به کلاینت یک بولین می‌رسد و
  // نه کلید و نه آدرسی.
  const googleEnabled = googleConfig() !== null;

  return (
    <main className=" container ">
      {message && (
        <p
          dir="rtl"
          role="alert"
          className="mx-auto mt-6 max-w-md rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
        >
          {message}
        </p>
      )}
      <Auth googleEnabled={googleEnabled} />
    </main>
  );
}
