import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CompleteProfileForm from "@/components/UI/CompleteProfileForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { safeReturnTo } from "@/lib/auth/return-to";

export const metadata: Metadata = {
  title: "تکمیل حساب",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * صفحهٔ تکمیلِ حسابِ نیمه‌ساخته — نام و نام خانوادگی.
 *
 * کسی اینجا می‌رسد که با گوگل یا با کدِ پیامکی وارد شده و حسابش هنوز نام
 * ندارد. `proxy.ts` او را از هر مسیرِ دیگری به اینجا برمی‌گرداند؛ توضیحِ
 * چراییِ آن گیت (و اینکه چرا در layout نیست) همان‌جا نوشته شده.
 *
 * ⚠️ این صفحه گاردِ **خودش** را هم دارد و به گیتِ proxy تکیه نمی‌کند.
 * آن گیت از یک ادعای تا-۱۵-دقیقه-کهنه در توکن می‌خواند؛ اینجا ردیفِ واقعیِ
 * کاربر خوانده می‌شود. پس کسی که نامش را قبلاً نوشته (مثلاً در تبِ دیگری)
 * اینجا گیر نمی‌افتد، و کسی که وارد نشده اصلاً این فرم را نمی‌بیند.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const { returnTo } = await searchParams;
  /* ⚠️ همان پاک‌سازیِ سمتِ سرورِ صفحهٔ ورود. جزئیاتِ خطر (Open Redirect)
     بالای lib/auth/return-to.ts نوشته شده. */
  const destination = safeReturnTo(returnTo);

  if (!needsOnboarding(user)) redirect(destination);

  /* پیش‌پُرکردن از نامی که گوگل داده.
     ⚠️ فقط وقتی فارسی باشد. نامِ گوگل معمولاً لاتین است («Matin Jafari») و
     ریختنش در فیلد یعنی کاربر قبل از اینکه چیزی بنویسد، دو پیامِ خطای قرمز
     می‌بیند — بدترین شکلِ خوش‌آمدگویی. */
  const parts = (user.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const persian = /^[\u0600-\u06FF\u200c\s]+$/;
  const prefill =
    parts.length >= 2 && persian.test(user.fullName ?? "")
      ? { firstName: parts[0], lastName: parts.slice(1).join(" ") }
      : { firstName: "", lastName: "" };

  return (
    <main dir="rtl" className="container">
      <CompleteProfileForm
        defaultValues={prefill}
        returnTo={destination}
        /* برای جمله‌ای که می‌گوید این حساب با چه چیزی ساخته شده — تا کاربر
           بداند اینجا کجاست و چرا ناگهان یک فرم می‌بیند. */
        via={user.email ? "email" : "phone"}
      />
    </main>
  );
}
