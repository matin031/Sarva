"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   صدای «کیمیای وزن» — همه‌چیز سنتزشده، هیچ فایلی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا سنتز و نه sample:

   کلِ صداهای این بازی «مایع و شیشه»اند: تیک، تُق، طنین، جریان، حباب. با
   sample باید ده فایل دانلود می‌شد که هیچ‌کدام *وابسته به حالت* نیستند —
   و مهم‌ترین صدای بازی (ریختن) دقیقاً باید با نرخِ جریان و سطحِ مایع
   تغییر کند. یک بافرِ نویز به‌علاوهٔ چند اسیلاتور همان کار را با صفر
   بایت شبکه و کنترلِ پیوسته انجام می‌دهد.

   ── ساختار ────────────────────────────────────────────────────────────────
       منبع‌ها → گینِ هر صدا → master (−۱۲dB) → compressor → destination

   ⚠️ فشرده‌سازِ ملایم روی خروجی هست چون چند لایه ممکن است هم‌زمان بیفتند
   (جریان + حباب + تُق). بدونش، جمعشان به کلیپ می‌خورد و «تِرَق» می‌کند.

   ⚠️ سقفِ هم‌زمانی هشت صداست و قدیمی‌ترین قطع می‌شود. روی گوشیِ متوسط،
   بیست گرهٔ زنده در حلقهٔ تعامل خودش را به‌صورتِ پرشِ فریم نشان می‌دهد.

   ── چند حقیقتِ ناخوشایند که دور زدنی نیستند ───────────────────────────────
   • روی iOS، کلیدِ فیزیکیِ بی‌صدا WebAudio را هم می‌بندد. هیچ راهی برای
     دور زدنش نیست (و نباید هم باشد).
   • هیچ صدایی پیش از اولین ژستِ واقعیِ کاربر پخش نمی‌شود؛ مرورگرها
     `AudioContext` را تا آن لحظه `suspended` نگه می‌دارند.
   • *کیفیتِ* صدا با گوش تنظیم می‌شود و assert‌شدنی نیست. چیزی که تست
     می‌شود، ترتیب و زمان‌بندی و پاکسازیِ گره‌هاست.
   ═══════════════════════════════════════════════════════════════════════════ */

export type KimiaSfx =
  /** لمسِ پخش‌کننده — تیکِ شیشه‌ای. */
  | "valve"
  /** نشستنِ شیشه در جایگاه — تُق + طنین. */
  | "settle"
  /** برگشتنِ شیشه به پخش‌کننده (و «از نو») — همان، آرام‌تر و کمی زیرتر. */
  | "drain"
  /** حل شدنِ رنگ‌ها — whooshِ پایین‌گذر. */
  | "blend"
  /** ترکیب پایدار شد. */
  | "correct"
  /** ترکیب ناپایدار شد. */
  | "wrong";

/* ⚠️ عمداً کوتاه است. «مخزن پر شد»، «آزمایشِ ترکیب» و «بیتِ بعد» صدا
   ندارند: هیچ‌کدام رویدادِ *فیزیکیِ* روی صحنه نبودند و فقط شلوغی صوتی
   می‌ساختند. صدای *ریختن* هم یک رویدادِ تک‌ضربه‌ای نیست؛ یک صدای پیوسته
   است و از `startPourVoice()` می‌آید. */

/** پارامترهای قابلِ تنظیم — پنلِ توسعه همین‌ها را عوض می‌کند. */
export type SfxParams = {
  master: number;
  tick: { gain: number; freq: number; ms: number };
  settle: { gain: number; freq: number; ms: number; ringFreq: number; ringMs: number };
  ret: { gain: number; freq: number; ms: number };
  pour: { gain: number; fromHz: number; toHz: number; q: number; lowpass: number; bubbles: number };
  bubble: { gain: number; minHz: number; maxHz: number; ms: number };
  blend: { gain: number; fromHz: number; ms: number };
  correct: { gain: number; freq: number; ms: number };
  wrong: { gain: number; freq: number; ms: number };
};

