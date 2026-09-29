"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSiteContent } from "@/lib/site/use-site-content";
import type { AnnouncementTone } from "@/lib/site/content";

/**
 * نوار اعلان سایت.
 *
 * ---------------------------------------------------------------------------
 * چرا این شکل
 * ---------------------------------------------------------------------------
 * «خبری که همه باید ببینند» بالاترین چیزِ صفحه است — بالاتر از هدر. سه
 * تصمیم این شکل را می‌سازند:
 *
 *   ۱) **بالاتر از هدر، نه شناور روی آن.** کارت در جریان عادیِ صفحه
 *      می‌نشیند و بقیه را پایین می‌راند. جایگزینش (position: fixed) روی
 *      محتوا می‌افتد و منوی هدر را می‌پوشاند — و روی گوشی، ارتفاعِ کوچکِ
 *      صفحه را می‌خورد.
 *
 *   ۲) **هم‌عرضِ هدر، نه تمام‌عرض.** کارت در همان `container`ِ هدر است و
 *      همان سطحِ شیشه‌ایِ منوهایش را دارد؛ جایگاهش (بالای همه‌چیز) می‌گوید
 *      «این دربارهٔ کلِ سایت است»، و شکلش می‌گوید «این بخشی از سرواست».
 *
 *   ۳) **همیشه فقط یکی.** کوئری هم همین را برمی‌گرداند. دو اعلان روی هم یعنی
 *      هیچ‌کدام خوانده نمی‌شود.
 *
 * ---------------------------------------------------------------------------
 * بستنِ اعلان
 * ---------------------------------------------------------------------------
 * کلید ذخیره، شناسه **به‌علاوهٔ زمان ویرایش** است. یعنی اگر متن اعلان عوض
 * شود، همان اعلان دوباره برای همه ظاهر می‌شود — که درست است: متنِ تازه خبرِ
 * تازه است. اعلانِ `dismissible = false` اصلاً دکمهٔ بستن ندارد؛ برای
 * اختلالِ در جریان.
 *
 * چیزی در سرور ذخیره نمی‌شود: بستن یک اعلان دانشِ خصوصیِ همان مرورگر است و
 * ارزشِ یک ردیف در دیتابیس یا یک کوکیِ اضافه در هر درخواست را ندارد.
 */

const STORAGE_PREFIX = "sarva:announcement:";

/**
 * «این اعلان بسته شده؟» — یک منبعِ بیرونیِ کوچک روی localStorage.
 *
 * ⚠️ چرا useSyncExternalStore و نه یک useEffect ساده:
 *
 * localStorage در رندرِ سرور وجود ندارد، پس خواندنش باید بعد از mount باشد.
 * راهِ ساده‌اش «useEffect + setState» است — ولی آن یعنی یک setState همگام در
 * افکت، که یک رندرِ آبشاریِ اضافه می‌سازد و React هم دربارهٔ همین هشدار
 * می‌دهد.
 *
 * useSyncExternalStore دقیقاً برای همین ساخته شده: یک عکسِ فوری برای سرور
 * («بسته است»، پس چیزی رندر نمی‌شود) و یکی برای مرورگر.
 *
 * رویدادِ `storage` مرورگر فقط در *تب‌های دیگر* شلیک می‌شود، پس بستن در همین
 * تب با شنوندهٔ خودمان اطلاع داده می‌شود.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function markDismissed(storageKey: string): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, "1");
  } catch {
    /* مرورگرِ ناشناس یا ذخیره‌سازیِ بسته — فقط برای همین بازدید بسته می‌ماند */
  }
  for (const listener of listeners) listener();
}

