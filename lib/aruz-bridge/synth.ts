import type { AruzBridgeSoundName } from "./assets";

/* ═══════════════════════════════════════════════════════════════════════════
   صداهای جانشین، ساخته‌شده در همان لحظه.
   ═══════════════════════════════════════════════════════════════════════════

   تا امروز نبودنِ فایلِ صوتی یعنی سکوتِ کامل — و از بیرون هیچ راهی نبود که
   بفهمی صدا *خراب* است یا فقط *نیامده*. این ماژول آن ابهام را از بین می‌برد:
   اگر فایلی نبود، نمونهٔ صوتی‌اش همین‌جا از پایه ساخته می‌شود.

   نتیجه دو چیز است. اول اینکه بازی همین حالا صدا دارد و کلِ زنجیره —
   بازکردنِ قفلِ مرورگر، رمزگشایی، زمان‌بندی، میکس، قطعِ ضربان — واقعاً و
   قابلِ‌شنیدن کار می‌کند، نه فقط «روی کاغذ». دوم اینکه وقتی فایلِ حرفه‌ای
   اضافه شد، دقیقاً جای همین می‌نشیند و هیچ کدی عوض نمی‌شود.

   این‌ها جایگزینِ صدابرداریِ واقعی نیستند و قرار هم نیست باشند؛ فقط از سکوت
   بهترند و ثابت می‌کنند لوله‌کشی درست است. و هرجا که صدای ساختگی از سکوت
   *بدتر* باشد، سکوت انتخاب می‌شود — صدای بدْ بازی را ارزان نشان می‌دهد.
   به همین دلیل هیچ صدای شکستی ساخته نمی‌شود.

   همه‌چیز مستقیم داخلِ بافر نوشته می‌شود (نه با گرافِ نودها) چون یک بار
   ساخته می‌شود و بارها پخش — و این‌طوری نتیجه بینِ مرورگرها یکسان است.
   ═══════════════════════════════════════════════════════════════════════════ */

/** نوفهٔ سفید در بازهٔ ‎[-1, 1]. */
const noise = () => Math.random() * 2 - 1;

/** افتِ نمایی: در `t=0` برابرِ ۱ و با ثابتِ زمانیِ `tau` کم می‌شود. */
const decay = (t: number, tau: number) => Math.exp(-t / tau);

/** حمله/فرودِ کوتاه تا صدا از ابتدا «تِق» نکند. */
function attack(t: number, ms = 0.004) {
  return Math.min(1, t / ms);
}

interface Ctx {
  sampleRate: number;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer;
}

type Writer = (t: number, i: number) => number;

function render(ctx: Ctx, seconds: number, write: Writer): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.ceil(seconds * rate));
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    // سقفِ نرم، تا هیچ نمونه‌ای فراتر از بازه نرود و بشکند
    data[i] = Math.tanh(write(t, i) * 1.1) * 0.92;
  }
  return buffer;
}

/** دانه‌های پراکنده — پایهٔ صدای ترک و خردشدنِ شیشه. */
function grains(count: number, spread: number, seedFn: () => number) {
  return Array.from({ length: count }, () => ({
    at: Math.pow(seedFn(), 1.7) * spread,
    freq: 1800 + seedFn() * 6500,
    gain: 0.25 + seedFn() * 0.75,
    tau: 0.006 + seedFn() * 0.03,
  }));
}

export function synthesizeSound(name: AruzBridgeSoundName, ctx: Ctx): AudioBuffer {
  switch (name) {
    /* جهش: یک خیزِ کوتاهِ رو به بالا با پفِ هوا. */
    case "jump":
      return render(ctx, 0.24, (t) => {
        const sweep = 260 + 620 * Math.min(1, t / 0.16);
        const body = Math.sin(2 * Math.PI * sweep * t) * decay(t, 0.075);
        const air = noise() * decay(t, 0.045) * 0.18;
        return (body * 0.5 + air) * attack(t);
      });

    /* فرود: ضربهٔ کوتاه و خشک روی سطحِ سخت. */
    case "landing":
      return render(ctx, 0.3, (t) => {
        const pitch = 150 * Math.exp(-t * 14) + 52;
        const thud = Math.sin(2 * Math.PI * pitch * t) * decay(t, 0.09);
        const click = noise() * decay(t, 0.012) * 0.5;
        return (thud * 0.75 + click) * attack(t, 0.002);
      });

    /* ترک: چند تِقِ تیز و نامنظم، نه یک صدای کشیده. */
    case "crack": {
      const g = grains(7, 0.16, Math.random);
      return render(ctx, 0.45, (t) => {
        let s = noise() * decay(t, 0.01) * 0.35;
        for (const grain of g) {
          if (t < grain.at) continue;
          const dt = t - grain.at;
          s += Math.sin(2 * Math.PI * grain.freq * dt) * decay(dt, grain.tau) * grain.gain * 0.4;
        }
        return s * attack(t, 0.001);
      });
    }

    /* خردشدن: انفجارِ اولیه، بعد بارشِ ریزه‌های شیشه. */
    case "shatter": {
      const g = grains(46, 0.85, Math.random);
      return render(ctx, 1.15, (t) => {
        // موجِ اولِ پهن‌باند: لحظهٔ جداشدنِ قطعات
        let s = noise() * decay(t, 0.11) * 0.55;
        // ریزه‌ها: هر کدام یک زنگِ بلندِ کوتاه
        for (const grain of g) {
          if (t < grain.at) continue;
          const dt = t - grain.at;
          s += Math.sin(2 * Math.PI * grain.freq * dt) * decay(dt, grain.tau) * grain.gain * 0.22;
        }
        return s * attack(t, 0.001);
      });
    }

    /* پاسخِ درست: دو نتِ کوتاه و ملایم — نه جشنِ آرکید. */
    case "correct":
      return render(ctx, 0.55, (t) => {
        const a = Math.sin(2 * Math.PI * 660 * t) * decay(t, 0.16);
        const d2 = t - 0.085;
        const b = d2 > 0 ? Math.sin(2 * Math.PI * 990 * d2) * decay(d2, 0.2) : 0;
        return (a * 0.4 + b * 0.4) * attack(t, 0.008);
      });

    /* ضربان: «لاب-داب» و بعد سکوت، تا حلقه‌اش بی‌درز بسته شود. */
    case "heartbeat":
      return render(ctx, 1.0, (t) => {
        const beat = (at: number, gain: number) => {
          const dt = t - at;
          if (dt < 0 || dt > 0.22) return 0;
          const pitch = 68 * Math.exp(-dt * 22) + 34;
          return Math.sin(2 * Math.PI * pitch * dt) * decay(dt, 0.055) * gain;
        };
        return (beat(0, 1) + beat(0.3, 0.72)) * 0.85;
      });

    default:
      return render(ctx, 0.05, () => 0);
  }
}
