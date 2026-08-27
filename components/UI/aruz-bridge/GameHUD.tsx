"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { GameState } from "@/lib/aruz-bridge/types";

/* HUD کاملاً بیرون از canvas است.
 *
 * دو سود دارد که هر دو در این بازی مهم‌اند: متنِ فارسی را خودِ مرورگر با
 * فونتِ سایت شکل می‌دهد (پس هیچ‌وقت شکسته یا آینه نمی‌شود)، و ضربهٔ دوربینِ
 * لحظهٔ ترک‌خوردن به HUD نمی‌رسد — صحنه تکان می‌خورد، ولی واژهٔ پرسش و
 * امتیاز سرِ جایشان می‌مانند.
 *
 * چیدمان برای موبایل *اول* طراحی شده و بعد برای صفحهٔ بزرگ باز می‌شود:
 * تراشه‌های آمار روی صفحهٔ باریک جمع‌وجورند تا فضای عمودی را از صحنه
 * نگیرند، و واژهٔ پرسش در هر اندازه‌ای بزرگ‌ترین چیزِ HUD است. */

const fa = new Intl.NumberFormat("fa-IR");

/** در این حالت‌ها هنوز یک پرسشِ زنده در جریان است و واژه باید دیده شود. */
const PROMPT_VISIBLE: ReadonlySet<GameState> = new Set<GameState>([
  "preparing",
  "showingQuestion",
  "waitingForAnswer",
  "jumping",
  "landing",
  "correct",
  "timeout",
  "cracking",
  "shattering",
  "falling",
]);

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-11 flex-col items-center rounded-lg border border-border/70 bg-card/70 px-2 py-1 backdrop-blur-md sm:min-w-16 sm:rounded-xl sm:px-3 sm:py-1.5">
      <span className="text-[0.55rem] leading-tight text-muted-foreground sm:text-[0.65rem]">
        {label}
      </span>
      <span className="text-xs font-bold tabular-nums text-foreground sm:text-sm">{value}</span>
    </div>
  );
}

function IconButton({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const cls =
    "rounded-lg border border-border/70 bg-card/70 p-1.5 text-foreground backdrop-blur-md transition-all hover:brightness-125 active:scale-95 sm:rounded-xl sm:p-2";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  );
}

