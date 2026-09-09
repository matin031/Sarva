"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { PlusSummary } from "@/lib/plus/types";
import type { AuthUser } from "./types";

/**
 * کاربر فعلی در کامپوننت‌های کلاینت — جایگزین
 * `supabase.auth.getUser().then(...)` که در هفت کامپوننت تکرار شده بود.
 *
 * حالت `loading` جداست و مهم است: بدون آن، کامپوننت بین رندر اول و رسیدن
 * پاسخ، کاربر را «مهمان» می‌بیند و مثلاً دکمهٔ نشان‌کردن یک لحظه ناپدید
 * می‌شود و برمی‌گردد. نسخهٔ قبلی همین مشکل را داشت.
 *
 * نتیجه در یک کش درون‌ماژولی نگه داشته می‌شود تا پنج کامپوننت روی یک صفحه،
 * پنج بار /me را صدا نزنند.
 *
 * ── خلاصهٔ سروا پلاس هم از همین‌جا می‌آید ────────────────────────────────────
 * ⚠️ عمداً یک درخواستِ دوم برایش زده نمی‌شود. نشانِ پلاس روی هر صفحه رندر
 * می‌شود؛ اگر کوئریِ جدا داشت، هم هزینهٔ هر بازدید دو برابر می‌شد و هم نشان
 * یک لحظه بعد از نامِ کاربر ظاهر می‌شد (پرشِ چیدمان).
 *
 * ⚠️ و همین یعنی **تعویضِ حساب خودبه‌خود درست است**: `clearCurrentUser()` که
 * هنگام خروج صدا زده می‌شود، وضعیتِ پلاس را هم پاک می‌کند. اگر پلاس کشِ
 * جداگانه‌ای داشت، کاربرِ بعدی روی همان دستگاه ممکن بود یک لحظه نشانِ پلاسِ
 * کاربر قبلی را ببیند.
 */

const GUEST_PLUS: PlusSummary = {
  state: "off",
  expiresAt: null,
  expiringSoon: false,
  isTrial: false,
  unreadNotifications: 0,
  unreadTickets: 0,
};

type Session = { user: AuthUser | null; plus: PlusSummary };
type State = { user: AuthUser | null; loading: boolean };
type PlusState = { plus: PlusSummary; loading: boolean };

let cached: Session | undefined;
let inFlight: Promise<Session> | null = null;
const listeners = new Set<(session: Session) => void>();

async function fetchSession(): Promise<Session> {
  const result = await apiGet<{ user: AuthUser | null; plus?: PlusSummary }>("/api/v1/auth/me");
  if (!result.ok) return { user: null, plus: GUEST_PLUS };
  return { user: result.data.user, plus: result.data.plus ?? GUEST_PLUS };
}

function loadSession(): Promise<Session> {
  if (cached !== undefined) return Promise.resolve(cached);
  inFlight ??= fetchSession().then((session) => {
    cached = session;
    inFlight = null;
    return session;
  });
  return inFlight;
}

function publish(session: Session): void {
  for (const listener of listeners) listener(session);
}

/** کش را باطل می‌کند و همهٔ شنونده‌ها را خبر می‌کند.
 *
 *  بعد از ورود، خروج، تغییر نام حساب — و حالا بعد از فعال‌شدن یا تمدید پلاس —
 *  صدا زده می‌شود؛ وگرنه هدر تا رفرش بعدی همچنان وضعیت قبلی را نشان می‌دهد. */
export function refreshCurrentUser(): void {
  cached = undefined;
  inFlight = null;
  void loadSession().then(publish);
}

/** بعد از خروج: کاربر *و* وضعیت پلاس را بدون رفت‌وبرگشت شبکه پاک می‌کند. */
export function clearCurrentUser(): void {
  cached = { user: null, plus: GUEST_PLUS };
  inFlight = null;
  publish(cached);
}

/**
 * تازه‌سازیِ وضعیت وقتی کاربر به تب برمی‌گردد.
 *
 * ⚠️ سناریوی واقعی: کاربر در تبِ اول پرداخت می‌کند یا مدیر دسترسی‌اش را لغو
 * می‌کند؛ تبِ دوم تا رفرشِ دستی، وضعیتِ قدیمی را نشان می‌دهد. با این شنونده،
 * برگشتن به آن تب کافی است.
 *
 * عمداً نه realtime و نه polling: هیچ‌کدام ارزشِ زیرساختشان را برای این
 * مسئله ندارند، و «وقتی نگاه می‌کنی تازه باشد» همان چیزی است که کاربر
 * می‌بیند.
 */
function startVisibilityRefresh(): () => void {
  if (typeof document === "undefined") return () => {};

  let lastRefresh = Date.now();
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    // سقفِ یک بار در ۳۰ ثانیه: جابه‌جا شدنِ سریع بین تب‌ها نباید به رگبارِ
    // درخواست تبدیل شود.
    if (Date.now() - lastRefresh < 30_000) return;
    lastRefresh = Date.now();
    refreshCurrentUser();
  };

  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
}

function useSession(): Session & { loading: boolean } {
  const [state, setState] = useState<Session & { loading: boolean }>(() =>
    cached !== undefined
      ? { ...cached, loading: false }
      : { user: null, plus: GUEST_PLUS, loading: true },
  );

  useEffect(() => {
    let alive = true;

    const listener = (session: Session) => {
      if (alive) setState({ ...session, loading: false });
    };
    listeners.add(listener);

    void loadSession().then((session) => {
      if (alive) setState({ ...session, loading: false });
    });

    const stopVisibility = startVisibilityRefresh();

    return () => {
      alive = false;
      listeners.delete(listener);
      stopVisibility();
    };
  }, []);

  return state;
}

export function useCurrentUser(): State {
  const { user, loading } = useSession();
  return { user, loading };
}

/** وضعیتِ سروا پلاسِ کاربر فعلی — از همان پاسخِ `/me`، بدون درخواست اضافه. */
export function usePlusSummary(): PlusState {
  const { plus, loading } = useSession();
  return { plus, loading };
}
