"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   پخش‌کنندهٔ ریتم — یکی، و فقط یکی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا یک عنصرِ ماژولی و نه یکی به‌ازای هر کامپوننت:

   «فقط یک صدا هم‌زمان» یک قاعدهٔ رابط کاربری نیست که بشود با دقت رعایتش
   کرد؛ باید *ساختاری* باشد. با یک عنصرِ مشترک، دومین `play()` خودبه‌خود
   اولی را جابه‌جا می‌کند و هیچ مسیری وجود ندارد که دو ریتم روی هم بیفتند —
   نه با پنج بار تند زدنِ دکمه، نه با رفتن به دورِ بعد وسطِ پخش، نه با دو
   کامپوننتی که هم‌زمان mount شده‌اند.

   ⚠️ چرا `Audio` و نه Web Audio:

   اینجا هیچ زمان‌بندیِ دقیقی لازم نیست — یک فایلِ آماده از اول تا آخر پخش
   می‌شود. Web Audio یعنی `AudioContext`، قفلِ ژست، رمزگشاییِ بافر و
   پاکسازیِ گره‌ها، برای چیزی که `HTMLAudioElement` خودش می‌کند و روی
   Safariِ موبایل هم رفتارِ آزموده‌ای دارد. («پلِ وزن» Web Audio دارد چون
   آنجا صدای شکستن باید *دقیقاً* روی فریمِ جدا شدنِ قطعات بنشیند؛ اینجا
   چنین قیدی نیست.)

   ⚠️ هیچ autoplay ای وجود ندارد. `play()` فقط از دلِ یک کلیک/لمسِ واقعی
   صدا زده می‌شود، که هم قاعدهٔ Safariِ موبایل است و هم تصمیمِ محصولی:
   ریتمی که خودش شروع شود، در کلاس یک مزاحمت است.
   ═══════════════════════════════════════════════════════════════════════════ */

export type RhythmState = {
  readonly src: string | null;
  readonly playing: boolean;
  readonly ready: boolean;
  readonly failed: boolean;
  /** ثانیه. تا وقتی فراداده نیامده `0`. */
  readonly duration: number;
  /**
   * آیا این ریتم دستِ‌کم یک‌بار تا آخر پخش شده.
   *
   * ⚠️ فقط برای *نمایش* است: کلیدِ پخش بعد از پایان به «دوباره» تبدیل
   * می‌شود و موج سرِ جایش می‌ماند. با `playing: false` تنها نمی‌شد فهمید
   * «هنوز شروع نشده» یا «تمام شد» — و این دو باید فرق کنند.
   */
  readonly played: boolean;
};

type Listener = () => void;

let element: HTMLAudioElement | null = null;
let state: RhythmState = { src: null, playing: false, ready: false, failed: false, duration: 0, played: false };
const listeners = new Set<Listener>();

function emit(next: Partial<RhythmState>) {
  state = { ...state, ...next };
  for (const fn of listeners) fn();
}

function ensureElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (element) return element;
  const audio = new Audio();
  audio.preload = "none"; // بایتی پیش از خواستِ کاربر کشیده نمی‌شود
  audio.addEventListener("loadedmetadata", () =>
    emit({ ready: true, failed: false, duration: Number.isFinite(audio.duration) ? audio.duration : 0 }),
  );
  audio.addEventListener("playing", () => emit({ playing: true, failed: false }));
  /* ⚠️ `timeupdate` اینجا *برای کشیدنِ پیشرفت* نیست — آن کار در
     `RhythmRing` با rAF و درون‌یابی انجام می‌شود، چون این رویداد حدودِ
     چهار بار در ثانیه می‌آید و بردر را پله‌پله می‌کرد. کارش اینجا فقط
     تازه نگه داشتنِ مدت است: بعضی مرورگرها مدتِ درست را تازه بعد از
     شروعِ پخش می‌دهند (فایلِ استریم‌شده)، و بدونِ این، نسبتِ پیشرفت تا
     آخر با مدتِ غلط حساب می‌شد. */
  audio.addEventListener("timeupdate", () => {
    if (Number.isFinite(audio.duration) && audio.duration !== state.duration) {
      emit({ duration: audio.duration });
    }
  });
  audio.addEventListener("pause", () => emit({ playing: false }));
  audio.addEventListener("ended", () => emit({ playing: false, played: true }));
  /* ⚠️ شکستِ صدا یک حالتِ *نمایش‌دادنی* است و نه یک استثنای بلعیده‌شده.
     فایلی که نیاید باید روی صفحه دیده شود، وگرنه بازیکن فکر می‌کند دکمه
     خراب است و ده بار می‌زندش. */
  audio.addEventListener("error", () => emit({ playing: false, ready: false, failed: true }));
  element = audio;
  return audio;
}

