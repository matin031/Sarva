import type { AruzBridgeConfig, ScoringConfig } from "./config";
import { defaultAruzBridgeConfig, defaultScoring } from "./config";
import type {
  AruzBridgeQuestion,
  FailureReason,
  GameState,
  PreparedStep,
  RunSummary,
  Side,
} from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   ماشینِ حالتِ بازی — تابعِ خالص، بدون React، بدون three، بدون تایمر.
   ═══════════════════════════════════════════════════════════════════════════

   قاعدهٔ اصلی: هر رویداد فقط در حالت‌هایی که برایش تعریف شده پذیرفته می‌شود
   و در بقیهٔ حالت‌ها *بی‌صدا نادیده گرفته* می‌شود. همین یک قاعده تقریباً همهٔ
   شرایطِ رقابتیِ این بازی را حل می‌کند:

     • دو بار زدنِ سریع  → دومی در حالتِ `jumping` می‌رسد، پذیرفته نمی‌شود.
     • چپ و راست هم‌زمان → هرکدام اول reduce شود برنده است؛ دیگری رد می‌شود.
     • پاسخ دقیقاً سرِ صفرِ تایمر → یکی از `answer`/`timeout` اول می‌رسد و
       حالت را عوض می‌کند؛ دیگری دیگر معتبر نیست.
     • تایمرِ جامانده بعد از پایانِ بازی → حالت `gameOver` است، رد می‌شود.

   `epoch` با هر گذار یک واحد بالا می‌رود. لایهٔ React تایمرهایش را با
   `[state, epoch]` کلید می‌زند، پس هر گذار به‌طور خودکار تایمرِ قبلی را لغو
   می‌کند و هیچ callbackِ کهنه‌ای اثر نمی‌گذارد.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface MachineState {
  state: GameState;
  config: AruzBridgeConfig;
  scoring: ScoringConfig;
  steps: PreparedStep[];
  stepIndex: number;
  /** سمتی که بازیکن انتخاب کرده — در `jumping` به بعد معتبر است. */
  chosen: Side | null;
  /** چرا دور تمام شد. تا وقتی بازی زنده است `null`. */
  failure: FailureReason | null;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  answeredCount: number;
  /** زمانِ بازشدنِ پنجرهٔ پاسخ (performance.now)، برای پاداشِ سرعت و تایمرِ HUD. */
  answerOpenedAt: number | null;
  /**
   * لحظه‌ای که بازیکن سمت را انتخاب کرد (performance.now).
   *
   * ⚠️ این فیلد وجود دارد چون پاداشِ سرعت پیش از این در `resolve` سنجیده
   * می‌شد — یعنی *بعد* از پرش. مدتِ پرش (۶۵۰ms، ثابت) روی زمانِ فکر کردنِ
   * بازیکن سوار می‌شد و از فرصتِ پاسخ کم می‌کرد. روی سرعتِ «سریع» که فرصت
   * ۲۵۰۰ms است، این یعنی ۲۶٪ از دامنهٔ پاداش اصلاً دست‌یافتنی نبود، و هر
   * پاسخی که بعد از ۱۸۵۰ms می‌آمد دقیقاً مثلِ نرسیدن نمره می‌گرفت.
   *
   * حالا لحظهٔ انتخاب همان‌جا که رخ می‌دهد ثبت می‌شود. سود دومش این است که
   * `resolve` دیگر `performance.now()` صدا نمی‌زند و reducer خالص می‌ماند.
   */
  answeredAt: number | null;
  /** شناسهٔ پرسش‌هایی که بازیکن در آن‌ها شکست خورد.
   *  آرایه است و نه یک مقدار، چون مکانیکِ فعلی دور را با اولین اشتباه تمام
   *  می‌کند ولی حالت‌های آینده ممکن است چند اشتباه را اجازه دهند. */
  failedQuestionIds: string[];
  epoch: number;
}

export type MachineAction =
  | { type: "reset" }
  | { type: "start"; steps: PreparedStep[]; config: AruzBridgeConfig; scoring?: ScoringConfig }
  /** شمارشِ معکوس تمام شد؛ اولین مرحله را آماده کن. */
  | { type: "countdownDone" }
  /** آماده‌سازیِ مرحله تمام شد؛ پرسش را نشان بده. */
  | { type: "questionShown"; now: number }
  /** متنِ پرسش محو شد؛ پنجرهٔ پاسخ باز شد. */
  | { type: "answerWindowOpen"; now: number }
  | { type: "answer"; side: Side; now: number }
  | { type: "timeout" }
  | { type: "landed" }
  /** بعد از سکوتِ فرود: مشخص شد شیشه سالم است یا نه. */
  | { type: "resolve" }
  | { type: "crackDone" }
  | { type: "shatterDone" }
  | { type: "fallDone" }
  /** جشنِ پاسخِ درست تمام شد؛ برو مرحلهٔ بعد یا پایان. */
  | { type: "advance"; now: number };

