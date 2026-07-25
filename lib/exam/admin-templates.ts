import type { QuestionPartType } from "@/lib/exam/content-schemas";

/** Starter JSON for the content/correctAnswer editors when a type is
 *  picked, so the admin edits a working example instead of starting from
 *  an empty textarea and guessing the shape from scratch. */
export const CONTENT_TEMPLATES: Record<QuestionPartType, string> = {
  "word-meaning-input": JSON.stringify(
    {
      type: "word-meaning-input",
      passage: {
        tokens: [
          { kind: "text", value: "متن قبل از واژه " },
          { kind: "highlight", value: "واژه" },
          { kind: "blank", blankId: "w1" },
          { kind: "text", value: " متن بعد از واژه." },
        ],
      },
    },
    null,
    2,
  ),
  "mcq-inline": JSON.stringify({ type: "mcq-inline", questionText: "متن سؤال" }, null, 2),
  "mcq-multi-select": JSON.stringify(
    { type: "mcq-multi-select", questionText: "متن سؤال", minSelect: 1, maxSelect: 2 },
    null,
    2,
  ),
  "mcq-plus-correction": JSON.stringify(
    { type: "mcq-plus-correction", questionText: "متن سؤال", correctionPrompt: "شکل درست را بنویسید" },
    null,
    2,
  ),
  "short-text-answer": JSON.stringify({ type: "short-text-answer", questionText: "متن سؤال" }, null, 2),
  "true-false": JSON.stringify({ type: "true-false", statementText: "متن گزاره" }, null, 2),
  "multi-part-inline-tagging": JSON.stringify(
    {
      type: "multi-part-inline-tagging",
      passage: {
        tokens: [
          { kind: "text", value: "متن قبل از " },
          { kind: "select", blankId: "s1", value: "کلمه", options: ["گزینه۱", "گزینه۲"] },
          { kind: "text", value: " متن بعد." },
        ],
      },
      tagOptions: ["گزینه۱", "گزینه۲"],
    },
    null,
    2,
  ),
  "diagram-builder": JSON.stringify(
    {
      type: "diagram-builder",
      mode: "dependency-select",
      passage: { tokens: [{ kind: "text", value: "متن جمله" }] },
      nodes: [
        { id: "n1", label: "کلمهٔ اول" },
        { id: "n2", label: "کلمهٔ دوم" },
      ],
    },
    null,
    2,
  ),
  "fill-blank-term": JSON.stringify(
    {
      type: "fill-blank-term",
      passage: {
        tokens: [
          { kind: "text", value: "متن قبل از جای خالی " },
          { kind: "blank", blankId: "b1" },
          { kind: "text", value: " متن بعد." },
        ],
      },
    },
    null,
    2,
  ),
  "two-answer-text": JSON.stringify(
    {
      type: "two-answer-text",
      questionText: "متن سؤال",
      fields: [
        { id: "f1", label: "پاسخ اول" },
        { id: "f2", label: "پاسخ دوم" },
      ],
    },
    null,
    2,
  ),
  "word-reorder-dnd": JSON.stringify({ type: "word-reorder-dnd", scrambledTokens: ["کلمهٔ۱", "کلمهٔ۲"] }, null, 2),
  "verse-completion": JSON.stringify({ type: "verse-completion", firstMesra: "مصراع اول" }, null, 2),
  "matching-pairs-with-distractor": JSON.stringify(
    {
      type: "matching-pairs-with-distractor",
      columnA: [{ id: "a1", text: "مورد اول" }],
      columnB: [
        { id: "b1", text: "گزینهٔ درست" },
        { id: "b2", text: "گزینهٔ اضافه (منحرف‌کننده)" },
      ],
    },
    null,
    2,
  ),
  "count-answer": JSON.stringify({ type: "count-answer", questionText: "متن سؤال" }, null, 2),
  "paired-list-error-correction": JSON.stringify(
    { type: "paired-list-error-correction", items: [{ id: "i1", pairText: "متن مورد" }] },
    null,
    2,
  ),
  "find-n-errors-in-list": JSON.stringify(
    { type: "find-n-errors-in-list", items: [{ id: "i1", text: "متن مورد" }], errorCount: 1 },
    null,
    2,
  ),
  "open-error-correction-in-passage": JSON.stringify(
    { type: "open-error-correction-in-passage", passage: { tokens: [{ kind: "text", value: "متن عبارت" }] } },
    null,
    2,
  ),
  "mcq-select-line-in-poem": JSON.stringify(
    { type: "mcq-select-line-in-poem", lines: ["مصراع اول", "مصراع دوم"] },
    null,
    2,
  ),
};