export function subscribeRhythm(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function rhythmSnapshot(): RhythmState {
  return state;
}

/** روی سرور هیچ صدایی نیست؛ همین مقدارِ ثابت تا اولین رندرِ مرورگر. */
const SERVER_STATE: RhythmState = {
  src: null,
  playing: false,
  ready: false,
  failed: false,
  duration: 0,
  played: false,
};
export function rhythmServerSnapshot(): RhythmState {
  return SERVER_STATE;
}

/**
 * منبعِ ریتمِ دورِ جاری.
 *
 * ⚠️ بی‌درنگ پخش نمی‌کند — فقط آماده می‌کند. صدا دادنِ این از دلِ یک
 * `useEffect`ِ دورِ تازه کاملاً امن است.
 */
export function setRhythmSource(src: string | null): void {
  const audio = ensureElement();
  if (!audio) return;
  if (state.src === src) return;
  audio.pause();
  audio.removeAttribute("src");
  if (src) audio.src = src;
  else audio.load(); // بافرِ قبلی را رها می‌کند
  audio.currentTime = 0;
  /* ⚠️ `played` هم صفر می‌شود: بیتِ تازه یعنی ریتمِ تازه، و کلید باید
     دوباره «شنیدن» باشد و نه «شنیدنِ دوباره». */
  emit({ src, playing: false, ready: false, failed: false, duration: 0, played: false });
}

/**
 * پخش.
 *
 * ⚠️ **از ابتدا، مگر اینکه وسطِ کار مکث شده باشد.** نسخهٔ قبلِ این تابع
 * همیشه از صفر شروع می‌کرد، و آن‌وقت درست بود: کلید آنجا معنی‌اش
 * «دوباره بشنو» بود. حالا کلید یک play/pauseِ واقعی است و بردر جای
 * دقیقِ پخش را نشان می‌دهد؛ اگر «ادامه» دوباره از صفر شروع کند، هم
 * دکمه دروغ گفته و هم بردر می‌پرد عقب (تستِ مرورگری همین را گرفت).
 *
 * پس: مکث → ادامه از همان‌جا. پایان یا شروعِ تازه → از صفر. و پنج بار
 * تند زدن هم هنوز پنج صدای روی‌هم نمی‌سازد، چون عنصرِ صوتی یکی است.
 */
export async function playRhythm(): Promise<void> {
  const audio = ensureElement();
  /* ⚠️ «بدونِ فایل» یک حالتِ واقعی است و نه خطا: بعضی دورها ممکن است
     ریتمِ آماده نداشته باشند. آن‌وقت پخش‌کننده *وانمود* می‌کند — یعنی
     `playing` روشن می‌شود و بردر با یک ساعتِ شبیه‌سازی‌شده پر می‌شود.
     صریح گفته می‌شود که صدایی نیست (`aria-label` پخش‌کننده)، ولی صفحه
     مرده نمی‌ماند. */
  if (!state.src) {
    emit({ playing: true, failed: false });
    return;
  }
  if (!audio) return;
  const resumable = state.played === false && audio.currentTime > 0.05 && !audio.ended;
  if (!resumable) {
    try {
      audio.currentTime = 0;
    } catch {
      // پیش از آمدنِ فراداده ممکن است رد شود؛ بی‌اهمیت.
    }
  }
  try {
    await audio.play();
  } catch {
    /* مرورگر ژست را نپذیرفت یا فایل نیامد. حالتِ `failed` را شنوندهٔ
       `error` می‌گذارد؛ اینجا فقط نباید استثنا به بازی برسد. */
    emit({ playing: false });
  }
}

export function pauseRhythm(): void {
  if (!state.src) {
    emit({ playing: false, played: true });
    return;
  }
  element?.pause();
}

export function rhythmCurrentTime(): number {
  return element?.currentTime ?? 0;
}

/**
 * توقفِ کامل و رها کردنِ منبع.
 *
 * ⚠️ در پاکسازیِ کامپوننت و در تعویضِ دور *باید* صدا زده شود. بدونش،
 * ریتمِ بیتِ قبلی روی بیتِ تازه ادامه پیدا می‌کرد — که هم آزاردهنده است و
 * هم آموزشی‌اش غلط.
 */
export function stopRhythm(): void {
  if (state.playing && !state.src) emit({ playing: false });
  if (!element) return;
  element.pause();
  try {
    element.currentTime = 0;
  } catch {}
  emit({ playing: false });
}
