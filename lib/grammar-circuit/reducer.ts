import type {
  GrammarCircuitSessionConfig,
  PlacementInputMethod,
  PreparedQuestion,
} from "./types";

/** تنها منبعِ حقیقتِ معناییِ بازی.
 *
 *  ── تغییرِ بزرگِ این نسخه ──────────────────────────────────────────────
 *
 *  پیش‌تر، همان لحظه که قطعه در سوکت می‌نشست، درستی‌اش سنجیده می‌شد: پاسخِ
 *  غلط اصلاً ثبت نمی‌شد و بازی با یک لرزش پسش می‌زد. یعنی بازی جواب را لو
 *  می‌داد — دانش‌آموز بدونِ اینکه فکر کند می‌فهمید کدام گزینه درست است، چون
 *  فقط درست‌ها می‌چسبیدند.
 *
 *  حالا چیدن و سنجیدن از هم جدا شده‌اند:
 *
 *    • هر قطعهٔ استفاده‌نشده در هر سوکتِ *خالی* می‌نشیند. درستی پرسیده نمی‌شود.
 *    • چیدمان تا پیش از «بررسی اتصال» کاملاً قابلِ ویرایش است.
 *    • درستی فقط با فشردنِ صریحِ دکمه، و یکجا برای کلِ تخته، سنجیده می‌شود.
 *
 *  `placementsByTokenId` چیدمان است و `validationByTokenId` نتیجهٔ تشخیص —
 *  دو چیزِ جدا. هیچ‌وقت چیدمان را برای نمایشِ نتیجه دستکاری نمی‌کنیم.
 */

export type GrammarCircuitScreen = "setup" | "playing" | "results";

/** فازهای معناییِ یک سؤال. به‌جای چند boolean که با هم رقابت کنند. */
export type QuestionPhase =
  | "arranging"
  | "readyToValidate"
  | "validating"
  | "failureSequence"
  | "failureReview"
  | "successCurrent"
  | "successReward"
  | "questionComplete";

export type SlotValidation = "pending" | "checking" | "correct" | "wrong";

export interface PlacementOutcome {
  /** «قطعه نشست» یا «قطعه برداشته شد» — هیچ‌کدام دربارهٔ درستی چیزی نمی‌گویند. */
  kind: "none" | "seated" | "lifted" | "blocked";
  tokenId: string | null;
  pieceId: string | null;
  inputMethod: PlacementInputMethod | null;
  nonce: number;
}

export interface QuestionResult {
  questionId: string;
  grade?: string;
  lesson?: number;
  requiredSlots: number;
  /** چند بار «بررسی اتصال» زده شد تا مدار کامل شود. */
  attempts: number;
  /** در اولین بررسی چند خانه درست بود. */
  firstAttemptCorrect: number;
  solvedOnFirstAttempt: boolean;
  activeTimeMs: number;
}

export interface GrammarCircuitState {
  screen: GrammarCircuitScreen;
  /** با هر تعویضِ سؤال / شروعِ دوباره یکی بالا می‌رود. */
  epoch: number;
  /** با هر فشردنِ «بررسی اتصال» یکی بالا می‌رود؛ تایمرهای یک اجرای کهنه
   *  هرگز نباید نتیجهٔ اجرای تازه را دست بزنند. */
  validationRunId: number;
  session: GrammarCircuitSessionConfig | null;
  questions: readonly PreparedQuestion[];
  questionIndex: number;
  phase: QuestionPhase;

  placementsByTokenId: Readonly<Record<string, string>>;
  validationByTokenId: Readonly<Record<string, SlotValidation>>;
  /** خانه‌هایی که در یک بررسیِ قبلی درست بوده‌اند و دیگر ویرایش نمی‌شوند. */
  lockedTokenIds: readonly string[];
  selectedPieceId: string | null;

  attempts: number;
  firstAttemptCorrect: number | null;
  outcome: PlacementOutcome;
  results: readonly QuestionResult[];
}