function useDismissed(storageKey: string): boolean {
  const getSnapshot = useCallback(() => {
    if (!storageKey) return true;
    try {
      return window.localStorage.getItem(STORAGE_PREFIX + storageKey) === "1";
    } catch {
      // ذخیره‌سازی در دسترس نیست: اعلان هر بار دیده می‌شود، که از ندیدنش بهتر
      // است.
      return false;
    }
  }, [storageKey]);

  // عکسِ فوریِ سرور همیشه «بسته» است تا HTML سرور و اولین رندرِ مرورگر یکی
  // بمانند و hydration هشدار ندهد.
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

/**
 * هویتِ هر لحن.
 *
 * ⚠️ نسخهٔ اول یک نوارِ تخت با یک تهِ‌رنگ بود و «به‌سختی دیده می‌شد»؛ نسخهٔ
 * دوم یک نوارِ تمام‌عرضِ گرادیانی شد که از لبهٔ صفحه تا لبهٔ صفحه می‌رفت و با
 * بقیهٔ سایت — که همه‌چیزش در `container` و کارت‌های شیشه‌ایِ گرد است — هم‌زبان
 * نبود؛ بیشتر به بنرِ مرورگر می‌مانْد تا به بخشی از سروا.
 *
 * این نسخه یک **کارتِ شیشه‌ای** است، هم‌عرض و هم‌لبه با هدر (همان `container`)
 * و با همان سطحِ `glass-pop`ِ منوهای هدر. چهار چیز لحن را می‌رسانند و هیچ‌کدام
 * به‌تنهایی حاملِ معنا نیست:
 *
 *   ۱) کاشیِ آیکونِ پُررنگ — اولین نقطه‌ای که چشم می‌گیرد.
 *   ۲) برچسبِ متنیِ لحن («اطلاع‌رسانی»، «فوری» …) — برای کسی که رنگ را
 *      نمی‌بیند، و برای همه، چون یک کلمه سریع‌تر از یک رنگ خوانده می‌شود.
 *   ۳) لبهٔ رنگیِ سمتِ شروع و یک هالهٔ ملایم که از همان‌جا محو می‌شود.
 *   ۴) درخششِ آرامی که فقط `transform` را عوض می‌کند (روی compositor) و با
 *      `prefers-reduced-motion` می‌ایستد.
 */
const TONE: Record<
  AnnouncementTone,
  {
    /** رنگِ پُر — کاشیِ آیکون، لبه و دکمه. متنِ روی آن سفید است. */
    accent: string;
    /** رنگِ *متنِ* برچسب روی سطحِ کارت، جدا برای تمِ تیره. */
    ink: string;
    icon: React.ReactNode;
    label: string;
    /** فوری‌ها یک نقطهٔ تپنده دارند؛ بقیه آرام‌اند. */
    live?: boolean;
  }
> = {
  info: {
    accent: "var(--color-primary)",
    ink: "text-primary",
    label: "اطلاع‌رسانی",
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5v3a1 1 0 0 0 1 1h2l5 4V5.5l-5 4H5a1 1 0 0 0-1 1Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" />
      </>
    ),
  },
  success: {
    accent: "#0f9b73",
    ink: "text-emerald-700 dark:text-emerald-300",
    label: "خبر خوب",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 14.4 8l5 .7-3.6 3.5.9 5-4.7-2.4-4.7 2.4.9-5L4.6 8.7l5-.7L12 3.5Z" />
    ),
  },
  warning: {
    accent: "var(--color-gold-ink)",
    ink: "text-gold-ink dark:text-gold",
    label: "توجه",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    ),
  },
  critical: {
    accent: "var(--color-destructive)",
    ink: "text-destructive",
    label: "فوری",
    live: true,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5m0 3.5h.01" />
      </>
    ),
  },
};

