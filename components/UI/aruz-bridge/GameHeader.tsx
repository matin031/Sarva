"use client";

import { useEffect, useRef } from "react";
import type { AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { GameState } from "@/lib/aruz-bridge/types";

/* سرصفحهٔ بازی — *بیرون* از بومِ سه‌بعدی و در سطحِ خودِ صفحه.
 *
 * پیش‌تر واژهٔ پرسش یک کارتِ تیره بود که روی پل شناور می‌ماند. دو ایراد
 * داشت: بخشی از خودِ بازی را می‌پوشاند، و چون داخلِ کادرِ تیره بود، مثلِ یک
 * برنامهٔ جدا از سایت به نظر می‌رسید.
 *
 * حالا محتوای آموزشی همان‌جایی است که در بقیهٔ سروا می‌نشیند: در جریانِ
 * صفحه، با سطح و فونت و شعاعِ خودِ سایت. هیچ چیزی در صحنه — تکانِ دوربین،
 * پرش، شکستن، کادربندیِ موبایل — نمی‌تواند رویش اثر بگذارد. */

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[0.7rem] text-muted-foreground">{label}</span>
      <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
    </span>
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
}: {
  state: GameState;
  epoch: number;
  config: AruzBridgeConfig;
  promptText: string | null;
  stepIndex: number;
  totalSteps: number;
  score: number;
  streak: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const running = state === "waitingForAnswer";

  /* نوارِ زمان با requestAnimationFrame و نوشتنِ مستقیم روی style حرکت می‌کند؛
     با state، هر فریمِ تایمر یک re-renderِ کلِ سرصفحه بود. */
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
    <div
      dir="rtl"
      /* روی صفحهٔ کوتاه (گوشیِ افقی) سرصفحه جمع می‌شود: ارتفاعِ کادرِ بازی
         آنجا فقط ~۲۴۰ پیکسل است و هر پیکسل ارزش دارد. */
      className="rounded-2xl border border-border bg-card px-4 py-3 sm:px-6 sm:py-4 [@media(max-height:560px)]:px-3 [@media(max-height:560px)]:py-1.5"
    >
      {/* واژهٔ پرسش — محتوای آموزشیِ اصلی، و بزرگ‌ترین چیزِ صفحه */}
      <div className="text-center">
        <p className="text-[0.7rem] text-muted-foreground sm:text-xs [@media(max-height:560px)]:hidden">
          وزنِ این واژه کدام است؟
        </p>
        <p
          aria-live="polite"
          className={`mt-0.5 font-sans text-2xl font-black leading-tight text-foreground transition-opacity duration-200 sm:text-4xl [@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:text-lg ${
            active && promptText ? "opacity-100" : "opacity-30"
          }`}
        >
          {promptText ?? "—"}
        </p>
      </div>

      {/* نوارِ زمان */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted [@media(max-height:560px)]:mt-1.5">
        <div
          ref={barRef}
          className="h-full w-full origin-right rounded-full"
          style={{ background: "var(--color-primary)", transform: "scaleX(1)" }}
        />
      </div>

      {/* آمار — یک ردیف، هم‌تراز، نه پراکنده */}
      <div className="mt-2.5 flex items-center justify-center gap-4 sm:gap-6 [@media(max-height:560px)]:mt-1 [@media(max-height:560px)]:gap-3">
        <Stat
          label="مرحله"
          value={`${fa.format(Math.min(stepIndex + 1, totalSteps))} از ${fa.format(totalSteps)}`}
        />
        <span className="h-3 w-px bg-border" />
        <Stat label="امتیاز" value={fa.format(score)} />
        <span className="h-3 w-px bg-border" />
        <Stat label="زنجیره" value={fa.format(streak)} />
      </div>
    </div>
  );
}