export const CORRECT_ANSWER_TEMPLATES: Record<QuestionPartType, string> = {
  "word-meaning-input": JSON.stringify({ w1: ["معنای درست"] }, null, 2),
  "mcq-inline": "{}",
  "mcq-multi-select": "{}",
  "mcq-plus-correction": JSON.stringify({ correctionAnswers: ["شکل درست"] }, null, 2),
  "short-text-answer": JSON.stringify({ accepted: ["پاسخ درست"] }, null, 2),
  "true-false": JSON.stringify({ value: true }, null, 2),
  "multi-part-inline-tagging": JSON.stringify({ tags: { s1: "گزینه۱" } }, null, 2),
  "diagram-builder": JSON.stringify({ edges: [{ childId: "n1", parentId: "n2", label: "نقش" }] }, null, 2),
  "fill-blank-term": JSON.stringify({ accepted: ["پاسخ درست"] }, null, 2),
  "two-answer-text": JSON.stringify({ f1: ["پاسخ اول"], f2: ["پاسخ دوم"] }, null, 2),
  "word-reorder-dnd": JSON.stringify({ orderedTokens: ["کلمهٔ۲", "کلمهٔ۱"] }, null, 2),
  "verse-completion": JSON.stringify({ accepted: ["مصراع دوم"] }, null, 2),
  "matching-pairs-with-distractor": JSON.stringify({ a1: "b1" }, null, 2),
  "count-answer": JSON.stringify({ value: 1 }, null, 2),
  "paired-list-error-correction": JSON.stringify({ i1: { isCorrect: false, correctedText: "متن درست" } }, null, 2),
  "find-n-errors-in-list": JSON.stringify({ errorItemIds: ["i1"], corrections: { i1: "متن درست" } }, null, 2),
  "open-error-correction-in-passage": JSON.stringify({ wrongWord: "غلط", correctWord: "درست" }, null, 2),
  "mcq-select-line-in-poem": JSON.stringify({ correctLineIndex: 0 }, null, 2),
};

export const TYPE_LABELS: Record<QuestionPartType, string> = {
  "word-meaning-input": "معنای واژهٔ مشخص‌شده",
  "mcq-inline": "چندگزینه‌ای",
  "mcq-multi-select": "چندگزینه‌ای چندپاسخی",
  "mcq-plus-correction": "چندگزینه‌ای + تصحیح",
  "short-text-answer": "پاسخ کوتاه/تشریحی",
  "true-false": "درست/نادرست",
  "multi-part-inline-tagging": "برچسب‌گذاری درون‌متنی",
  "diagram-builder": "نمودار وابستگی",
  "fill-blank-term": "جای خالی (اصطلاح)",
  "two-answer-text": "دو پاسخ جدا",
  "word-reorder-dnd": "مرتب‌سازی کلمات",
  "verse-completion": "تکمیل مصراع",
  "matching-pairs-with-distractor": "تطبیق با گزینهٔ اضافه",
  "count-answer": "پاسخ عددی",
  "paired-list-error-correction": "تصحیح لیست جفتی",
  "find-n-errors-in-list": "پیدا کردن N غلط",
  "open-error-correction-in-passage": "تصحیح غلط در متن",
  "mcq-select-line-in-poem": "انتخاب مصراع",
};

export const NEEDS_OPTIONS: QuestionPartType[] = ["mcq-inline", "mcq-multi-select", "mcq-plus-correction"];
