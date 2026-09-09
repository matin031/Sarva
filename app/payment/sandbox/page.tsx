import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { paymentProviderName } from "@/lib/plus/config";
import { buildSandboxToken } from "@/lib/plus/payments";
import { formatRials } from "@/lib/plus/money";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درگاه آزمایشی",
  robots: { index: false, follow: false },
};

/**
 * شبیه‌سازِ صفحهٔ بانک — فقط برای توسعه و تست.
 *
 * ⚠️ چهار قفل روی این صفحه است و هر چهار لازم‌اند:
 *
 *   ۱) فقط وقتی درگاهِ انتخاب‌شده «آزمایشی» است.
 *   ۲) فقط وقتی `NODE_ENV` تولیدی نیست.
 *   ۳) فقط کاربرِ واردشده.
 *   ۴) فقط اگر تلاشِ پرداخت با این شناسه، متعلق به سفارشِ *همین* کاربر باشد.
 *
 * قفلِ چهارم مهم‌ترین است: بدونِ آن، هر کسی می‌توانست شناسهٔ تلاشِ دیگری را
 * حدس بزند و برایش توکنِ «پرداخت موفق» بسازد.
 *
 * ⚠️ و نکتهٔ اصلی: این صفحه نتیجه را به‌صورت `?success=true` برنمی‌گرداند.
 * یک توکنِ **امضاشده** برمی‌گرداند که سرور امضایش را بررسی می‌کند — همان
 * کاری که با callbackِ یک درگاه واقعی می‌کنیم. پس مسیرِ کد همان مسیرِ واقعی
 * است و روزِ وصلِ درگاه، چیزی «برای اولین بار» اجرا نمی‌شود.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; amount?: string; order?: string; back?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  if ((await paymentProviderName()) !== "test") notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const { ref, back } = await searchParams;
  if (!ref) notFound();

  // مالکیت: این تلاشِ پرداخت باید مالِ سفارشی از همین کاربر باشد.
  const attempt = await queryOne<{ amount_rials: number; order_number: string }>(
    `select a.amount_rials, o.order_number
       from plus_payment_attempts a
       join plus_orders o on o.id = a.order_id
      where a.provider_ref = $1 and o.user_id = $2`,
    [ref, user.id],
  );
  if (!attempt) notFound();

  /* ⚠️ آدرسِ بازگشت هرگز همان‌طور که آمده استفاده نمی‌شود.
     `back` را خودِ سرور ساخته بود، ولی این صفحه آن را از query می‌گیرد و
     query را کاربر هم می‌تواند دست بزند. اگر مستقیم در `href` می‌نشست، همین
     صفحهٔ توسعه‌ای یک Open Redirect بود: `?back=https://evil.example`.

     پس فقط مسیر و queryِ آن نگه داشته می‌شود، و آن هم فقط اگر دقیقاً
     `/payment/return` باشد. در غیر این صورت مسیرِ ثابت جایگزین می‌شود. */
  const returnBase = safeReturnPath(back);

  const join = returnBase.includes("?") ? "&" : "?";
  const paidHref = `${returnBase}${join}token=${encodeURIComponent(buildSandboxToken(ref, "paid"))}`;
  const cancelHref = `${returnBase}${join}token=${encodeURIComponent(buildSandboxToken(ref, "cancelled"))}`;

  return (
    <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-16 max-w-md">
      <div className="glass rounded-2xl border-2 border-dashed border-destructive/40 p-6 text-center">
        <p className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
          درگاه آزمایشی — هیچ پولی جابه‌جا نمی‌شود
        </p>

        <h1 className="mt-5 text-lg font-extrabold">پرداخت سفارش {attempt.order_number}</h1>
        <p className="mt-2 text-2xl font-extrabold">{formatRials(attempt.amount_rials)}</p>

        <div className="mt-6 space-y-2">
          <a
            href={paidHref}
            className="block rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            پرداخت موفق (شبیه‌سازی)
          </a>
          <a
            href={cancelHref}
            className="block rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground"
          >
            انصراف
          </a>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          این صفحه فقط در محیط توسعه وجود دارد. روی سرور اصلی، جای آن را درگاه
          واقعی می‌گیرد و هیچ‌کدام از دکمه‌های بالا در دسترس نیست.
        </p>
      </div>
    </main>
  );
}

/**
 * مسیرِ بازگشتِ امن: فقط `/payment/return`، با queryِ خودش.
 *
 * ⚠️ نکتهٔ کلیدی: **میزبانِ ورودی همیشه دور ریخته می‌شود.** آدرسِ بازگشتی که
 * سرور ساخته مطلق است (`http://…/payment/return?order=…`) و آدرسی که یک
 * مهاجم جا بزند هم مطلق است؛ فرقشان از داخلِ این تابع قابلِ اثبات نیست و
 * لازم هم نیست باشد. چون فقط `pathname` و `search` نگه داشته می‌شوند، هر
 * میزبانی که بیاید بی‌اثر است و لینکِ نهایی همیشه نسبی و داخلی است.
 *
 * (نسخهٔ اول اینجا میزبان را با یک مبنای ساختگی مقایسه می‌کرد. نتیجه‌اش این
 * بود که آدرسِ *درستِ* سرور هم رد می‌شد و `order` از دست می‌رفت — یعنی
 * بازگشت از درگاه به فهرست خریدها می‌افتاد به‌جای صفحهٔ نتیجه. آزمونِ
 * دستیِ همین جریان پیدایش کرد.)
 */
function safeReturnPath(raw: string | undefined): string {
  const FALLBACK = "/payment/return";
  if (!raw) return FALLBACK;
  try {
    const url = new URL(raw, "https://sandbox.invalid");
    if (url.pathname !== FALLBACK) return FALLBACK;
    // فقط مسیر و query — میزبان و پروتکل هرگز به لینک نمی‌رسند.
    return `${url.pathname}${url.search}`;
  } catch {
    return FALLBACK;
  }
}
