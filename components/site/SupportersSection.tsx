"use client";

import { useMemo } from "react";
import { useSiteContent } from "@/lib/site/use-site-content";
import type { PublicSupporter } from "@/lib/site/content";

/**
 * بخش «حامیان» صفحهٔ اصلی.
 *
 * ---------------------------------------------------------------------------
 * تصمیم‌های طراحی
 * ---------------------------------------------------------------------------
 * • **نوارِ بی‌پایان و نه شبکه.** فهرست حامیان با گذشت زمان بلند می‌شود؛ یک
 *   شبکهٔ ثابت یا صفحهٔ اصلی را بی‌انتها می‌کند یا مجبورتان می‌کند بعضی نام‌ها
 *   را حذف کنید. نوارِ آرامِ در حرکت، هر تعداد را در ارتفاعِ ثابت جا می‌دهد و
 *   هیچ نامی حذف نمی‌شود.
 *
 * • **دو ردیفِ مخالفِ هم.** یک ردیف تنها، شبیه تیکرِ خبری است. دو ردیف که
 *   خلافِ هم می‌روند، عمق می‌سازد و نگاه را نگه می‌دارد.
 *
 * • **ایستادن روی نگه‌داشتنِ اشاره‌گر و روی فوکوس.** نامِ حامی چیزی است که
 *   باید بشود واقعاً خواندش؛ نوارِ همیشه‌درحرکت یعنی هیچ‌کس نمی‌خواند.
 *
 * • **با کمتر از چهار حامی، نوار نمی‌سازیم.** دو کارتِ در گردش، خراب به نظر
 *   می‌رسد؛ آنجا یک ردیفِ وسط‌چین آبرومندتر است.
 *
 * • **بدون مبلغ.** جدول عمداً ستون عددی ندارد (توضیحش در migration ۰۰۸):
 *   یک برچسبِ دلخواه مثل «حامی طلایی» همان کار را می‌کند بدون اینکه دادهٔ
 *   مالی روی صفحهٔ اصلی بنشیند.
 */

const TIER: Record<
  PublicSupporter["tier"],
  { ring: string; glow: string; badge: string | null; chip: string }
> = {
  gold: {
    ring: "ring-gold/60",
    glow: "shadow-[0_0_28px_-8px_var(--color-gold)]",
    badge: "حامی طلایی",
    chip: "bg-gold/15 text-gold-ink dark:text-gold",
  },
  silver: {
    ring: "ring-foreground/25",
    glow: "shadow-[0_0_24px_-10px_rgba(148,163,184,0.9)]",
    badge: "حامی نقره‌ای",
    chip: "bg-foreground/10 text-foreground/70",
  },
  bronze: {
    ring: "ring-amber-700/40",
    glow: "shadow-[0_0_24px_-10px_rgba(180,110,60,0.8)]",
    badge: "حامی برنزی",
    chip: "bg-amber-700/15 text-amber-800 dark:text-amber-300",
  },
  supporter: {
    ring: "ring-primary/40",
    glow: "shadow-[0_0_24px_-10px_var(--color-primary)]",
    badge: null,
    chip: "bg-primary/12 text-primary",
  },
};

/** حرفِ اولِ نام، برای دایرهٔ نمایه. با نام‌های فارسی و لاتین هر دو کار
 *  می‌کند و با ایموجی هم نمی‌شکند (spread روی نویسه‌های یونیکد). */
function initial(name: string): string {
  return [...name.trim()][0] ?? "؟";
}

