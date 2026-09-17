import type { PoetsShelfConfig } from "./config";
import { defaultPoetsShelfConfig } from "./config";
import type { Round } from "./questions";

/* ═══════════════════════════════════════════════════════════════════════════
   ماشینِ حالتِ «قفسهٔ شاعران» — تابعِ خالص. بدونِ React، بدونِ three، بدونِ تایمر.
   ═══════════════════════════════════════════════════════════════════════════

   ── چرا اصلاً ماشینِ حالت ──────────────────────────────────────────────────

   خواستهٔ صورت‌مسئله این بود: «کلیکِ سریعِ پشتِ‌هم روی چند کتاب نباید حالتِ
   شخصیت را بشکند». راهِ متعارف — یک `isMoving` بولی و چند `setTimeout` —
   دقیقاً همان‌جایی است که این بازی‌ها می‌شکنند، چون بولی نمی‌داند *چرا*
   قفل است و تایمرها نمی‌دانند دنیا از زیرِ پایشان عوض شده.

   اینجا یک قاعده همهٔ آن دسته اشکال را با هم می‌بندد:

       هر رویداد فقط در حالت‌هایی که برایش تعریف شده پذیرفته می‌شود،
       و در بقیهٔ حالت‌ها بی‌صدا نادیده گرفته می‌شود.

   نتیجه‌اش:

     • کلیکِ دوم وسطِ دویدن  → `select` در حالتِ `moving` تعریف نشده، رد می‌شود.
     • کلیک روی دو کتاب هم‌زمان → هرکدام اول reduce شود برنده است.
     • تایمرِ جامانده از دورِ قبل → `epoch` عوض شده، اثرش خنثی است.
     • رسیدنِ شخصیت پس از خروجِ کاربر → حالت `intro` است، رد می‌شود.

   ── epoch ─────────────────────────────────────────────────────────────────

   با هر گذار یکی بالا می‌رود. لایهٔ React تایمرهایش را با `[state, epoch]`
   کلید می‌زند، پس هر گذار خودبه‌خود تایمرِ قبلی را لغو می‌کند و هیچ
   callbackِ کهنه‌ای نمی‌تواند اثر بگذارد. همان الگوی `lib/aruz-bridge/machine.ts`.
   ═══════════════════════════════════════════════════════════════════════════ */

export type GameState =
  /** پیش از شروع — هنوز دوری ساخته نشده. */
  | "intro"
  /** پرسش روی صفحه است و کتاب‌ها کلیک‌پذیرند. تنها حالتی که ورودی می‌پذیرد. */
  | "ready"
  /** انتخاب قفل شد؛ شخصیت می‌چرخد و می‌دود. */
  | "moving"
  /** شخصیت سرِ جایش ایستاده؛ مکثِ کوتاهِ پیش از واکنشِ کتاب. */
  | "arrived"
  /** کتاب دارد واکنش نشان می‌دهد — بلندشدن و درخشش، یا کنده‌شدن و کوبیده‌شدن. */
  | "resolving"
  /** پاسخِ درست: جشن. */
  | "success"
  /** پاسخِ نادرست: روی زمین، گیج، و مکثِ کمدی. */
  | "failure"
  /** شخصیت بلند می‌شود و به خانه برمی‌گردد. */
  | "resetting";

export type Outcome = "correct" | "wrong";

export interface MachineState {
  state: GameState;
  config: PoetsShelfConfig;
  round: Round | null;
  /** شمارهٔ کتابِ انتخاب‌شده. از `moving` به بعد معتبر است. */
  chosen: number | null;
  /** نتیجهٔ دورِ جاری. تا `resolving` مشخص نمی‌شود. */
  outcome: Outcome | null;
  roundNumber: number;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  answeredCount: number;
  /** پدیدآورنده‌های چند دورِ اخیر — برای پرهیز از تکرارِ پشتِ‌هم. */
  recentAuthorIds: string[];
  epoch: number;
}

export type MachineAction =
  /** شروع، یا شروعِ دوباره، با اولین دور. */
  | { type: "start"; round: Round }
  | { type: "select"; index: number }
  /** شخصیت به لنگرِ رسیدن رسید. */
  | { type: "arrive" }
  /** مکثِ پس از رسیدن تمام شد؛ کتاب واکنش نشان بدهد. */
  | { type: "resolve" }
  /** کتاب کارش را کرد — لحظهٔ برخورد یا اوجِ جشن. */
  | { type: "impact" }
  /** جشن یا زمین‌خوردن تمام شد؛ برگرد. */
  | { type: "recover" }
  /** شخصیت به خانه رسید؛ دورِ بعد. */
  | { type: "next"; round: Round };

