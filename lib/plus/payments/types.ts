/**
 * قراردادِ درگاه پرداخت.
 *
 * ⚠️ چرا این لایه وجود دارد، وقتی هنوز هیچ درگاهی انتخاب نشده:
 *
 * اگر منتظر می‌ماندیم تا درگاه مشخص شود، کلِ زنجیرهٔ خرید — سفارش، تلاشِ
 * پرداخت، تأیید، دسترسی، فاکتور، بازیابیِ سفارشِ گم‌شده — بی‌آزمون می‌ماند و
 * روزی که درگاه وصل می‌شد، همهٔ آن‌ها *هم‌زمان* برای اولین بار اجرا می‌شدند.
 *
 * با این سه متد، همهٔ آن زنجیره همین حالا با یک درگاهِ آزمایشی تا انتها اجرا
 * و تست می‌شود، و افزودنِ درگاه واقعی یعنی نوشتنِ یک فایل که همین رابط را
 * برآورده می‌کند.
 *
 * ⚠️ و چرا این لایه **کوچک** است: وسوسهٔ ساختنِ یک آداپتورِ همه‌کاره برای ده
 * درگاه، پیچیدگی‌ای می‌سازد که هیچ‌وقت استفاده نمی‌شود. اینجا فقط همان
 * تفکیکی هست که برای وصل کردنِ *یک* درگاه واقعی لازم است.
 */

import type { PaymentState } from "../types";

/** ورودیِ ساختِ پرداخت — همه‌اش از سرور می‌آید، هیچ‌کدام از مرورگر. */
export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  /** ریال. از snapshot سفارش، نه از درخواستِ کاربر. */
  amountRials: number;
  description: string;
  /** آدرس مطلقِ بازگشت. سرور می‌سازدش تا کاربر نتواند مقصد را عوض کند. */
  returnUrl: string;
  /** فقط برای درگاه‌هایی که رسید ایمیل می‌کنند. */
  payerEmail?: string;
};

export type CreatePaymentResult =
  | {
      ok: true;
      /** شناسهٔ درگاه برای این تلاش (authority / token). */
      providerRef: string;
      /** جایی که کاربر باید به آن هدایت شود. */
      redirectUrl: string;
    }
  | { ok: false; errorCode: string; errorMessage: string };

/** آنچه از بازگشتِ مرورگر به سرور می‌رسد. برای هر درگاه شکلِ متفاوتی دارد. */
export type VerifyPaymentInput = {
  orderId: string;
  amountRials: number;
  providerRef: string;
  /** پارامترهای query در لحظهٔ بازگشت. ⚠️ داده‌اند، نه حقیقت. */
  returnParams: Record<string, string>;
};

/**
 * نتیجهٔ تأیید.
 *
 * ⚠️ `state` عمداً یک اتحادِ شش‌حالته است و نه یک بولی. یک بولی مجبورمان
 * می‌کرد «نمی‌دانم» را به «نه» تبدیل کنیم — همان تصمیمی که باعث می‌شود
 * کاربری که پولش کم شده، دوباره پول بدهد.
 */
export type VerifyPaymentResult = {
  state: Extract<PaymentState, "verified" | "failed" | "cancelled" | "pending" | "unknown">;
  /** شمارهٔ پیگیریِ قابلِ نمایش به کاربر. فقط در حالت verified معنی دارد. */
  trackingId?: string;
  /**
   * مبلغی که درگاه می‌گوید واقعاً پرداخت شده (ریال).
   *
   * ⚠️ اگر درگاه این را بدهد، لایهٔ بالادست آن را با مبلغِ سفارش مقایسه
   * می‌کند و اگر نخواند، پرداخت را تأییدشده حساب نمی‌کند. بدون این بررسی، یک
   * درگاهِ خراب (یا یک دستکاری) می‌توانست با ۱۰۰۰ ریال، اشتراکِ ۱۹۹ هزار
   * تومانی بسازد.
   */
  paidAmountRials?: number;
  errorCode?: string;
  errorMessage?: string;
};

/** پرس‌وجوی وضعیت، بدونِ اینکه کاربر برگشته باشد — قلبِ «بازیابیِ سفارش». */
export type PaymentStatusResult = VerifyPaymentResult;

export interface PaymentProvider {
  /** نامی که در `plus_payment_attempts.provider` می‌نشیند. */
  readonly name: string;
  /** آیا این یک درگاهِ آزمایشی است؟ رابط کاربری باید صریح بگوید. */
  readonly isTest: boolean;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  /** تأیید پس از بازگشتِ کاربر. */
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  /**
   * وضعیتِ یک تلاش، بدونِ بازگشتِ کاربر.
   *
   * ⚠️ این متد همان چیزی است که «اینترنتِ کاربر بعد از پرداخت قطع شد» را
   * قابلِ ترمیم می‌کند. بدونش، تنها راهِ فهمیدنِ نتیجه، بازگشتِ مرورگر بود —
   * و بازگشتِ مرورگر هیچ تضمینی ندارد.
   */
  getPaymentStatus(input: VerifyPaymentInput): Promise<PaymentStatusResult>;
}
