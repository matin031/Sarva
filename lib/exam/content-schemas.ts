import { z } from "zod";

/**
 * Phase 1 — question-bank content model.
 *
 * One Zod schema per `question_part_type` value (see the SQL enum in
 * migrations/001_init.sql). `question_parts.content`
 * and `question_parts.correct_answer` are validated against these before
 * insert; the discriminated union lets one JSON column hold 18 different
 * shapes while TypeScript still narrows correctly per `type`.
 *
 * RichPassage is the shared building block for "text with inline slots"
 * (rule 2 in the spec: inputs must sit inside the text flow, not below it
 * as a separate form). A renderer just maps `tokens` in order to spans or
 * inputs — that mapping is agnostic to prose vs. poetry and to RTL vs LTR,
 * so it reflows naturally on narrow screens instead of needing fixed
 * positioning.
 */

const passageTokenSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), value: z.string() }),
  // free-text inline input slot (word-meaning-input, fill-blank-term, ...)
  z.object({ kind: z.literal("blank"), blankId: z.string() }),
  // inline dropdown slot (multi-part-inline-tagging): `value` is the visible
  // underlined word/phrase being tagged, rendered immediately before its
  // dropdown — unlike `blank`, the source word stays on screen.
  z.object({
    kind: z.literal("select"),
    blankId: z.string(),
    value: z.string(),
    options: z.array(z.string()).min(2),
  }),
  // decorative emphasis only, no input (e.g. underlined vocab inside an option)
  z.object({ kind: z.literal("highlight"), value: z.string() }),
]);

export const richPassageSchema = z.object({
  // poetry: one entry per mesra/line, rendered stacked. Omit for prose.
  lines: z.array(z.array(passageTokenSchema)).optional(),
  // prose: single flowing paragraph. Omit for poetry.
  tokens: z.array(passageTokenSchema).optional(),
});
export type RichPassage = z.infer<typeof richPassageSchema>;

// ---------------------------------------------------------------------------
// Per-type content schemas
// ---------------------------------------------------------------------------

const wordMeaningInput = z.object({
  type: z.literal("word-meaning-input"),
  // separate reference text shown above `passage`, e.g. the sentence that
  // actually contains the synonym the student has to find and write into
  // the blank in `passage` — not every question needs this.
  stimulus: richPassageSchema.optional(),
  passage: richPassageSchema, // exactly one `blank` token
});

const mcqInline = z.object({
  type: z.literal("mcq-inline"),
  stimulus: richPassageSchema.optional(),
  questionText: z.string(),
  // options themselves live in question_options, joined by question_part_id
});

const mcqMultiSelect = z.object({
  type: z.literal("mcq-multi-select"),
  stimulus: richPassageSchema.optional(),
  questionText: z.string(),
  minSelect: z.number().int().min(1),
  maxSelect: z.number().int().min(1),
});

const mcqPlusCorrection = z.object({
  type: z.literal("mcq-plus-correction"),
  stimulus: richPassageSchema.optional(),
  questionText: z.string(),
  correctionPrompt: z.string(), // e.g. "شکل درست کلمه را بنویسید"
});

const shortTextAnswer = z.object({
  type: z.literal("short-text-answer"),
  stimulus: richPassageSchema.optional(),
  questionText: z.string(),
  inputVariant: z.enum(["single-line", "textarea"]).default("single-line"),
  // 'list-item' = compact vertical row (used for the list-of-parallel-blanks
  // and multi-paraphrase-block container patterns); purely a layout hint.
  displayVariant: z.enum(["default", "list-item"]).default("default"),
});

const trueFalse = z.object({
  type: z.literal("true-false"),
  stimulus: richPassageSchema.optional(),
  statementText: z.string(),
  labels: z.tuple([z.string(), z.string()]).default(["درست", "نادرست"]),
});

const multiPartInlineTagging = z.object({
  type: z.literal("multi-part-inline-tagging"),
  passage: richPassageSchema, // contains multiple `select` tokens
  tagOptions: z.array(z.string()).min(2),
});

const diagramBuilder = z.object({
  type: z.literal("diagram-builder"),
  passage: richPassageSchema,
  // 'dependency-select' = phase-1 simple mode: pick each node's parent from
  // a dropdown. 'canvas' = full drag/arrow SVG editor, added later without
  // a schema change — just switch mode and populate node positions.
  mode: z.enum(["dependency-select", "canvas"]),
  nodes: z.array(z.object({ id: z.string(), label: z.string() })),
});

const fillBlankTerm = z.object({
  type: z.literal("fill-blank-term"),
  stimulus: richPassageSchema.optional(),
  passage: richPassageSchema, // exactly one `blank` token, mid-sentence
});

const twoAnswerText = z.object({
  type: z.literal("two-answer-text"),
  stimulus: richPassageSchema.optional(),
  questionText: z.string(),
  fields: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
});

