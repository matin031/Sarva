import { logger } from "@/lib/observability";
import { siteOrigin } from "@/lib/seo/site";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatusResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./types";

/**
 * درگاهِ آقای پرداخت (API v2) — مستند: https://aqayepardakht.ir/api/
 *
 * - create/verify: POST JSON، مبلغ به **تومان** (۱٬۰۰۰ تا ۴۰۰٬۰۰۰٬۰۰۰).
 *   موفق: 200 `{status:"success", transid}` / `{status:"success", code:"1"|"2"}`.
 *   خطا: 422 `{status:"error", code:"-6"}`. جلوی API فایروالِ ArvanCloud است که
 *   ممکن است HTML با 403 برگرداند — آن هم باید خوانا لاگ شود، نه SyntaxError.
 * - هدایت: `/startpay/<transid>`؛ با پینِ `sandbox`: `/startpay/sandbox/<transid>`.
 * - بازگشت: POST فرم با transid, tracking_number, cardnumber, bank, invoice_id,
 *   status. `/payment/return` آن را به GET تبدیل می‌کند.
 * - استعلامِ جدا ندارد؛ «بررسی دوباره» هم verify است.
 *
 * ⚠️ پین هرگز لاگ نمی‌شود — نه بدنهٔ درخواست و نه هیچ فیلدی که از آن ساخته شده.
 *
 * این فایل عمداً server-only و وابسته به دیتابیس نیست: پین از بیرون داده
 * می‌شود (index.ts از تنظیمات می‌خواند) تا منطق بدون دیتابیس تست شود.
 */

const API = "https://panel.aqayepardakht.ir/api/v2";
const START = "https://panel.aqayepardakht.ir/startpay";
const TIMEOUT_MS = 15_000;
/** بعد از این مدت، تراکنشِ پرداخت‌نشده را رهاشده حساب می‌کنیم. */
const SESSION_MINUTES = 20;
export const MIN_TOMANS = 1_000;

/** معنیِ کدهای درگاه، از جدولِ مستند — فقط برای لاگ. */
export const AP_CODES: Record<string, string> = {
  "0": "پرداخت انجام نشد",
  "1": "پرداخت موفق",
  "2": "قبلاً وریفای شده",
  "-1": "amount خالی است",
  "-2": "پین خالی است",
  "-3": "callback خالی است",
  "-4": "amount عددی نیست",
  "-5": "amount باید بین ۱٬۰۰۰ تا ۴۰۰٬۰۰۰٬۰۰۰ تومان باشد",
  "-6": "پین درگاه اشتباه است",
  "-7": "transid خالی است",
  "-8": "تراکنش وجود ندارد",
  "-9": "پین با درگاهِ تراکنش نمی‌خواند",
  "-10": "مبلغ با مبلغِ تراکنش نمی‌خواند",
  "-11": "درگاه در انتظار تأیید یا غیرفعال است",
  "-12": "امکان ارسال درخواست برای این پذیرنده نیست",
  "-13": "شماره کارت باید ۱۶ رقم باشد",
  "-14": "درگاه روی سایت دیگری استفاده می‌شود",
  "-15": "دامنهٔ callback با دامنهٔ تأییدشدهٔ درگاه نمی‌خواند",
  "-16": "ارجاع‌دهنده نامعتبر است (Referer)",
  "-17": "callback_method باید POST یا GET باشد",
};

/**
 * پینِ کپی‌شده از پنلِ فارسی را تمیز می‌کند.
 *
 * ⚠️ کپی از صفحهٔ راست‌به‌چپ معمولاً نویسه‌های نامرئیِ جهت (U+200E/U+200F،
 * U+202A..U+202E، U+2066..U+2069) و ZWNJ همراه دارد که `trim()` پاکشان
 * نمی‌کند، و پنلِ آقای پرداخت ارقام را فارسی نشان می‌دهد. هر کدام درگاه را به
 * `-6` (پین اشتباه) می‌برد.
 */
export function normalizePin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[​-‏‪-‮⁦-⁩﻿\s]/g, "")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/^["']+|["']+$/g, "");
  if (!cleaned) return null;
  return cleaned.toLowerCase() === "sandbox" ? "sandbox" : cleaned;
}

