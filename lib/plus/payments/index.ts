import "server-only";
import { getSetting } from "@/lib/settings";
import { paymentProviderName } from "../config";
import { TestPaymentProvider } from "./test-provider";
import { AqayePardakhtProvider } from "./aqayepardakht";
import type { PaymentProvider } from "./types";

export * from "./types";
export {
  buildSandboxToken,
  recordSandboxOutcome,
  testGatewayAllowedFor,
  SANDBOX_SESSION_MINUTES,
  type SandboxOutcome,
} from "./test-provider";

/**
 * انتخابِ درگاه — تنها جایی که نامِ درگاه به یک پیاده‌سازی تبدیل می‌شود.
 *
 * درگاهِ تازه = یک `case` در `paymentProviderByName` + نامش در
 * `PAYMENT_PROVIDER_NAMES`. راهنمای کامل: docs/payment-gateway-migration.md
 *
 * ⚠️ نبودِ درگاه، خطا است و نه «موفقیتِ خاموش». اگر مالک نامِ درگاهی گذاشت که
 * پیاده‌سازی ندارد، خرید باید بشکند — نه اینکه بی‌سروصدا به درگاه آزمایشی
 * برگردد و اشتراکِ رایگان بدهد.
 */
export async function getPaymentProvider(): Promise<PaymentProvider> {
  const name = await paymentProviderName();
  const provider = paymentProviderByName(name);
  if (!provider) {
    throw new Error(
      `درگاه پرداخت «${name}» پیاده‌سازی ندارد. در پنل مدیریت درگاه معتبری انتخاب کنید.`,
    );
  }
  return provider;
}

/**
 * درگاه با نامی که روی `plus_payment_attempts.provider` نشسته.
 *
 * ⚠️ تأییدِ هر پرداخت با همان درگاهی انجام می‌شود که پرداخت با آن شروع شد، نه
 * درگاهِ فعلی. وگرنه عوض کردنِ درگاه در پنل، پرداخت‌های نیمه‌کارهٔ درگاهِ
 * قبلی را «نامعلوم» می‌گذاشت.
 */
export function paymentProviderByName(name: string): PaymentProvider | null {
  switch (name) {
    case "test":
      return new TestPaymentProvider();
    case "aqayepardakht":
      return new AqayePardakhtProvider(() => getSetting("plus.aqayepardakht_pin"));
    default:
      return null;
  }
}

/** همهٔ درگاه‌های پیاده‌شده — برای شناختنِ بازگشت از هر کدام. */
export const PAYMENT_PROVIDER_NAMES = ["test", "aqayepardakht"] as const;
