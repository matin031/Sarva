import { CONCEPTS, type ConceptId, type Level, type Step, type TokenId } from "./content";

/* ═══════════════════════════════════════════════════════════════════════════
   «رنگ‌آرا» — داوری و ماشینِ حالت. بدونِ React و بدونِ DOM، پس تست‌پذیر.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ قاعدهٔ اصلی: **منطق هیچ‌وقت منتظرِ انیمیشن نمی‌ماند، ولی انیمیشن هم
   نمی‌تواند منطق را جلو ببرد مگر با شناسهٔ همان ضربه.** هر رنگ‌زدن یک
   `stroke.id` تازه می‌گیرد و هر اقدامی که از یک تایمر یا پایانِ حرکتِ
   دستمال می‌آید همان شناسه را با خودش می‌آورد. پایانِ دیررسِ یک ضربهٔ قدیمی
   (مثلاً بعد از رفتن به بیتِ بعد) بی‌صدا نادیده گرفته می‌شود. کلیکِ دوباره
   وسطِ بررسی یا پاک‌کردن هم هیچ اثری ندارد، چون `paint` فقط در
   `color-selected` پذیرفته می‌شود. */

export type Phase =
  | "idle" // هیچ رنگی برداشته نشده
  | "color-selected" // رنگ در دست است؛ آمادهٔ زدن روی واژه
  | "checking" // رنگ روی واژه نشسته و دارد پخش می‌شود
  | "correct"
  | "wrong"
  | "wiping" // دستمال در راه است
  | "explanation" // همهٔ گام‌های بیت پیدا شده؛ منتظرِ «بیت بعدی»
  | "transition-next"
  | "finished";

/* «word-hover» عمداً فاز نیست: هاور هم‌زمان با `color-selected` و `idle` رخ
   می‌دهد و فقط نگاهِ شخصیت و پیش‌نمایشِ رنگ را عوض می‌کند، پس حالتِ
   جداگانه‌ای در کامپوننت است و ماشینِ بازی را قفل یا آزاد نمی‌کند. */

export type Verdict =
  /** `partial`: یک واژه از جناس/سجع؛ گام هنوز باز است. */
  | { kind: "correct"; step: number; tokens: TokenId[]; partial?: true }
  | { kind: "wrong-color"; tokens: TokenId[] }
  /** جفتِ نیمه‌کاره‌ای با همین رنگ هست و این واژه جفتش نیست. */
  | { kind: "wrong-pair"; step: number; tokens: TokenId[] }
  | { kind: "wrong"; tokens: TokenId[] };

/** `token` همان واژه‌ای است که زده شد — برای ثبت در پنل (`record.ts`). */
export type Stroke = { id: number; concept: ConceptId; token: TokenId; verdict: Verdict };

export type Found = { step: number; tokens: TokenId[]; strokeId: number };

export type State = {
  levelIndex: number;
  phase: Phase;
  concept: ConceptId | null;
  found: Found[];
  stroke: Stroke | null;
  strokeSeq: number;
  levelMistakes: number;
  stats: { found: number; wipes: number; clean: number };
};

export type Action =
  | { type: "pick"; concept: ConceptId | null }
  | { type: "paint"; token: TokenId }
  | { type: "resolve"; id: number }
  | { type: "wipe"; id: number }
  | { type: "wiped"; id: number }
  | { type: "settled"; id: number }
  | { type: "next" }
  | { type: "enter" }
  | { type: "restart" };

export function selections(step: Step): TokenId[][] {
  return [step.answer, ...(step.accepted ?? [])];
}

/** واژه‌هایی که تا حالا برای یک گام رنگ شده‌اند. */
export function stepTokens(found: Found[], step: number): TokenId[] {
  return found.filter((f) => f.step === step).flatMap((f) => f.tokens);
}

/** گام تمام است وقتی همهٔ واژه‌های یکی از جواب‌هایش رنگ شده باشد. */
export function isStepDone(level: Level, found: Found[], step: number): boolean {
  const have = stepTokens(found, step);
  return have.length > 0 && selections(level.steps[step]).some((sel) => sel.every((t) => have.includes(t)));
}

/** اولین گامی که هنوز پیدا نشده — همان چیزی که شخصیت می‌خواهد. */
export function currentStep(level: Level, found: Found[]): number {
  return level.steps.findIndex((_, i) => !isStepDone(level, found, i));
}