export type GrammarCircuitAction =
  | {
      type: "START";
      session: GrammarCircuitSessionConfig;
      questions: readonly PreparedQuestion[];
    }
  | { type: "PLACE"; pieceId: string; tokenId: string; inputMethod: PlacementInputMethod }
  | { type: "LIFT"; tokenId: string; inputMethod: PlacementInputMethod }
  | { type: "SELECT_PIECE"; pieceId: string }
  | { type: "TOGGLE_PIECE"; pieceId: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "BEGIN_VALIDATION" }
  | { type: "SET_CHECKING"; tokenId: string; runId: number }
  | { type: "SET_RESULT"; tokenId: string; result: "correct" | "wrong"; runId: number }
  | { type: "VALIDATION_FINISHED"; runId: number; allCorrect: boolean }
  | { type: "FAILURE_SEQUENCE_DONE"; runId: number }
  | { type: "CURRENT_FINISHED"; runId: number }
  | { type: "REWARD_DONE"; runId: number }
  | { type: "ENTER_CORRECTION" }
  | { type: "CLEAR_BOARD" }
  | { type: "NEXT_QUESTION"; activeTimeMs: number }
  | { type: "EXIT_TO_SETUP" };

const EMPTY_OUTCOME: PlacementOutcome = {
  kind: "none",
  tokenId: null,
  pieceId: null,
  inputMethod: null,
  nonce: 0,
};

export const initialGrammarCircuitState: GrammarCircuitState = {
  screen: "setup",
  epoch: 0,
  validationRunId: 0,
  session: null,
  questions: [],
  questionIndex: 0,
  phase: "arranging",
  placementsByTokenId: {},
  validationByTokenId: {},
  lockedTokenIds: [],
  selectedPieceId: null,
  attempts: 0,
  firstAttemptCorrect: null,
  outcome: EMPTY_OUTCOME,
  results: [],
};

export function usedPieceIds(
  placements: Readonly<Record<string, string>>,
): Set<string> {
  return new Set(Object.values(placements));
}

/** آیا همهٔ سوکت‌های لازم پر شده‌اند؟
 *
 *  مبنا «پر بودنِ همهٔ خانه‌ها» است، نه «خالی شدنِ سینی»: ممکن است قطعه‌های
 *  اضافه (طعمه) در سینی بمانند و بازی باز هم آمادهٔ بررسی باشد. */
function allRequiredFilled(
  prepared: PreparedQuestion,
  placements: Readonly<Record<string, string>>,
): boolean {
  return prepared.layoutSlots.every((slot) => Boolean(placements[slot.tokenId]));
}

function phaseAfterArrangement(
  prepared: PreparedQuestion,
  placements: Readonly<Record<string, string>>,
): QuestionPhase {
  return allRequiredFilled(prepared, placements) ? "readyToValidate" : "arranging";
}

/** آیا در این فاز می‌شود چیدمان را دست زد؟ */
export function isArrangeable(phase: QuestionPhase): boolean {
  return phase === "arranging" || phase === "readyToValidate" || phase === "failureReview";
}

function freshQuestion(
  state: GrammarCircuitState,
  questionIndex: number,
): GrammarCircuitState {
  return {
    ...state,
    epoch: state.epoch + 1,
    validationRunId: state.validationRunId + 1,
    questionIndex,
    phase: "arranging",
    placementsByTokenId: {},
    validationByTokenId: {},
    lockedTokenIds: [],
    selectedPieceId: null,
    attempts: 0,
    firstAttemptCorrect: null,
    outcome: { ...EMPTY_OUTCOME, nonce: state.outcome.nonce },
  };
}

