import type { FootKey } from "./catalog";
import { KIMIA_CONFIG } from "./config";
import type { KimiaErrorType } from "./scansion";

/* ═══════════════════════════════════════════════════════════════════════════
   «این تلاش چه چیزی را در ردیفِ دور عوض می‌کند؟» — منطقِ خالص.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ عمداً از `server/rounds.ts` جدا شده و نه به‌خاطر معماری. سه قاعده‌ای
   که اینجا زندگی می‌کنند، *معنای* کارنامهٔ دانش‌آموزند:

     • یک دور = یک شاهد، هرچند بار که تلاش شود
     • شاهدِ یادگیری = تلاشِ اول، و فقط یک بار نوشته می‌شود
     • تلاشِ دوبارهٔ شبکه هیچ ستونی را تکان نمی‌دهد
     • هر بیت سه تلاش دارد، و تلاشِ سومِ غلط پاسخ را باز می‌کند
     • دورِ باز‌شده بسته است: نه تلاشِ تازه می‌گیرد، نه دوباره باز می‌شود

   اگر این سه فقط داخلِ یک تراکنشِ SQL زندگی می‌کردند، تنها راهِ آزمودنشان
   بالا آوردنِ یک دیتابیس بود — و در عمل یعنی آزموده نمی‌شدند. حالا
   `tests/kimia/round-state.test.ts` هر ترکیبِ ممکن را بدونِ هیچ اتصالی
   می‌سنجد، و لایهٔ SQL فقط همین تصمیم را اجرا می‌کند.

   (همان الگوی `lib/plus/skill-buckets.ts` و `lib/aruz-bridge/machine.ts`.)
   ═══════════════════════════════════════════════════════════════════════════ */

/** وضعیتِ ردیفِ دور، همان‌طور که از دیتابیس خوانده می‌شود. */
export type RoundSnapshot = {
  status: "active" | "completed";
  attemptsCount: number;
  lastAttemptId: string | null;
  lastCorrect: boolean | null;
  lastErrorType: KimiaErrorType | null;
  /**
   * آیا پاسخ به بازیکن نشان داده شده، و چرا.
   *
   * ⚠️ `status` عمداً عوض نمی‌شود و در مهاجرت ۰۱۹ توضیح داده شده: دو
   * CHECKِ جدول می‌گویند `completed` یعنی `last_correct = 1`، و دورِ
   * reveal شده درست جواب نداده. پس «بسته بودن» یک ستون نیست، یک تابع
   * است — `isRoundClosed`.
   */
  revealReason: RevealReason | null;
};

/** چرا پاسخ باز شد. */
export type RevealReason =
  /** هر سه تلاش رفت. */
  | "exhausted"
  /** بازیکن خودش «نمایش پاسخ» را زد. */
  | "user";

/** سقفِ تلاشِ هر بیت — از پیکربندی، تا در دو جا دو عدد نباشد. */
export const MAX_ATTEMPTS = KIMIA_CONFIG.attempts.max;

/**
 * «این دور دیگر تلاش نمی‌پذیرد؟»
 *
 * ⚠️ تنها تعریفِ «بسته» در کلِ پروژه، و عمداً یک تابع است و نه یک مقایسهٔ
 * درون‌خطی. سه شرط دارد و هر سه لازم‌اند؛ اگر هرکدام جایی فراموش شود،
 * نتیجه یک تلاشِ چهارم است که بی‌صدا ثبت می‌شود.
 */
export function isRoundClosed(round: RoundSnapshot): boolean {
  return (
    round.status === "completed" ||
    round.revealReason !== null ||
    round.attemptsCount >= MAX_ATTEMPTS
  );
}

/**
 * چند تلاش مانده.
 *
 * دورِ بسته صفر می‌دهد، حتی اگر شمارنده‌اش به سقف نرسیده باشد (پاسخِ درست
 * در تلاشِ اول: بسته است و «دو تلاشِ باقی‌مانده» دربارهٔ آن معنا ندارد).
 */
export function attemptsRemaining(round: RoundSnapshot): number {
  if (isRoundClosed(round)) return 0;
  return Math.max(0, MAX_ATTEMPTS - round.attemptsCount);
}

export type AttemptInput = {
  attemptId: string;
  selected: readonly FootKey[];
  isCorrect: boolean;
  errorType: KimiaErrorType | null;
  responseMs: number | null;
};