/**
 * آیا این واژه هنوز رنگ می‌پذیرد؟ واژهٔ رنگ‌شده فقط وقتی دوباره پذیرفته
 * می‌شود که جوابِ گامِ بازِ دیگری هم باشد — مثلاً کنایه‌ای که واژه‌ای مجاز در
 * دلش دارد. هر آرایه لایهٔ خودش را روی واژه می‌گذارد.
 */
export function canPaint(level: Level, found: Found[], token: TokenId): boolean {
  if (!found.some((f) => f.tokens.includes(token))) return true;
  return level.steps.some(
    (s, i) =>
      !isStepDone(level, found, i) &&
      !stepTokens(found, i).includes(token) &&
      selections(s).some((sel) => sel.includes(token)),
  );
}

/** گامِ جناس/سجعی با این رنگ که یک واژه‌اش رنگ شده و بقیه نه؛ وگرنه ‎-1. */
export function openPair(level: Level, found: Found[], concept: ConceptId): number {
  return level.steps.findIndex(
    (s, i) => s.concept === concept && CONCEPTS[concept].pair && found.some((f) => f.step === i) && !isStepDone(level, found, i),
  );
}

export function paintedTokens(found: Found[]): Set<TokenId> {
  return new Set(found.flatMap((f) => f.tokens));
}

/**
 * یک ضربه را داوری می‌کند.
 *
 * ⚠️ جوابِ درست برای گامی که هنوز نرسیده هم پذیرفته می‌شود: کسی که آرایهٔ
 * بعدی را زودتر دیده نباید با دستمال جریمه شود. گامِ جاری اولویت دارد، چون
 * یک واژه ممکن است در دو گام جواب باشد.
 */
export function judge(level: Level, found: Found[], concept: ConceptId, token: TokenId): Verdict {
  const open = level.steps
    .map((step, i) => ({ step, i }))
    .filter(({ i }) => !isStepDone(level, found, i));
  const pending = openPair(level, found, concept);

  for (const { step, i } of open) {
    if (step.concept !== concept) continue;
    if (!CONCEPTS[concept].pair) {
      const hit = selections(step).find((sel) => sel.includes(token));
      if (hit) return { kind: "correct", step: i, tokens: hit };
      continue;
    }
    /* جناس و سجع: هر واژه جدا رنگ می‌شود. تا جفتی با همین رنگ نیمه‌کاره
       است، فقط لنگهٔ همان پذیرفته می‌شود — تشخیصِ «کدام با کدام» خودِ
       آرایه است. واژهٔ تازه باید با واژه‌های رنگ‌شدهٔ همان گام در یک جواب
       باشد. */
    if (pending !== -1 && i !== pending) continue;
    const have = stepTokens(found, i);
    if (have.includes(token)) continue;
    const sel = selections(step).find((s) => s.includes(token) && have.every((t) => s.includes(t)));
    if (!sel) continue;
    const done = sel.every((t) => t === token || have.includes(t));
    return done ? { kind: "correct", step: i, tokens: [token] } : { kind: "correct", step: i, tokens: [token], partial: true };
  }
  if (pending !== -1) return { kind: "wrong-pair", step: pending, tokens: [token] };
  const isAnswerOfSomething = open.some(
    ({ step, i }) => !stepTokens(found, i).includes(token) && selections(step).some((sel) => sel.includes(token)),
  );
  return { kind: isAnswerOfSomething ? "wrong-color" : "wrong", tokens: [token] };
}

export const initialState: State = {
  levelIndex: 0,
  phase: "idle",
  concept: null,
  found: [],
  stroke: null,
  strokeSeq: 0,
  levelMistakes: 0,
  stats: { found: 0, wipes: 0, clean: 0 },
};

/** فازهایی که در آن‌ها برداشتنِ رنگ مجاز است. */
const PICKABLE: Phase[] = ["idle", "color-selected", "checking", "correct", "wrong", "wiping"];

