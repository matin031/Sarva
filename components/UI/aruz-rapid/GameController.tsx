"use client";

import type { RapidAruzConfig } from "@/lib/aruz-rapid/config";
import type { RapidAruzInputMethod, ScansionLength } from "@/lib/aruz-rapid/types";

/** نوارِ مهلت.
 *
 *  انیمیشنِ CSS است، نه state در هر فریم. با هر تلاشِ تازه از نو سوار
 *  می‌شود (key)، و در بازگشت از مکث با animation-delayِ منفی از همان‌جا
 *  که مانده بود ادامه می‌دهد. نتیجهٔ بازی را این نوار تعیین نمی‌کند —
 *  مرجع، مهلتِ معناییِ reducer است. */
export function StepTimer({
  timerKey,
  durationMs,
  elapsedMs,
  running,
  idle,
}: {
  timerKey: string;
  durationMs: number;
  elapsedMs: number;
  running: boolean;
  /** بینِ دو دور یا بعد از تکمیل، نوار نباید «پُر» به نظر برسد. */
  idle: boolean;
}) {
  return (
    <div className="aruzr-timer" data-idle={idle ? "true" : "false"} aria-hidden="true">
      <div
        key={timerKey}
        className="aruzr-timer-fill"
        style={{
          animationDuration: `${durationMs}ms`,
          animationDelay: `-${Math.max(0, elapsedMs)}ms`,
          animationPlayState: running ? "running" : "paused",
        }}
      />
    </div>
  );
}

/** واحدِ عروضیِ جاری — دقیقاً همان متنی که داده داده. */
export function CurrentUnit({
  display,
  hidden,
  feedback,
}: {
  display: string;
  /** در مکث، واحد پنهان می‌شود تا کسی از پشتِ روپوش تقلب نکند. */
  hidden: boolean;
  feedback: "correct" | "wrong" | "timeout" | null;
}) {
  return (
    <div className="aruzr-unit-wrap">
      <div
        className="aruzr-unit"
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
  unitIndex,
  unitCount,
  attemptCount,
  streak,
  compact,
}: {
  unitIndex: number;
  unitCount: number;
  attemptCount: number;
  streak: number;
  compact: boolean;
}) {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  return (
    <div className="aruzr-progress" dir="rtl">
      <span className="aruzr-chip">
        {fa(unitIndex)} / {fa(unitCount)}
      </span>
      <span className="aruzr-chip">تلاش {fa(attemptCount)}</span>
      {compact ? null : <span className="aruzr-chip">زنجیره {fa(streak)}</span>}
    </div>
  );
}

/** دکمه‌های پاسخ.
 *
 *  دکمهٔ واقعی‌اند (نه div کلیک‌پذیر)، جایشان در طولِ نشست عوض نمی‌شود، و
 *  هیچ‌کدام نمی‌دانند پاسخِ درست چیست — فقط رویداد را می‌فرستند. */
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
  const buttons: { length: ScansionLength; symbol: string; label: string; hint: string }[] = [
    { length: "short", symbol: config.shortSymbol, label: "هجای کوتاه", hint: "U" },
    { length: "long", symbol: config.longSymbol, label: "هجای بلند", hint: "−" },
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
          <span className="aruzr-answer-label" aria-hidden="true">
            {b.label}
          </span>
          <span className="aruzr-answer-key" aria-hidden="true">
            {b.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
