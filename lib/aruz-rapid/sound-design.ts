/**
 * طراحیِ صدای بازی.
 *
 * صداها اینجا ساخته می‌شوند، نه در هوکِ React — تا بشود همین کد را در یک
 * OfflineAudioContext رندر کرد و واقعاً *اندازه گرفت*: اوج، طول، و روشناییِ
 * طیف. «به گوش خوب است» ادعای قابلِ بررسی‌ای نیست؛ عدد هست.
 *
 * سه قاعده که همه‌جا رعایت شده:
 *
 *   ۱. کوتاه. طولانی‌ترین صدا (تکمیل) زیرِ نیم ثانیه است و بقیه زیرِ ۳۰۰ms.
 *   ۲. نرم. هیچ موجِ مربعی/اره‌ای‌ای در کار نیست؛ همه سینوسی، مثلثی یا
 *      نویزِ فیلترشده‌اند و از یک lowpass مشترک رد می‌شوند تا لبهٔ تیزِ
 *      دیجیتال نداشته باشند.
 *   ۳. attack کوتاه ولی نه صفر (۲–۲۰ms) و release نمایی — کلیکِ خشکِ
 *      شروع و قطعِ ناگهانیِ پایان، همان چیزی است که صدا را ارزان می‌کند.
 *
 * سلسله‌مراتبِ بلندی عمدی است (بندِ ۱۴ طراحی):
 *   unitAppear ≪ preview/spoiler < correct/wrong/timeout < completion
 * چون تیکِ واحد ده‌ها بار در یک دور تکرار می‌شود و باید تقریباً زیرِ آستانه
 * بماند، ولی تکمیل فقط یک بار می‌آید.
 */

export type RapidAruzSoundName =
  | "previewStart"
  | "spoilerTransition"
  | "unitAppear"
  | "correct"
  | "wrong"
  | "timeout"
  | "complete";

/** اوجِ هر صدا نسبت به بلندیِ کلی. ترتیبشان همان سلسله‌مراتبِ بالاست. */
export const SOUND_PEAK: Record<RapidAruzSoundName, number> = {
  unitAppear: 0.045,
  spoilerTransition: 0.13,
  previewStart: 0.17,
  timeout: 0.16,
  wrong: 0.17,
  correct: 0.17,
  complete: 0.24,
};

/** طولِ تقریبیِ هر صدا (ms) — برای رزروِ بافر در رندرِ آفلاین و برای تست. */
export const SOUND_DURATION_MS: Record<RapidAruzSoundName, number> = {
  unitAppear: 70,
  spoilerTransition: 300,
  previewStart: 340,
  timeout: 240,
  wrong: 140,
  correct: 160,
  complete: 460,
};

const FLOOR = 0.00001;

let noiseCache: WeakMap<BaseAudioContext, AudioBuffer> | null = null;

/** یک ثانیه نویزِ سفید، یک‌بار به ازای هر context. */
function noise(ctx: BaseAudioContext): AudioBuffer {
  noiseCache ??= new WeakMap();
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buffer);
  return buffer;
}

/** پوششِ دامنه: بالا آمدن کوتاه، افتِ نمایی. هرگز قطعِ ناگهانی. */
function envelope(
  gain: GainNode,
  start: number,
  peak: number,
  attack: number,
  duration: number,
) {
  gain.gain.setValueAtTime(FLOOR, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, FLOOR * 2), start + attack);
  gain.gain.exponentialRampToValueAtTime(FLOOR, start + duration);
  gain.gain.setValueAtTime(0, start + duration + 0.005);
}

interface ToneOptions {
  freq: number;
  endFreq?: number;
  peak: number;
  attackMs?: number;
  durationMs: number;
  type?: OscillatorType;
  lowpass?: number;
  delayMs?: number;
}

function tone(ctx: BaseAudioContext, out: AudioNode, at: number, o: ToneOptions) {
  const start = at + (o.delayMs ?? 0) / 1000;
  const duration = o.durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(o.endFreq, start + duration);
  }
  envelope(gain, start, o.peak, (o.attackMs ?? 4) / 1000, duration);

  let node: AudioNode = gain;
  if (o.lowpass !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(o.lowpass, start);
    gain.connect(filter);
    node = filter;
  }
  osc.connect(gain);
  node.connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

interface AirOptions {
  peak: number;
  durationMs: number;
  attackMs?: number;
  filter: "bandpass" | "lowpass";
  from: number;
  to: number;
  q?: number;
  delayMs?: number;
}