export function grammarCircuitReducer(
  state: GrammarCircuitState,
  action: GrammarCircuitAction,
): GrammarCircuitState {
  switch (action.type) {
    case "START":
      return {
        ...freshQuestion(state, 0),
        screen: "playing",
        session: action.session,
        questions: action.questions,
        results: [],
      };

    case "EXIT_TO_SETUP":
      return {
        ...freshQuestion(state, 0),
        screen: "setup",
        session: null,
        questions: [],
        results: [],
      };

    case "SELECT_PIECE":
    case "TOGGLE_PIECE": {
      if (state.screen !== "playing" || !isArrangeable(state.phase)) return state;
      if (usedPieceIds(state.placementsByTokenId).has(action.pieceId)) return state;
      const next =
        action.type === "TOGGLE_PIECE" && state.selectedPieceId === action.pieceId
          ? null
          : action.pieceId;
      return next === state.selectedPieceId ? state : { ...state, selectedPieceId: next };
    }

    case "CLEAR_SELECTION":
      return state.selectedPieceId === null ? state : { ...state, selectedPieceId: null };

    /* ── نشاندنِ قطعه ──────────────────────────────────────────────────────
       هیچ‌جای این شاخه `acceptedRoleKeys` خوانده نمی‌شود. تنها قیدها ساختاری‌اند:
       سوکت باید وجود داشته باشد، خالی باشد، و قطعه جای دیگری مصرف نشده باشد. */
    case "PLACE": {
      if (state.screen !== "playing" || !isArrangeable(state.phase)) return state;
      const prepared = state.questions[state.questionIndex];
      if (!prepared) return state;

      const slot = prepared.slotByTokenId.get(action.tokenId);
      const piece = prepared.pieceById.get(action.pieceId);
      if (!slot || !piece) return state;
      // خانه‌ای که در بررسیِ قبلی درست بوده قفل است.
      if (state.lockedTokenIds.includes(action.tokenId)) return state;
      if (usedPieceIds(state.placementsByTokenId).has(action.pieceId)) return state;

      const nonce = state.outcome.nonce + 1;

      // سوکتِ پر: هیچ commit‌ای. کاربر اول قطعهٔ قبلی را برمی‌دارد.
      if (state.placementsByTokenId[action.tokenId]) {
        return {
          ...state,
          outcome: {
            kind: "blocked",
            tokenId: action.tokenId,
            pieceId: action.pieceId,
            inputMethod: action.inputMethod,
            nonce,
          },
        };
      }

      const placements = {
        ...state.placementsByTokenId,
        [action.tokenId]: action.pieceId,
      };
      return {
        ...state,
        placementsByTokenId: placements,
        // نتیجهٔ تشخیصِ این خانه با هر ویرایش خنثی می‌شود.
        validationByTokenId: { ...state.validationByTokenId, [action.tokenId]: "pending" },
        selectedPieceId: null,
        phase: phaseAfterArrangement(prepared, placements),
        outcome: {
          kind: "seated",
          tokenId: action.tokenId,
          pieceId: action.pieceId,
          inputMethod: action.inputMethod,
          nonce,
        },
      };
    }

    /* ── برداشتنِ قطعه از سوکت و بازگرداندنش به سینی ─────────────────────── */
    case "LIFT": {
      if (state.screen !== "playing" || !isArrangeable(state.phase)) return state;
      const prepared = state.questions[state.questionIndex];
      if (!prepared) return state;
      const pieceId = state.placementsByTokenId[action.tokenId];
      if (!pieceId) return state;
      if (state.lockedTokenIds.includes(action.tokenId)) return state;

      const placements = { ...state.placementsByTokenId };
      delete placements[action.tokenId];
      const validation = { ...state.validationByTokenId };
      delete validation[action.tokenId];

      return {
        ...state,
        placementsByTokenId: placements,
        validationByTokenId: validation,
        selectedPieceId: null,
        phase: phaseAfterArrangement(prepared, placements),
        outcome: {
          kind: "lifted",
          tokenId: action.tokenId,
          pieceId,
          inputMethod: action.inputMethod,
          nonce: state.outcome.nonce + 1,
        },
      };
    }

    /* ── شروعِ بررسی ──────────────────────────────────────────────────────
       چیدمان همین‌جا برای این اجرا تثبیت می‌شود و شناسهٔ اجرا بالا می‌رود. */
    case "BEGIN_VALIDATION": {
      if (state.phase !== "readyToValidate") return state;
      const prepared = state.questions[state.questionIndex];
      if (!prepared) return state;
      const pending: Record<string, SlotValidation> = {};
      for (const tokenId of prepared.validationOrder) {
        pending[tokenId] = state.lockedTokenIds.includes(tokenId) ? "correct" : "pending";
      }
      return {
        ...state,
        phase: "validating",
        validationRunId: state.validationRunId + 1,
        validationByTokenId: pending,
        selectedPieceId: null,
        attempts: state.attempts + 1,
      };
    }

    case "SET_CHECKING": {
      if (state.phase !== "validating" || action.runId !== state.validationRunId) return state;
      return {
        ...state,
        validationByTokenId: { ...state.validationByTokenId, [action.tokenId]: "checking" },
      };
    }

    case "SET_RESULT": {
      if (state.phase !== "validating" || action.runId !== state.validationRunId) return state;
      return {
        ...state,
        validationByTokenId: {
          ...state.validationByTokenId,
          [action.tokenId]: action.result,
        },
      };
    }

    case "VALIDATION_FINISHED": {
      if (state.phase !== "validating" || action.runId !== state.validationRunId) return state;
      const correctCount = Object.values(state.validationByTokenId).filter(
        (v) => v === "correct",
      ).length;
      return {
        ...state,
        phase: action.allCorrect ? "successCurrent" : "failureSequence",
        firstAttemptCorrect:
          state.attempts === 1 ? correctCount : state.firstAttemptCorrect,
      };
    }

    case "FAILURE_SEQUENCE_DONE":
      if (state.phase !== "failureSequence" || action.runId !== state.validationRunId) {
        return state;
      }
      return { ...state, phase: "failureReview" };

    case "CURRENT_FINISHED":
      if (state.phase !== "successCurrent" || action.runId !== state.validationRunId) {
        return state;
      }
      return { ...state, phase: "successReward" };

    case "REWARD_DONE":
      if (state.phase !== "successReward" || action.runId !== state.validationRunId) {
        return state;
      }
      return { ...state, phase: "questionComplete" };

    /* ── حالتِ اصلاح ──────────────────────────────────────────────────────
       خانه‌های درست قفل و سبز می‌مانند؛ خانه‌های غلط آزاد می‌شوند و قطعه‌شان
       به سینی برمی‌گردد. جوابِ درست هیچ‌جا فاش نمی‌شود. */
    case "ENTER_CORRECTION": {
      if (state.phase !== "failureReview") return state;
      const prepared = state.questions[state.questionIndex];
      if (!prepared) return state;

      const placements = { ...state.placementsByTokenId };
      const validation: Record<string, SlotValidation> = {};
      const locked: string[] = [];
      for (const tokenId of prepared.validationOrder) {
        if (state.validationByTokenId[tokenId] === "correct") {
          validation[tokenId] = "correct";
          locked.push(tokenId);
        } else {
          delete placements[tokenId];
        }
      }
      return {
        ...state,
        placementsByTokenId: placements,
        validationByTokenId: validation,
        lockedTokenIds: locked,
        selectedPieceId: null,
        phase: phaseAfterArrangement(prepared, placements),
      };
    }

    /* «بازچینی» — همه‌چیزِ این سؤال از نو، حتی خانه‌های درست. */
    case "CLEAR_BOARD": {
      if (state.screen !== "playing") return state;
      if (state.phase === "validating" || state.phase === "successCurrent") return state;
      const prepared = state.questions[state.questionIndex];
      if (!prepared) return state;
      return {
        ...state,
        placementsByTokenId: {},
        validationByTokenId: {},
        lockedTokenIds: [],
        selectedPieceId: null,
        phase: "arranging",
      };
    }

    case "NEXT_QUESTION": {
      const prepared = state.questions[state.questionIndex];
      const result: QuestionResult = {
        questionId: prepared?.question.id ?? "",
        grade: prepared?.question.grade,
        lesson: prepared?.question.lesson,
        requiredSlots: prepared?.requiredSlotCount ?? 0,
        attempts: state.attempts,
        firstAttemptCorrect: state.firstAttemptCorrect ?? 0,
        solvedOnFirstAttempt: state.attempts === 1,
        activeTimeMs: action.activeTimeMs,
      };
      const results = [...state.results, result];
      const nextIndex = state.questionIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...freshQuestion(state, state.questionIndex), screen: "results", results };
      }
      return { ...freshQuestion(state, nextIndex), results };
    }

    default:
      return state;
  }
}
