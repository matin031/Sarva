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
 * ⚠️ **روی سرورِ اصلی فقط مدیر می‌تواند با آن پرداخت کند.** یک درگاهِ
 * آزمایشی که در production برای همه کار کند، دقیقاً یعنی هر کسی بدون پول
 * اشتراک بگیرد. ولی تا درگاه واقعی وصل نشده، مالک باید بتواند کلِ مسیرِ خرید
 * را روی همان سایت ببیند؛ و مدیر همین حالا هم می‌تواند به هر کسی پلاس هدیه
 * بدهد، پس پرداختِ آزمایشیِ او چیزِ تازه‌ای باز نمی‌کند. گیتش
 * `testGatewayAllowedFor` است و در سه جا صدا زده می‌شود: شروعِ پرداخت،
 * صفحهٔ شبیه‌ساز و تأیید.
 *
 * ── چطور «پرداخت» را شبیه‌سازی می‌کند ───────────────────────────────────────
 * کاربر به یک صفحهٔ داخلی (`/payment/sandbox`) می‌رود که نقشِ صفحهٔ بانک را
 * بازی می‌کند: پرداخت موفق، پرداخت ناموفق، انصراف، و «پرداخت شد ولی اتصال
 * قطع شد» — همان حالتی که فقط «بررسی دوباره» نجاتش می‌دهد.
 *
 * ⚠️ نکتهٔ مهم: آن صفحه نتیجه را به‌صورت `?success=true` برنمی‌گرداند. چنین
 * چیزی یعنی هر کسی با تایپ کردنِ یک URL اشتراک بگیرد. به‌جایش یک **توکنِ
 * امضاشده** برمی‌گردد و `verifyPayment` امضا را بررسی می‌کند — همان کاری که
 * با callbackِ امضاشدهٔ یک درگاه واقعی می‌کنیم. پس مسیرِ کد دقیقاً همان مسیرِ
 * واقعی است و در روزِ وصلِ درگاه، چیزی «برای اولین بار» اجرا نمی‌شود.
 *
 * توکن یک‌بارمصرف نیست و لازم هم نیست: تکرارِ verify یک entitlement دوم
 * نمی‌سازد، چون ایندکس یکتای `plus_entitlements_order_key` سرِ راه ایستاده.
 */

const PROVIDER_NAME = "test";

/** مهلتِ پرداخت در صفحهٔ بانک؛ بعدش تراکنشِ نیمه‌کاره باطل است. */
export const SANDBOX_SESSION_MINUTES = 15;

export type SandboxOutcome = "paid" | "failed" | "cancelled";
const OUTCOMES: readonly SandboxOutcome[] = ["paid", "failed", "cancelled"];

/**
 * آیا این نقش می‌تواند با درگاهِ آزمایشی پرداخت کند؟
 *
 * بیرون از production همه؛ در production فقط مدیر — مگر مالک صریحاً
 * `PLUS_ALLOW_TEST_GATEWAY=i-know` گذاشته باشد.
 */
export function testGatewayAllowedFor(role: string | null | undefined): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.PLUS_ALLOW_TEST_GATEWAY === "i-know") return true;
  return role === "admin";
}

/**
 * «دفترِ بانک» — آنچه صفحهٔ شبیه‌ساز ثبت کرده.
 *
 * ⚠️ درگاهِ واقعی سابقهٔ هر تراکنش را نزدِ خودش دارد و «بررسی دوباره» همان را
 * می‌پرسد. شبیه‌ساز هم باید چنین چیزی داشته باشد، وگرنه سناریوی «پول کم شد
 * و اتصال قطع شد» قابلِ آزمودن نبود. در حافظه است و نه در دیتابیس: این
 * دفترِ *بانک* است، نه دادهٔ سروا. با ری‌استارتِ سرور پاک می‌شود و آن‌وقت
 * پاسخ «نامعلوم» است — که همان رفتارِ امن است.
 */
type LedgerEntry = { outcome: SandboxOutcome; at: number };
const LEDGER_KEY = Symbol.for("sarva.plus.test-gateway.ledger");

function ledger(): Map<string, LedgerEntry> {
  const g = globalThis as unknown as Record<symbol, Map<string, LedgerEntry> | undefined>;
  g[LEDGER_KEY] ??= new Map();
  return g[LEDGER_KEY];
}

/** نتیجه‌ای که کاربر در صفحهٔ شبیه‌ساز انتخاب کرد. اولین نتیجه می‌ماند:
 *  بانکِ واقعی هم تراکنشِ پرداخت‌شده را با کلیکِ بعدی «لغو» نمی‌کند. */
export function recordSandboxOutcome(providerRef: string, outcome: SandboxOutcome): SandboxOutcome {
  const book = ledger();
  const existing = book.get(providerRef);
  if (existing) return existing.outcome;
  book.set(providerRef, { outcome, at: Date.now() });
  return outcome;
}

