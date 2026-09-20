import type { FootKey, SlotMutation } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   مدلِ محتویاتِ مخزن — منطقِ خالص، بدونِ React.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا آرایه‌ای با طولِ ثابت و نه `push`/`pop`:

   نسخهٔ ذهنیِ اول یک پشته بود («ماده اضافه کن، ماده بردار»). با پشته،
   «جایگاهِ دومِ پرشده را عوض کن» یعنی یا بازسازیِ کلِ آرایه یا یک `splice`
   که هر بار باید ثابت کنی درست است. آرایهٔ `(FootKey | null)[]` با طولِ
   `slotCount` همان چیزی است که *روی صفحه* دیده می‌شود: چهار جایگاه، هر
   کدام یا خالی یا پر. هیچ حالتِ سومی وجود ندارد که بشود در آن گیر کرد.
   ═══════════════════════════════════════════════════════════════════════════ */

export type TankState = {
  readonly slots: readonly (FootKey | null)[];
  /**
   * جایگاهی که کاربر صریحاً انتخاب کرده.
   *
   * ⚠️ `null` یعنی «هیچ هدفِ صریحی نیست» و آن‌وقت اولین جایگاهِ خالی هدف
   * است. این دو حالت را نباید یکی کرد: اگر مخزن پر باشد و هدفِ صریحی
   * نباشد، کلیک روی یک ویال **نباید** جایی را عوض کند — وگرنه بازیکنی که
   * فقط می‌خواست رنگ را دوباره ببیند، پاسخِ کاملش را خراب می‌کند.
   */
  readonly activeSlot: number | null;
  /**
   * تاریخچهٔ تغییرات — مبنای «واگرد».
   *
   * ⚠️ «واگرد» یعنی *آخرین تغییرِ واقعی*، نه «آخرین خانهٔ پرشده». اگر
   * بازیکن جایگاهِ دوم را عوض کند، واگرد باید همان جایگاه را به مقدارِ
   * قبلی‌اش برگرداند و نه اینکه جایگاهِ چهارم را خالی کند. برای همین هر
   * رکورد `previousFoot` دارد؛ بدونِ آن، جایگزینی قابلِ واگرد نیست.
   */
  readonly history: readonly SlotMutation[];
};

export function emptyTank(slotCount: number): TankState {
  return {
    slots: Array.from({ length: slotCount }, () => null),
    activeSlot: null,
    history: [],
  };
}

export function isFull(tank: TankState): boolean {
  return tank.slots.every((slot) => slot !== null);
}

export function filledCount(tank: TankState): number {
  return tank.slots.reduce((n, slot) => (slot === null ? n : n + 1), 0);
}

/** اولین جایگاهِ خالی، یا `null` اگر مخزن پر است. */
export function firstEmpty(tank: TankState): number | null {
  const index = tank.slots.findIndex((slot) => slot === null);
  return index === -1 ? null : index;
}

/**
 * جایگاهی که تزریقِ بعدی به آن می‌رود.
 *
 * هدفِ صریحِ کاربر مقدم است؛ وگرنه اولین جایگاهِ خالی. اگر هیچ‌کدام نبود
 * (مخزنِ پر و بدونِ هدفِ صریح) `null` — و آن‌وقت رابط کاربری فقط یک اشارهٔ
 * کوتاه می‌دهد و هیچ جایی را دست نمی‌زند.
 */
export function targetSlot(tank: TankState): number | null {
  if (tank.activeSlot !== null && tank.activeSlot < tank.slots.length) return tank.activeSlot;
  return firstEmpty(tank);
}

export function selectSlot(tank: TankState, index: number): TankState {
  if (index < 0 || index >= tank.slots.length) return tank;
  // زدنِ دوبارهٔ همان جایگاه، انتخاب را برمی‌دارد — راهِ خروجِ بدیهی.
  const next = tank.activeSlot === index ? null : index;
  return { ...tank, activeSlot: next };
}

export type PourResult = {
  readonly tank: TankState;
  /** `null` یعنی هیچ تغییری نکرد و هیچ انیمیشنی هم نباید اجرا شود. */
  readonly mutation: SlotMutation | null;
};

/**
 * ریختنِ یک ماده در مخزن.
 *
 * ⚠️ اگر هدفی نباشد، *هیچ کاری نمی‌کند* و صریحاً `mutation: null` می‌دهد.
 * وسوسه‌اش بود که «خب آخرین جایگاه را عوض کن»؛ رد شد چون از دیدِ بازیکن
 * یک تغییرِ تصادفی است. پیامِ «برای تغییر، یکی از بخش‌های مخزن را انتخاب
 * کن» کارِ رابط کاربری است، نه این تابع.
 *
 * ⚠️ ریختنِ همان ماده در همان جایگاه هم یک تغییر *نیست*: نه تاریخچه‌ای
 * می‌سازد و نه انیمیشنی. بدونِ این، دو بار زدنِ یک ویال یک واگردِ بی‌اثر
 * در تاریخچه می‌گذاشت و دکمهٔ واگرد «خراب» به نظر می‌رسید.
 */
