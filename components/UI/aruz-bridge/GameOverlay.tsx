"use client";

import { defaultScoring, type AruzBridgeConfig } from "@/lib/aruz-bridge/config";
import type { GameState } from "@/lib/aruz-bridge/types";

/* ═══════════════════════════════════════════════════════════════════════════
   لایهٔ HTMLِ روی بوم: بازخوردی که باید *خوانده* شود.
   ═══════════════════════════════════════════════════════════════════════════

   صحنهٔ سه‌بعدی نشان می‌دهد چه شد؛ این لایه می‌گوید چقدر خوب شد:

     • «+۱۲۴» و یک واژهٔ تشویق که با طولِ زنجیره بزرگ‌تر می‌شود.
     • قابِ قرمزی که در ثانیه‌های آخرِ فرصت دورِ صحنه می‌تپد — فشار را به
       چشم هم می‌رساند، نه فقط به گوش (بسیاری بی‌صدا بازی می‌کنند).
     • برقِ قرمزِ لحظهٔ ترک.
     • راهنمای کوتاهِ اولین پرسش.

   ⚠️ همه‌چیز CSS است و هیچ تایمر یا stateـی در JS ندارد. قابِ فشار با
   `animation-delay` دقیقاً سرِ آستانه روشن می‌شود و با `key={epoch}` هر
   پرسش از نو شروع می‌کند؛ یعنی حتی یک re-render هم برای فشار لازم نیست.
   فقط `opacity` و `transform` متحرک‌اند، که مرورگر بدونِ paint جابه‌جا
   می‌کند. همه `pointer-events-none`اند تا لمسِ شیشه‌ها را نگیرند. */

const fa = new Intl.NumberFormat("fa-IR");

/** واژهٔ تشویق از روی طولِ زنجیره؛ پاسخِ درستِ تنها هم بی‌جواب نمی‌ماند. */
function praiseFor(streak: number): string {
  if (streak >= 10) return "افسانه‌ای!";
  if (streak >= 7) return "بی‌نظیر!";
  if (streak >= 5) return "درخشان!";
  if (streak >= 3) return "عالی!";
  if (streak >= 2) return "آفرین!";
  return "درست!";
}

/** یک delay برای هر دو انیمیشنِ قابِ فشار (ورود و تپش) — ترتیبش همان ترتیبِ CSS است. */
const delays = (ms: number) => `${Math.round(ms)}ms, ${Math.round(ms)}ms`;

/** پس از پاسخِ درست، «+امتیاز» تا پرسشِ بعد روی صحنه می‌ماند (انیمیشن خودش محو می‌شود). */
const AFTER_CORRECT: ReadonlySet<GameState> = new Set<GameState>([
  "correct",
  "preparing",
  "showingQuestion",
  "waitingForAnswer",
]);

export function GameOverlay({
  state,
  epoch,
  config,
  score,
  lastGain,
  streak,
  stepIndex,
}: {
  state: GameState;
  epoch: number;
  config: AruzBridgeConfig;
  score: number;
  lastGain: number;
  streak: number;
  stepIndex: number;
}) {
  const waiting = state === "waitingForAnswer";
  const showGain = lastGain > 0 && AFTER_CORRECT.has(state);
  const firstQuestion = stepIndex === 0 && (state === "showingQuestion" || waiting);
  // همان فرمولِ `scoreForAnswer`، تا عددِ روی صفحه با امتیازِ واقعی یکی باشد.
  const multiplier = Math.min(1 + streak * defaultScoring.streakStep, defaultScoring.maxStreakMultiplier);

  return (
    <div dir="rtl" className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {waiting && (
        <>
          <div
            key={`p${epoch}`}
            className="ab-pressure"
            style={{ animationDelay: delays(config.answerTime * (1 - config.pressureThreshold)) }}
          />
          <div
            key={`x${epoch}`}
            className="ab-pressure ab-panic"
            style={{ animationDelay: delays(config.answerTime * (1 - config.panicThreshold)) }}
          />
        </>
      )}

      {state === "cracking" && <div key={`c${epoch}`} className="ab-crack-flash" />}

      {/* کلید = امتیازِ کل: هر پاسخِ درست یکتاست، پس انیمیشن فقط یک بار اجرا می‌شود. */}
      {showGain && (
        <div key={`g${score}`} className="ab-gain">
          <span className="ab-gain-praise game-display">{praiseFor(streak)}</span>
          <span className="ab-gain-points game-display tabular-nums">+{fa.format(lastGain)}</span>
          {multiplier > 1.05 && (
            <span className="ab-gain-combo tabular-nums">
              زنجیرهٔ {fa.format(streak)} · ×{fa.format(Math.round(multiplier * 10) / 10)}
            </span>
          )}
        </div>
      )}

      {firstQuestion && (
        <div className="ab-hint">
          <span className="pointer-coarse:hidden">
            <kbd>→</kbd> یا <kbd>D</kbd> راست · <kbd>←</kbd> یا <kbd>A</kbd> چپ · یا روی شیشه کلیک کن
          </span>
          <span className="hidden pointer-coarse:inline">روی شیشه‌ای بزن که وزنِ درست رویش نوشته شده</span>
        </div>
      )}
    </div>
  );
}