export function GameHUD({
  state,
  epoch,
  config,
  score,
  streak,
  stepIndex,
  totalSteps,
  muted,
  onToggleMute,
  promptText,
}: {
  state: GameState;
  epoch: number;
  config: AruzBridgeConfig;
  score: number;
  streak: number;
  stepIndex: number;
  totalSteps: number;
  muted: boolean;
  onToggleMute: () => void;
  /** واژه یا عبارتی که باید تقطیع شود — محتوای آموزشیِ اصلیِ صفحه. */
  promptText: string | null;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const running = state === "waitingForAnswer";

  /* نوارِ زمان با requestAnimationFrame و نوشتنِ مستقیم روی style حرکت می‌کند.
     اگر با state حرکت می‌کرد، هر فریمِ تایمر یک re-renderِ کلِ HUD بود — و
     این دقیقاً همان کاری است که وسطِ یک بازیِ سه‌بعدی نباید کرد. */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (!running) {
      bar.style.transform = "scaleX(1)";
      bar.style.background = "var(--color-primary)";
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const left = Math.max(0, 1 - (performance.now() - start) / config.answerTime);
      bar.style.transform = `scaleX(${left})`;
      // فشارِ دیداری در ربعِ پایانی، شدیدتر در ده‌درصدِ آخر
      bar.style.background =
        left < config.panicThreshold
          ? "var(--color-destructive)"
          : left < config.pressureThreshold
            ? "var(--gold)"
            : "var(--color-primary)";
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, epoch, config.answerTime, config.pressureThreshold, config.panicThreshold]);

  const showPrompt = PROMPT_VISIBLE.has(state) && Boolean(promptText);

  return (
    <div dir="rtl" className="pointer-events-none absolute inset-x-0 top-0 z-30 p-2 sm:p-4">
      {/* ── چیدمانی که با *ارتفاعِ* پنجره بازآرایی می‌شود ──────────────────
          روی صفحهٔ بلند: ردیفِ آمار، بعد نوارِ زمان، بعد واژهٔ پرسش وسطِ خودش.
          روی صفحهٔ کوتاه (گوشیِ افقی، کادرِ ~۲۲۰ پیکسل): واژه به همان ردیفِ
          بالا می‌رود و بینِ آمار و دکمه‌ها می‌نشیند.

          چرا: در حالتِ عمودی کارتِ پرسش دقیقاً وسطِ کادر می‌افتاد و همان‌جا
          که کاشی‌های گزینه هستند را می‌پوشاند. با `flex-wrap` و `order` همان
          یک عنصر جابه‌جا می‌شود — نه نسخهٔ دومی در DOM، نه محاسبهٔ جای‌گذاری. */}
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-2 gap-y-1.5 sm:gap-y-2">
          <div className="order-1 flex items-center gap-1 sm:gap-2">
            <StatChip label="امتیاز" value={fa.format(score)} />
            <StatChip label="زنجیره" value={fa.format(streak)} />
            <StatChip
              label="مرحله"
              value={`${fa.format(Math.min(stepIndex + 1, totalSteps))}/${fa.format(totalSteps)}`}
            />
          </div>

          <div className="pointer-events-auto order-2 flex items-center gap-1 sm:gap-2 [@media(max-height:560px)]:order-3">
            <IconButton
              onClick={onToggleMute}
              label={muted ? "روشن‌کردن صدا" : "خاموش‌کردن صدا"}
            >
              {muted ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4 sm:size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4 sm:size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
                </svg>
              )}
            </IconButton>
            <IconButton href="/game" label="خروج از بازی">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4 sm:size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </IconButton>
          </div>

        {/* نوارِ زمان */}
        <div className="order-3 h-1 w-full basis-full overflow-hidden rounded-full bg-card/60 backdrop-blur-md sm:h-1.5 [@media(max-height:560px)]:order-4">
          <div
            ref={barRef}
            className="h-full w-full origin-right rounded-full"
            style={{ background: "var(--color-primary)", transform: "scaleX(1)" }}
          />
        </div>

        {/* ── واژهٔ پرسش ────────────────────────────────────────────────────
            محتوای آموزشیِ اصلیِ صفحه، و بزرگ‌ترین چیزِ HUD.

            پیش‌تر این متن یک کارتِ شناور در دلِ صحنه بود که بعد از یک ثانیه
            محو می‌شد؛ یعنی هر وقت دوربین تکان می‌خورد یا بازیکن دیر نگاه
            می‌کرد، اصلِ سؤال از دست می‌رفت. حالا تا وقتی پرسش زنده است ثابت
            سرِ جایش می‌ماند و به دوربین هیچ وابستگی‌ای ندارد. */}
        <div
          className={`order-4 mt-0.5 basis-full text-center transition-all duration-300 sm:mt-1 [@media(max-height:560px)]:order-2 [@media(max-height:560px)]:mx-2 [@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:min-w-0 [@media(max-height:560px)]:flex-1 [@media(max-height:560px)]:basis-auto [@media(max-height:560px)]:text-center ${
            showPrompt ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
          }`}
          aria-live="polite"
        >
          {/* اندازه‌ها با یک پرسمانِ *ترکیبی* تعیین می‌شوند و نه با `sm:`
              به‌اضافهٔ یک پرسمانِ ارتفاعیِ جدا.
              دلیلش: هر دو پرسمان هم‌ویژگی‌اند و برنده‌شان ترتیبِ تولیدِ CSS
              است نه نیتِ ما — روی گوشیِ افقی (۸۴۴×۳۹۰) `sm:` می‌بُرد و کارت
              با اندازهٔ دسکتاپ ۲۷٪ ارتفاعِ صحنه را می‌گرفت. با یک شرطِ «هم
              پهن، هم بلند» اصلاً برخوردی پیش نمی‌آید. */}
          <div className="inline-block rounded-xl border border-accent/40 bg-[#07141d]/85 px-4 py-1 text-center shadow-[0_2px_24px_rgba(217,164,65,0.18)] backdrop-blur-md [@media(min-width:640px)_and_(min-height:561px)]:rounded-2xl [@media(min-width:640px)_and_(min-height:561px)]:px-8 [@media(min-width:640px)_and_(min-height:561px)]:py-2.5">
            <p className="text-[0.55rem] leading-none text-accent/80 [@media(min-width:640px)_and_(min-height:561px)]:text-[0.7rem] [@media(max-height:560px)]:hidden">
              وزنِ این واژه کدام است؟
            </p>
            {/* سه اندازه که شرط‌هایشان *ناهم‌پوشان*‌اند، پس هیچ‌کدام نمی‌تواند
                دیگری را با ترتیبِ CSS ببرد: کوتاه، بلندِ باریک، بلندِ پهن. */}
            <p className="mt-0.5 font-sans text-xl font-black leading-tight text-[#ffe9bd] [@media(min-height:561px)_and_(max-width:639px)]:text-2xl [@media(min-height:561px)_and_(min-width:640px)]:mt-1.5 [@media(min-height:561px)_and_(min-width:640px)]:text-4xl">
              {promptText ?? " "}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

/** یادداشتِ «دادهٔ نمایشی».
 *
 *  پایینِ کادر می‌نشیند و نه زیرِ واژهٔ پرسش: آنجا درست به لبهٔ کارتِ پرسش
 *  می‌چسبید و روی پس‌زمینهٔ روشنِ پل هم خوانده نمی‌شد. این یک پانویس است،
 *  پس جایش هم باید پانویس باشد. */
export function DemoDataNote() {
  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-x-0 bottom-1.5 z-30 flex justify-start px-3 sm:bottom-2.5 sm:px-4 [@media(max-height:560px)]:hidden"
    >
      <p className="rounded-full bg-[#04080f]/70 px-2.5 py-1 text-center text-[0.55rem] text-muted-foreground backdrop-blur-sm sm:text-[0.65rem]">
        دادهٔ نمایشی — محتوای عروضیِ نهاییِ سروا نیست.
      </p>
    </div>
  );
}
