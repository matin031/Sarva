import type { PlacementInputMethod, PreparedQuestion } from "./types";

/** تنها منبعِ حقیقتِ معناییِ بازی.
 *
 *  دو تصمیمِ طراحی که بقیهٔ چیزها را ساده می‌کند:
 *
 *  • اعتبارسنجیِ گذاشتن *داخلِ* همین reducer است، نه در فراخوان. در نتیجه دو
 *    رویدادِ ورودی در یک تیک (دابل‌تپ، drag و بعد click، لمس و بعد tap) هرگز
 *    نمی‌توانند دو بار commit کنند: اکشنِ دوم روی نتیجهٔ اکشنِ اول اجرا می‌شود
 *    و آنجا سوکت دیگر پر است.
 *
 *  • `placementsByTokenId` تنها جای نگهداریِ اتصال‌هاست. «کدام قطعه مصرف شده»
 *    از همین مشتق می‌شود، پس هیچ‌وقت دو حالتِ ناهمگام نداریم.
 */

export type GrammarCircuitScreen = "intro" | "playing" | "results";
export type QuestionStatus = "playing" | "completing" | "complete";

export interface PlacementOutcome {
  kind: "none" | "correct" | "wrong";
  tokenId: string | null;
  pieceId: string | null;
  inputMethod: PlacementInputMethod | null;
  /** آخرین سوکتِ لازم بسته شد؟ */
  final: boolean;
  /** با هر نتیجه یکی بالا می‌رود؛ افکتِ صدا/بازخورد به همین گوش می‌دهد. */
  nonce: number;
}

export interface QuestionResult {
  questionId: string;
  correctPlacements: number;
  wrongAttempts: number;
  firstTryPlacements: number;
  requiredSlots: number;
  activeTimeMs: number;
}

export interface GrammarCircuitState {
  screen: GrammarCircuitScreen;
  /** با هر تعویضِ سؤال / شروعِ دوباره یکی بالا می‌رود. هر کالبکِ ناهمگامی که
   *  epoch قدیمی دارد، حقِ دست‌زدن به حالتِ جدید را ندارد. */
  epoch: number;
  questions: readonly PreparedQuestion[];
  questionIndex: number;
  status: QuestionStatus;

  placementsByTokenId: Readonly<Record<string, string>>;
  selectedPieceId: string | null;

  correctPlacements: number;
  wrongAttempts: number;
  firstTryPlacements: number;
  wrongByTokenId: Readonly<Record<string, number>>;

  outcome: PlacementOutcome;
  results: readonly QuestionResult[];
}

export type GrammarCircuitAction =
  | { type: "START"; questions: readonly PreparedQuestion[] }
  | {
      type: "ATTEMPT";
      pieceId: string;
      tokenId: string;
      inputMethod: PlacementInputMethod;
    }
  | { type: "SELECT_PIECE"; pieceId: string }
  | { type: "TOGGLE_PIECE"; pieceId: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "COMPLETE_QUESTION" }
  | { type: "NEXT_QUESTION"; activeTimeMs: number }
  | { type: "RESTART_QUESTION" }
  | { type: "RESTART_SESSION"; questions: readonly PreparedQuestion[] }
  | { type: "EXIT_TO_INTRO" };

const EMPTY_OUTCOME: PlacementOutcome = {
  kind: "none",
  tokenId: null,
  pieceId: null,
  inputMethod: null,
  final: false,
  nonce: 0,
};

export const initialGrammarCircuitState: GrammarCircuitState = {
  screen: "intro",
  epoch: 0,
  questions: [],
  questionIndex: 0,
  status: "playing",
  placementsByTokenId: {},
  selectedPieceId: null,
  correctPlacements: 0,
  wrongAttempts: 0,
  firstTryPlacements: 0,
  wrongByTokenId: {},
  outcome: EMPTY_OUTCOME,
  results: [],
};

/** حالتِ تازه برای یک سؤال؛ آمارِ جلسه (`results`) دست نمی‌خورد. */
function freshQuestion(
  state: GrammarCircuitState,
  questionIndex: number,
): GrammarCircuitState {
  return {
    ...state,
    epoch: state.epoch + 1,
    questionIndex,
    status: "playing",
    placementsByTokenId: {},
    selectedPieceId: null,
    correctPlacements: 0,
    wrongAttempts: 0,
    firstTryPlacements: 0,
    wrongByTokenId: {},
    outcome: { ...EMPTY_OUTCOME, nonce: state.outcome.nonce },
  };
}

