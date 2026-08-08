"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
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
 */

type State = { user: AuthUser | null; loading: boolean };

let cached: AuthUser | null | undefined;
let inFlight: Promise<AuthUser | null> | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

async function fetchUser(): Promise<AuthUser | null> {
  const result = await apiGet<{ user: AuthUser | null }>("/api/v1/auth/me");
  return result.ok ? result.data.user : null;
}

function loadUser(): Promise<AuthUser | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  inFlight ??= fetchUser().then((user) => {
    cached = user;
    inFlight = null;
    return user;
  });
  return inFlight;
}

/** کش را باطل می‌کند و همهٔ شنونده‌ها را خبر می‌کند.
 *
 *  بعد از ورود، خروج، و تغییر نام حساب صدا زده می‌شود — وگرنه هدر تا رفرش
 *  بعدی همچنان کاربر قبلی را نشان می‌دهد. */
export function refreshCurrentUser(): void {
  cached = undefined;
  inFlight = null;
  void loadUser().then((user) => {
    for (const listener of listeners) listener(user);
  });
}

/** بعد از خروج: کاربر را بدون رفت‌وبرگشت شبکه پاک می‌کند. */
export function clearCurrentUser(): void {
  cached = null;
  inFlight = null;
  for (const listener of listeners) listener(null);
}

export function useCurrentUser(): State {
  const [state, setState] = useState<State>(() =>
    cached !== undefined ? { user: cached, loading: false } : { user: null, loading: true },
  );

  useEffect(() => {
    let alive = true;

    const listener = (user: AuthUser | null) => {
      if (alive) setState({ user, loading: false });
    };
    listeners.add(listener);

    void loadUser().then((user) => {
      if (alive) setState({ user, loading: false });
    });

    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);

  return state;
}
