"use client";

/**
 * صدای «شکار نقش‌ها» — تولیدی، بدونِ هیچ فایلِ صوتی.
 *
 * ⚠️ همان دو قاعده‌ای که `useCircuitAudio` و «تقطیعِ سریع» دارند:
 *
 *   ۱) هیچ نشانیِ صوتی‌ای درخواست نمی‌شود. حالتِ «اول فایل را صدا بزن، ۴۰۴
 *      بگیر، بعد برو سراغ صدای تولیدی» ممنوع است — این بازی بستهٔ صوتی
 *      ندارد و وانمود هم نمی‌کند که دارد.
 *
 *   ۲) صدا هیچ‌وقت مسیرِ معناییِ بازی را نگه نمی‌دارد. هیچ `await`ی وجود
 *      ندارد و شکستِ صدا بازی را متوقف نمی‌کند. مرورگری که AudioContext
 *      ندارد یا کاربری که هنوز ژستی نکرده، بازیِ کاملاً سالمی دارد.
 *
 * ⚠️ چرا صداها کوتاه و کم‌فرکانس‌اند: این بازی در کلاس هم باز می‌شود. یک
 * صدای بلندِ «بازی‌گونه» باعث می‌شود دانش‌آموز صدا را برای همیشه خاموش کند،
 * و آن‌وقت بازخوردِ شنیداریِ پاسخ — که برای کسی که تندتند بازی می‌کند مفید
 * است — هم از دست می‌رود.
 */

export type RoleHuntSound =
  /** نقش رو شد؛ دورِ تازه شروع شد. */
  | "reveal"
  /** هر گامِ رمزگشا — بسیار ریز. */
  | "tick"
  | "correct"
  | "wrong"
  /** مهلتِ پاسخ تمام شد — نرم‌تر از «غلط»، چون بازیکن چیزی نزده. */
  | "timeout"
  /** نشست شروع شد. */
  | "start"
  | "sessionEnd"
  /** تیکِ ثانیه‌شمار در سه ثانیهٔ آخرِ خواندن. */
  | "clock";

const STORAGE_KEY = "role-hunt-sound";

type Kit = { ctx: AudioContext; master: GainNode };

let kit: Kit | null = null;
let enabled = true;
let loaded = false;

/* ─────────────────────── store، و نه یک useState ───────────────────────
   ⚠️ ترجیحِ صدا یک حالتِ *بیرون از React* است: در `localStorage` می‌نشیند و
   هر کامپوننتی می‌تواند عوضش کند. خواندنش با `useEffect` + `setState` یک
   رندرِ اضافه می‌ساخت (و ESLint درست ایراد می‌گرفت). همان الگویی که
   `lib/guest/use-guest-rounds.ts` دارد: یک store کوچک و
   `useSyncExternalStore`.

   ⚠️ `getServerSnapshot` همیشه `true` می‌دهد و نه مقدارِ واقعی — روی سرور
   ذخیره‌سازی نیست، و اگر آنجا چیزِ دیگری می‌گفتیم، اولین رندرِ مرورگر با
   HTMLِ سرور نمی‌خواند. */
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeSound(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** ⚠️ مقدار باید cache شود: `getSnapshot` بین دو رندرِ بی‌تغییر باید همان
 *  مقدار را بدهد، وگرنه React بی‌نهایت رندر می‌کند. */
export function isSoundEnabled(): boolean {
  if (!loaded) {
    loaded = true;
    try {
      enabled = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      // حالتِ ناشناس یا ذخیره‌سازیِ بسته: پیش‌فرض روشن.
    }
  }
  return enabled;
}

/** روی سرور ذخیره‌سازی نیست؛ «روشن» یعنی «هنوز نمی‌دانیم». */
export function soundServerSnapshot(): boolean {
  return true;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  loaded = true;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {}
  // روشن کردن خودش یک ژستِ کاربر است؛ همان‌جا قفلِ صدا باز می‌شود.
  if (next) ensureContext();
  emit();
}

/**
 * ⚠️ فقط از دلِ یک ژستِ واقعیِ کاربر صدا زده شود.
 *
 * مرورگرها AudioContext را پیش از اولین کلیک `suspended` نگه می‌دارند. اگر
 * این در `useEffect` صدا زده می‌شد، یک context معلق می‌ساخت که هیچ‌وقت
 * بیدار نمی‌شد و اولین صدای بازی بی‌صدا رد می‌شد.
 */
function ensureContext(): Kit | null {
  if (typeof window === "undefined") return null;
  if (!kit) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      kit = { ctx, master };
    } catch {
      return null;
    }
  }
  if (kit.ctx.state === "suspended") void kit.ctx.resume().catch(() => {});
  return kit;
}