/**
 * مقادیرِ پیش‌فرض.
 *
 * ⚠️ اینها نقطهٔ *شروع* تنظیم‌اند و نه عددهای مقدس: پنلِ توسعه همین‌ها را
 * زنده عوض می‌کند و دکمهٔ «کپی مقدارها» خروجیِ نهایی را می‌دهد.
 */
export const SFX_DEFAULTS: SfxParams = {
  /** ≈ −۱۲dB. */
  master: 0.25,
  tick: { gain: 0.5, freq: 2400, ms: 30 },
  settle: { gain: 0.6, freq: 320, ms: 90, ringFreq: 1800, ringMs: 120 },
  /** برگشت: ~۶dB آرام‌تر از نشستن و کمی زیرتر. */
  ret: { gain: 0.3, freq: 380, ms: 80 },
  pour: { gain: 0.5, fromHz: 900, toHz: 2400, q: 0.8, lowpass: 5200, bubbles: 1 },
  bubble: { gain: 0.35, minHz: 400, maxHz: 1400, ms: 55 },
  blend: { gain: 0.4, fromHz: 1800, ms: 600 },
  correct: { gain: 0.35, freq: 587.33, ms: 160 },
  wrong: { gain: 0.4, freq: 90, ms: 120 },
};

let params: SfxParams = structuredCloneSafe(SFX_DEFAULTS);

export function sfxParams(): SfxParams {
  return params;
}

/** فقط پنلِ توسعه. در production کسی صدایش نمی‌زند. */
export function setSfxParams(next: SfxParams): void {
  params = next;
  if (kit) kit.master.gain.value = next.master;
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const STORAGE_KEY = "kimia-sfx";
const MAX_VOICES = 8;
const KILL_RAMP = 0.02;

type Kit = {
  ctx: AudioContext;
  master: GainNode;
  comp: DynamicsCompressorNode;
  noise: AudioBuffer;
};

type Voice = {
  gain: GainNode;
  /** منبع‌ها — این‌ها `stop()` هم لازم دارند. */
  nodes: AudioScheduledSourceNode[];
  /** بقیهٔ گره‌های مسیر (فیلترها). */
  parts: AudioNode[];
  endsAt: number;
  /** تایمرِ پاکسازیِ طبیعی، تا با مرگِ زودرس دوبار اجرا نشود. */
  sweep?: number;
};

let kit: Kit | null = null;
let enabled = true;
let loaded = false;
let voices: Voice[] = [];
let visibilityBound = false;

/* ─────────────────── ترجیحِ کاربر، بیرون از React ──────────────────────
   همان الگوی بقیهٔ بازی‌ها: یک store کوچک و `useSyncExternalStore`. */
const listeners = new Set<() => void>();

export function subscribeSfx(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** ⚠️ مقدار cache می‌شود، وگرنه `getSnapshot` هر بار تازه می‌شود و React
 *  بی‌نهایت رندر می‌کند. */
export function isSfxEnabled(): boolean {
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

export function sfxServerSnapshot(): boolean {
  return true;
}

export function setSfxEnabled(next: boolean): void {
  enabled = next;
  loaded = true;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {}
  if (next) ensureKit();
  else stopAllVoices(true);
  for (const fn of listeners) fn();
}

/* ───────────────────────────── موتور ──────────────────────────────────── */

/**
 * ساختِ گرافِ صدا.
 *
 * ⚠️ فقط از دلِ یک ژستِ واقعیِ کاربر، و `resume()` هم *داخلِ همان
 * handler* صدا زده می‌شود — این شرطِ iOS است و نه یک احتیاطِ اضافه.
 */
function ensureKit(): Kit | null {
  if (typeof window === "undefined") return null;
  if (!kit) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 18;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      comp.connect(ctx.destination);

      const master = ctx.createGain();
      master.gain.value = params.master;
      master.connect(comp);

      /* ⚠️ دو ثانیه نویزِ سفید، *یک بار*: جریان این بافر را loop می‌کند و
         حباب‌ها هم از همین می‌خورند. ساختنش در هر رویداد، روی گوشیِ
         متوسط وسطِ تعامل دیده می‌شود. */
      const frames = Math.floor(ctx.sampleRate * 2);
      const noise = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

      kit = { ctx, master, comp, noise };
      bindVisibility();
    } catch {
      return null;
    }
  }
  if (kit.ctx.state === "suspended") void kit.ctx.resume().catch(() => {});
  return kit;
}

/** تبِ پنهان: context معلق می‌شود و با برگشتن، دوباره بیدار. */
function bindVisibility(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (!kit) return;
    if (document.visibilityState === "hidden") {
      stopAllVoices(true);
      void kit.ctx.suspend().catch(() => {});
    } else if (isSfxEnabled()) {
      void kit.ctx.resume().catch(() => {});
    }
  });
}