function toToman(rials: number): number | null {
  const n = Number(rials);
  return Number.isSafeInteger(n) && n > 0 && n % 10 === 0 ? n / 10 : null;
}

type ApReply = {
  httpStatus: number;
  /** null یعنی پاسخ JSON نبود (مثلاً صفحهٔ فایروال). */
  data: { status?: string; code?: string | number; transid?: string } | null;
  contentType: string;
  /** چند صد نویسهٔ اولِ پاسخِ غیر JSON، برای لاگ. پاسخِ درگاه پین ندارد. */
  snippet: string;
};

async function call(path: "create" | "verify", body: Record<string, string | number>): Promise<ApReply> {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      // کد ‎-16‎ = «ارجاع‌دهنده ارسال نشده». fetchِ سرور Referer ندارد.
      referer: `${siteOrigin()}/`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const text = await res.text();
  let data: ApReply["data"] = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") data = parsed as ApReply["data"];
  } catch {
    // HTML یا خالی — پایین به‌عنوانِ خطا لاگ می‌شود.
  }
  return {
    httpStatus: res.status,
    data,
    contentType: res.headers.get("content-type") ?? "",
    snippet: data ? "" : text.replace(/\s+/g, " ").slice(0, 300),
  };
}

function logFailure(op: "create" | "verify", reply: ApReply | null, extra: Record<string, unknown>) {
  const code = reply?.data?.code === undefined ? null : String(reply.data.code);
  logger.error("درگاه آقای پرداخت درخواست را نپذیرفت", {
    event: `plus.payment.aqayepardakht.${op}_failed`,
    http_status: reply?.httpStatus ?? null,
    provider_status: reply?.data?.status ?? null,
    provider_code: code,
    provider_meaning: code ? (AP_CODES[code] ?? "کد ناشناخته") : reply ? "پاسخ JSON نبود" : "خطای شبکه",
    content_type: reply?.contentType ?? null,
    response_snippet: reply?.snippet || null,
    ...extra,
  });
}

function codeOf(reply: ApReply): string {
  const code = reply.data?.code;
  if (code !== undefined && code !== null && String(code) !== "") return String(code);
  return reply.data ? "unknown" : `http_${reply.httpStatus}`;
}

export class AqayePardakhtProvider implements PaymentProvider {
  readonly name = "aqayepardakht";
  readonly isTest = false;

  constructor(private readonly readPin: () => Promise<string | null>) {}

  private async pin(): Promise<string | null> {
    return normalizePin(await this.readPin());
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const amount = toToman(input.amountRials);
    if (!amount || amount < MIN_TOMANS) {
      logFailure("create", null, { reason: "amount_out_of_range", amount_rials: input.amountRials, order_id: input.orderId });
      return { ok: false, errorCode: "ap_amount", errorMessage: "مبلغ این سفارش برای پرداخت آنلاین معتبر نیست." };
    }

    const key = await this.pin();
    if (!key) {
      logFailure("create", null, { reason: "pin_not_set", order_id: input.orderId });
      return { ok: false, errorCode: "ap_no_pin", errorMessage: "پرداخت آنلاین هنوز راه‌اندازی نشده است." };
    }

    let reply: ApReply;
    try {
      reply = await call("create", {
        pin: key,
        amount,
        callback: input.returnUrl,
        callback_method: "POST",
        invoice_id: input.orderNumber,
        description: input.description,
        ...(input.payerEmail ? { email: input.payerEmail } : {}),
      });
    } catch (err) {
      logFailure("create", null, { err, order_id: input.orderId, sandbox: key === "sandbox" });
      return { ok: false, errorCode: "ap_network", errorMessage: "ارتباط با درگاه پرداخت برقرار نشد." };
    }

    const transid = reply.data?.transid;
    if (reply.data?.status !== "success" || typeof transid !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(transid)) {
      logFailure("create", reply, {
        order_id: input.orderId,
        sandbox: key === "sandbox",
        callback_origin: new URL(input.returnUrl).origin,
        amount_tomans: amount,
      });
      return { ok: false, errorCode: `ap_${codeOf(reply)}`, errorMessage: "ارتباط با درگاه پرداخت برقرار نشد." };
    }

    const prefix = key === "sandbox" ? `${START}/sandbox` : START;
    return { ok: true, providerRef: transid, redirectUrl: `${prefix}/${transid}` };
  }