/** چند پدیدآورندهٔ اخیر تکرار نشوند. */
const RECENT_MEMORY = 4;

export function initialMachineState(config: PoetsShelfConfig = defaultPoetsShelfConfig): MachineState {
  return {
    state: "intro",
    config,
    round: null,
    chosen: null,
    outcome: null,
    roundNumber: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    answeredCount: 0,
    recentAuthorIds: [],
    epoch: 0,
  };
}

/** یک دورِ تازه را می‌نشاند. مشترکِ `start` و `next`. */
function openRound(base: MachineState, round: Round): MachineState {
  return {
    ...base,
    state: "ready",
    round,
    chosen: null,
    outcome: null,
    roundNumber: base.roundNumber + 1,
    recentAuthorIds: [round.author.id, ...base.recentAuthorIds].slice(0, RECENT_MEMORY),
    epoch: base.epoch + 1,
  };
}

export function reduce(state: MachineState, action: MachineAction): MachineState {
  switch (action.type) {
    case "start": {
      /* شروعِ دوباره امتیاز را صفر می‌کند ولی `config` را نگه می‌دارد. */
      const fresh = initialMachineState(state.config);
      return openRound(fresh, action.round);
    }

    case "select": {
      /* ⚠️ تنها دروازهٔ ورودیِ بازیکن، و عمداً فقط در `ready` باز است.
         همهٔ محافظت در برابرِ کلیکِ سریع همین یک شرط است. */
      if (state.state !== "ready" || !state.round) return state;
      const option = state.round.options[action.index];
      if (!option) return state;

      return { ...state, state: "moving", chosen: action.index, epoch: state.epoch + 1 };
    }

    case "arrive": {
      if (state.state !== "moving") return state;
      return { ...state, state: "arrived", epoch: state.epoch + 1 };
    }

    case "resolve": {
      if (state.state !== "arrived" || !state.round || state.chosen === null) return state;
      /* نتیجه *همین‌جا* تعیین می‌شود و نه در لحظهٔ برخورد: صحنه باید از
         پیش بداند کتاب قرار است جشن بگیرد یا بکوبد، چون هر دو انیمیشنِ
         متفاوتی دارند که همین حالا باید شروع شوند. */
      const correct = state.round.options[state.chosen]?.correct === true;
      return {
        ...state,
        state: "resolving",
        outcome: correct ? "correct" : "wrong",
        epoch: state.epoch + 1,
      };
    }

    case "impact": {
      if (state.state !== "resolving" || !state.outcome) return state;

      const correct = state.outcome === "correct";
      const streak = correct ? state.streak + 1 : 0;
      const { scoring } = state.config;
      /* پاداشِ زنجیره پلکانی است و نه ضربی: ضرب، امتیازِ دورهای بعدی را
         بی‌معنا بزرگ می‌کرد و مقایسهٔ نتیجه‌ها را از بین می‌برد. */
      const gained = correct ? scoring.correct + Math.max(0, streak - 1) * scoring.streakBonus : scoring.wrong;

      return {
        ...state,
        state: correct ? "success" : "failure",
        score: state.score + gained,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        correctCount: state.correctCount + (correct ? 1 : 0),
        answeredCount: state.answeredCount + 1,
        epoch: state.epoch + 1,
      };
    }

    case "recover": {
      if (state.state !== "success" && state.state !== "failure") return state;
      return { ...state, state: "resetting", epoch: state.epoch + 1 };
    }

    case "next": {
      if (state.state !== "resetting") return state;
      return openRound(state, action.round);
    }

    default:
      return state;
  }
}

/* ── کمکی‌های مشتق ───────────────────────────────────────────────────────── */

/** آیا کتاب‌ها همین حالا کلیک‌پذیرند؟ تنها منبعِ این تصمیم. */
export function acceptsInput(state: MachineState): boolean {
  return state.state === "ready";
}

/** آیا دورِ فعالی در جریان است؟ `GameShell` با این نگهبانِ خروج را می‌بندد. */
export function roundInProgress(state: MachineState): boolean {
  return state.state !== "intro";
}