export function initialMachineState(
  config: AruzBridgeConfig = defaultAruzBridgeConfig,
  scoring: ScoringConfig = defaultScoring,
): MachineState {
  return {
    state: "intro",
    config,
    scoring,
    steps: [],
    stepIndex: 0,
    chosen: null,
    failure: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    answeredCount: 0,
    answerOpenedAt: null,
    answeredAt: null,
    failedQuestionIds: [],
    epoch: 0,
  };
}

/** گذارِ پذیرفته‌شده: حالت را عوض کن و epoch را جلو ببر. */
function to(s: MachineState, next: GameState, patch: Partial<MachineState> = {}): MachineState {
  return { ...s, ...patch, state: next, epoch: s.epoch + 1 };
}

/** شناسهٔ پرسشِ فعلی را به فهرستِ شکست‌ها می‌افزاید، بدونِ تکرار. */
function appendFailure(s: MachineState): string[] {
  const id = s.steps[s.stepIndex]?.question.id;
  if (!id || s.failedQuestionIds.includes(id)) return s.failedQuestionIds;
  return [...s.failedQuestionIds, id];
}

export function currentStep(s: MachineState): PreparedStep | null {
  return s.steps[s.stepIndex] ?? null;
}

/** امتیازِ یک پاسخِ درست: پایه + پاداشِ سرعت، ضربدرِ ضریبِ streak (سقف‌دار). */
export function scoreForAnswer(
  s: MachineState,
  elapsedMs: number,
  newStreak: number,
): number {
  const { base, maxSpeedBonus, streakStep, maxStreakMultiplier } = s.scoring;
  const remaining = Math.max(0, 1 - elapsedMs / s.config.answerTime);
  const multiplier = Math.min(1 + newStreak * streakStep, maxStreakMultiplier);
  return Math.round((base + maxSpeedBonus * remaining) * multiplier);
}

export function machineReducer(s: MachineState, a: MachineAction): MachineState {
  switch (a.type) {
    case "reset":
      return initialMachineState(s.config, s.scoring);

    case "start":
      // از `intro` یا از صفحه‌های پایان — هر دو شروعِ یک دورِ تازه‌اند.
      if (s.state !== "intro" && s.state !== "gameOver" && s.state !== "finished") return s;
      if (!a.steps.length) return s;
      // شمارشِ معکوس بیرون از فرصتِ پاسخ است و در تایمرِ پرسش حساب نمی‌شود.
      return to(initialMachineState(a.config, a.scoring ?? s.scoring), "countdown", {
        steps: a.steps,
      });

    case "countdownDone":
      if (s.state !== "countdown") return s;
      return to(s, "preparing");

    case "questionShown":
      if (s.state !== "preparing") return s;
      return to(s, "showingQuestion", { chosen: null, answerOpenedAt: null, answeredAt: null });

    case "answerWindowOpen":
      if (s.state !== "showingQuestion") return s;
      return to(s, "waitingForAnswer", { answerOpenedAt: a.now });

    case "answer": {
      if (s.state !== "waitingForAnswer") return s;
      return to(s, "jumping", { chosen: a.side, answeredAt: a.now });
    }

    case "timeout":
      if (s.state !== "waitingForAnswer") return s;
      // بی‌پاسخی هم یک شکست است، نه فقط یک پیام: شیشهٔ زیرِ پا می‌شکند.
      return to(s, "timeout", {
        failure: "timeout",
        streak: 0,
        answeredCount: s.answeredCount + 1,
        failedQuestionIds: appendFailure(s),
      });

    case "landed":
      if (s.state !== "jumping") return s;
      return to(s, "landing");

    case "resolve": {
      // از `landing` (بعدِ پرش) یا از `timeout` (لرزشِ کاشیِ زیرِ پا).
      if (s.state === "timeout") return to(s, "cracking");
      if (s.state !== "landing") return s;

      const step = currentStep(s);
      const isCorrect = step != null && s.chosen === step.correctSide;
      if (!isCorrect) {
        return to(s, "cracking", {
          failure: "wrong",
          streak: 0,
          answeredCount: s.answeredCount + 1,
          failedQuestionIds: appendFailure(s),
        });
      }

      /* از بازشدنِ پنجره تا لحظهٔ *انتخاب* — نه تا پایانِ پرش. */
      const elapsed =
        s.answerOpenedAt == null || s.answeredAt == null
          ? 0
          : Math.max(0, s.answeredAt - s.answerOpenedAt);
      const streak = s.streak + 1;
      return to(s, "correct", {
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        correctCount: s.correctCount + 1,
        answeredCount: s.answeredCount + 1,
        score: s.score + scoreForAnswer(s, elapsed, streak),
      });
    }

    case "crackDone":
      if (s.state !== "cracking") return s;
      return to(s, "shattering");

    case "shatterDone":
      if (s.state !== "shattering") return s;
      return to(s, "falling");

    case "fallDone":
      if (s.state !== "falling") return s;
      return to(s, "gameOver");

    case "advance": {
      if (s.state !== "correct") return s;
      const next = s.stepIndex + 1;
      if (next >= s.steps.length) return to(s, "finished");

      /* مستقیم به پنجرهٔ پاسخ، نه از راهِ `preparing` و `showingQuestion`.
         آن دو حالت برای *اولین* پرسشِ یک دورند (بعد از شمارشِ معکوس)؛ وسطِ
         بازی فقط وقتِ مرده می‌ساختند: بازیکن فرود می‌آمد و بیش از دو ثانیه
         منتظر می‌ماند تا دوباره بتواند بازی کند.

         هیچ چیزی «آماده» نمی‌شود، چون چیزی برای آماده‌کردن نیست: کلِ دنبالهٔ
         مرحله‌ها — متن، جای چپ و راست، پاسخِ درست — هنگامِ ساختِ دور یک بار
         ساخته و منجمد شده. پس همین‌جا می‌شود بلافاصله مسلح کرد. */
      return to(s, "waitingForAnswer", {
        stepIndex: next,
        chosen: null,
        answerOpenedAt: a.now,
        /* این مسیر از `showingQuestion` نمی‌گذرد، پس پاک‌سازیِ آنجا شاملش
           نمی‌شود و لحظهٔ انتخابِ پرسشِ قبلی همین‌طور می‌ماند. امروز بی‌ضرر
           است (`answer` پیش از هر خواندنی رویش می‌نویسد) ولی یک مقدارِ کهنه
           در حالت، تله‌ای است برای فردا. */
        answeredAt: null,
      });
    }

    default:
      return s;
  }
}