export function reduce(levels: Level[], state: State, action: Action): State {
  const level = levels[state.levelIndex];
  const live = (id: number) => state.stroke?.id === id;

  switch (action.type) {
    case "pick": {
      if (!PICKABLE.includes(state.phase)) return state;
      /* وسطِ یک ضربه فقط رنگِ در دست عوض می‌شود؛ فاز دست نمی‌خورد تا
         چرخهٔ بررسی/پاک کردن کامل شود. */
      const resting = state.phase === "idle" || state.phase === "color-selected";
      return {
        ...state,
        concept: action.concept,
        phase: resting ? (action.concept ? "color-selected" : "idle") : state.phase,
      };
    }

    case "paint": {
      if (state.phase !== "color-selected" || !state.concept || !level) return state;
      if (!level.tokens.some((t) => t.id === action.token)) return state;
      if (!canPaint(level, state.found, action.token)) return state;
      const id = state.strokeSeq + 1;
      return {
        ...state,
        phase: "checking",
        strokeSeq: id,
        stroke: { id, concept: state.concept, token: action.token, verdict: judge(level, state.found, state.concept, action.token) },
      };
    }

    case "resolve": {
      if (state.phase !== "checking" || !live(action.id) || !state.stroke) return state;
      const { verdict, id } = state.stroke;
      if (verdict.kind === "correct") {
        return {
          ...state,
          phase: "correct",
          found: [...state.found, { step: verdict.step, tokens: verdict.tokens, strokeId: id }],
          stats: { ...state.stats, found: state.stats.found + (verdict.partial ? 0 : 1) },
        };
      }
      return {
        ...state,
        phase: "wrong",
        levelMistakes: state.levelMistakes + 1,
        stats: { ...state.stats, wipes: state.stats.wipes + 1 },
      };
    }

    case "wipe":
      if (state.phase !== "wrong" || !live(action.id)) return state;
      return { ...state, phase: "wiping" };

    case "wiped":
      if (state.phase !== "wiping" || !live(action.id)) return state;
      return { ...state, phase: state.concept ? "color-selected" : "idle", stroke: null };

    case "settled": {
      if (state.phase !== "correct" || !live(action.id) || !level) return state;
      const complete = currentStep(level, state.found) === -1;
      if (complete) {
        return {
          ...state,
          phase: "explanation",
          stroke: null,
          stats: { ...state.stats, clean: state.stats.clean + (state.levelMistakes === 0 ? 1 : 0) },
        };
      }
      /* گامِ بعد به احتمالِ زیاد رنگِ دیگری می‌خواهد؛ رنگِ قبلی در دست
         نمی‌ماند تا بازیکن بی‌نگاه روی واژهٔ بعدی نزند. ولی اگر وسطِ جشن رنگِ
         تازه‌ای برداشته، همان در دستش می‌ماند. نیمهٔ یک جفت هم رنگ را در دست
         نگه می‌دارد، چون لنگه‌اش همان رنگ را می‌خواهد. */
      const partial = state.stroke?.verdict.kind === "correct" && state.stroke.verdict.partial;
      const kept = partial || state.concept !== state.stroke?.concept ? state.concept : null;
      return { ...state, phase: kept ? "color-selected" : "idle", concept: kept, stroke: null };
    }

    case "next":
      if (state.phase !== "explanation") return state;
      return { ...state, phase: "transition-next" };

    case "enter": {
      if (state.phase !== "transition-next") return state;
      const nextIndex = state.levelIndex + 1;
      if (nextIndex >= levels.length) return { ...state, phase: "finished" };
      return {
        ...state,
        levelIndex: nextIndex,
        phase: "idle",
        concept: null,
        found: [],
        stroke: null,
        levelMistakes: 0,
      };
    }

    case "restart":
      return { ...initialState, strokeSeq: state.strokeSeq };
  }
}

/** فازهایی که در آن‌ها واژه‌ها و پالت نباید ورودی بپذیرند. */
export function isLocked(phase: Phase): boolean {
  return phase === "checking" || phase === "correct" || phase === "wrong" || phase === "wiping" || phase === "transition-next";
}

/**
 * یک جمله از مجموعه، بدونِ تکرارِ چند جملهٔ اخیر.
 *
 * `recent` از بیرون نگه داشته می‌شود (یک آرایه برای هر مجموعه) و همین تابع
 * به‌روزش می‌کند. پنجره یکی کمتر از اندازهٔ مجموعه است، پس هیچ جمله‌ای
 * دو بار پشتِ سرِ هم نمی‌آید و مجموعهٔ کوچک هم هرگز خالی نمی‌ماند.
 */
export function pickLine(pool: readonly string[], recent: string[], rand: () => number = Math.random): string {
  const windowSize = Math.min(5, pool.length - 1);
  /* ⚠️ `slice(-0)` کلِ آرایه را برمی‌گرداند، نه هیچ‌چیز. */
  const blocked = windowSize > 0 ? recent.slice(-windowSize) : [];
  const fresh = pool.filter((line) => !blocked.includes(line));
  const choices = fresh.length ? fresh : pool;
  const line = choices[Math.floor(rand() * choices.length)];
  recent.push(line);
  if (recent.length > 8) recent.shift();
  return line;
}