  refFromReturn(returnParams: Record<string, string>): string | null {
    const ref = returnParams.transid?.trim() ?? "";
    return /^[A-Za-z0-9_-]{1,64}$/.test(ref) ? ref : null;
  }

  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return this.check(input, true);
  }

  getPaymentStatus(input: VerifyPaymentInput): Promise<PaymentStatusResult> {
    return this.check(input, Boolean(input.returnParams.transid));
  }

  private async check(input: VerifyPaymentInput, returned: boolean): Promise<VerifyPaymentResult> {
    const amount = toToman(input.amountRials);
    if (!amount) return { state: "unknown", errorCode: "ap_amount", errorMessage: "مبلغ سفارش معتبر نیست." };

    // ⚠️ verify روی تراکنشی که هنوز پرداخت نشده، آن را در درگاه باطل می‌کند
    // (آزموده روی sandbox: بعد از verifyِ زودهنگام، صفحهٔ پرداخت ۴۰۴ می‌شود).
    // reconcileOpenOrders با هر بارِ باز شدنِ /checkout و /panel/billing همین
    // مسیر را صدا می‌زند؛ پس تا وقتی کاربر ممکن است هنوز در درگاه باشد و خودِ
    // درگاه برنگشته، از درگاه نمی‌پرسیم.
    const startedAt = input.redirectedAt ? new Date(input.redirectedAt).getTime() : NaN;
    const mayStillBePaying = Number.isFinite(startedAt) && Date.now() - startedAt < SESSION_MINUTES * 60_000;
    if (!returned && mayStillBePaying) {
      return { state: "pending", errorCode: "ap_in_progress", errorMessage: "پرداخت هنوز در درگاه انجام نشده است." };
    }

    const key = await this.pin();
    if (!key) {
      logFailure("verify", null, { reason: "pin_not_set", order_id: input.orderId });
      return { state: "unknown", errorCode: "ap_no_pin", errorMessage: "وضعیت پرداخت هنوز مشخص نیست." };
    }

    // خطای شبکه عمداً پرتاب می‌شود: settlePayment آن را «نامعلوم» ثبت می‌کند، نه «ناموفق».
    const reply = await call("verify", { pin: key, amount, transid: input.providerRef });
    const code = reply.data ? String(reply.data.code ?? "") : "";

    // ۱ = موفق، ۲ = قبلاً وریفای و پرداخت شده (callback تکراری، دو تب، یا verifyی
    // که موفق بود ولی نوشتنِ دیتابیس بعدش شکست). ⚠️ درگاه ۲ را با
    // `status:"error"` و HTTP 422 می‌دهد (آزموده روی sandbox)، پس فقط کد ملاک است.
    if ((reply.data?.status === "success" && code === "1") || code === "2") {
      const tracking = input.returnParams.tracking_number?.trim();
      return {
        state: "verified",
        trackingId: tracking && /^[\w-]{1,64}$/.test(tracking) ? tracking : input.providerRef,
        // درگاه مبلغ را با amountِ ما سنجیده (وگرنه ‎-10‎ می‌داد).
        paidAmountRials: input.amountRials,
      };
    }

    // ۰ = پرداخت انجام نشد. بعد از این verify تراکنش در درگاه بسته است.
    if (code === "0") {
      return { state: "cancelled", errorCode: "ap_0", errorMessage: "پرداخت انجام نشد." };
    }

    // بقیه (پین اشتباه، عدم تطابق مبلغ، تراکنشِ ناموجود، فایروال، …) ردِ پرداخت
    // نیست و «ناموفق» ثبت کردنش ممکن است پرداختِ واقعی را گم کند.
    logFailure("verify", reply, { order_id: input.orderId, transid: input.providerRef });
    return { state: "unknown", errorCode: `ap_${codeOf(reply)}`, errorMessage: "وضعیت پرداخت هنوز مشخص نیست." };
  }
}