/** باز کردنِ قفلِ صدا از دلِ یک ژست. */
export function unlockSfx(): void {
  if (!isSfxEnabled()) return;
  ensureKit();
}

/** زمانِ ساعتِ صدا — خطِ زمانیِ ریختن با همین هماهنگ می‌شود. */
export function sfxNow(): number {
  return kit?.ctx.currentTime ?? 0;
}

/**
 * جبرانِ تأخیرِ خروجی.
 *
 * ⚠️ صدایی که *همین حالا* زمان‌بندی شود، `outputLatency` دیرتر شنیده
 * می‌شود. وقتی خطِ زمانی می‌داند رویدادی `leadMs` بعد می‌آید، صدا را
 * همان‌قدر زودتر می‌گذاریم تا با تصویر یکی شنیده شود. اگر فرصت نباشد،
 * همین حالا پخش می‌شود و تأخیر می‌ماند — دروغ نمی‌گوییم.
 */
export function sfxTime(leadMs = 0): number {
  const k = kit;
  if (!k) return 0;
  const latency = k.ctx.outputLatency || k.ctx.baseLatency || 0;
  return k.ctx.currentTime + Math.max(0, leadMs / 1000 - latency);
}

/**
 * توقفِ کامل و رها کردنِ context.
 *
 * ⚠️ بدونِ این، رفتن به صفحهٔ دیگر یک AudioContextِ زنده جا می‌گذارد و
 * بعضی مرورگرها بعد از شش‌تا اصلاً context تازه نمی‌دهند.
 */
export function disposeSfx(): void {
  stopAllVoices(true);
  const k = kit;
  kit = null;
  if (!k) return;
  try {
    k.master.disconnect();
    k.comp.disconnect();
    void k.ctx.close().catch(() => {});
  } catch {}
}

/* ───────────────────────── مدیریتِ صداها ──────────────────────────────── */

/**
 * ثبتِ یک صدا.
 *
 * ⚠️ هر صدا *همهٔ* گره‌هایش را با خودش می‌برد و خودش بعد از تمام شدن
 * قطعشان می‌کند. نسخهٔ اول فقط گین را قطع می‌کرد و بقیه را به
 * `onended` و garbage collector می‌سپرد؛ تستِ چرخهٔ عمر نشان داد
 * فیلترها و اسیلاتورها وصل می‌مانند.
 */
function remember(voice: Voice): void {
  voices.push(voice);
  const ms = Math.max(0, (voice.endsAt - (kit?.ctx.currentTime ?? 0)) * 1000) + 80;
  voice.sweep = window.setTimeout(() => {
    releaseVoice(voice);
    voices = voices.filter((v) => v !== voice);
  }, ms);
  /* سقفِ هم‌زمانی: قدیمی‌ترین‌ها با ramp قطع می‌شوند و نه ناگهانی. */
  while (voices.length > MAX_VOICES) {
    const oldest = voices.shift();
    if (oldest) killVoice(oldest, false);
  }
  const now = kit?.ctx.currentTime ?? 0;
  voices = voices.filter((v) => v === voice || v.endsAt > now);
}

/** قطعِ همهٔ گره‌های یک صدا. بی‌خطر اگر دوبار صدا زده شود. */
function releaseVoice(voice: Voice): void {
  if (voice.sweep !== undefined) {
    window.clearTimeout(voice.sweep);
    voice.sweep = undefined;
  }
  for (const node of [...voice.nodes, ...voice.parts, voice.gain]) {
    try {
      node.disconnect();
    } catch {}
  }
}