export function unlockSound(): void {
  if (!isSoundEnabled()) return;
  ensureContext();
}

/** پوششِ نرمِ حجم — بدونِ کلیکِ ابتدا و انتها. */
function envelope(gain: GainNode, at: number, peak: number, attack: number, dur: number) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
}

function tone(
  k: Kit,
  o: {
    at: number;
    freq: number;
    to?: number;
    dur: number;
    peak: number;
    type?: OscillatorType;
  },
) {
  const osc = k.ctx.createOscillator();
  const gain = k.ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, o.at);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(o.to, 1), o.at + o.dur);
  }
  envelope(gain, o.at, o.peak, Math.min(0.012, o.dur / 3), o.dur);
  osc.connect(gain).connect(k.master);
  osc.start(o.at);
  osc.stop(o.at + o.dur + 0.02);
}

/**
 * پخشِ یک رویداد. بی‌صدا رد می‌شود اگر کاربر خاموش کرده یا مرورگر نتواند.
 *
 * ⚠️ هیچ‌وقت throw نمی‌کند. صدا یک لایهٔ تزئینی است و نباید بتواند یک دورِ
 * تمرین را خراب کند.
 */
export function playRoleHuntSound(name: RoleHuntSound, opts?: { streak?: number }): void {
  if (!isSoundEnabled()) return;
  const k = ensureContext();
  if (!k) return;

  try {
    const t = k.ctx.currentTime;
    switch (name) {
      /* ریزترین صدای بازی — یک تیکِ خشک، هم‌زمان با جا افتادنِ هر نویسه.
         عمداً بسیار کم‌حجم: هشت‌تا پشتِ هم پخش می‌شود. */
      case "tick":
        tone(k, { at: t, freq: 2100, dur: 0.02, peak: 0.02, type: "square" });
        break;

      /* نقش رو شد: دو نتِ بالارونده، مثلِ «قفل باز شد». */
      case "reveal":
        tone(k, { at: t, freq: 520, to: 780, dur: 0.14, peak: 0.075, type: "triangle" });
        tone(k, { at: t + 0.07, freq: 1040, dur: 0.12, peak: 0.045 });
        break;

      /* درست: یک «دینگ»ِ دونتی با ته‌صدای زنگ‌مانند.
         ⚠️ با هر پاسخِ درستِ پیاپی دو نیم‌پرده زیرتر می‌شود (تا شش پله) —
         زنجیره را *می‌شنوی* بی‌آنکه به نوارِ بالا نگاه کنی. */
      case "correct": {
        const lift = Math.pow(2, (Math.min(opts?.streak ?? 0, 6) * 2) / 12);
        const f = 784 * lift;
        tone(k, { at: t, freq: f, dur: 0.12, peak: 0.09, type: "triangle" });
        tone(k, { at: t + 0.075, freq: f * 1.5, dur: 0.34, peak: 0.08 });
        // ته‌صدای فلزی: یک اکتاو بالاتر، بسیار کم‌حجم و کمی بلندتر.
        tone(k, { at: t + 0.075, freq: f * 3, dur: 0.42, peak: 0.018 });
        break;
      }

      /* غلط: یک نتِ پایین‌رونده. ⚠️ عمداً «بازر»ِ خشن نیست — این بازی جای
         تمرین است و صدای تنبیه‌گونه دانش‌آموز را از تمرین فراری می‌دهد. */
      case "wrong":
        tone(k, { at: t, freq: 300, to: 170, dur: 0.2, peak: 0.085, type: "triangle" });
        tone(k, { at: t + 0.09, freq: 150, to: 110, dur: 0.22, peak: 0.06 });
        break;

      case "timeout":
        tone(k, { at: t, freq: 440, to: 330, dur: 0.18, peak: 0.05, type: "triangle" });
        tone(k, { at: t + 0.14, freq: 330, to: 262, dur: 0.24, peak: 0.045, type: "triangle" });
        break;

      case "start":
        [392, 523, 659].forEach((f, i) =>
          tone(k, { at: t + i * 0.07, freq: f, dur: 0.18, peak: 0.055, type: "triangle" }),
        );
        break;

      /* ⚠️ تیکِ ساعت، و عمداً بلندتر و بم‌تر از `tick`ِ رمزگشا.
         آن یکی بافتِ پس‌زمینه است و این یکی یک *هشدار*: سه ثانیه مانده.
         اگر هم‌صدا بودند، بازیکن تفاوتشان را نمی‌فهمید. */
      case "clock":
        tone(k, { at: t, freq: 900, dur: 0.06, peak: 0.05, type: "square" });
        break;

      /* پایانِ نشست: چهار نتِ آرام. */
      case "sessionEnd":
        [523, 659, 784, 1047].forEach((f, i) =>
          tone(k, { at: t + i * 0.1, freq: f, dur: 0.3, peak: 0.07, type: "triangle" }),
        );
        break;
    }
  } catch {
    // یک صدای ناموفق، یک صدای ناموفق است. بس.
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   بازکردنِ دستیِ قفلِ حرکت
   ═══════════════════════════════════════════════════════════════════════

   ⚠️ چرا لازم شد: کاربری گزارش داد «هیچ انیمیشنی اجرا نمی‌شود» و سیستمش
   قوی بود. علت دستگاه نبود — ویندوزش «Animation effects» را خاموش داشت،
   پس مرورگر `prefers-reduced-motion: reduce` می‌فرستاد و کلِ سایت
   محترمانه انیمیشن‌ها را می‌بست.

   آن رفتار درست است و حذف نمی‌شود: کسی که این تنظیم را روشن کرده ممکن
   است با سرگیجه یا میگرن سر و کار داشته باشد و مدارِ چرخان آزارش بدهد.

   ولی این بازی روی حرکت ایستاده، پس کاربر باید بتواند *برای همین بازی*
   تصمیم بگیرد. پیش‌فرض همچنان حرفِ سیستم‌عامل است؛ این فقط یک درِ خروج
   است که خودِ کاربر بازش می‌کند.
   ═══════════════════════════════════════════════════════════════════════ */

const MOTION_KEY = "role-hunt-motion";

let motionOn = false;
let motionLoaded = false;
const motionListeners = new Set<() => void>();

export function subscribeMotion(onChange: () => void): () => void {
  motionListeners.add(onChange);
  return () => motionListeners.delete(onChange);
}

/** کاربر صریحاً حرکت را برای این بازی روشن کرده؟ */
export function isMotionForced(): boolean {
  if (!motionLoaded) {
    motionLoaded = true;
    try {
      motionOn = localStorage.getItem(MOTION_KEY) === "on";
    } catch {
      // ذخیره‌سازیِ بسته: پیش‌فرض «نه»، یعنی حرفِ سیستم‌عامل.
    }
  }
  return motionOn;
}

/** روی سرور چیزی ذخیره نشده؛ «نه» تنها فرضی است که با HTMLِ سرور می‌خواند. */
export function motionServerSnapshot(): boolean {
  return false;
}

export function setMotionForced(next: boolean): void {
  motionOn = next;
  motionLoaded = true;
  try {
    localStorage.setItem(MOTION_KEY, next ? "on" : "auto");
  } catch {}
  for (const fn of motionListeners) fn();
}
