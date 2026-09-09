import "server-only";
import { getSetting } from "@/lib/settings";

/**
 * پیکربندیِ سروا پلاس — همه‌اش از `app_settings`، هیچ‌کدام هاردکد.
 *
 * ── معنیِ دقیقِ «خاموش» ─────────────────────────────────────────────────────
 * مالک خواسته با یک دکمه بتواند پولی‌بودنِ سایت را روشن و خاموش کند. این
 * جمله دو تفسیر دارد و انتخاب بینشان مهم است:
 *
 *   الف) خاموش = فروش بسته، ولی قابلیت‌ها همچنان قفل.
 *   ب)  خاموش = سایت دقیقاً مثل قبل از پولی‌شدن؛ همه‌چیز باز.
 *
 * (الف) یعنی در روزی که چیزی خراب شده و مالک دکمه را می‌زند، دانش‌آموزها
 * سایتی می‌بینند که هم نمی‌شود خرید و هم قفل است — بدترین حالتِ ممکن.
 *
 * پس (ب) پیاده شده: خاموش‌کردن، *فروش را می‌بندد و قفل‌ها را باز می‌کند*.
 * هیچ داده‌ای پاک نمی‌شود؛ entitlement های ثبت‌شده سر جایشان می‌مانند و با
 * روشن‌کردنِ دوباره همان‌طور که بودند برمی‌گردند. نشانِ پلاس هم در حالت خاموش
 * نمایش داده نمی‌شود، چون وقتی همه‌چیز رایگان است، «پلاس» معنایی ندارد که
 * نشانش بدهیم.
 */

/** پیش‌فرض‌ها وقتی مالک هنوز چیزی ست نکرده. */
const DEFAULTS = {
  /**
   * ⚠️ پیش‌فرض **خاموش** است و این عمدی است.
   *
   * یک deploy نباید به‌خودیِ‌خود سایتی را که تا دیروز رایگان بود پولی کند.
   * پولی‌شدن باید یک تصمیمِ صریحِ مالک باشد، با یک کلیک در پنل.
   */
  enabled: false,
  expiringSoonDays: 7,
  provider: "test",
  pilotGrant: false,
} as const;

function isOn(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

/** آیا کلِ سروا پلاس روشن است؟ */
export async function isPlusEnabled(): Promise<boolean> {
  const raw = await getSetting("plus.enabled");
  return raw === null ? DEFAULTS.enabled : isOn(raw);
}

/**
 * آستانهٔ «نزدیک پایان»، بر حسب روز.
 *
 * ⚠️ چرا از تنظیمات و نه یک عددِ ثابت در کامپوننت: چون این عدد در سه جای
 * مختلف نمایش پیدا می‌کند (نوارِ هشدار، صفحهٔ اشتراک، اعلان) و اگر هاردکد
 * بود، تغییرش یعنی پیدا کردنِ هر سه — و آن یکی که پیدا نشد، تا ابد عددِ
 * دیگری می‌گوید.
 *
 * ورودیِ بی‌معنی (متن، عددِ منفی، ۱۰۰۰) بی‌سروصدا به پیش‌فرض برمی‌گردد: یک
 * تنظیمِ اشتباه نباید صفحهٔ اشتراک را بشکند.
 */
export async function expiringSoonDays(): Promise<number> {
  const raw = await getSetting("plus.expiring_soon_days");
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) return DEFAULTS.expiringSoonDays;
  return parsed;
}

/** نامِ آداپتورِ درگاه. تا وقتی درگاه واقعی وصل نشده «test». */
export async function paymentProviderName(): Promise<string> {
  const raw = (await getSetting("plus.payment_provider"))?.trim();
  return raw || DEFAULTS.provider;
}

/**
 * مسیرِ پایلوت: مدیر می‌تواند سفارشی را بدون درگاه فعال کند.
 *
 * ⚠️ این یک درِ پشتی است و مثل هر درِ پشتی باید صریح باز شود. حتی وقتی روشن
 * است، نتیجه‌اش برای کاربر «دسترسی آزمایشی» نوشته می‌شود و نه «پرداخت
 * موفق» — چون دومی دروغ است و در اولین تماسِ پشتیبانی خودش را نشان می‌دهد.
 */
export async function isPilotGrantEnabled(): Promise<boolean> {
  const raw = await getSetting("plus.pilot_grant_enabled");
  return raw === null ? DEFAULTS.pilotGrant : isOn(raw);
}

/** خلاصهٔ شرایط خرید که مالک نوشته. null یعنی هنوز ننوشته. */
export async function purchaseTerms(): Promise<string | null> {
  const raw = (await getSetting("plus.purchase_terms"))?.trim();
  return raw || null;
}

/**
 * سیاستِ تمدید.
 *
 * ⚠️ پیش‌فرض «افزودن به انتهای دورهٔ فعلی» است و نه «شروع از امروز».
 *
 * سناریوی واقعی: اشتراکِ کاربر ۳۰ مهر تمام می‌شود و او ۲۰ مهر تمدید می‌کند.
 * اگر دورهٔ تازه از ۲۰ مهر شروع می‌شد، کاربر ده روزی را که پولش را داده بود
 * از دست می‌داد — یعنی تمدیدِ زودهنگام مجازات داشت و کاربرِ عاقل تا آخرین
 * لحظه صبر می‌کرد.
 *
 * فعلاً ثابت است چون تنها سیاستِ درست برای اشتراکِ پیش‌پرداخت همین است؛ تابع
 * است تا اگر روزی محصول تصمیمِ دیگری گرفت، فقط همین‌جا عوض شود.
 */
export function renewalPolicy(): "extend_from_end" {
  return "extend_from_end";
}
