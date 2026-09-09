import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withRoute } from "@/lib/api/route";
import { isUuid } from "@/lib/api/action-input";
import { settlePayment } from "@/lib/plus/orders";
import { logger } from "@/lib/observability";

/**
 * GET /payment/return — جایی که مرورگر بعد از درگاه به آن برمی‌گردد.
 *
 * ⚠️ چرا یک Route Handler و نه یک صفحه:
 *
 * این آدرس یک *عمل* انجام می‌دهد (تأیید پرداخت)، نه یک نمایش. اگر صفحه بود،
 * عمل داخلِ رندر انجام می‌شد و هر رفرش، هر پیش‌واکشیِ مرورگر و هر رندرِ
 * دوبارهٔ React یک بار دیگر صدایش می‌زد. اینجا یک بار اجرا می‌شود و بعد به
 * صفحهٔ نتیجه ریدایرکت می‌کند — پس رفرشِ کاربر روی صفحهٔ نتیجه دیگر هیچ
 * فراخوانیِ درگاهی ندارد.
 *
 * ⚠️ و مهم‌تر: **این آدرس منبعِ حقیقت نیست.** پارامترهای بازگشت فقط به
 * آداپتورِ درگاه داده می‌شوند تا او تأیید کند؛ هیچ‌کدامشان مستقیماً به
 * «پرداخت موفق» تبدیل نمی‌شوند. یعنی این کار نمی‌کند:
 *
 *     /payment/return?order=…&success=true
 *
 * اگر کاربر اصلاً به اینجا برنگردد (اینترنت قطع شود، صفحهٔ بانک بسته شود)،
 * سفارش از بین نمی‌رود: همان تأیید بعداً از مسیر «بررسی دوباره» در صفحهٔ
 * خریدها انجام می‌شود.
 */
export const GET = withRoute("/payment/return", async (request: NextRequest) => {
  const url = request.nextUrl;
  const orderId = url.searchParams.get("order") ?? "";

  const fallback = new URL("/panel/billing", url.origin);

  const user = await getCurrentUser();
  if (!user) {
    // کاربر در حین پرداخت از حساب خارج شده یا کوکی‌اش رفته. سفارش سرِ جایش
    // است؛ فقط باید دوباره وارد شود و از «خریدهای من» وضعیت را ببیند.
    const login = new URL("/auth", url.origin);
    login.searchParams.set("returnTo", "/panel/billing");
    return NextResponse.redirect(login);
  }

  if (!isUuid(orderId)) return NextResponse.redirect(fallback);

  const result = new URL("/payment/result", url.origin);
  result.searchParams.set("order", orderId);

  try {
    // پارامترهای بازگشت همان‌طور که آمده‌اند به آداپتور داده می‌شوند. خودِ
    // آداپتور تصمیم می‌گیرد کدامشان معنی دارند و کدام باید نادیده گرفته شوند.
    const returnParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (key !== "order") returnParams[key] = value;
    });

    await settlePayment({ userId: user.id, orderId, returnParams });
  } catch (err) {
    // ⚠️ شکستِ تأیید هرگز نباید کاربر را با یک صفحهٔ خطای خام تنها بگذارد.
    // صفحهٔ نتیجه وضعیتِ واقعی را از دیتابیس می‌خواند و اگر هنوز نامعلوم
    // باشد، دکمهٔ «بررسی دوباره» را نشان می‌دهد.
    logger.error("تأیید پرداخت در بازگشت از درگاه شکست خورد", {
      event: "plus.payment.return_failed",
      err,
      order_id: orderId,
    });
  }

  return NextResponse.redirect(result);
});

export const dynamic = "force-dynamic";
