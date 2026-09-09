import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./types";

/**
 * درگاهِ آزمایشی — برای توسعه و تست، هرگز برای فروش واقعی.
 *
 * ⚠️ **این فایل روی سرورِ اصلی اجرا نمی‌شود.** سازنده‌اش در production خطا
 * می‌دهد. دلیلش تعارف نیست: یک درگاهِ آزمایشی که بتواند در production یک
 * پرداختِ «تأییدشده» بسازد، دقیقاً یعنی هر کسی می‌تواند بدون پول اشتراک
 * بگیرد.
 *
 * ── چطور «پرداخت» را شبیه‌سازی می‌کند ───────────────────────────────────────
 * کاربر به یک صفحهٔ داخلی (`/payment/sandbox`) می‌رود که نقشِ صفحهٔ بانک را
 * بازی می‌کند و دو دکمه دارد: «پرداخت موفق» و «انصراف».
 *
 * ⚠️ نکتهٔ مهم: آن صفحه نتیجه را به‌صورت `?success=true` برنمی‌گرداند. چنین
 * چیزی یعنی هر کسی با تایپ کردنِ یک URL اشتراک بگیرد. به‌جایش یک **توکنِ
 * امضاشده** برمی‌گردد و `verifyPayment` امضا را بررسی می‌کند — همان کاری که
 * با callbackِ امضاشدهٔ یک درگاه واقعی می‌کنیم. پس مسیرِ کد دقیقاً همان مسیرِ
 * واقعی است و در روزِ وصلِ درگاه، چیزی «برای اولین بار» اجرا نمی‌شود.
 *
 * توکن یک‌بارمصرف نیست و لازم هم نیست: تکرارِ verify یک entitlement دوم
 * نمی‌سازد، چون ایندکس یکتای `plus_entitlements_order_idx` سرِ راه ایستاده.
 * (و همین یعنی تکرارِ callback در محیط تست هم واقعاً تست می‌شود.)
 */

const PROVIDER_NAME = "test";

/**
 * کلیدِ امضا.
 *
 * ⚠️ از `AUTH_JWT_SECRET` *مشتق* می‌شود و خودش نیست: اگر این توکن‌ها با همان
 * کلیدِ نشستِ کاربر امضا می‌شدند، لو رفتنِ یکی، دیگری را هم لو می‌داد.
 */
function signingKey(): Buffer {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET تنظیم نشده است؛ درگاه آزمایشی نمی‌تواند امضا کند.");
  }
  return createHmac("sha256", secret).update("sarva-plus/test-gateway/v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/** مقایسهٔ امضا در زمانِ ثابت — مقایسهٔ معمولی نشتِ زمانی دارد. */
function signatureMatches(payload: string, provided: string): boolean {
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(provided);
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}

/** توکنی که صفحهٔ شبیه‌ساز به آدرس بازگشت اضافه می‌کند. */
export function buildSandboxToken(providerRef: string, outcome: "paid" | "cancelled"): string {
  const payload = `${providerRef}.${outcome}`;
  return `${outcome}.${sign(payload)}`;
}

export class TestPaymentProvider implements PaymentProvider {
  readonly name = PROVIDER_NAME;
  readonly isTest = true;

  constructor() {
    if (process.env.NODE_ENV === "production" && process.env.PLUS_ALLOW_TEST_GATEWAY !== "i-know") {
      // ⚠️ عمداً throw و نه یک هشدارِ لاگ: اگر فقط هشدار می‌داد، اولین
      // deploy با تنظیماتِ ناقص، یک فروشگاهِ رایگان می‌ساخت و کسی تا مدت‌ها
      // نمی‌فهمید.
      throw new Error(
        "درگاه آزمایشی روی سرور اصلی اجازهٔ کار ندارد. در پنل مدیریت درگاه واقعی را انتخاب کنید.",
      );
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.amountRials <= 0) {
      return { ok: false, errorCode: "amount", errorMessage: "مبلغ سفارش معتبر نیست." };
    }

    const providerRef = `test_${randomUUID().replace(/-/g, "")}`;

    // آدرسِ بازگشت را *ما* ساخته‌ایم و همین‌جا دست‌نخورده به شبیه‌ساز داده
    // می‌شود؛ شبیه‌ساز حق ندارد مقصدِ دیگری بسازد.
    const url = new URL("/payment/sandbox", "https://placeholder.invalid");
    url.searchParams.set("ref", providerRef);
    url.searchParams.set("amount", String(input.amountRials));
    url.searchParams.set("order", input.orderNumber);
    url.searchParams.set("back", input.returnUrl);

    return {
      ok: true,
      providerRef,
      // فقط مسیر و query — بدونِ میزبان. تا کسی نتواند با دستکاری، کاربر را
      // به یک دامنهٔ بیرونی بفرستد.
      redirectUrl: `${url.pathname}${url.search}`,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const token = input.returnParams.token ?? "";
    const [outcome, signature] = token.split(".", 2);

    if (!outcome || !signature) {
      // بازگشتی بدون توکن: یا کاربر دستی آدرس را باز کرده، یا وسطِ کار
      // چیزی گم شده. هیچ‌کدام «ناموفق» نیست.
      return { state: "unknown", errorCode: "missing_token", errorMessage: "نتیجهٔ پرداخت همراه نبود." };
    }

    if (outcome !== "paid" && outcome !== "cancelled") {
      return { state: "unknown", errorCode: "bad_token", errorMessage: "نتیجهٔ پرداخت نامعتبر بود." };
    }

    if (!signatureMatches(`${input.providerRef}.${outcome}`, signature)) {
      // ⚠️ امضای نادرست = تلاش برای جعل. «ناموفق» است و نه «نامعلوم»، چون
      // چیزی که به ما رسیده اصلاً از شبیه‌ساز نیامده.
      return { state: "failed", errorCode: "bad_signature", errorMessage: "نتیجهٔ پرداخت معتبر نبود." };
    }

    if (outcome === "cancelled") {
      return { state: "cancelled", errorCode: "cancelled", errorMessage: "پرداخت لغو شد." };
    }

    return {
      state: "verified",
      // شمارهٔ پیگیریِ ساختگی، با پیشوندی که هیچ‌وقت با یک شمارهٔ واقعی
      // اشتباه گرفته نمی‌شود.
      trackingId: `TEST-${input.providerRef.slice(5, 17).toUpperCase()}`,
      paidAmountRials: input.amountRials,
    };
  }

  async getPaymentStatus(input: VerifyPaymentInput): Promise<PaymentStatusResult> {
    // شبیه‌ساز حافظهٔ سروری ندارد: بدونِ توکنِ بازگشت نمی‌تواند بگوید چه شد.
    // این دقیقاً همان حالتی است که باید در رابط کاربری تست شود — «وضعیت
    // هنوز نهایی نشده» به‌جای «ناموفق».
    if (!input.returnParams.token) {
      return {
        state: "unknown",
        errorCode: "no_record",
        errorMessage: "درگاه آزمایشی سابقه‌ای از این پرداخت ندارد.",
      };
    }
    return this.verifyPayment(input);
  }
}