function killVoice(voice: Voice, immediate: boolean): void {
  const k = kit;
  if (!k) return;
  const t = k.ctx.currentTime;
  const ramp = immediate ? KILL_RAMP : KILL_RAMP * 2;
  try {
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), t);
    voice.gain.gain.linearRampToValueAtTime(0, t + ramp);
    for (const node of voice.nodes) {
      try {
        node.stop(t + ramp + 0.01);
      } catch {}
    }
  } catch {}
  if (voice.sweep !== undefined) {
    window.clearTimeout(voice.sweep);
    voice.sweep = undefined;
  }
  window.setTimeout(() => releaseVoice(voice), 80);
}

/**
 * قطعِ همهٔ صداها با ramp.
 *
 * ⚠️ در لغوِ خطِ زمانی (ریست، تعویضِ بیت، unmount، سوارِ دومِ StrictMode)
 * صدا زده می‌شود. بدونِ ramp، قطعِ ناگهانیِ یک نویزِ در حالِ پخش یک
 * «کلیک» می‌دهد که از خودِ صدا بدتر است.
 */
export function stopAllVoices(immediate = false): void {
  const list = voices;
  voices = [];
  for (const voice of list) killVoice(voice, immediate);
  pourVoice?.dispose(immediate);
}

/* ───────────────────────── مصالحِ پایه ────────────────────────────────── */

function envelope(gain: GainNode, at: number, peak: number, attack: number, dur: number): void {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
}

function tone(
  k: Kit,
  o: { at: number; freq: number; to?: number; dur: number; peak: number; type?: OscillatorType },
): void {
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
  remember({ gain, nodes: [osc], parts: [], endsAt: o.at + o.dur + 0.05 });
}

function noiseBurst(
  k: Kit,
  o: {
    at: number;
    from: number;
    to?: number;
    q: number;
    dur: number;
    peak: number;
    attack?: number;
    type?: BiquadFilterType;
  },
): void {
  const src = k.ctx.createBufferSource();
  src.buffer = k.noise;
  src.loop = true;

  const filter = k.ctx.createBiquadFilter();
  filter.type = o.type ?? "bandpass";
  filter.Q.value = o.q;
  filter.frequency.setValueAtTime(o.from, o.at);
  if (o.to !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(o.to, 20), o.at + o.dur);
  }

  const gain = k.ctx.createGain();
  envelope(gain, o.at, o.peak, o.attack ?? Math.min(0.03, o.dur / 4), o.dur);

  src.connect(filter).connect(gain).connect(k.master);
  src.start(o.at);
  src.stop(o.at + o.dur + 0.03);
  remember({ gain, nodes: [src], parts: [filter], endsAt: o.at + o.dur + 0.06 });
}

/* ───────────────────── لاگِ توسعه برای تست ────────────────────────────── */

const DEV = process.env.NODE_ENV === "development";

export type SfxLogEntry = { name: string; audioAt: number; timelineMs: number | null; wall: number };

function logSfx(name: string, audioAt: number, timelineMs: number | null): void {
  if (!DEV || typeof window === "undefined") return;
  const store = ((window as unknown as { __sfxLog?: SfxLogEntry[] }).__sfxLog ??= []);
  store.push({ name, audioAt, timelineMs, wall: performance.now() });
  if (store.length > 400) store.splice(0, store.length - 400);
}

/* ────────────────────────── رویدادهای تک ──────────────────────────────── */

export type SfxCue = {
  /** زمانِ همین رویداد روی ساعتِ خطِ زمانی — فقط برای لاگ و تست. */
  timelineMs?: number;
  /** رویداد این‌قدر دیگر *دیده* می‌شود؛ صدا به همان اندازه زودتر می‌رود. */
  leadMs?: number;
};

/**
 * پخشِ یک رویداد.
 *
 * ⚠️ هیچ‌وقت throw نمی‌کند و هیچ‌وقت چیزی را await نمی‌کند: صدا یک لایهٔ
 * تزئینی است و نباید بتواند یک دورِ تمرین را خراب کند.
 *
 * ⚠️ و وقتی صدا خاموش است، *هیچ گرهی ساخته نمی‌شود* — نه ساخته و بی‌صدا،
 * که همان هزینهٔ CPU را دارد.
 */
