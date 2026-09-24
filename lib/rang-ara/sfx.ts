/* ═══════════════════════════════════════════════════════════════════════════
   «رنگ‌آرا» — صدای دستمال روی شیشه.
   ═══════════════════════════════════════════════════════════════════════════

   بدونِ فایلِ صوتی: با Web Audio ساخته می‌شود، پس هیچ بارگذاریِ اضافه‌ای
   ندارد و دقیقاً با زمان‌بندیِ ضربه‌های دست جفت می‌شود.

     • هر ضربه یک «خش»: نویزِ سفیدِ فیلترشده (باندِ ۲–۳ کیلوهرتز) با پوشِ
       کوتاه — صدای پارچه روی سطحِ صاف.
     • ضربه‌های رفت یک «جیرجیر»ِ ریز هم دارند: یک نوسانگرِ ۱٫۵ کیلوهرتزی که با
       لرزشِ ~۳۸ هرتز مدوله می‌شود؛ همان گیر-و-لغزِ پارچه روی شیشهٔ تمیز.

   ⚠️ `AudioContext` فقط بعد از اولین تعاملِ کاربر ساخته می‌شود (مرورگرها قبلش
   صدا را قفل نگه می‌دارند) و با خروج از بازی بسته می‌شود. روشن/خاموش بودن در
   localStorage می‌ماند؛ هر خواندن/نوشتنش در try است چون در حالتِ خصوصی ممکن
   است خطا بدهد. */

const KEY = "rang-ara:sfx";
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function isSfxOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSfxOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ذخیره نشد؛ فقط برای همین نشست */
  }
  listeners.forEach((l) => l());
}

export function subscribeSfx(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext) {
  if (noise) return noise;
  const len = ac.sampleRate;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

/**
 * کشیدنِ دستمال: `strokes` ضربه در `duration` ثانیه — همان عددهایی که
 * شخصیت با آن‌ها دست را رفت‌وبرگشت می‌برد.
 */
export function playWipe(duration = 0.62, strokes = 6) {
  if (!isSfxOn()) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.01;
  const seg = duration / strokes;
  const out = ac.createGain();
  out.gain.value = 0.9;
  out.connect(ac.destination);

  for (let i = 0; i < strokes; i++) {
    const t = t0 + i * seg;

    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2300 + (i % 2 ? 550 : 0) + Math.random() * 350;
    band.Q.value = 1.1;
    const high = ac.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 900;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.17, t + seg * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seg * 0.95);
    src.connect(band).connect(high).connect(g).connect(out);
    src.start(t, Math.random() * 0.5, seg);

    if (i % 2 === 0) {
      const f0 = 1450 + Math.random() * 350;
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f0, t + seg * 0.2);
      osc.frequency.linearRampToValueAtTime(f0 + 240, t + seg * 0.75);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 38;
      const depth = ac.createGain();
      depth.gain.value = 70;
      lfo.connect(depth).connect(osc.frequency);
      const shape = ac.createBiquadFilter();
      shape.type = "bandpass";
      shape.frequency.value = f0 + 120;
      shape.Q.value = 6;
      const sg = ac.createGain();
      sg.gain.setValueAtTime(0.0001, t + seg * 0.2);
      sg.gain.exponentialRampToValueAtTime(0.04, t + seg * 0.35);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + seg * 0.85);
      osc.connect(shape).connect(sg).connect(out);
      osc.start(t + seg * 0.2);
      osc.stop(t + seg);
      lfo.start(t + seg * 0.2);
      lfo.stop(t + seg);
    }
  }
}

/** صدای ضربه به شخصیت: تَق (سر و دست)، شَتَرق (لُپ)، بوینگ (کاکل)، خنده (شکم). */
export function playHit(kind: "thud" | "slap" | "boing" | "giggle") {
  if (!isSfxOn()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.005;
  const out = ac.createGain();
  out.gain.value = 0.85;
  out.connect(ac.destination);

  const tone = (type: OscillatorType, f0: number, f1: number, at: number, len: number, peak: number) => {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f1, at + len);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + len + 0.02);
  };
  const burst = (freq: number, q: number, len: number, peak: number) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(band).connect(g).connect(out);
    src.start(t, Math.random() * 0.5, len + 0.02);
  };

  switch (kind) {
    case "thud":
      tone("sine", 190, 55, t, 0.2, 0.55);
      burst(900, 0.9, 0.05, 0.3);
      break;
    case "slap":
      burst(2400, 0.7, 0.11, 0.7);
      tone("sine", 340, 170, t, 0.07, 0.18);
      break;
    case "boing": {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(170, t);
      osc.frequency.exponentialRampToValueAtTime(460, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.42);
      const lfo = ac.createOscillator();
      lfo.frequency.value = 17;
      const depth = ac.createGain();
      depth.gain.value = 36;
      lfo.connect(depth).connect(osc.frequency);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.5);
      lfo.start(t);
      lfo.stop(t + 0.5);
      break;
    }
    case "giggle":
      [640, 760, 680, 820].forEach((f, i) => tone("sine", f, f * 0.92, t + i * 0.085, 0.07, 0.16));
      break;
  }
}

export function disposeSfx() {
  void ctx?.close();
  ctx = null;
  noise = null;
}
