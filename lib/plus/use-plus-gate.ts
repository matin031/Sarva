"use client";

import { usePlusSummary } from "@/lib/auth/use-current-user";

/**
 * «آیا این کاربر به قابلیت‌های پولی دسترسی دارد؟» — یک جواب، برای همهٔ
 * جاهایی که قرار است چیزی را قفل کنند.
 *
 * ⚠️ چرا یک قلّاب و نه یک `plus.state === "active"` در هر کامپوننت: چون آن
 * مقایسه سه حالتِ لبه را نادیده می‌گیرد و هر سه دیدنی‌اند —
 *
 *   • `loading`     — پاسخِ /me نرسیده. نه «دارد» و نه «ندارد».
 *   • `off`         — پلاس از پنلِ مدیریت خاموش است. یعنی سایت رایگان است و
 *                     **هیچ‌چیز نباید قفل باشد**. نشانِ «+» هم نباید دیده شود؛
 *                     تبلیغِ چیزی که فروشی نیست، فقط کاربر را گیج می‌کند.
 *   • `unavailable` — دیتابیس جواب نداد. «نمی‌دانیم».
 *
 * ⚠️ دو قاعده که با هم می‌آیند و جدا کردنشان باگ می‌سازد:
 *
 *   ۱. برای *دسترسی* fail-closed: تا وقتی «بله» قطعی نشده، قفل باز نمی‌شود.
 *      شاملِ `loading` هم می‌شود — وگرنه محتوای پولی یک‌دهم ثانیه دیده و بعد
 *      پس گرفته می‌شود، که هم نشت است و هم شبیهِ باگ.
 *
 *   ۲. برای *پیام* fail-open نیست ولی مؤدب است: در `loading` هیچ نشانی رندر
 *      نمی‌شود (`gated` هنوز false است) تا دکمه‌ها نپرند، و در `unavailable`
 *      هرگز نمی‌گوییم «اشتراک نداری، بخر» — آن جمله به کسی که دیروز پول داده
 *      می‌گوید پولش را دور ریخته، و بدتر، ممکن است دوباره بخرد.
 */
export type PlusGate = {
  /** پاسخِ /me رسیده است. */
  ready: boolean;
  /** اجازهٔ دیدنِ قابلیتِ پولی. تا قطعی نشدن، false. */
  unlocked: boolean;
  /** باید قفل و نشانِ «+» نشان داده شود. */
  gated: boolean;
  /** قفل است، ولی چون *نمی‌دانیم* — نه چون اشتراک ندارد. */
  unknown: boolean;
  /**
   * کاربر واقعاً مشترک است.
   *
   * ⚠️ با `unlocked` یکی نیست و همین تفاوت مهم است: وقتی پلاس از پنل خاموش
   * است، همه‌چیز باز است ولی هیچ‌کس مشترک نیست. جشن گرفتنِ اشتراک برای
   * کسی که اشتراکی ندارد — حلقهٔ طلاییِ چرخان دورِ دکمه‌ها — یعنی نشان دادنِ
   * چیزی که اصلاً وجود ندارد. `unlocked` در را باز می‌کند؛ `subscriber`
   * تنها چیزی است که اجازهٔ آن جشن را می‌دهد.
   */
  subscriber: boolean;
};

export function usePlusGate(): PlusGate {
  const { plus, loading } = usePlusSummary();

  if (loading) {
    return { ready: false, unlocked: false, gated: false, unknown: false, subscriber: false };
  }

  /* خاموش بودنِ کلِ پلاس یعنی سایت رایگان است: باز، ولی بدونِ هیچ نشانی. */
  if (plus.state === "off" || plus.state === "active") {
    return {
      ready: true,
      unlocked: true,
      gated: false,
      unknown: false,
      subscriber: plus.state === "active",
    };
  }

  return {
    ready: true,
    unlocked: false,
    gated: true,
    unknown: plus.state === "unavailable",
    subscriber: false,
  };
}
