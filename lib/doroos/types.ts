/** Types for the درسنامه (lesson notes) section.
 *
 *  Three textbooks — فارسی ۱/۲/۳ for دهم، یازدهم، دوازدهم — each with 18
 *  lessons. A poem lesson is analysed one بیت at a time, and every بیت is
 *  broken into the three قلمروs the curriculum uses: زبانی، ادبی، فکری.
 *
 *  Content currently lives in typed modules under `lib/doroos/content/`, the
 *  same way exam seeds do. The shape is deliberately serialisable so the same
 *  objects can be served from the database later without touching the UI. */

export type GradeKey = "dahom" | "yazdahom" | "davazdahom";

export type Grade = {
  key: GradeKey;
  /** پایه, e.g. "دهم" */
  label: string;
  /** the textbook's own name, e.g. "فارسی ۱" */
  book: string;
  /** 1..18 — a title only where we actually know it */
  lessons: LessonRef[];
};

export type LessonRef = {
  number: number;
  /** omitted until the real title is known; the UI then shows «درس N» */
  title?: string;
  /** false while the lesson has no content yet */
  ready: boolean;
};

/** One annotated note hanging off a بیت — «فراتر از قلمرو», «نکته», an
 *  alternative grammatical reading, and so on. An empty label means the note is
 *  a continuation bullet of the one before it. */
export type BeytNote = { label: string; body: string };

export type ExamQuestion = { q: string; a: string };

/** One labelled span in a diagram drawn over the بیت — a grammatical role in
 *  the نقشِ دستوری view, a figure of speech in the آرایه‌ها view.
 *
 *  `words` are indices into `hemistichs[h].split(/\s+/)`, so an entry can cover
 *  a whole phrase («بی‌دست و پای», «زنخدان فرو برد … به جیب») as easily as a
 *  single word; a multi-word entry is drawn as an underline under the phrase
 *  rather than a dot on one word. They are written out by hand rather than
 *  matched from the prose notes: a diagram that points at the wrong word is
 *  worse than no diagram, and matching prose was exactly how the earlier
 *  attempt went wrong. */
export type WordRole = {
  /** which line of the passage — 0 = مصراع اول, 1 = مصراع دوم for a بیت, and
   *  an index into a prose passage's `lines` otherwise */
  h: number;
  /** word indices this role covers, in order */
  words: number[];
  /** what to write in the box, e.g. «نهاد» or «جناس با سیر» */
  label: string;
};

export type Beyt = {
  /** 1-based index within the poem */
  n: number;
  /** the two مصراع, in order */
  hemistichs: [string, string];
  /** معنی — a plain-language rendering */
  meaning: string;
  /** مفهوم — the single idea the بیت carries */
  concept: string;
  /** قلمرو زبانی — vocabulary, grammar, sentence patterns */
  linguistic: string[];
  /** قلمرو ادبی — figures of speech */
  literary: string[];
  /** قلمرو فکری — one paragraph, not a list */
  intellectual: string;
  /** تعدادِ جمله — counted by finite verbs, plus any شبه‌جمله (a منادا counts) */
  clauses?: number;
  /** نقشِ دستوریِ واژه‌ها, drawn as a diagram over the بیت. Omitted where the
   *  analysis has not been written yet — the diagram is then simply not shown,
   *  which is honest in a way that a guessed one would not be. */
  syntax?: WordRole[];
  /** آرایه‌ها, drawn the same way. Only the figures that actually attach to a
   *  word are here: واج‌آرایی، تلمیح and تمثیل belong to the whole بیت and stay
   *  in the قلمرو ادبی panel, and مراعات‌نظیر is left out on request. */
  devices?: WordRole[];
  notes?: BeytNote[];
  /** قرابت معنایی — lines from elsewhere that carry the same idea */
  affinity?: string[];
  /** سؤال امتحانی, answer hidden until the reader asks for it */
  exam?: ExamQuestion;
};

/** A closing «نکات پایانی و جمع‌بندی» topic. */
export type WrapUpTopic = { title: string; body: string };

export type PoemLesson = {
  kind: "poem";
  grade: GradeKey;
  number: number;
  title: string;
  poet?: string;
  /** the section of the book, e.g. "ستایش" or "فصل اول" */
  section?: string;
  /** a one-line orientation shown above the first بیت */
  intro?: string;
  beyts: Beyt[];
  wrapUp?: WrapUpTopic[];
};

/** Prose lessons are analysed by paragraph rather than by بیت. Declared now so
 *  the registry and routing do not have to change when the first one lands. */
export type ProseLesson = {
  kind: "prose";
  grade: GradeKey;
  number: number;
  title: string;
  author?: string;
  section?: string;
  intro?: string;
  passages: Passage[];
  wrapUp?: WrapUpTopic[];
};

/** One بند of a prose lesson.
 *
 *  A prose lesson is not uniformly prose: گلستان and its like run a paragraph
 *  of نثر, then break into a بیت, then carry on. So each بند says which it is,
 *  and `lines` holds however many it needs — several paragraphs for نثر, and
 *  exactly the two مصراع for a بیت. */
export type Passage = {
  n: number;
  /** «quotation» is an آیه or حدیث quoted inside the نثر — Arabic, and set
   *  apart from the author's own prose */
  form: "prose" | "verse" | "quotation";
  /** paragraphs for «prose»; the two مصراع for «verse»; the quoted text for
   *  «quotation» */
  lines: string[];
  /** a heading that opens a new part of the lesson */
  section?: string;
  meaning?: string;
  concept?: string;
  linguistic: string[];
  literary: string[];
  intellectual: string;
  /** تعدادِ جمله */
  clauses?: number;
  syntax?: WordRole[];
  devices?: WordRole[];
  affinity?: string[];
  notes?: BeytNote[];
  exam?: ExamQuestion;
};

export type Lesson = PoemLesson | ProseLesson;

/** The three قلمروs, as the UI needs them: an id, a label, and the token its
 *  panel is tinted with. Keeping this beside the types means a lesson renderer
 *  never hard-codes a colour. */
export const REALMS = [
  { id: "linguistic", label: "قلمرو زبانی", token: "--color-primary" },
  // ⚠️ gold-ink و نه gold: این توکن به‌عنوان *رنگ متن* استفاده می‌شود و
  // طلاییِ اصلی روی کاغذِ کرم فقط ۲٫۰۵:۱ کنتراست دارد.
  { id: "literary", label: "قلمرو ادبی", token: "--color-gold-ink" },
  { id: "intellectual", label: "قلمرو فکری", token: "--color-lapis-light" },
] as const;

export type RealmId = (typeof REALMS)[number]["id"];
