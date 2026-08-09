"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * ویجت Cloudflare Turnstile.
 *
 * وقتی NEXT_PUBLIC_TURNSTILE_SITE_KEY تنظیم نشده باشد، این کامپوننت هیچ چیزی
 * رندر نمی‌کند و بلافاصله توکنِ null می‌دهد — یعنی سایت بدون حساب Cloudflare
 * دقیقاً مثل قبل کار می‌کند. سمت سرور هم همان‌جور رفتار می‌کند
 * (lib/auth/turnstile.ts)، پس فعال و غیرفعال کردن کپچا فقط تنظیم دو متغیر
 * محیطی است، نه تغییر کد.
 *
 * ⚠️ این کامپوننت هیچ چیزی را امن نمی‌کند. تنها کارش ساختن یک توکن است؛
 * محافظت واقعی وقتی اتفاق می‌افتد که سرور آن توکن را از Cloudflare بپرسد.
 */

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme: "dark" | "light" | "auto";
  language: string;
};

type TurnstileApi = {
  render: (element: HTMLElement, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** اسکریپت فقط یک بار برای کل صفحه بار می‌شود، حتی اگر چند فرم آن را بخواهند. */
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile script failed"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type TurnstileWidgetProps = {
  /** با هر توکن تازه (یا null وقتی منقضی/خطا شد) صدا زده می‌شود. */
  onToken: (token: string | null) => void;
  /** با تغییرش ویجت ریست می‌شود — بعد از یک تلاش ناموفق لازم است، چون هر
   *  توکن Turnstile فقط یک بار قابل مصرف است. */
  resetSignal?: number;
};

/**
 * site key از سرور خوانده می‌شود، نه از باندل.
 *
 * `process.env.NEXT_PUBLIC_*` در یک کامپوننت کلاینت هنگام build جاسازی
 * می‌شود، و مرحلهٔ build داکر هیچ .env ای ندارد — پس آن مسیر روی سرور همیشه
 * خالی برمی‌گشت و کپچا بی‌صدا خاموش می‌ماند. توضیح کامل در
 * app/api/v1/config/route.ts.
 *
 * مقدارِ زمانِ build به‌عنوان پشتیبان می‌ماند: در `npm run dev` که .env واقعاً
 * در دسترس است، ویجت بدون منتظر ماندن برای این درخواست ظاهر می‌شود.
 */
let cachedSiteKey: string | null | undefined;

async function fetchSiteKey(): Promise<string | null> {
  if (cachedSiteKey !== undefined) return cachedSiteKey;

  try {
    const response = await fetch("/api/v1/config", { cache: "no-store" });
    const payload = await response.json();
    cachedSiteKey = payload?.ok ? (payload.data?.turnstileSiteKey ?? null) : null;
  } catch {
    cachedSiteKey = null;
  }

  return cachedSiteKey ?? null;
}

export default function TurnstileWidget({ onToken, resetSignal = 0 }: TurnstileWidgetProps) {
  const [siteKey, setSiteKey] = useState<string | null>(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const id = useId();

  // onToken معمولاً یک تابع inline است، پس هر رندر مرجع تازه‌ای دارد. اگر
  // مستقیم در وابستگی‌های افکت می‌آمد، ویجت در هر رندر از نو ساخته می‌شد.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const emit = useCallback((token: string | null) => {
    onTokenRef.current(token);
  }, []);

  // اگر مقدارِ زمانِ build نداشتیم، از سرور بپرس.
  useEffect(() => {
    if (siteKey) return;
    let cancelled = false;
    fetchSiteKey().then((key) => {
      if (!cancelled && key) setSiteKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) {
      // کپچا خاموش است — سرور هم همین را می‌داند و توکن نمی‌خواهد.
      emit(null);
      return;
    }

    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => emit(token),
          // توکن Turnstile عمر کوتاهی دارد؛ اگر کاربر فرم را باز گذاشت و بعد
          // فرستاد، بدون این پاک کردن، توکنِ مرده فرستاده می‌شد و سرور با یک
          // خطای گنگ ردش می‌کرد.
          "expired-callback": () => emit(null),
          "error-callback": () => {
            emit(null);
            setFailed(true);
          },
          theme: "dark",
          language: "fa",
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, emit, id]);

  // ریست بعد از تلاش ناموفق: هر توکن یک‌بارمصرف است، پس بدون این، تلاش دوم
  // همیشه با همان توکنِ سوخته می‌رفت و همیشه رد می‌شد.
  useEffect(() => {
    if (!resetSignal || !widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    emit(null);
  }, [resetSignal, emit]);

  if (!siteKey) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} />
      {failed && (
        <p className="text-xs text-red-400">
          بارگذاری تأیید امنیتی ناموفق بود. اتصال اینترنت را بررسی کنید و صفحه را تازه کنید.
        </p>
      )}
    </div>
  );
}