export function pour(tank: TankState, foot: FootKey): PourResult {
  const index = targetSlot(tank);
  if (index === null) return { tank, mutation: null };

  const previousFoot = tank.slots[index] ?? null;
  if (previousFoot === foot) {
    // هدفِ صریح مصرف می‌شود تا رابط کاربری در حالتِ «منتظرِ انتخاب» نماند.
    return { tank: { ...tank, activeSlot: null }, mutation: null };
  }

  const slots = [...tank.slots];
  slots[index] = foot;
  const mutation: SlotMutation = { slotIndex: index, previousFoot, nextFoot: foot };
  return {
    tank: { slots, activeSlot: null, history: [...tank.history, mutation] },
    mutation,
  };
}

/**
 * برداشتنِ مادهٔ یک جایگاه — با کلیک روی خودِ همان جایگاهِ پر.
 *
 * ⚠️ **جای بقیه تکان نمی‌خورد.** وسوسه‌اش بود که آرایه را `filter` کنیم و
 * جاهای پر را جمع کنیم، ولی آن‌وقت برداشتنِ جایگاهِ دوم از `[A][B][C][D]`
 * می‌داد `[A][C][D][ ]` — یعنی بازیکن یک رکن برداشت و **سه** رکنِ دیگر
 * جابه‌جا شدند. اینجا همان خانه `null` می‌شود و بس: `[A][ ][C][D]`.
 *
 * ⚠️ این یک `SlotMutation` با `nextFoot: null` در تاریخچه می‌گذارد، پس
 * «واگرد» می‌تواند برش گرداند. دو رفتار جداست و قاطی نمی‌شوند:
 *   • دکمهٔ واگرد → آخرین تغییر، هرچه بوده
 *   • کلیک روی جایگاهِ پر → همان یک جایگاه
 *
 * ⚠️ هدف روی همان جایگاه می‌نشیند: کسی که یک رکن را برمی‌دارد تقریباً
 * همیشه می‌خواهد چیزِ دیگری جایش بگذارد، و نباید مجبور شود دوباره
 * جایگاه را انتخاب کند.
 */
export function clearSlot(tank: TankState, index: number): PourResult {
  if (index < 0 || index >= tank.slots.length) return { tank, mutation: null };
  const previousFoot = tank.slots[index] ?? null;
  if (previousFoot === null) return { tank, mutation: null };

  const slots = [...tank.slots];
  slots[index] = null;
  const mutation: SlotMutation = { slotIndex: index, previousFoot, nextFoot: null };
  return {
    tank: { slots, activeSlot: index, history: [...tank.history, mutation] },
    mutation,
  };
}

/** واگردِ آخرین تغییرِ واقعی. بدونِ تاریخچه، بی‌اثر. */
export function undo(tank: TankState): TankState {
  const last = tank.history[tank.history.length - 1];
  if (!last) return tank;
  const slots = [...tank.slots];
  slots[last.slotIndex] = last.previousFoot;
  return {
    slots,
    // هدف روی همان جایگاه می‌نشیند: بازیکن تازه آنجا را عوض کرده و
    // احتمالاً می‌خواهد چیزِ دیگری بگذارد.
    activeSlot: last.previousFoot === null ? null : last.slotIndex,
    history: tank.history.slice(0, -1),
  };
}

export function canUndo(tank: TankState): boolean {
  return tank.history.length > 0;
}

/** خالی کردنِ مخزن. همان دور، همان پرسش، همان زمان‌سنج. */
export function reset(tank: TankState): TankState {
  return emptyTank(tank.slots.length);
}

/**
 * محتویاتِ مخزن برای فرستادن به سرور.
 *
 * `null` یعنی هنوز کامل نیست — و آن‌وقت اصلاً درخواستی فرستاده نمی‌شود.
 * (سرور هم جداگانه همین را بررسی می‌کند؛ غیرفعال بودنِ دکمه یک قاعدهٔ
 * رابط کاربری است و نه یک تضمین.)
 */
export function completedSelection(tank: TankState): FootKey[] | null {
  const out: FootKey[] = [];
  for (const slot of tank.slots) {
    if (slot === null) return null;
    out.push(slot);
  }
  return out;
}
