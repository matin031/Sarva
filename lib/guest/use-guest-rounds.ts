"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { guestLimit, isUnlimited, type GuestSection } from "@/lib/guest/policy";

/**
 * شمارشِ دست/دورهایی که مهمان بازی کرده.
 *
 * ⚠️ این شمارش در localStorage است و پاک کردنش از دستِ کاربر برمی‌آید. عمداً
 * همین‌طور است و نباید با «اجرای امنیتی» اشتباه گرفته شود: هدف یادآوریِ ورود
 * است، نه جلوگیریِ فنی. محتوای بازی‌ها هرحال عمومی است و پشتِ این شمارش
 * چیزی پنهان نمی‌ماند.
 *
 * جایی که واقعاً باید سرور تصمیم بگیرد — کدام آزمون باز است، کدام درس —
 * تصمیم روی سرور گرفته می‌شود و اینجا نمی‌آید.
 */

const KEY = (section: GuestSection) => `sarva:guest-rounds:${section}`;

/**
 * یک store واقعی، نه اشتراکِ بی‌اثر.
 *
 * ⚠️ نسخهٔ اول این فایل به useSyncExternalStore یک subscribe بی‌کار می‌داد و
 * getSnapshot مستقیم localStorage را می‌خواند. در مرورگر آزموده شد و غلط
 * بود: getServerSnapshot صفر می‌داد و چون هیچ اشتراکی نبود، React دلیلی
 * برای خواندنِ دوباره نداشت و روی همان صفر می‌ماند — یعنی مهمانی که
 * سهمیه‌اش تمام شده بود همچنان بازی می‌کرد.
 *
 * حالا مقدارها در یک cache ماژولی می‌نشینند و هر تغییری به شنونده‌ها خبر
 * می‌دهد. `storage` هم گوش داده می‌شود تا بازی در تبِ دیگر هم دیده شود.
 */
const cache = new Map<string, number>();
const listeners = new Set<() => void>();

function readStored(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    // حالتِ ناشناس، یا مرورگری که ذخیره‌سازی را بسته: مثل «هیچ دوری نزده».
    return 0;
  }
}

/** ⚠️ مقدار باید cache شود: getSnapshot بین دو رندرِ بی‌تغییر باید همان
 *  مقدار را بدهد، وگرنه React بی‌نهایت رندر می‌کند. */
function snapshot(key: string): number {
  let v = cache.get(key);
  if (v === undefined) {
    v = readStored(key);
    cache.set(key, v);
  }
  return v;
}

function emit() {
  for (const fn of listeners) fn();
}

function onStorage(e: StorageEvent) {
  if (!e.key || !e.key.startsWith("sarva:guest-rounds:")) return;
  cache.delete(e.key);
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export type GuestRounds = {
  /** true تا وقتی وضعیتِ ورود هنوز معلوم نیست — چیزی را قفل نکنید. */
  checking: boolean;
  /** مهمان است و سهمیه‌اش تمام شده. */
  blocked: boolean;
  /** تعدادِ دورهایی که تا حالا زده. */
  used: number;
  /** سقفِ این بخش، یا null اگر آزاد است. */
  limit: number | null;
  /** یک دورِ تمام‌شده را ثبت می‌کند. برای کاربرِ واردشده کاری نمی‌کند. */
  recordRound: () => void;
};

export function useGuestRounds(section: GuestSection): GuestRounds {
  const { user, loading } = useCurrentUser();
  const key = KEY(section);

  const used = useSyncExternalStore(
    subscribe,
    () => snapshot(key),
    // روی سرور ذخیره‌سازی نیست؛ صفر یعنی «هنوز نمی‌دانیم» و چیزی قفل نمی‌شود.
    () => 0,
  );

  const recordRound = useCallback(() => {
    // کاربرِ واردشده سهمیه ندارد، پس چیزی هم شمرده نمی‌شود.
    if (user) return;
    const next = snapshot(key) + 1;
    cache.set(key, next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // نتوانستیم ذخیره کنیم — شمارش در همین نشست می‌ماند و بس.
    }
    emit();
  }, [key, user]);

  const limit = guestLimit(section);
  const checking = loading;
  const blocked =
    !checking && user === null && !isUnlimited(section) && limit !== null && used >= limit;

  return { checking, blocked, used, limit, recordRound };
}