/** نوشتنی‌هایی که یک تلاشِ واقعی تولید می‌کند. */
export type RoundWrite = {
  attemptsCount: number;
  status: "active" | "completed";
  selectedText: string;
  isCorrect: boolean;
  errorType: KimiaErrorType | null;
  /** فقط در تلاشِ اول پر است؛ در بقیه `null` یعنی «دست نزن». */
  first: { selectedText: string; isCorrect: boolean; errorType: KimiaErrorType | null; responseMs: number | null } | null;
  /**
   * اگر همین تلاش پاسخ را باز می‌کند، علتش.
   *
   * ⚠️ فقط `exhausted` از این مسیر می‌آید: تلاشِ سومِ غلط، در **همان**
   * تراکنش. نوشتنش در یک درخواستِ دوم یعنی پنجره‌ای که در آن دور نه باز
   * است نه بسته، و یک تبِ دیگر می‌تواند تلاشِ چهارم بفرستد.
   */
  reveal: RevealReason | null;
};

export type AttemptDecision =
  /** تلاشِ واقعی — ردیف عوض می‌شود. */
  | { kind: "write"; write: RoundWrite }
  /** همین شناسه قبلاً رسیده؛ همان پاسخِ قبلی، بدونِ هیچ تغییری. */
  | { kind: "duplicate" }
  /** دور با پاسخِ درست بسته شده؛ نتیجهٔ ثبت‌شده برمی‌گردد. */
  | { kind: "immutable" }
  /**
   * دور بسته است و تلاشِ تازه **رد** می‌شود.
   *
   * ⚠️ فرقش با `immutable` جدی است و نه لفظی: آنجا بازیکن قبلاً درست جواب
   * داده و دیدنِ دوبارهٔ همان پاسخ درست است؛ اینجا دارد تلاشِ چهارم
   * می‌فرستد و باید ۴۰۹ بگیرد. اگر هر دو یک‌جور پاسخ می‌گرفتند، رابط
   * کاربری راهی نداشت بفهمد کدام اتفاق افتاده.
   */
  | { kind: "rejected"; reason: "attempts-exhausted" | "already-revealed" };

/**
 * تصمیم دربارهٔ یک تلاش.
 *
 * ⚠️ ترتیبِ دو شرطِ اول مهم است و اتفاقی نیست: اول «تکراری» و بعد «بسته».
 * اگر برعکس بود، تلاشِ دوبارهٔ شبکه‌ای که *همان تلاشِ درست* را دوباره
 * می‌فرستد، به‌عنوان «دورِ بسته» دیده می‌شد — نتیجه یکی است ولی معنایش در
 * لاگ و در آیندهٔ این کد نه: یکی «چیزی نشد چون قبلاً همین را گفتی» است و
 * آن یکی «چیزی نشد چون دیر رسیدی».
 */
export function decideAttempt(
  round: RoundSnapshot,
  attempt: AttemptInput,
  joinSelected: (feet: readonly FootKey[]) => string,
): AttemptDecision {
  if (round.lastAttemptId !== null && round.lastAttemptId === attempt.attemptId) {
    return { kind: "duplicate" };
  }
  if (round.status === "completed") return { kind: "immutable" };

  /* ⚠️ ترتیب: اول «پاسخ باز شده» و بعد «تلاش‌ها تمام». هر دو رد می‌شوند
     ولی دلیلشان یکی نیست — بازیکنی که خودش «نمایش پاسخ» را زده باید پیامِ
     خودش را بگیرد و نه «تلاش‌هایت تمام شد»، که دروغ است. */
  if (round.revealReason !== null) {
    return { kind: "rejected", reason: "already-revealed" };
  }
  if (round.attemptsCount >= MAX_ATTEMPTS) {
    return { kind: "rejected", reason: "attempts-exhausted" };
  }

  const isFirst = round.attemptsCount === 0;
  const selectedText = joinSelected(attempt.selected);
  const attemptsCount = round.attemptsCount + 1;

  return {
    kind: "write",
    write: {
      attemptsCount,
      status: attempt.isCorrect ? "completed" : "active",
      selectedText,
      isCorrect: attempt.isCorrect,
      errorType: attempt.errorType,
      first: isFirst
        ? {
            selectedText,
            isCorrect: attempt.isCorrect,
            errorType: attempt.errorType,
            /* ⚠️ زمانِ پاسخ هم فقط یک بار نوشته می‌شود. «چقدر طول کشید تا
               اولین بار جواب داد» سنجهٔ متفاوتی است از «چقدر طول کشید تا
               بالاخره درست شد»، و دومی را `attempts_count` می‌گوید. */
            responseMs: attempt.responseMs,
          }
        : null,
      /* ⚠️ آخرین تلاش و غلط → پاسخ همین‌جا باز می‌شود، در همان تراکنش.
         پاسخِ درست هیچ‌وقت `reveal` نمی‌نویسد: آنجا `status` بسته می‌شود و
         نوشتنِ `revealed_at` یک دورِ موفق را با یک بن‌بست قاطی می‌کرد. */
      reveal: !attempt.isCorrect && attemptsCount >= MAX_ATTEMPTS ? "exhausted" : null,
    },
  };
}