/** نویزِ فیلترشده با فرکانسِ متحرک — پایهٔ صداهای «هوا»یی. */
function air(ctx: BaseAudioContext, out: AudioNode, at: number, o: AirOptions) {
  const start = at + (o.delayMs ?? 0) / 1000;
  const duration = o.durationMs / 1000;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.Q.setValueAtTime(o.q ?? 0.8, start);
  filter.frequency.setValueAtTime(o.from, start);
  filter.frequency.exponentialRampToValueAtTime(o.to, start + duration);
  const gain = ctx.createGain();
  envelope(gain, start, o.peak, (o.attackMs ?? 14) / 1000, duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(start);
  src.stop(start + duration + 0.03);
}

/**
 * یک رویدادِ صوتی را روی گرافِ صدا می‌نشاند.
 *
 * چیزی play نمی‌کند و منتظرِ چیزی نمی‌ماند — فقط زمان‌بندی می‌کند. بازی
 * هیچ‌وقت پشتِ صدا نمی‌ایستد.
 */
export function scheduleRapidAruzSound(
  ctx: BaseAudioContext,
  out: AudioNode,
  name: RapidAruzSoundName,
  at: number,
): void {
  const peak = SOUND_PEAK[name];

  switch (name) {
    // ورود به مرحلهٔ مطالعه: یک دمِ هوای بالارونده، تقریباً نامحسوس.
    case "previewStart":
      air(ctx, out, at, { peak, durationMs: 320, from: 480, to: 2200, filter: "bandpass", q: 0.7 });
      tone(ctx, out, at, { freq: 523.25, peak: peak * 0.35, durationMs: 260, attackMs: 40, lowpass: 2400 });
      return;

    // پوشیده‌شدنِ مصراع: همان هوا، ولی رو به پایین — حسِ «افتادنِ پرده».
    case "spoilerTransition":
      air(ctx, out, at, { peak, durationMs: 280, attackMs: 20, from: 3200, to: 520, filter: "lowpass" });
      return;

    // تیکِ واحدِ تازه. کوتاه‌ترین و آرام‌ترین صدای بازی، چون بیشترین تکرار
    // را دارد. اگر روزی آزاردهنده شد، همین‌جا صفر می‌شود.
    case "unitAppear":
      tone(ctx, out, at, { freq: 1760, peak, durationMs: 48, attackMs: 3, lowpass: 5200 });
      return;

    // پاسخِ درست: یک پینگِ تمیز و کوتاه با یک هارمونیکِ آرام. جایزه نیست،
    // تأییدِ لمسی است.
    case "correct":
      tone(ctx, out, at, { freq: 1174.66, peak, durationMs: 130, attackMs: 3, lowpass: 6800 });
      tone(ctx, out, at, { freq: 1760, peak: peak * 0.3, durationMs: 95, attackMs: 3, lowpass: 6800 });
      return;

    // پاسخِ نادرست: یک تقهٔ کوتاه و خفه. نه بوق، نه صدای باخت.
    case "wrong":
      tone(ctx, out, at, { freq: 165, endFreq: 130, peak, durationMs: 130, attackMs: 3, type: "triangle", lowpass: 520 });
      air(ctx, out, at, { peak: peak * 0.28, durationMs: 26, attackMs: 2, from: 1400, to: 700, filter: "lowpass" });
      return;

    // پایانِ زمان: یک ضربانِ فرودی، متفاوت با «نادرست» ولی به همان آرامی.
    case "timeout":
      tone(ctx, out, at, { freq: 560, endFreq: 300, peak, durationMs: 220, attackMs: 6, lowpass: 1500 });
      return;

    // تکمیل: دو نتِ کوچکِ هماهنگ (پنجم) با یک دمِ هوایی. کوتاه می‌ماند —
    // فانفارِ پیروزی نداریم.
    case "complete":
      tone(ctx, out, at, { freq: 659.25, peak, durationMs: 240, attackMs: 6, lowpass: 5200 });
      tone(ctx, out, at, { freq: 987.77, peak: peak * 0.85, durationMs: 300, attackMs: 6, delayMs: 130, lowpass: 5200 });
      air(ctx, out, at, { peak: peak * 0.22, durationMs: 320, attackMs: 40, from: 1600, to: 2600, filter: "bandpass", q: 0.6, delayMs: 90 });
      return;
  }
}

/**
 * زنجیرهٔ خروجی: بلندیِ کلی، سپس یک lowpassِ ملایم.
 *
 * آن فیلترِ آخر عمدی است: بدونش، هارمونیک‌های بالای ۸kHz صدا را «دیجیتالِ
 * ارزان» می‌کنند، مخصوصاً روی بلندگوی گوشی.
 */
export function createRapidAruzBus(ctx: BaseAudioContext, destination: AudioNode, volume: number) {
  const master = ctx.createGain();
  master.gain.value = volume;
  const softener = ctx.createBiquadFilter();
  softener.type = "lowpass";
  softener.frequency.value = 7600;
  softener.Q.value = 0.5;
  master.connect(softener);
  softener.connect(destination);
  return master;
}