export function usedPieceIds(
  placements: Readonly<Record<string, string>>,
): Set<string> {
  return new Set(Object.values(placements));
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
        questions: action.questions,
        results: [],
      };

    case "RESTART_SESSION":
      return {
        ...freshQuestion(state, 0),
        screen: "playing",
        questions: action.questions,
        results: [],
      };

    case "RESTART_QUESTION":
      return freshQuestion(state, state.questionIndex);

    case "EXIT_TO_INTRO":
      return { ...freshQuestion(state, 0), screen: "intro", questions: [] };

    case "SELECT_PIECE": {
      if (state.screen !== "playing" || state.status !== "playing") return state;
      if (usedPieceIds(state.placementsByTokenId).has(action.pieceId)) return state;
      if (state.selectedPieceId === action.pieceId) return state;
      return { ...state, selectedPieceId: action.pieceId };
    }

    case "TOGGLE_PIECE": {
      if (state.screen !== "playing" || state.status !== "playing") return state;
      if (usedPieceIds(state.placementsByTokenId).has(action.pieceId)) return state;
      return {
        ...state,
        selectedPieceId:
          state.selectedPieceId === action.pieceId ? null : action.pieceId,
      };
    }

    case "CLEAR_SELECTION":
      return state.selectedPieceId === null
        ? state
        : { ...state, selectedPieceId: null };

    case "ATTEMPT": {
      if (state.screen !== "playing" || state.status !== "playing") return state;
      const prepared = state.questions[state.questionIndex];
      if (!prepared) return state;

      const slot = prepared.slotByTokenId.get(action.tokenId);
      const piece = prepared.pieceById.get(action.pieceId);

      // هیچ‌کدام از این‌ها «پاسخِ غلط» نیست — فقط تعاملِ بی‌اثر:
      //   سوکت وجود ندارد / سوکت قبلاً بسته شده / قطعه مصرف شده.
      if (!slot || !piece) return state;
      if (state.placementsByTokenId[action.tokenId]) return state;
      if (usedPieceIds(state.placementsByTokenId).has(action.pieceId)) return state;

      const nonce = state.outcome.nonce + 1;

      if (!slot.acceptedRoleKeys.includes(piece.roleKey)) {
        return {
          ...state,
          selectedPieceId: null,
          wrongAttempts: state.wrongAttempts + 1,
          wrongByTokenId: {
            ...state.wrongByTokenId,
            [action.tokenId]: (state.wrongByTokenId[action.tokenId] ?? 0) + 1,
          },
          outcome: {
            kind: "wrong",
            tokenId: action.tokenId,
            pieceId: action.pieceId,
            inputMethod: action.inputMethod,
            final: false,
            nonce,
          },
        };
      }

      const placements = {
        ...state.placementsByTokenId,
        [action.tokenId]: action.pieceId,
      };
      // «کامل‌شدن» فقط یعنی همهٔ سوکت‌های لازم اتصالِ معتبر دارند — نه تعدادِ
      // کشیدن‌ها، نه خالی‌شدنِ سینی، نه پایانِ یک انیمیشن.
      const complete =
        Object.keys(placements).length === prepared.requiredSlotCount;
      const firstTry = (state.wrongByTokenId[action.tokenId] ?? 0) === 0;

      return {
        ...state,
        placementsByTokenId: placements,
        selectedPieceId: null,
        status: complete ? "completing" : "playing",
        correctPlacements: state.correctPlacements + 1,
        firstTryPlacements: state.firstTryPlacements + (firstTry ? 1 : 0),
        outcome: {
          kind: "correct",
          tokenId: action.tokenId,
          pieceId: action.pieceId,
          inputMethod: action.inputMethod,
          final: complete,
          nonce,
        },
      };
    }

    case "COMPLETE_QUESTION":
      if (state.status !== "completing") return state;
      return { ...state, status: "complete" };

    case "NEXT_QUESTION": {
      const prepared = state.questions[state.questionIndex];
      const result: QuestionResult = {
        questionId: prepared?.question.id ?? "",
        correctPlacements: state.correctPlacements,
        wrongAttempts: state.wrongAttempts,
        firstTryPlacements: state.firstTryPlacements,
        requiredSlots: prepared?.requiredSlotCount ?? 0,
        activeTimeMs: action.activeTimeMs,
      };
      const results = [...state.results, result];
      const nextIndex = state.questionIndex + 1;
      if (nextIndex >= state.questions.length) {
        return {
          ...freshQuestion(state, state.questionIndex),
          screen: "results",
          results,
        };
      }
      return { ...freshQuestion(state, nextIndex), results };
    }

    default:
      return state;
  }
}