const mix = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`;

export default function AnnouncementBar() {
  const content = useSiteContent();
  const announcement = content?.announcement ?? null;

  const storageKey = announcement ? `${announcement.id}:${announcement.version}` : "";
  const dismissed = useDismissed(storageKey);

  // فقط برای انیمیشن: یک فریم بعد از اینکه عنصر واقعاً در DOM نشست، ارتفاعش
  // باز می‌شود. بدون این، با ارتفاع نهایی متولد می‌شود و صفحه می‌پرد.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // بستنِ حالت اینجا انجام *نمی‌شود*: وقتی اعلانی نیست یا بسته شده،
    // کامپوننت پایین‌تر null برمی‌گرداند و چیزی رندر نمی‌شود، پس یک
    // setState همگام در افکت فقط یک رندرِ آبشاریِ بی‌فایده می‌سازد.
    if (!announcement || dismissed) return;

    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [announcement, dismissed]);

  if (!announcement || dismissed) return null;

  const tone = TONE[announcement.tone] ?? TONE.info;
  const hasLink = !!(announcement.linkUrl && announcement.linkLabel);

  const close = () => {
    // اول انیمیشن جمع شدن، بعد ثبت — وگرنه کامپوننت همان لحظه ناپدید می‌شود
    // و بستن، پرشی به نظر می‌رسد.
    setOpen(false);
    setTimeout(() => markDismissed(storageKey), 260);
  };

  return (
    <div
      role="region"
      aria-label="اعلان سایت"
      dir="rtl"
      className={`relative z-40 grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        {/* ⚠️ همان `container`ِ هدر: لبه‌های کارت دقیقاً با لبه‌های لوگو و
            منو هم‌خط‌اند، پس اعلان جزئی از سرِ صفحه دیده می‌شود و نه چیزی که
            رویش چسبانده شده. */}
        <div className="container pt-3">
          <div
            className={`glass-pop relative isolate overflow-hidden rounded-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
              open ? "translate-y-0" : "-translate-y-2"
            }`}
            style={{ borderColor: mix(tone.accent, 30) }}
          >
            {/* هاله‌ای که از لبهٔ شروع (راست) محو می‌شود */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background: `linear-gradient(270deg, ${mix(tone.accent, 14)}, ${mix(tone.accent, 4)} 45%, transparent 80%)`,
              }}
            />
            {/* درخششِ آرام — فقط transform */}
            <div
              aria-hidden
              className="ann-sheen pointer-events-none absolute inset-y-0 -z-10 w-1/3"
              style={{ background: `linear-gradient(90deg, transparent, ${mix(tone.accent, 12)}, transparent)` }}
            />
            {/* لبهٔ رنگیِ سمتِ شروع */}
            <span
              aria-hidden
              className="absolute inset-y-3 start-0 w-[3px] rounded-e-full"
              style={{ background: tone.accent }}
            />

            {/* روی گوشی: [آیکون | متن | بستن] و دکمه در ردیفِ دوم، هم‌خط با
                متن. از sm به بالا همه در یک ردیف. */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2.5 py-3 ps-4 pe-2.5 sm:flex sm:items-center sm:gap-4 sm:py-3.5 sm:pe-3">
              <span
                aria-hidden
                className="relative flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={{
                  background: `linear-gradient(145deg, ${tone.accent}, color-mix(in oklab, ${tone.accent} 72%, black))`,
                  boxShadow: `0 6px 16px -6px ${mix(tone.accent, 70)}, inset 0 1px 0 rgb(255 255 255 / 0.25)`,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-5">
                  {tone.icon}
                </svg>
                {tone.live && (
                  <span className="absolute -end-1 -top-1 flex size-3">
                    <span
                      className="absolute inset-0 animate-ping rounded-full opacity-70 motion-reduce:animate-none"
                      style={{ background: tone.accent }}
                    />
                    <span className="relative size-3 rounded-full ring-2 ring-card" style={{ background: tone.accent }} />
                  </span>
                )}
              </span>

              <div className="min-w-0 sm:flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-5 ${tone.ink}`}
                    style={{ background: mix(tone.accent, 13) }}
                  >
                    {tone.label}
                  </span>
                  {announcement.title && (
                    <strong className="text-[14px] font-extrabold leading-6 tracking-tight text-foreground sm:text-[15px]">
                      {announcement.title}
                    </strong>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] leading-6 text-foreground/75 sm:text-sm">{announcement.body}</p>
              </div>

              {announcement.dismissible && (
                <button
                  type="button"
                  onClick={close}
                  aria-label="بستن اعلان"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:order-last"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden>
                    <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              )}

              {hasLink && (
                <div className="col-span-2 col-start-2 sm:col-auto">
                  <LinkButton url={announcement.linkUrl!} label={announcement.linkLabel!} accent={tone.accent} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkButton({
  url,
  label,
  accent,
}: {
  url: string;
  label: string;
  accent: string;
}) {
  const internal = url.startsWith("/");
  const className =
    "group inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-[13px] font-bold text-white transition-[transform,filter] hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2";
  const style = {
    background: accent,
    outlineColor: accent,
    boxShadow: `0 6px 14px -8px ${mix(accent, 80)}, inset 0 1px 0 rgb(255 255 255 / 0.2)`,
  } as const;

  const inner = (
    <>
      {label}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        className="size-3.5 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
      </svg>
    </>
  );

  if (internal) {
    return (
      <Link href={url} className={className} style={style}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {inner}
      <span className="sr-only"> (در پنجرهٔ تازه)</span>
    </a>
  );
}