const wordReorderDnd = z.object({
  type: z.literal("word-reorder-dnd"),
  scrambledTokens: z.array(z.string()).min(2),
});

const verseCompletion = z.object({
  type: z.literal("verse-completion"),
  firstMesra: z.string(),
});

const matchingPairsWithDistractor = z.object({
  type: z.literal("matching-pairs-with-distractor"),
  promptText: z.string().optional(),
  columnA: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  // columnB.length must be > columnA.length (at least one distractor)
  columnB: z.array(z.object({ id: z.string(), text: z.string() })).min(3),
});

const countAnswer = z.object({
  type: z.literal("count-answer"),
  questionText: z.string(),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
});

const pairedListErrorCorrection = z.object({
  type: z.literal("paired-list-error-correction"),
  items: z.array(z.object({ id: z.string(), pairText: z.string() })).min(2),
});

const findNErrorsInList = z.object({
  type: z.literal("find-n-errors-in-list"),
  items: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  errorCount: z.number().int().min(1),
});

const openErrorCorrectionInPassage = z.object({
  type: z.literal("open-error-correction-in-passage"),
  passage: richPassageSchema, // plain `text` tokens only, no highlight/blank
});

const mcqSelectLineInPoem = z.object({
  type: z.literal("mcq-select-line-in-poem"),
  lines: z.array(z.string()).min(2), // no الف/ب/ج labels — line itself is the option
});

export const questionPartContentSchema = z.discriminatedUnion("type", [
  wordMeaningInput,
  mcqInline,
  mcqMultiSelect,
  mcqPlusCorrection,
  shortTextAnswer,
  trueFalse,
  multiPartInlineTagging,
  diagramBuilder,
  fillBlankTerm,
  twoAnswerText,
  wordReorderDnd,
  verseCompletion,
  matchingPairsWithDistractor,
  countAnswer,
  pairedListErrorCorrection,
  findNErrorsInList,
  openErrorCorrectionInPassage,
  mcqSelectLineInPoem,
]);

// z.input (not z.infer/z.output) — fields with `.default()` (inputVariant,
// displayVariant, labels, ...) must stay optional here since this type is
// for *authoring* content (seed data, forms) before Zod fills defaults in.
export type QuestionPartContent = z.input<typeof questionPartContentSchema>;
export type QuestionPartType = QuestionPartContent["type"];

// ---------------------------------------------------------------------------
// Answer-key shapes (question_parts.correct_answer), keyed by the same type
// ---------------------------------------------------------------------------

const acceptedList = z.array(z.string()).min(1);

export const correctAnswerSchemaByType = {
  "word-meaning-input": z.record(z.string(), acceptedList), // blankId -> accepted answers
  "mcq-inline": z.object({}), // correctness lives on question_options.is_correct
  "mcq-multi-select": z.object({}),
  "mcq-plus-correction": z.object({
    correctionAnswers: acceptedList,
  }),
  "short-text-answer": z.object({ accepted: acceptedList }),
  "true-false": z.object({ value: z.boolean() }),
  "multi-part-inline-tagging": z.object({
    tags: z.record(z.string(), z.string()), // blankId -> correct tag
    weights: z.record(z.string(), z.number()).optional(), // blankId -> partial-score weight
  }),
  "diagram-builder": z.object({
    edges: z.array(
      z.object({ childId: z.string(), parentId: z.string(), label: z.string().optional() }),
    ),
  }),
  "fill-blank-term": z.object({ accepted: acceptedList }),
  "two-answer-text": z.record(z.string(), acceptedList), // fieldId -> accepted answers
  "word-reorder-dnd": z.object({ orderedTokens: z.array(z.string()) }),
  "verse-completion": z.object({ accepted: acceptedList }),
  "matching-pairs-with-distractor": z.record(z.string(), z.string()), // columnA id -> columnB id
  "count-answer": z.object({ value: z.number().int() }),
  "paired-list-error-correction": z.record(
    z.string(),
    z.object({ isCorrect: z.boolean(), correctedText: z.string().optional() }),
  ),
  "find-n-errors-in-list": z.object({
    errorItemIds: z.array(z.string()),
    corrections: z.record(z.string(), z.string()),
  }),
  "open-error-correction-in-passage": z.object({
    wrongWord: z.string(),
    correctWord: z.string(),
  }),
  "mcq-select-line-in-poem": z.object({ correctLineIndex: z.number().int() }),
} as const satisfies Record<QuestionPartType, z.ZodTypeAny>;

/** The 5 catalogue types that are pure arrangements of the 18 atomic types
 *  above (multiple `question_parts` rows sharing one `questions` row).
 *  Stored at questions.layout_pattern for display/analytics only — never
 *  branched on when rendering. */
export const layoutPatterns = [
  "multi-subquestion",
  "bracket-choice-mcq",
  "multi-item-true-false",
  "multi-paraphrase-block",
  "list-of-parallel-blanks",
] as const;
export type LayoutPattern = (typeof layoutPatterns)[number];
