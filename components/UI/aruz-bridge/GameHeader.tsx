"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { GameState } from "@/lib/aruz-bridge/types";

/* HUDـِ فشرده — بخشِ بالاییِ *همان* پوستهٔ بازی، نه کارتی جدا.
 *
 * پیش‌تر این یک کارتِ مستقل با ۱۶۰ پیکسل ارتفاع بود که با کادرِ بازی روی هم
 * صفحه را پر می‌کرد و کاربر مجبور بود بینِ پرسش و پل اسکرول کند. حالا یک
 * نوارِ جمع‌وجور است که مرزِ مشترک با بومِ سه‌بعدی دارد.
 *
 * واژهٔ پرسش بیرون از WebGL می‌ماند (شکل‌دهیِ فارسی را مرورگر انجام دهد) ولی
 * قوی‌ترین متنِ HUD است — چون محتوای آموزشیِ اصلی همان است. */

const fa = new Intl.NumberFormat("fa-IR");

/** در این حالت‌ها پرسشِ زنده‌ای در جریان است. */
const ACTIVE: ReadonlySet<GameState> = new Set<GameState>([
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

/**
 * اندازهٔ قلمِ واژه از *طولِ متن* می‌آید، نه یک عددِ ثابت.
 *
 * دادهٔ پرسش ممکن است یک واژه باشد یا یک مصراع. با قلمِ ثابت، متنِ بلند یا
 * بریده می‌شد (یعنی محتوای آموزشی پنهان می‌ماند) یا ارتفاعِ HUD را عوض
 * می‌کرد و کلِ کادرِ بازی را پایین می‌راند. کوچک‌شدنِ پلکانیِ قلم هر دو را
 * حل می‌کند: متن کامل دیده می‌شود و ارتفاع دست‌نخورده می‌ماند.
 */
function promptSizeClass(text: string | null): string {
  const length = text?.trim().length ?? 0;
  if (length <= 12) return "text-xl sm:text-3xl";
  if (length <= 24) return "text-lg sm:text-2xl";
  if (length <= 40) return "text-base sm:text-xl";
  return "text-sm sm:text-base";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[0.65rem] text-muted-foreground">{label}</span>
      <span className="text-xs font-bold tabular-nums text-foreground sm:text-sm">{value}</span>
    </span>
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
    "rounded-lg border border-border bg-background/70 p-1.5 text-muted-foreground transition-all hover:text-foreground hover:border-primary/50 active:scale-95";
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  );
}

export function GameHeader({
  state,
  epoch,
  config,
  promptText,
  stepIndex,
  totalSteps,
  score,
  streak,
  muted,
  onToggleMute,
}: {
  state: GameState;
  epoch: number;
  config: AruzBridgeConfig;
  promptText: string | null;
  stepIndex: number;
  totalSteps: number;
  score: number;
  streak: number;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const running = state === "waitingForAnswer";

  /* نوارِ زمان با requestAnimationFrame و نوشتنِ مستقیم روی style حرکت می‌کند؛
     با state، هر فریمِ تایمر یک re-renderِ کلِ HUD بود. */
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
      bar.style.background =
        left < config.panicThreshold
          ? "var(--color-destructive)"
          : left < config.pressureThreshold
            ? "var(--gold-ink)"
            : "var(--color-primary)";
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, epoch, config.answerTime, config.pressureThreshold, config.panicThreshold]);

  const active = ACTIVE.has(state);

  return (
    <div dir="rtl" className="px-3 pb-2 pt-2 sm:px-4">
      <div className="flex items-center gap-3">
        {/* چپ: خروج و صدا — بخشی از پوستهٔ بازی، نه شناور روی صحنه */}
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton href="/game" label="خروج از بازی">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
          </IconButton>
          <IconButton onClick={onToggleMute} label={muted ? "روشن‌کردن صدا" : "خاموش‌کردن صدا"}>
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
              </svg>
            )}
          </IconButton>
        </div>

        {/* وسط: واژهٔ پرسش.
            ارتفاع *ثابت* است و به طولِ متن وابسته نیست: یک ردیفِ با ارتفاعِ
            معین، متنِ تک‌خطی و کوچک‌شدنِ اندازهٔ قلم روی صفحهٔ باریک. پس یک
            مصراعِ بلند هم کادرِ بازی را پایین نمی‌راند. */}
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[0.65rem] leading-none text-muted-foreground sm:text-xs">
            وزنِ این واژه کدام است؟
          </p>
          {/* ارتفاع *ثابت* است (h-9/h-10) و به طولِ متن وابسته نیست، پس
              عوض‌شدنِ پرسش هرگز کادرِ بازی را جابه‌جا نمی‌کند. */}
          <p
            aria-live="polite"
            className={`mt-0.5 flex h-9 items-center justify-center overflow-hidden font-sans font-black leading-tight text-foreground transition-opacity duration-200 sm:h-10 ${promptSizeClass(
              promptText,
            )} ${active && promptText ? "opacity-100" : "opacity-30"}`}
          >
            <span className="line-clamp-2 px-1">{promptText ?? "—"}</span>
          </p>
        </div>

        {/* راست: آمار. روی صفحهٔ باریک زیرِ واژه می‌رود تا ردیف شلوغ نشود. */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <Stat label="مرحله" value={`${fa.format(Math.min(stepIndex + 1, totalSteps))}/${fa.format(totalSteps)}`} />
          <Stat label="امتیاز" value={fa.format(score)} />
          <Stat label="زنجیره" value={fa.format(streak)} />
        </div>
      </div>

      {/* آمارِ فشرده برای صفحهٔ باریک */}
      <div className="mt-1 flex items-center justify-center gap-4 sm:hidden">
        <Stat label="مرحله" value={`${fa.format(Math.min(stepIndex + 1, totalSteps))}/${fa.format(totalSteps)}`} />
        <Stat label="امتیاز" value={fa.format(score)} />
        <Stat label="زنجیره" value={fa.format(streak)} />
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          ref={barRef}
          className="h-full w-full origin-right rounded-full"
          style={{ background: "var(--color-primary)", transform: "scaleX(1)" }}
        />
      </div>
    </div>
  );
}
