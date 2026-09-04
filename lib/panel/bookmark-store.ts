"use client";

import { apiGet } from "@/lib/api/client";
import type { BookmarkArea } from "@/lib/panel/types";

/**
 * وضعیتِ نشانِ یک دور، در حافظهٔ مشترک.
 *
 * ⚠️ چرا ساخته شد: هر دکمهٔ نشان وضعیتِ خودش را جدا می‌پرسید. روی یک دورِ
 * هشت‌سؤالی اندازه گرفته شد — دقیقاً هشت `GET /api/v1/bookmarks` جدا. روی
 * دورِ بیست‌سؤالی می‌شود بیست تا، و همه برای داده‌ای که با یک درخواست
 * می‌آمد.
 *
 * قواعدی که رعایت می‌شوند، هرکدام چون نبودشان یک باگِ واقعی می‌سازد:
 *
 *   • کلیدِ حافظه شاملِ شناسهٔ کاربر است. بدونِ آن، خروج و ورود با حسابِ
 *     دیگر نشان‌های نفرِ قبلی را نشان می‌داد.
 *   • هر شناسه فقط یک درخواستِ در پرواز دارد (single-flight). دو کامپوننت
 *     که هم‌زمان یک دور را می‌خواهند، یک درخواست می‌سازند نه دو تا.
 *   • هر تغییرِ خوش‌بینانه یک شماره می‌گیرد. پاسخِ دیرآمدهٔ یک تغییرِ قدیمی
 *     نباید وضعیتِ جدیدتر را برگرداند — همان چیزی که با نشان‌کردن و
 *     برداشتنِ سریع دیده می‌شود.
 *   • خطای خواندن «نشان نشده» نیست. حالتِ نامعلوم جدا نگه داشته می‌شود تا
 *     دکمه پرشِ مرموز نکند.
 */

type Key = string;
const keyOf = (userId: string, area: BookmarkArea) => `${userId}:${area}`;

type AreaState = {
  /** شناسه‌هایی که وضعیتشان معلوم است. */
  known: Map<string, boolean>;
  /** شماره‌ی آخرین تغییرِ خواسته‌شده برای هر شناسه. */
  seq: Map<string, number>;
  /** درخواستی که همین حالا در پرواز است، برای جلوگیری از تکرار. */
  inFlight: Promise<void> | null;
};

const areas = new Map<Key, AreaState>();
const listeners = new Set<() => void>();
let nextSeq = 1;

function stateFor(userId: string, area: BookmarkArea): AreaState {
  const k = keyOf(userId, area);
  let st = areas.get(k);
  if (!st) {
    st = { known: new Map(), seq: new Map(), inFlight: null };
    areas.set(k, st);
  }
  return st;
}

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeBookmarks(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * وضعیتِ یک شناسه: true/false اگر معلوم است، undefined اگر هنوز نه.
 *
 * ⚠️ undefined عمداً از false جداست — «نمی‌دانم» با «نشان نشده» یکی نیست.
 */
export function bookmarkState(
  userId: string,
  area: BookmarkArea,
  refId: string,
): boolean | undefined {
  return stateFor(userId, area).known.get(refId);
}

/**
 * وضعیتِ یک دستهٔ کامل را یک‌جا می‌گیرد.
 *
 * شناسه‌هایی که از قبل می‌دانیم دوباره پرسیده نمی‌شوند، پس برگشت به همان
 * دور هیچ درخواستی نمی‌سازد.
 */
export async function preloadBookmarks(
  userId: string,
  area: BookmarkArea,
  refIds: string[],
): Promise<void> {
  const st = stateFor(userId, area);

  // ⚠️ اگر درخواستی در پرواز است، *منتظرش می‌مانیم و بعد دوباره حساب
  // می‌کنیم* — نه اینکه همین‌جا برگردیم.
  //
  // نسخهٔ اول همین‌جا `return st.inFlight` می‌کرد و در مرورگر آزموده شد و
  // غلط بود: دکمهٔ سؤالِ جاری حین رندر برای شناسهٔ خودش یک درخواست
  // می‌ساخت، و بعد که افکتِ صفحه می‌خواست کلِ دور را بگیرد، آن درخواستِ
  // تک‌شناسه‌ای در پرواز بود و بقیهٔ شناسه‌ها بی‌صدا دور ریخته می‌شدند —
  // پس هر سؤال باز هم درخواستِ خودش را می‌زد و هیچ چیز بهتر نشده بود.
  if (st.inFlight) await st.inFlight;

  const missing = [...new Set(refIds)].filter((id) => id && !st.known.has(id));
  if (missing.length === 0) return;

  const run = (async () => {
    const qs = `area=${encodeURIComponent(area)}&refIds=${encodeURIComponent(missing.join(","))}`;
    const result = await apiGet<{ marked: string[] }>(`/api/v1/bookmarks?${qs}`);
    if (!result.ok) {
      // خطا را «نشان نشده» جا نمی‌زنیم؛ وضعیت نامعلوم می‌ماند تا دفعهٔ بعد.
      console.error("preloadBookmarks:", result.errors.join(" "));
      return;
    }
    const marked = new Set(result.data.marked);
    for (const id of missing) {
      // ⚠️ اگر بین فرستادن و رسیدنِ پاسخ، کاربر همین شناسه را عوض کرده،
      // پاسخِ سرور کهنه است و نباید خواستهٔ تازه را پس بزند.
      if (st.seq.has(id)) continue;
      st.known.set(id, marked.has(id));
    }
    emit();
  })();

  st.inFlight = run.finally(() => {
    st.inFlight = null;
  });
  return st.inFlight;
}

/** تغییرِ خوش‌بینانه — بلافاصله دیده می‌شود، بعد با سرور هماهنگ. */
export function setBookmarkOptimistic(
  userId: string,
  area: BookmarkArea,
  refId: string,
  value: boolean,
): number {
  const st = stateFor(userId, area);
  const seq = nextSeq++;
  st.seq.set(refId, seq);
  st.known.set(refId, value);
  emit();
  return seq;
}

/**
 * نتیجهٔ واقعیِ سرور را می‌نشاند — ولی فقط اگر تغییرِ تازه‌تری نیامده باشد.
 *
 * سناریو: کاربر سریع نشان می‌کند و برمی‌دارد. پاسخِ «نشان شد» ممکن است
 * بعد از «برداشته شد» برسد. بدونِ این بررسی، دکمه به حالتِ قدیمی برمی‌گشت.
 */
export function settleBookmark(
  userId: string,
  area: BookmarkArea,
  refId: string,
  seq: number,
  value: boolean | undefined,
) {
  const st = stateFor(userId, area);
  if (st.seq.get(refId) !== seq) return; // خواستهٔ تازه‌تری هست
  st.seq.delete(refId);
  if (value === undefined) st.known.delete(refId);
  else st.known.set(refId, value);
  emit();
}

/** خروج یا تعویضِ حساب: هرچه از آن کاربر می‌دانستیم دور ریخته می‌شود. */
export function clearBookmarkCache(userId?: string) {
  if (!userId) areas.clear();
  else for (const k of [...areas.keys()]) if (k.startsWith(`${userId}:`)) areas.delete(k);
  emit();
}