export function playKimiaSfx(name: KimiaSfx, cue?: SfxCue): void {
  if (!isSfxEnabled()) return;
  const k = ensureKit();
  if (!k) return;

  try {
    const at = sfxTime(cue?.leadMs ?? 0);
    const p = params;

    switch (name) {
      /* تیکِ شیشه‌ای — کوتاه‌ترین صدای بازی، در هر لمس. */
      case "valve": {
        const dur = p.tick.ms / 1000;
        noiseBurst(k, { at, from: p.tick.freq, to: p.tick.freq * 0.6, q: 7, dur, peak: p.tick.gain * 0.5, attack: 0.002 });
        tone(k, { at, freq: p.tick.freq, to: p.tick.freq * 0.7, dur: dur * 1.1, peak: p.tick.gain * 0.35 });
        break;
      }

      /* تُق + طنینِ شیشه. */
      case "settle": {
        const dur = p.settle.ms / 1000;
        tone(k, { at, freq: p.settle.freq, to: p.settle.freq * 0.45, dur, peak: p.settle.gain * 0.7 });
        noiseBurst(k, { at, from: p.settle.freq * 3, to: p.settle.freq, q: 1.4, dur: dur * 0.6, peak: p.settle.gain * 0.3, attack: 0.004 });
        tone(k, {
          at: at + 0.01,
          freq: p.settle.ringFreq,
          dur: p.settle.ringMs / 1000,
          peak: p.settle.gain * 0.18,
        });
        break;
      }

      /* برگشتِ شیشه (و «از نو») — همان تُق، ~۶dB آرام‌تر و کمی زیرتر. */
      case "drain": {
        const dur = p.ret.ms / 1000;
        tone(k, { at, freq: p.ret.freq, to: p.ret.freq * 0.5, dur, peak: p.ret.gain * 0.7 });
        noiseBurst(k, { at, from: p.ret.freq * 2.4, to: p.ret.freq, q: 1.6, dur: dur * 0.5, peak: p.ret.gain * 0.25, attack: 0.004 });
        break;
      }

      /* حل شدنِ رنگ‌ها — whooshِ پایین‌گذر. */
      case "blend":
        noiseBurst(k, {
          at,
          from: p.blend.fromHz,
          to: 220,
          q: 0.6,
          dur: p.blend.ms / 1000,
          peak: p.blend.gain * 0.5,
          attack: 0.1,
          type: "lowpass",
        });
        break;

      /* موفقیت — دو نتِ کوتاه به فاصلهٔ پنجم. بدونِ jingle. */
      case "correct": {
        const dur = p.correct.ms / 1000;
        tone(k, { at, freq: p.correct.freq, dur, peak: p.correct.gain * 0.6 });
        tone(k, { at: at + dur * 0.55, freq: p.correct.freq * 1.5, dur, peak: p.correct.gain * 0.5 });
        break;
      }

      /* خطا — ضربهٔ کم‌صدا و مات. */
      case "wrong": {
        const dur = p.wrong.ms / 1000;
        tone(k, { at, freq: p.wrong.freq, to: p.wrong.freq * 0.7, dur, peak: p.wrong.gain * 0.7 });
        noiseBurst(k, { at, from: 400, to: 160, q: 0.8, dur: dur * 0.8, peak: p.wrong.gain * 0.25, attack: 0.006, type: "lowpass" });
        break;
      }

    }

    logSfx(name, at, cue?.timelineMs ?? null);
  } catch {
    /* صدا هیچ‌وقت نباید بازی را بشکند. */
  }
}

/* ─────────────────────── صدای پیوستهٔ ریختن ───────────────────────────── */

export type PourVoice = {
  /**
   * به‌روزرسانیِ جریان.
   *
   * @param flow  نرخِ خروجِ مایع، نرمال‌شده بینِ ۰ و ۱
   * @param level پرشدگیِ ظرف بینِ ۰ و ۱ — فرکانسِ مرکزی با آن بالا می‌رود
   */
  set(flow: number, level: number): void;
  /** حبابِ کوتاهِ نقطهٔ برخورد. */
  bubble(intensity: number): void;
  /** خاموشیِ نرم. */
  stop(): void;
  dispose(immediate: boolean): void;
};