export function sandboxOutcomeOf(providerRef: string): SandboxOutcome | null {
  return ledger().get(providerRef)?.outcome ?? null;
}

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

/** توکنی که شبیه‌ساز به آدرس بازگشت اضافه می‌کند. */
export function buildSandboxToken(providerRef: string, outcome: SandboxOutcome): string {
  const payload = `${providerRef}.${outcome}`;
  return `${outcome}.${sign(payload)}`;
}

export class TestPaymentProvider implements PaymentProvider {
  readonly name = PROVIDER_NAME;
  readonly isTest = true;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.amountRials <= 0) {
      return { ok: false, errorCode: "amount", errorMessage: "مبلغ سفارش معتبر نیست." };
    }

    const providerRef = `test_${randomUUID().replace(/-/g, "")}`;

    // ⚠️ آدرسِ بازگشت به شبیه‌ساز داده *نمی‌شود*: `/payment/sandbox/submit`
    // آن را از روی سفارشِ همین تلاش می‌سازد. چیزی که از query نیاید، قابلِ
    // دستکاری هم نیست.
    const url = new URL("/payment/sandbox", "https://placeholder.invalid");
    url.searchParams.set("ref", providerRef);

    return {
      ok: true,
      providerRef,
      // فقط مسیر و query — بدونِ میزبان. تا کسی نتواند با دستکاری، کاربر را
      // به یک دامنهٔ بیرونی بفرستد.
      redirectUrl: `${url.pathname}${url.search}`,
    };
  }

  refFromReturn(returnParams: Record<string, string>): string | null {
    const ref = returnParams.ref ?? "";
    return /^test_[0-9a-f]{32}$/.test(ref) ? ref : null;
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const token = input.returnParams.token ?? "";
    const [outcome, signature] = token.split(".", 2);

    if (!outcome || !signature) {
      // بازگشتی بدون توکن: یا کاربر دستی آدرس را باز کرده، یا وسطِ کار
      // چیزی گم شده. هیچ‌کدام «ناموفق» نیست.
      return { state: "unknown", errorCode: "missing_token", errorMessage: "نتیجهٔ پرداخت همراه نبود." };
    }

    if (!OUTCOMES.includes(outcome as SandboxOutcome)) {
      return { state: "unknown", errorCode: "bad_token", errorMessage: "نتیجهٔ پرداخت نامعتبر بود." };
    }

    if (!signatureMatches(`${input.providerRef}.${outcome}`, signature)) {
      // ⚠️ امضای نادرست = تلاش برای جعل. «ناموفق» است و نه «نامعلوم»، چون
      // چیزی که به ما رسیده اصلاً از شبیه‌ساز نیامده.
      return { state: "failed", errorCode: "bad_signature", errorMessage: "نتیجهٔ پرداخت معتبر نبود." };
    }

    return this.resultFor(outcome as SandboxOutcome, input);
  }

  async getPaymentStatus(input: VerifyPaymentInput): Promise<PaymentStatusResult> {
    if (input.returnParams.token) return this.verifyPayment(input);

    // «بررسی دوباره» بدونِ بازگشتِ مرورگر: از دفترِ بانک می‌پرسیم.
    const recorded = sandboxOutcomeOf(input.providerRef);
    if (recorded) return this.resultFor(recorded, input);

    // بانک نتیجه‌ای ثبت نکرده. اگر مهلتِ صفحهٔ بانک گذشته، تراکنش باطل است؛
    // وگرنه کاربر هنوز می‌تواند پرداخت کند.
    const startedAt = input.redirectedAt ? new Date(input.redirectedAt).getTime() : NaN;
    if (!Number.isFinite(startedAt)) {
      return { state: "unknown", errorCode: "no_record", errorMessage: "درگاه سابقه‌ای از این پرداخت ندارد." };
    }
    if (Date.now() - startedAt > SANDBOX_SESSION_MINUTES * 60_000) {
      return { state: "cancelled", errorCode: "expired", errorMessage: "مهلت پرداخت در درگاه تمام شد." };
    }
    return { state: "pending", errorCode: "not_paid_yet", errorMessage: "پرداخت هنوز در درگاه انجام نشده است." };
  }

  private resultFor(outcome: SandboxOutcome, input: VerifyPaymentInput): VerifyPaymentResult {
    if (outcome === "cancelled") {
      return { state: "cancelled", errorCode: "cancelled", errorMessage: "پرداخت لغو شد." };
    }
    if (outcome === "failed") {
      return { state: "failed", errorCode: "declined", errorMessage: "بانک پرداخت را تأیید نکرد." };
    }
    return {
      state: "verified",
      // شمارهٔ پیگیریِ ساختگی، با پیشوندی که هیچ‌وقت با یک شمارهٔ واقعی
      // اشتباه گرفته نمی‌شود.
      trackingId: `TEST-${input.providerRef.slice(5, 17).toUpperCase()}`,
      paidAmountRials: input.amountRials,
    };
  }
}
