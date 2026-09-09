import "server-only";
import { paymentProviderName } from "../config";
import { TestPaymentProvider } from "./test-provider";
import type { PaymentProvider } from "./types";

export * from "./types";
export { buildSandboxToken } from "./test-provider";

/**
 * انتخابِ درگاه — تنها جایی که نامِ درگاه به یک پیاده‌سازی تبدیل می‌شود.
 *
 * وقتی درگاه واقعی انتخاب شد، اینجا یک `case` اضافه می‌شود و هیچ‌جای دیگری
 * از پروژه عوض نمی‌شود.
 *
 * ⚠️ نبودِ درگاه، خطا است و نه «موفقیتِ خاموش». اگر مالک نامِ درگاهی گذاشت که
 * پیاده‌سازی ندارد، خرید باید بشکند — نه اینکه بی‌سروصدا به درگاه آزمایشی
 * برگردد و اشتراکِ رایگان بدهد.
 */
export async function getPaymentProvider(): Promise<PaymentProvider> {
  const name = await paymentProviderName();

  switch (name) {
    case "test":
      return new TestPaymentProvider();
    default:
      throw new Error(
        `درگاه پرداخت «${name}» پیاده‌سازی ندارد. در پنل مدیریت درگاه معتبری انتخاب کنید.`,
      );
  }
}
