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
 * الگوی جاافتادهٔ وب برای «خبری که همه باید ببینند» یک نوارِ تمام‌عرض در
 * بالاترین نقطهٔ صفحه است — بالاتر از هدر. سه دلیل دارد و هر سه عملی‌اند:
 *
 *   ۱) **بالاتر از هدر، نه شناور روی آن.** این نوار در جریان عادیِ صفحه
 *      می‌نشیند و بقیه را پایین می‌راند. جایگزینش (position: fixed) روی
 *      محتوا می‌افتد و منوی چسبانِ هدر را می‌پوشاند — و روی گوشی، ارتفاعِ
 *      کوچکِ صفحه را می‌خورد.
 *
 *   ۲) **تمام‌عرض.** نواری که به عرضِ ستونِ متن باشد، به چشم یک کارتِ دیگر
 *      در صفحه می‌آید و رد می‌شود. تمام‌عرض بودن است که می‌گوید «این دربارهٔ
 *      کلِ سایت است».
 *
 *   ۳) **همیشه فقط یکی.** کوئری هم همین را برمی‌گرداند. دو نوار روی هم یعنی
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

/** پالت هر لحن. رنگ‌ها از توکن‌های خودِ سایت می‌آیند تا در تم روشن و تیره
 *  هر دو درست بنشینند. */
const TONE: Record<
  AnnouncementTone,
  { wrap: string; rail: string; chip: string; icon: React.ReactNode; label: string }
> = {
  info: {
    wrap: "bg-primary/12 text-foreground",
    rail: "from-primary/70 via-primary to-primary/40",
    chip: "bg-primary/15 text-primary",
    label: "اطلاع‌رسانی",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
  success: {
    wrap: "bg-emerald-500/12 text-foreground",
    rail: "from-emerald-500/70 via-emerald-500 to-emerald-500/40",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    label: "خبر خوب",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4.5 4.5L19 7" />,
  },
  warning: {
    wrap: "bg-gold/15 text-foreground",
    rail: "from-gold/70 via-gold to-gold/40",
    chip: "bg-gold/20 text-gold-ink dark:text-gold",
    label: "توجه",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    ),
  },
  critical: {
    wrap: "bg-destructive/14 text-foreground",
    rail: "from-destructive/70 via-destructive to-destructive/40",
    chip: "bg-destructive/15 text-destructive",
    label: "فوری",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5m0 3.5h.01" />
      </>
    ),
  },
};

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

  const close = () => {
    // اول انیمیشن جمع شدن، بعد ثبت — وگرنه کامپوننت همان لحظه ناپدید می‌شود
    // و بستن، پرشی به نظر می‌رسد.
    setOpen(false);
    setTimeout(() => markDismissed(storageKey), 220);
  };

  return (
    <div
      role="region"
      aria-label="اعلان سایت"
      dir="rtl"
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className={`relative border-b border-border/60 backdrop-blur-sm ${tone.wrap}`}>
          {/* خطِ باریکِ رنگی بالای نوار — همان چیزی که لحن را در یک نگاه
              می‌گوید، بدون اینکه کلِ نوار پررنگ و آزاردهنده شود. */}
          <div className={`h-[3px] w-full bg-gradient-to-l ${tone.rail}`} />

          <div className="container mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-6">
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${tone.chip}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-4">
                {tone.icon}
              </svg>
            </span>

            <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] leading-relaxed sm:text-sm">
              {/* برچسبِ لحن برای کسی که رنگ را نمی‌بیند — رنگ به‌تنهایی هرگز
                  تنها حاملِ معنا نیست. */}
              <span className="sr-only">{tone.label}: </span>
              {announcement.title && (
                <strong className="font-bold">{announcement.title}</strong>
              )}
              <span className="text-foreground/85">{announcement.body}</span>
            </p>

            {announcement.linkUrl && announcement.linkLabel && (
              <LinkButton url={announcement.linkUrl} label={announcement.linkLabel} />
            )}

            {announcement.dismissible && (
              <button
                type="button"
                onClick={close}
                aria-label="بستن اعلان"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="size-4">
                  <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** لینکِ داخلی با <Link> می‌رود تا ناوبری کلاینتی بماند؛ بیرونی با <a> و
 *  rel امن. */
function LinkButton({ url, label }: { url: string; label: string }) {
  const internal = url.startsWith("/");
  const className =
    "shrink-0 rounded-lg border border-current/25 px-3 py-1 text-[12px] font-semibold transition-colors hover:bg-foreground/5";

  if (internal) {
    return (
      <Link href={url} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
      <span className="sr-only"> (در پنجرهٔ تازه)</span>
    </a>
  );
}
