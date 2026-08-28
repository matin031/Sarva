"use client";

import type { RapidAruzConfig } from "@/lib/aruz-rapid/config";
import type { RapidAruzInputMethod, ScansionLength } from "@/lib/aruz-rapid/types";

/** نوارِ مهلت.
 *
 *  انیمیشنِ CSS است، نه state در هر فریم. با هر تلاشِ تازه از نو سوار
 *  می‌شود (key)، و در بازگشت از مکث با animation-delayِ منفی از همان‌جا
 *  که مانده بود ادامه می‌دهد. رنگش هم در همان انیمیشن از فیروزه‌ای به
 *  طلایی و هشدار می‌رود، پس ثانیهٔ آخر بدونِ هیچ state ای دیده می‌شود.
 *  نتیجهٔ بازی را این نوار تعیین نمی‌کند — مرجع، مهلتِ معناییِ reducer است. */
export function StepTimer({
  timerKey,
  durationMs,
  elapsedMs,
  running,
  idle,
  flash,
}: {
  timerKey: string;
  durationMs: number;
  elapsedMs: number;
  running: boolean;
  /** بینِ دو دور یا بعد از تکمیل، نوار نباید «پُر» به نظر برسد. */
  idle: boolean;
  /** پایانِ زمان: خودِ نوار یک بار کوتاه روشن می‌شود. */
  flash: "timeout" | null;
}) {
  const delay = `-${Math.max(0, elapsedMs)}ms`;
  return (
    <div
      className="aruzr-timer"
      data-idle={idle ? "true" : "false"}
      data-flash={flash ?? "none"}
      aria-hidden="true"
    >
      <div
        key={timerKey}
        className="aruzr-timer-fill"
        style={{
          animationDuration: `${durationMs}ms, ${durationMs}ms`,
          animationDelay: `${delay}, ${delay}`,
          animationPlayState: running ? "running" : "paused",
        }}
      />
    </div>
  );
}

/** پیشرفتِ دورِ جاری: یک نقطه به ازای هر واحد.
 *
 *  جای شمارندهٔ «۳ / ۱۱» را می‌گیرد و در یک نگاه می‌گوید کجای مصراعیم. */
export function UnitDots({
  count,
  doneCount,
  active,
}: {
  count: number;
  doneCount: number;
  active: boolean;
}) {
  return (
    <div
      className="aruzr-dots"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={doneCount}
      aria-label="واحدهای تقطیع‌شدهٔ این دور"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="aruzr-dot"
          data-state={i < doneCount ? "done" : active && i === doneCount ? "current" : "todo"}
        />
      ))}
    </div>
  );
}

/** واحدِ عروضیِ جاری — دقیقاً همان متنی که داده داده، در کانونِ صفحه. */
export function CurrentUnit({
  display,
  unitKey,
  hidden,
  feedback,
}: {
  display: string;
  /** با هر تلاشِ تازه عوض می‌شود تا ظهورِ ملایم دوباره پخش شود. */
  unitKey: string;
  /** در مکث، واحد پنهان می‌شود تا کسی از پشتِ روپوش تقلب نکند. */
  hidden: boolean;
  feedback: "correct" | "wrong" | "timeout" | null;
}) {
  return (
    <div className="aruzr-unit-wrap">
      <div
        key={unitKey}
        className="aruzr-unit aruzr-unit-in"
        data-hidden={hidden ? "true" : "false"}
        data-feedback={feedback ?? "none"}
        dir="rtl"
        lang="fa"
        role="status"
        aria-live="polite"
        aria-label={hidden ? "واحد پنهان است" : `واحدِ جاری: ${display}`}
      >
        <span aria-hidden={hidden ? "true" : undefined}>{hidden ? "" : display}</span>
      </div>
    </div>
  );
}

export function Progress({
  attemptCount,
  streak,
  compact,
}: {
  attemptCount: number;
  streak: number;
  compact: boolean;
}) {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  return (
    <div className="aruzr-progress" dir="rtl">
      <span className="aruzr-chip">
        تلاش <strong>{fa(attemptCount)}</strong>
      </span>
      {compact ? null : (
        <span className="aruzr-chip">
          زنجیره <strong>{fa(streak)}</strong>
        </span>
      )}
    </div>
  );
}

/** دکمه‌های پاسخ.
 *
 *  دکمهٔ واقعی‌اند (نه div کلیک‌پذیر)، جایشان در طولِ نشست عوض نمی‌شود، و
 *  هیچ‌کدام نمی‌دانند پاسخِ درست چیست — فقط رویداد را می‌فرستند.
 *
 *  روی دکمه فقط نماد است. زیرنویسِ «هجای کوتاه/بلند» برداشته شد: بازیکن
 *  باید با تکرار یاد بگیرد، نه با خواندنِ برچسب در هر واحد. معنی همچنان در
 *  aria-label هست، پس برای صفحه‌خوان چیزی از دست نرفته. */
export function AnswerControls({
  config,
  disabled,
  onAnswer,
  lastPressed,
}: {
  config: RapidAruzConfig;
  disabled: boolean;
  onAnswer: (length: ScansionLength, inputMethod: RapidAruzInputMethod) => void;
  lastPressed: { length: ScansionLength; kind: "correct" | "wrong" | "timeout" } | null;
}) {
  const buttons: { length: ScansionLength; symbol: string; label: string }[] = [
    { length: "short", symbol: config.shortSymbol, label: "هجای کوتاه" },
    { length: "long", symbol: config.longSymbol, label: "هجای بلند" },
  ];

  return (
    <div className="aruzr-controls" dir="rtl">
      {buttons.map((b) => (
        <button
          key={b.length}
          type="button"
          className="aruzr-answer"
          data-length={b.length}
          data-flash={lastPressed?.length === b.length ? lastPressed.kind : "none"}
          disabled={disabled}
          aria-label={b.label}
          onPointerDown={(event) => {
            // pointerdown سریع‌تر از click است و لمس را قابل‌اتکا می‌کند.
            if (event.pointerType === "mouse" && event.button !== 0) return;
            onAnswer(b.length, "pointer");
          }}
          onClick={(event) => {
            // همان لمس، بعداً یک click هم می‌سازد؛ اگر آن را هم می‌شمردیم،
            // یک ضربهٔ فیزیکی دو واحد را رد می‌کرد. کلیکِ صفحه‌کلیدی
            // (Enter/Space) detail = 0 دارد و فقط همان پذیرفته می‌شود.
            if (event.detail !== 0) return;
            onAnswer(b.length, "keyboard");
          }}
        >
          <span className="aruzr-answer-symbol" aria-hidden="true">
            {b.symbol}
          </span>
        </button>
      ))}
    </div>
  );
}