export default function SupportersSection() {
  const content = useSiteContent();
  const section = content?.supporters;

  // ترتیب از سرور می‌آید (sort_index)؛ اینجا فقط برای دو ردیف نصف می‌شود.
  const [rowA, rowB] = useMemo(() => {
    const items = section?.items ?? [];
    if (items.length < 8) return [items, [] as PublicSupporter[]];
    const half = Math.ceil(items.length / 2);
    return [items.slice(0, half), items.slice(half)];
  }, [section]);

  if (!section?.enabled || section.items.length === 0) return null;

  const marquee = section.items.length >= 4;

  return (
    <section
      dir="rtl"
      aria-labelledby="supporters-heading"
      className="relative overflow-hidden py-16"
    >
      {/* هالهٔ پس‌زمینه. عمداً pointer-events-none تا جلوی هیچ کلیکی را نگیرد. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 size-[34rem] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl dark:bg-gold/8" />
        <div className="absolute bottom-0 right-1/4 size-72 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative">
        <header className="container mx-auto flex flex-col items-center gap-3 px-6 text-center">
          <Ornament />

          <h2 id="supporters-heading" className="text-2xl font-bold sm:text-3xl">
            {section.title}
          </h2>

          {section.subtitle && (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {section.subtitle}
            </p>
          )}
        </header>

        <div className="mt-10 flex flex-col gap-4">
          {marquee ? (
            <>
              <Marquee items={rowA} direction="rtl" duration={rowA.length * 7 + 30} />
              {rowB.length > 0 && (
                <Marquee items={rowB} direction="ltr" duration={rowB.length * 7 + 34} />
              )}
            </>
          ) : (
            <div className="container mx-auto flex flex-wrap justify-center gap-4 px-6">
              {section.items.map((s) => (
                <SupporterCard key={s.id} supporter={s} />
              ))}
            </div>
          )}
        </div>

        {section.ctaUrl && section.ctaLabel && (
          <div className="container mx-auto mt-10 flex justify-center px-6">
            <a
              href={section.ctaUrl}
              target={section.ctaUrl.startsWith("/") ? undefined : "_blank"}
              rel={section.ctaUrl.startsWith("/") ? undefined : "noopener noreferrer"}
              className="group inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-l from-gold/90 to-gold px-6 text-sm font-bold text-[oklch(0.2_0.02_250)] shadow-lg shadow-gold/20 transition-transform hover:scale-[1.02] active:scale-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4.5 transition-transform group-hover:scale-110">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" />
              </svg>
              {section.ctaLabel}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

/** جداکنندهٔ تزئینی — یک لوزیِ ساده میان دو خطِ محوشونده. همان زبانِ بصریِ
 *  بقیهٔ سایت، بدون تصویر و بدون وابستگی. */
function Ornament() {
  return (
    <span aria-hidden className="flex items-center gap-3 text-gold/70">
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-current sm:w-24" />
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        <path d="M12 0 15 9l9 3-9 3-3 9-3-9-9-3 9-3z" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-current sm:w-24" />
    </span>
  );
}

function Marquee({
  items,
  direction,
  duration,
}: {
  items: PublicSupporter[];
  direction: "rtl" | "ltr";
  duration: number;
}) {
  return (
    <div
      className="sarva-marquee relative"
      style={{
        // محوشدنِ دو لبه: بدون این، کارت‌ها وسطِ حرکت به لبهٔ صفحه می‌خورند و
        // بریده می‌شوند.
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className="sarva-marquee-track gap-4 px-2"
        data-direction={direction}
        style={{ ["--sarva-marquee-duration" as string]: `${duration}s` }}
      >
        {/* دو بار: نسخهٔ دوم دقیقاً وقتی به لبه می‌رسد که نسخهٔ اول از آن طرف
            وارد می‌شود — یعنی حلقه بدون پرش. نسخهٔ دوم برای صفحه‌خوان پنهان
            است تا هر نام دو بار خوانده نشود. */}
        {items.map((s) => (
          <SupporterCard key={s.id} supporter={s} />
        ))}
        {items.map((s) => (
          <SupporterCard key={`copy-${s.id}`} supporter={s} ariaHidden />
        ))}
      </div>
    </div>
  );
}

function SupporterCard({
  supporter,
  ariaHidden,
}: {
  supporter: PublicSupporter;
  ariaHidden?: boolean;
}) {
  const tier = TIER[supporter.tier] ?? TIER.supporter;

  const inner = (
    <>
      <span
        aria-hidden
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-card to-muted text-base font-bold ring-2 ${tier.ring} ${tier.glow}`}
      >
        {supporter.avatarUrl ? (
          /* ⚠️ <img> و نه next/image: آدرس تصویر را مدیر وارد می‌کند و از هر
             دامنه‌ای می‌تواند باشد، در حالی که next/image به فهرستِ از پیش
             تعیین‌شدهٔ دامنه‌ها در next.config نیاز دارد — چیزی که اینجا
             ممکن نیست. تصویر هم کوچک (۴۴ پیکسل) و lazy است. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={supporter.avatarUrl}
            alt=""
            loading="lazy"
            className="size-full rounded-xl object-cover"
          />
        ) : (
          initial(supporter.name)
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{supporter.name}</span>
        </span>

        {(supporter.amountLabel || tier.badge) && (
          <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tier.chip}`}>
            {supporter.amountLabel || tier.badge}
          </span>
        )}

        {supporter.message && (
          <span className="line-clamp-2 max-w-52 text-[11px] leading-relaxed text-muted-foreground">
            {supporter.message}
          </span>
        )}
      </span>
    </>
  );

  const className =
    "flex w-64 shrink-0 items-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 backdrop-blur-sm transition-colors hover:border-gold/40";

  if (supporter.linkUrl && !ariaHidden) {
    return (
      <a
        href={supporter.linkUrl}
        target={supporter.linkUrl.startsWith("/") ? undefined : "_blank"}
        rel={supporter.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={className} aria-hidden={ariaHidden || undefined}>
      {inner}
    </div>
  );
}
