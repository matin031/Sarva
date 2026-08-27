"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { GameState } from "@/lib/aruz-bridge/types";

/* HUD کاملاً بیرون از canvas است.
 *
 * دو سود دارد که هر دو در این بازی مهم‌اند: متنِ فارسی را خودِ مرورگر با
 * فونتِ سایت شکل می‌دهد (پس هیچ‌وقت شکسته یا آینه نمی‌شود)، و ضربهٔ دوربینِ
 * لحظهٔ ترک‌خوردن به HUD نمی‌رسد — صحنه تکان می‌خورد، ولی امتیاز و تایمر سرِ
 * جایشان می‌مانند. */

const fa = new Intl.NumberFormat("fa-IR");

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border/70 bg-card/70 px-3 py-1.5 backdrop-blur-md sm:px-4">
      <span className="text-[0.6rem] text-muted-foreground sm:text-xs">{label}</span>
      <span className="text-sm font-bold tabular-nums text-foreground sm:text-base">{value}</span>
    </div>
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
  isDemoData,
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
  isDemoData: boolean;
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

  return (
    <div dir="rtl" className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 sm:p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <StatChip label="امتیاز" value={fa.format(score)} />
            <StatChip label="زنجیره" value={fa.format(streak)} />
            <StatChip
              label="مرحله"
              value={`${fa.format(Math.min(stepIndex + 1, totalSteps))}/${fa.format(totalSteps)}`}
            />
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? "روشن‌کردن صدا" : "خاموش‌کردن صدا"}
              aria-pressed={muted}
              className="rounded-xl border border-border/70 bg-card/70 p-2 text-foreground backdrop-blur-md transition-all hover:brightness-125 active:scale-95"
            >
              {muted ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.7-.6-1.85-1.47a10 10 0 0 1 0-3.44c.15-.87.97-1.47 1.85-1.47h2.24Z" />
                </svg>
              )}
            </button>
            <Link
              href="/game"
              aria-label="خروج از بازی"
              className="rounded-xl border border-border/70 bg-card/70 p-2 text-foreground backdrop-blur-md transition-all hover:brightness-125 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </Link>
          </div>
        </div>

        {/* نوارِ زمان */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-card/60 backdrop-blur-md">
          <div
            ref={barRef}
            className="h-full w-full origin-right rounded-full"
            style={{ background: "var(--color-primary)", transform: "scaleX(1)" }}
          />
        </div>

        {isDemoData && (
          <p className="text-center text-[0.6rem] text-muted-foreground sm:text-xs">
            دادهٔ نمایشی — محتوای عروضیِ نهاییِ سروا نیست.
          </p>
        )}
      </div>
    </div>
  );
}