/* ─────────────────────────── «نمایش پاسخ» ──────────────────────────────── */

export type RevealDecision =
  /** `revealed_at` نوشته می‌شود. */
  | { kind: "write" }
  /** قبلاً باز شده، یا دور با پاسخِ درست بسته شده — فقط پاسخ برگردد. */
  | { kind: "already-open" }
  /** رد. */
  | { kind: "rejected"; reason: "no-attempt-yet" };

/**
 * «آیا این درخواستِ نمایشِ پاسخ پذیرفته می‌شود، و چیزی می‌نویسد؟»
 *
 * ⚠️ سه حالت و نه دو. «نوشتن» و «قبلاً باز است» هر دو موفق‌اند و هر دو
 * پاسخ را می‌دهند، ولی دومی هیچ ستونی را لمس نمی‌کند — پس زدنِ دوبارهٔ
 * دکمه زمانِ ثبت‌شده را جابه‌جا نمی‌کند و علتِ `exhausted` را به `user`
 * تبدیل نمی‌کند.
 *
 * ⚠️ و بدونِ حتی یک تلاش، پاسخ باز نمی‌شود. دوری که دست‌نخورده باز شود یک
 * شاهدِ بی‌معناست: نه می‌گوید بازیکن بلد بود، نه می‌گوید نبود. قیدِ
 * `kimia_rounds_reveal_needs_attempt` همین را در لایهٔ جدول هم می‌گذارد.
 */
export function decideReveal(round: RoundSnapshot): RevealDecision {
  if (round.revealReason !== null) return { kind: "already-open" };
  /* دورِ حل‌شده پاسخش را از قبل دیده؛ نوشتنِ `revealed_at` روی آن یعنی
     «تسلیم شد» در حالی که برنده شده. */
  if (round.status === "completed") return { kind: "already-open" };
  if (round.attemptsCount === 0) return { kind: "rejected", reason: "no-attempt-yet" };
  return { kind: "write" };
}

/**
 * «آیا پاسخِ درست الان به کلاینت می‌رسد؟»
 *
 * ⚠️ تنها سه دروازه، و همه‌شان اینجا. اگر روزی جای دیگری هم `solution`
 * ساخته شود، این تابع دیگر تنها مرجع نیست و همان روز نشتی شروع می‌شود.
 */
export function mayRevealSolution(round: RoundSnapshot): boolean {
  return (
    round.status === "completed" ||
    round.revealReason !== null ||
    round.attemptsCount >= MAX_ATTEMPTS
  );
}

/**
 * وضعیتِ ردیف بعد از اعمالِ یک تصمیم — مدلِ آینهٔ همان `UPDATE`.
 *
 * فقط برای تست و استدلال است و هیچ‌جای مسیرِ اجرا صدا زده نمی‌شود؛ ولی
 * وجودش یعنی می‌شود ثابت کرد که هیچ دنباله‌ای از تلاش‌ها ردیف را به حالتی
 * نمی‌برد که CHECKهای مهاجرت ۰۱۸ ردش کنند.
 */
export function applyDecision(
  round: RoundSnapshot,
  decision: AttemptDecision,
): RoundSnapshot {
  if (decision.kind !== "write") return round;
  const { write } = decision;
  return {
    status: write.status,
    attemptsCount: write.attemptsCount,
    lastAttemptId: null, // فراخواننده شناسه را می‌گذارد؛ اینجا اهمیتی ندارد
    lastCorrect: write.isCorrect,
    lastErrorType: write.errorType,
    revealReason: write.reveal ?? round.revealReason,
  };
}
