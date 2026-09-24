/**
 * متنِ پیام‌ها — پیامک و ایمیل، در یک جا.
 *
 * ⚠️ بدونِ import از `lib/db` و بدونِ `server-only`، به همان دلیلی که
 * `./events` ندارد: تستِ `node --test` باید متن‌ها را ببیند.
 *
 * ── دو نکته دربارهٔ متنِ پیامک ─────────────────────────────────────────────
 *
 * ۱) متنی که اینجا نوشته شده **متنِ نهایی نیست** مگر در حالتِ متنِ آزاد.
 *    در مسیرِ عادی (قالبِ تأییدشده) متن در پنلِ SMS.ir زندگی می‌کند و ما فقط
 *    متغیرها را می‌فرستیم. این متن دو کار می‌کند: الگویی که مدیر موقعِ ساختِ
 *    قالب از آن کپی می‌کند، و متنِ واقعیِ حالتِ متنِ آزاد.
 *
 * ۲) کوتاه. هر ۷۰ نویسهٔ فارسی یک «صفحه» پیامک است و هزینهٔ جداگانه دارد.
 *    یک جملهٔ اضافه یعنی دو برابر شدنِ قبضِ همان پیام.
 */

import { jalali } from "@/lib/panel/format";
import type { NotifyEvent } from "./events";

/**
 * داده‌هایی که متن‌ها از آن ساخته می‌شوند.
 *
 * ⚠️ `name` همیشه پر است — فراخوان اگر نامی نداشت «کاربر» می‌فرستد. پیامکی
 * که با «سلام ،» شروع شود، بدتر از پیامکی است که نام نداشته باشد.
 */
export type NotifyVars = {
  name: string;
  /** تاریخِ پایانِ اشتراک (ISO). برای رویدادهای فعال‌سازی و تمدید. */
  endsAt?: string | null;
  /** چند روز تا پایان. برای `plus_expiring`. */
  daysLeft?: number;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

/** تاریخِ پایان به شمسی، یا «نامحدود» اگر تاریخی نداشته باشد. */
function endsLabel(vars: NotifyVars): string {
  return vars.endsAt ? jalali(vars.endsAt) : "نامحدود";
}

/**
 * مقدارِ متغیرهای قالب، به همان نامی که `NOTIFY_EVENT_SPECS` اعلام کرده.
 *
 * ⚠️ کلیدها باید با `smsVariables` همان رویداد یکی باشند. تست
 * (`tests/notify/messages.test.ts`) همین را می‌سنجد، چون ناهماهنگی‌اش خطا
 * نمی‌دهد — فقط پیامکی می‌فرستد که جای متغیر در آن خالی است.
 */
export function smsParameters(event: NotifyEvent, vars: NotifyVars): Record<string, string> {
  switch (event) {
    case "welcome":
      return { Name: vars.name };
    case "plus_activated":
    case "plus_renewed":
      return { Name: vars.name, Date: endsLabel(vars) };
    case "plus_expiring":
      return { Name: vars.name, Days: fa(vars.daysLeft ?? 0) };
    case "plus_expired":
      return { Name: vars.name };
  }
}

/**
 * متنِ آزادِ پیامک — الگوی قالب، و متنِ واقعی وقتی مدیر «شمارهٔ خط» را ثبت
 * کرده و قالب را نه.
 *
 * ⚠️ «سروا» در خطِ اول عمدی است: پیامکِ خطِ خدماتی شمارهٔ ناشناخته دارد و
 * گیرنده باید در نگاهِ اول بداند از کجاست.
 */
export function smsBody(event: NotifyEvent, vars: NotifyVars): string {
  switch (event) {
    case "welcome":
      return `سروا\n${vars.name} عزیز، حسابت ساخته شد.\nsarvaedu.ir`;
    case "plus_activated":
      return `سروا\nاشتراک سروا پلاس فعال شد.\nتا ${endsLabel(vars)}`;
    case "plus_renewed":
      return `سروا\nاشتراک سروا پلاس تمدید شد.\nتا ${endsLabel(vars)}`;
    case "plus_expiring":
      return `سروا\n${fa(vars.daysLeft ?? 0)} روز تا پایان اشتراک سروا پلاس.\nتمدید: sarvaedu.ir/checkout`;
    case "plus_expired":
      return `سروا\nاشتراک سروا پلاس به پایان رسید.\nتمدید: sarvaedu.ir/checkout`;
  }
}
