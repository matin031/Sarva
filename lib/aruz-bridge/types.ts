/** انواعِ مشترکِ بازیِ «پلِ وزن».
 *
 *  این فایل عمداً هیچ وابستگی‌ای به three، React یا دیتابیس ندارد: هم منطقِ
 *  بازی و هم صحنهٔ سه‌بعدی از همین یک جا نوع می‌گیرند، پس باید سبک بماند. */

/** چرخهٔ عمرِ یک دور بازی. هر گذار در `lib/aruz-bridge/machine.ts` تعریف شده. */
export type GameState =
  | "intro"
  | "preparing"
  | "showingQuestion"
  | "waitingForAnswer"
  | "jumping"
  | "landing"
  | "correct"
  | "cracking"
  | "shattering"
  | "falling"
  | "timeout"
  | "gameOver"
  | "finished";

/** حالتِ دیداریِ یک شیشه. خودِ کاشی مسئولِ نمایشِ این‌هاست، نه منطقِ بازی. */
export type GlassState =
  | "intact"
  | "impact"
  | "cracking"
  | "shattering"
  | "broken";

/** دوربین فقط «حالت» می‌گیرد؛ اینکه چرا در این حالت است به او مربوط نیست. */
export type CameraMode = "gameplay" | "jump" | "fall" | "gameOver";

/** کاراکتر فقط «فرمان» می‌گیرد؛ از سؤال و پاسخ چیزی نمی‌داند. */
export type CharacterAnimation = "idle" | "jump" | "land" | "fall";

export type Side = "left" | "right";

export type Difficulty = 1 | 2 | 3;

/** چرا دور تمام شد — صفحهٔ پایان همین را به فارسی ترجمه می‌کند. */
export type FailureReason = "wrong" | "timeout";

/**
 * یک پرسشِ خام، همان‌طور که از منبعِ داده می‌آید.
 *
 * `distractors` عمداً از همین ابتدا وجود دارد تا وقتی روزی گزینه‌ها بیش از دو
 * تا شدند، لازم نباشد شکلِ داده عوض شود؛ فعلاً موتورِ بازی فقط `wrongPattern`
 * (یا اولین عضوِ `distractors`) را می‌خواند.
 *
 * `audioUrl` هم برای حالتِ آیندهٔ «شنیداری» است: در آن حالت `promptText` نمایش
 * داده نمی‌شود و بازیکن باید از روی صدا تشخیص دهد. صحنه همین حالا هم اگر
 * `promptText` خالی باشد کار می‌کند، پس افزودنِ آن مُد بازنویسی نمی‌خواهد.
 */
export interface AruzBridgeQuestion {
  id: string;
  /** کلمه یا عبارتی که باید وزنش تشخیص داده شود. در حالتِ شنیداری می‌تواند خالی باشد. */
  promptText: string;
  correctPattern: string;
  /** گزینهٔ نادرست. اگر `distractors` پر باشد، این اولین عضوِ آن است. */
  wrongPattern: string;
  distractors?: string[];
  difficulty?: Difficulty;
  audioUrl?: string;
  explanation?: string;
  /**
   * دادهٔ نمایشی است و محتوای علمیِ تأییدشدهٔ سروا نیست.
   * تا وقتی منبعِ واقعی وصل نشده، همهٔ پرسش‌ها این را دارند.
   */
  isDemo?: boolean;
}

/**
 * یک مرحله، بعد از آماده‌سازی.
 *
 * جای چپ/راست دقیقاً یک بار — هنگامِ ساختنِ دور — قرعه می‌خورد و بعد از آن
 * ثابت است. اگر این کار در رندر انجام می‌شد، هر re-render جای گزینه‌ها را
 * عوض می‌کرد و بازی غیرقابل‌بازی می‌شد.
 */
export interface PreparedStep {
  question: AruzBridgeQuestion;
  leftPattern: string;
  rightPattern: string;
  correctSide: Side;
}

/** نتیجهٔ یک دورِ کامل — صفحه‌های پایان از روی همین ساخته می‌شوند. */
export interface RunSummary {
  score: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  bestStreak: number;
  /** درصدِ صحیح از میانِ پاسخ‌های داده‌شده؛ اگر هیچ پاسخی نبوده، صفر. */
  accuracy: number;
  completed: boolean;
}