let pourVoice: (PourVoice & { live: boolean }) | null = null;

/**
 * صدای ریختن — یک نویزِ loopِ فیلترشده که تا پایانِ ترکیب زنده می‌ماند.
 *
 * ⚠️ چرا یک صدای پیوسته و نه چند تک‌ضربه: ریختن یک *حالت* است و نه یک
 * رویداد. با تک‌ضربه‌ها، تغییرِ نرخِ جریان و بالا آمدنِ سطحِ مایع اصلاً
 * شنیده نمی‌شد.
 *
 * ⚠️ و پارامترها با `setTargetAtTime` حرکت می‌کنند و نه با set در هر
 * فریم: خطِ زمانی ۶۰ بار در ثانیه به‌روز می‌شود ولی هر `setValueAtTime`
 * یک پله است و پله‌ها روی نویز شنیده می‌شوند. نمونه‌برداری هم ~۲۵ هرتز
 * است (`PourVoiceThrottleMs` در خطِ زمانی).
 */
export function startPourVoice(): PourVoice | null {
  if (!isSfxEnabled()) return null;
  const k = ensureKit();
  if (!k) return null;

  try {
    pourVoice?.dispose(true);

    const src = k.ctx.createBufferSource();
    src.buffer = k.noise;
    src.loop = true;

    const band = k.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = params.pour.q;
    band.frequency.value = params.pour.fromHz;

    /* یک پایین‌گذرِ ثانویه، فقط برای نرمی. */
    const soft = k.ctx.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = params.pour.lowpass;

    const gain = k.ctx.createGain();
    gain.gain.value = 0.0001;

    src.connect(band).connect(soft).connect(gain).connect(k.master);
    src.start();

    const voice: PourVoice & { live: boolean } = {
      live: true,
      set(flow, level) {
        if (!kit || !this.live) return;
        const t = kit.ctx.currentTime;
        const target = Math.max(0.0001, Math.min(1, flow) * params.pour.gain);
        gain.gain.setTargetAtTime(target, t, 0.05);
        const hz =
          params.pour.fromHz + (params.pour.toHz - params.pour.fromHz) * Math.min(1, Math.max(0, level));
        band.frequency.setTargetAtTime(hz, t, 0.08);
      },
      bubble(intensity) {
        if (!kit || !this.live) return;
        const p = params.bubble;
        if (p.gain <= 0 || params.pour.bubbles <= 0) return;
        const at = kit.ctx.currentTime;
        const from = p.minHz + Math.random() * (p.maxHz - p.minHz);
        tone(kit, {
          at,
          freq: from,
          to: from * 1.8,
          dur: p.ms / 1000,
          peak: p.gain * 0.35 * Math.min(1, Math.max(0.2, intensity)),
        });
      },
      stop() {
        if (!kit || !this.live) return;
        logSfx("pour:stop", kit.ctx.currentTime, null);
        const t = kit.ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
        gain.gain.linearRampToValueAtTime(0, t + 0.12);
        this.live = false;
        window.setTimeout(() => this.dispose(true), 200);
      },
      dispose(immediate) {
        this.live = false;
        if (pourVoice === this) pourVoice = null;
        try {
          const t = kit?.ctx.currentTime ?? 0;
          if (kit) {
            gain.gain.cancelScheduledValues(t);
            gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
            gain.gain.linearRampToValueAtTime(0, t + (immediate ? KILL_RAMP : 0.08));
          }
          src.stop((kit?.ctx.currentTime ?? 0) + KILL_RAMP + 0.01);
        } catch {}
        window.setTimeout(() => {
          try {
            src.disconnect();
            band.disconnect();
            soft.disconnect();
            gain.disconnect();
          } catch {}
        }, 120);
      },
    };

    pourVoice = voice;
    logSfx("pour:start", k.ctx.currentTime, null);
    return voice;
  } catch {
    return null;
  }
}

/** فقط برای تست: چند صدای زنده در صف است. */
export function activeVoiceCount(): number {
  const now = kit?.ctx.currentTime ?? 0;
  return voices.filter((v) => v.endsAt > now).length;
}