/** در این حالت‌ها ورودیِ بازیکن قفل است. */
export function isInputLocked(state: GameState): boolean {
  return state !== "waitingForAnswer";
}

export function summarize(s: MachineState): RunSummary {
  return {
    score: s.score,
    correctCount: s.correctCount,
    answeredCount: s.answeredCount,
    totalQuestions: s.steps.length,
    bestStreak: s.bestStreak,
    accuracy: s.answeredCount ? s.correctCount / s.answeredCount : 0,
    completed: s.state === "finished",
  };
}

/* ── آماده‌سازیِ مرحله‌ها ─────────────────────────────────────────────────── */

/**
 * پرسش‌های خام را به مرحله تبدیل می‌کند و جای چپ/راست را همین‌جا — یک بار
 * برای همیشه — قرعه می‌زند.
 *
 * دو نکته:
 *  ۱. این کار *بیرون از رندر* انجام می‌شود. اگر داخلِ رندر بود، هر
 *     re-render جای گزینه‌ها را عوض می‌کرد.
 *  ۲. قرعه تصادفی است، ولی بیش از سه بارِ پیاپی یک سمت نمی‌آید. تصادفِ
 *     خالص گاهی زنجیرهٔ بلند می‌سازد که بازیکن آن را «خرابی» می‌فهمد، نه
 *     شانس — و زنجیرهٔ سقف‌دار هنوز هیچ الگویِ قابلِ‌پیش‌بینی‌ای ندارد.
 */
export function prepareSteps(
  questions: AruzBridgeQuestion[],
  random: () => number = Math.random,
): PreparedStep[] {
  const MAX_RUN = 3;
  let lastSide: Side | null = null;
  let run = 0;

  return questions.map((question) => {
    let correctSide: Side = random() < 0.5 ? "left" : "right";
    if (correctSide === lastSide && run >= MAX_RUN) {
      correctSide = correctSide === "left" ? "right" : "left";
    }
    run = correctSide === lastSide ? run + 1 : 1;
    lastSide = correctSide;

    const wrong = question.distractors?.[0] ?? question.wrongPattern;
    return {
      question,
      correctSide,
      leftPattern: correctSide === "left" ? question.correctPattern : wrong,
      rightPattern: correctSide === "right" ? question.correctPattern : wrong,
    };
  });
}
