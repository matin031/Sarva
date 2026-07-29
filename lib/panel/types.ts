/** Shapes and labels shared by the panel's server queries and its client
 *  components.
 *
 *  Kept separate from `queries.ts` on purpose: that module is `server-only`,
 *  and a client component importing a *value* from it (a label map, say) would
 *  pull the whole server module — and the service client with it — into the
 *  browser bundle. Types alone would be erased, but values are not, so the
 *  split has to be a real file rather than a convention. */

// ---------------------------------------------------------------- عروض ----

/** The same six shapes the quiz page renders (`Question["type"]`). The panel
 *  has to know all of them, not just the three that happen to be seeded — a
 *  review that silently drops a question shape is worse than no review. */
export type AruzQuestionType =
  | "audio-to-poem"
  | "audio-to-pattern"
  | "audio-to-weight"
  | "poem-to-audio"
  | "pattern-to-audio"
  | "weight-to-audio";

export const ARUZ_TYPE_LABEL: Record<AruzQuestionType, string> = {
  "audio-to-poem": "صوت به بیت",
  "audio-to-pattern": "صوت به الگوی هجایی",
  "audio-to-weight": "صوت به وزن",
  "poem-to-audio": "بیت به صوت",
  "pattern-to-audio": "الگوی هجایی به صوت",
  "weight-to-audio": "وزن به صوت",
};

export type AruzOption = {
  id: string;
  label: string | null;
  poem: string[] | null;
  audioUrl: string | null;
  isCorrect: boolean;
};

export type AruzAnswer = {
  id: string;
  isCorrect: boolean;
  /** which option the student picked; null if nothing was recorded */
  selectedOptionId: string | null;
  questionId: string | null;
  type: AruzQuestionType | null;
  /** the بیت shown as the prompt, when the prompt is text */
  poem: string[] | null;
  /** the clip played as the prompt, when the prompt is audio */
  audioUrl: string | null;
  options: AruzOption[];
};

/** Question types whose OPTIONS are audio clips — the prompt is then the بیت,
 *  and reviewing means listening to the options again. */
export const AUDIO_OPTION_TYPES: readonly string[] = [
  "poem-to-audio",
  "pattern-to-audio",
  "weight-to-audio",
];

export type AruzAttempt = {
  id: string;
  total: number;
  correct: number;
  createdAt: string;
  answers: AruzAnswer[];
};

// ------------------------------------------------------------ واژه‌یاب ----

export type VocabAnswer = {
  id: string;
  grade: string;
  lesson: number | null;
  word: string;
  meaning: string;
  image: string;
  isCorrect: boolean;
  answeredAt: string;
};

// -------------------------------------------------------------- جاسوس ----

export type JasoosAnswer = {
  id: string;
  levelId: number;
  category: string;
  chosenRole: string;
  correctRole: string;
  isCorrect: boolean;
  answeredAt: string;
};

// ------------------------------------------------------- امتحان نهایی ----

export type ExamAttempt = {
  /** `exams.exam_session` — lets the panel load the paper this attempt was of. */
  examKey?: string | null;
  /** What the student typed/chose, keyed "questionNumber:partIndex". Null for
   *  attempts written before answers were persisted. */
  answers?: Record<string, unknown> | null;
  id: string;
  examTitle: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  /** per-question awarded/max, keyed by question index */
  results: Record<string, { score?: number; max?: number }>;
};

// --------------------------------------------------------- نشان‌شده‌ها ----

export type BookmarkArea = "aruz" | "vocab" | "exam" | "jasoos";

export const AREA_LABEL: Record<BookmarkArea, string> = {
  aruz: "عروض",
  vocab: "واژه‌یاب",
  exam: "امتحان نهایی",
  jasoos: "جاسوس",
};

export type Bookmark = {
  id: string;
  area: BookmarkArea;
  refId: string;
  title: string;
  subtitle: string | null;
  payload: Record<string, unknown>;
  note: string | null;
  createdAt: string;
};

export type PanelUser = {
  id: string;
  email: string | null;
  fullName: string;
  createdAt: string | null;
};

/** What `/panel/aruz` loads on first paint. It lives here rather than beside
 *  the action that returns it because a `"use server"` module may only export
 *  async functions. */
export type AruzPanelData = {
  attempts: AruzAttempt[];
  hasMore: boolean;
  summary: {
    attempts: number;
    best: number;
    questions: number;
    correct: number;
  };
  activity: { at: string; ok: boolean }[];
  bookmarks: Bookmark[];
};
