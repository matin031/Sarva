"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type AnimationPlaybackControls,
  type MotionValue,
  type ValueAnimationTransition,
} from "motion/react";
import type { HitZone } from "@/lib/rang-ara/content";

/* ═══════════════════════════════════════════════════════════════════════════
   شخصیتِ «رنگ‌آرا».
   ═══════════════════════════════════════════════════════════════════════════

   ── دو لایه، یک دستگاهِ مختصات ─────────────────────────────────────────────
   شخصیت واقعاً پشتِ کارت ایستاده، پس دو SVG دارد که هر دو کلِ صحنه را
   می‌پوشانند و کارت بینشان است:

       .ra-char-back   (z 1)  بدن و سر — نیمهٔ پایینِ بدن زیرِ کارت پنهان است
       .ra-card        (z 2)
       .ra-char-front  (z 3)  بازوها، دست‌ها و دستمال — از لبهٔ کارت رد می‌شوند

   هر دو یک `translate(anchor) scale(s)` دارند، پس همه‌چیز در واحدِ محلیِ
   شخصیت نوشته می‌شود: (0,0) وسطِ بدن روی لبهٔ بالای کارت است و y منفی یعنی
   بالاتر از لبه. هدف‌ها (واژه‌ها) با `toLocal` به همین واحد برمی‌گردند.

   ── پاک کردن، به ترتیب ─────────────────────────────────────────────────────
   دست‌به‌دست کردنِ دستمال (اگر واژه آن سمتِ بدن است) → سُر خوردن پشتِ کارت
   به طرفِ واژه، با قدم‌های کوتاه و دستِ آزاد که روی لبه جابه‌جا می‌شود →
   بالا آوردنِ دست (مکثِ پیش از حرکت) → رسیدن روی یک قوس → تماس و پهن شدنِ
   پارچه → چند رفت‌وبرگشت که هر بار جلوتر می‌رود → برداشتن → برگشت با فنر.

   ── چرا بازو شکلِ پرشده است و نه یک خط ────────────────────────────────────
   نسخهٔ اول یک stroke با پهنای ثابت بود و وقتی تا مصراعِ دوم کش می‌آمد، یک
   چوبِ صاف می‌شد. حالا بازو یک لولهٔ باریک‌شونده است (پهن در شانه، باریک در
   مچ، و هرچه کشیده‌تر باریک‌تر) که همیشه کمی قوس دارد.

   چرخشِ دستمال انیمیشنِ جداگانه ندارد: از *سرعتِ واقعیِ دست* با یک فنرِ
   کم‌میرا ساخته می‌شود، پس هر حرکتی خودش جا ماندن و تابِ پارچه را می‌سازد.

   ── ضربه ──────────────────────────────────────────────────────────────────
   هر تکهٔ بدن یک ناحیهٔ نامرئیِ کلیک‌پذیر دارد و واکنشِ خودش: سر گیج می‌رود
   و ستاره می‌بیند، چشم بسته می‌شود و اشک می‌ریزد، لپ سرخ می‌شود و سر
   برمی‌گردد، کاکل فنر می‌خورد، شکم قلقلکی است، دست تکان می‌خورد و دستمال
   تاب. جمله‌اش را بازی می‌گوید (`onPoke`). وسطِ پاک کردن فقط چهره واکنش
   نشان می‌دهد تا دست از مسیرش بیرون نیفتد.

   ⚠️ رنگ‌ها با کلاس می‌آیند و نه با `fill="var(--…)"`: متغیرِ CSS در
   attributeِ نمایشیِ SVG همه‌جا پشتیبانی نمی‌شود. */

export type Mood =
  | "neutral"
  | "curious"
  | "happy"
  | "proud"
  | "annoyed"
  | "skeptic"
  | "focused"
  | "smug"
  | "hurt"
  | "tickled"
  | "sulky";

export type Anchor = { x: number; y: number; s: number };

export type WipeOptions = {
  /** رنگِ لکه‌ای که روی دستمال می‌ماند. */
  stain: string;
  onContact?: () => void;
  /** پیشرفتِ پاک شدن (۰ تا ۱) و جهتش؛ فقط رو به جلو صدا زده می‌شود. */
  onProgress: (p: number, dir: "rtl" | "ltr") => void;
};

export type MascotHandle = {
  lookAt: (clientX: number, clientY: number) => void;
  lookAway: () => void;
  wipe: (target: DOMRect, opts: WipeOptions) => Promise<void>;
  cheer: () => void;
  startle: () => void;
  /** قهر: سرش را برمی‌گرداند و تا `ms` میلی‌ثانیه به نشانگر نگاه نمی‌کند. */
  sulk: (ms: number) => void;
};

/* ── هندسه (واحدِ محلی) ─────────────────────────────────────────────────── */

const SHOULDER = { x: 29, y: -44 };
const REST = { L: { x: -49, y: 1 }, R: { x: 49, y: 1 } };
const ARM_LENGTH = 56;
const EYE_Y = -95;
const HEAD_HALF = 51;
/** فاصلهٔ لبهٔ راستِ حباب از مرکزِ سر، و ارتفاعِ مرکزِ حباب. */
const BUBBLE_GAP = 60;
const BUBBLE_Y = -97;

const TUFT =
  "M-5 -139C-15 -147 -15 -161 -6 -169C0 -174.5 9.5 -174 12 -167.5C13.6 -163 10.5 -159.5 7 -161.5C9.5 -154 6 -145 -5 -139Z";
const HEAD =
  "M0 -142C33 -142 51 -125 51 -97C51 -69 31 -52 0 -52C-31 -52 -51 -69 -51 -97C-51 -125 -33 -142 0 -142Z";
const BODY = "M-25 -63C-36 -61 -41 -51 -42 -37L-49 96L49 96L42 -37C41 -51 36 -61 25 -63Z";
/* دستمالی که از یک گوشه گرفته شده: لوزیِ نرم با گوشهٔ پایینیِ کمی کج. */
const CLOTH = "M-1 -3C-6 3 -12 9 -16 15C-12 21 -6 28 2 35C7 28 12 21 16 13C12 8 6 3 1 -3Z";
const CLOTH_HEM =
  "M-1 0.6C-5.4 6 -10.4 11 -13.2 15.2C-10 20 -5.2 25.6 1.8 31.6C6 25.6 10.2 20 13.2 13.4C10 9 5.2 5 1 0.6Z";

/* دهان‌ها همه دقیقاً یک قالب دارند («M n n C n n n n n n C n n n n n n Z»،
   با همین فاصله‌ها) تا motion بتواند عددبه‌عدد بینشان morph کند. */
const MOUTH = {
  neutral: "M -8 0 C -4 3 4 3 8 0 C 4 3 -4 3 -8 0 Z",
  smile: "M -10 -1 C -5 4.5 5 4.5 10 -1 C 5 4.5 -5 4.5 -10 -1 Z",
  grin: "M -11 -2 C -6 0 6 0 11 -2 C 8 12 -8 12 -11 -2 Z",
  o: "M -4.5 0 C -4.5 -6 4.5 -6 4.5 0 C 4.5 6 -4.5 6 -4.5 0 Z",
  flat: "M -8 1 C -4 0.2 4 -0.2 8 0.4 C 4 -0.2 -4 0.2 -8 1 Z",
  side: "M -8 1.5 C -3 1.5 3 0.5 9 -3 C 3 0.5 -3 1.5 -8 1.5 Z",
  pout: "M -6 2.5 C -3 -1 3 -1 6 2.5 C 3 -1 -3 -1 -6 2.5 Z",
  ouch: "M -7 -1 C -7 -5.5 7 -5.5 7 -1 C 7 7 -7 7 -7 -1 Z",
} as const;

type Face = {
  /** ابروی چپ/راست: [جابه‌جاییِ عمودی، چرخش] */
  bl: [number, number];
  br: [number, number];
  mouth: keyof typeof MOUTH;
  squint: number;
  smile: number;
  cheek: number;
  tilt: number;
};

const FACES: Record<Mood, Face> = {
  neutral: { bl: [0, 0], br: [0, 0], mouth: "neutral", squint: 0, smile: 0, cheek: 0.62, tilt: 0 },
  curious: { bl: [-4, -7], br: [0.5, 3], mouth: "o", squint: 0, smile: 0, cheek: 0.62, tilt: -5 },
  happy: { bl: [-4, -5], br: [-4, 5], mouth: "grin", squint: 0, smile: 0.62, cheek: 1, tilt: 3 },
  proud: { bl: [-2.5, -3], br: [-2.5, 3], mouth: "smile", squint: 0, smile: 0.3, cheek: 0.85, tilt: 2 },
  annoyed: { bl: [2.5, 15], br: [2.5, -15], mouth: "flat", squint: 0.4, smile: 0, cheek: 0.4, tilt: -7 },
  skeptic: { bl: [-6, -9], br: [2, -12], mouth: "side", squint: 0.22, smile: 0, cheek: 0.4, tilt: 6 },
  focused: { bl: [1.5, 9], br: [1.5, -9], mouth: "pout", squint: 0.28, smile: 0, cheek: 0.45, tilt: 0 },
  /* «خب، تمیزش کردم»: یک ابرو بالا، نیم‌لبخندِ یک‌طرفه. */
  smug: { bl: [-3.5, -5], br: [0.5, 3], mouth: "side", squint: 0.14, smile: 0.18, cheek: 0.6, tilt: 3 },
  /* درد: ابروها از وسط بالا، دهانِ باز، چشم‌ها به‌هم فشرده. */
  hurt: { bl: [-3, -14], br: [-3, 14], mouth: "ouch", squint: 0.55, smile: 0, cheek: 0.9, tilt: -4 },
  tickled: { bl: [-4, -6], br: [-4, 6], mouth: "grin", squint: 0.62, smile: 0.7, cheek: 1, tilt: 5 },
  sulky: { bl: [2, 12], br: [2, -12], mouth: "pout", squint: 0.3, smile: 0, cheek: 0.95, tilt: -8 },
};

/** صدای ضربه روی حبابِ کمیک، به تفکیکِ جایی که خورده. */
const HIT_WORD: Record<HitZone, string> = {
  head: "تَق!",
  eye: "آخ!",
  cheek: "شَتَرق!",
  mouth: "مُمف!",
  tuft: "بوینگ!",
  belly: "هه‌هه!",
  hand: "تَلَق!",
  cloth: "فِش!",
};

/** ستارهٔ دندانه‌دارِ کمیک، با دندانه‌های کمی نامنظم. */
const BURST = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 30 : i % 4 === 0 ? 47 : 42;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
})();

type Burst = { id: number; x: number; y: number; word: string; rot: number };

const FACE_SPRING = { type: "spring", stiffness: 520, damping: 26, mass: 0.7 } as const;
const RETURN_SPRING = { type: "spring", stiffness: 190, damping: 17, mass: 0.85 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/**
 * بازوی کشسان: یک منحنیِ درجه‌دو از شانه تا دست که دورش یک لولهٔ باریک‌شونده
 * کشیده می‌شود. وقتی دست نزدیک است آرنج به بیرون خم می‌شود (طولِ بازو تقریباً
 * ثابت می‌ماند)؛ وقتی دور است هنوز کمی قوس دارد و باریک‌تر می‌شود.
 */
function armShape(sx: number, sy: number, hx: number, hy: number, side: -1 | 1) {
  const dx = hx - sx;
  const dy = hy - sy;
  const d = Math.hypot(dx, dy) || 1;
  const sag = Math.max(d < ARM_LENGTH ? Math.sqrt(ARM_LENGTH * ARM_LENGTH - d * d) * 0.55 : 0, d * 0.09);
  let nx = -dy / d;
  let ny = dx / d;
  if (nx * side < 0) {
    nx = -nx;
    ny = -ny;
  }
  const cx = sx + dx / 2 + nx * sag;
  const cy = sy + dy / 2 + ny * sag;

  const thin = Math.sqrt(clamp(ARM_LENGTH / d, 0.55, 1));
  const w0 = 10.4 * thin;
  const w1 = 7.6 * thin;
  const N = 14;
  const a: string[] = [];
  const b: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const u = 1 - t;
    const px = u * u * sx + 2 * u * t * cx + t * t * hx;
    const py = u * u * sy + 2 * u * t * cy + t * t * hy;
    let tx = 2 * u * (cx - sx) + 2 * t * (hx - cx);
    let ty = 2 * u * (cy - sy) + 2 * t * (hy - cy);
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const hw = (w0 + (w1 - w0) * t) / 2;
    a.push(`${(px - ty * hw).toFixed(2)} ${(py + tx * hw).toFixed(2)}`);
    b.push(`${(px + ty * hw).toFixed(2)} ${(py - tx * hw).toFixed(2)}`);
  }
  b.reverse();
  const r1 = (w1 / 2).toFixed(2);
  const r0 = (w0 / 2).toFixed(2);
  return `M${a.join("L")}A${r1} ${r1} 0 0 0 ${b[0]}L${b.join("L")}A${r0} ${r0} 0 0 0 ${a[0]}Z`;
}

type FreeHand = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  lift: MotionValue<number>;
  rest: { x: number; y: number };
};

export default function Mascot({
  ref,
  anchor,
  stageRef,
  mood,
  reduced,
  bubble,
  onPoke,
}: {
  ref?: Ref<MascotHandle>;
  anchor: Anchor;
  stageRef: RefObject<HTMLDivElement | null>;
  mood: Mood;
  reduced: boolean;
  /** حبابِ گفت‌وگو؛ کنارِ سر می‌نشیند و هر جا شخصیت برود همراهش می‌رود. */
  bubble?: ReactNode;
  /** ضربه به شخصیت؛ بازی جمله و صدایش را می‌سازد. */
  onPoke?: (zone: HitZone) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const face = FACES[mood];

  /* ── مقادیرِ متحرک ───────────────────────────────────────────────────── */
  const scale = useMotionValue(anchor.s);
  useEffect(() => scale.set(anchor.s), [anchor.s, scale]);

  const gazeX = useSpring(0, { stiffness: 240, damping: 24 });
  const gazeY = useSpring(0, { stiffness: 240, damping: 24 });
  const gazeTurn = useSpring(0, { stiffness: 120, damping: 18 });
  const tilt = useSpring(0, { stiffness: 170, damping: 16 });
  const headRot = useTransform(() => gazeTurn.get() + tilt.get());
  const headY = useMotionValue(0);
  /** تکیهٔ کوچک (فنر) و سُر خوردن پشتِ کارت (انیمیشن)، هر دو افقی. */
  const lean = useSpring(0, { stiffness: 140, damping: 17 });
  const slide = useMotionValue(0);
  const bodyY = useMotionValue(0);
  const bodyX = useTransform(() => slide.get() + lean.get());

  const lx = useMotionValue(REST.L.x);
  const ly = useMotionValue(REST.L.y);
  const rx = useMotionValue(REST.R.x);
  const ry = useMotionValue(REST.R.y);
  const lLift = useMotionValue(0);
  const rLift = useMotionValue(0);
  /** ۱ یعنی دستمال در دستِ چپ است، ۰ یعنی راست. */
  const holder = useMotionValue(1);

  const clothX = useTransform(() => rx.get() + (lx.get() - rx.get()) * holder.get());
  const clothY = useTransform(() => ry.get() + (ly.get() - ry.get()) * holder.get());
  const clothVx = useVelocity(clothX);
  /* جا ماندنِ پارچه پشتِ دست: سرعتِ افقی → زاویه، با فنری که کمی از حد
     می‌گذرد و برمی‌گردد (آونگ). حرکت به راست → لبهٔ پایین به چپ می‌ماند. */
  const swing = useSpring(useTransform(clothVx, [-1400, 0, 1400], [-30, 0, 30], { clamp: true }), {
    stiffness: 190,
    damping: 10,
    mass: 0.8,
  });
  const squash = useMotionValue(0);
  const idleSway = useMotionValue(0);
  const clothRot = useTransform(() => swing.get() * (1 - 0.65 * squash.get()) + idleSway.get());
  /* روی کاغذ پارچه به‌جای تاب خوردن، پشتِ دست کش می‌آید. */
  const clothSkew = useTransform(() => clamp(-clothVx.get() / 120, -14, 14) * squash.get());
  const clothSX = useTransform(squash, [0, 1], [1, 1.2]);
  const clothSY = useTransform(squash, [0, 1], [1, 0.68]);
  const stain = useMotionValue(0);

  const blink = useMotionValue(0);
  const squint = useMotionValue(0);
  /* هر چشم پلکِ خودش را هم دارد، برای چشمی که ضربه خورده. */
  const winkL = useMotionValue(0);
  const winkR = useMotionValue(0);
  const lidL = useTransform(() => Math.max(blink.get(), squint.get(), winkL.get()) * 24);
  const lidR = useTransform(() => Math.max(blink.get(), squint.get(), winkR.get()) * 24);
  /* واکنش‌های ضربه: سرخیِ لپ، اشک، ستاره‌های گیجی و فنرِ کاکل. */
  const slapL = useMotionValue(0);
  const slapR = useMotionValue(0);
  const tearL = useMotionValue(0);
  const tearR = useMotionValue(0);
  const dizzy = useMotionValue(0);
  const dizzyRot = useMotionValue(0);
  const tuftRot = useMotionValue(0);

  const armL = useTransform(() =>
    armShape(-SHOULDER.x + bodyX.get(), SHOULDER.y + bodyY.get(), lx.get(), ly.get(), -1),
  );
  const armR = useTransform(() =>
    armShape(SHOULDER.x + bodyX.get(), SHOULDER.y + bodyY.get(), rx.get(), ry.get(), 1),
  );

  /* حباب همراهِ سر: جابه‌جاییِ بدن (به پیکسل) و کمی از بالا-پایینِ سر. */
  const bubbleX = useTransform(() => bodyX.get() * scale.get());
  const bubbleY = useTransform(() => (headY.get() + bodyY.get()) * scale.get());

  /* ── انیمیشن‌های در جریان، برای لغو هنگامِ unmount ────────────────────── */
  const running = useRef(new Set<AnimationPlaybackControls>());
  const alive = useRef(true);
  const busy = useRef(false);
  /** هر پاک کردن یک نسل؛ ادامه‌های پس‌زمینه‌ایِ نسلِ قدیمی کاری نمی‌کنند. */
  const gen = useRef(0);
  const lastLook = useRef(0);
  const stainRef = useRef<SVGGElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  /** تا این لحظه قهر است: به نشانگر نگاه نمی‌کند. */
  const sulkUntil = useRef(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstSeq = useRef(0);

  function run(mv: MotionValue<number>, to: number | number[], opts: ValueAnimationTransition<number> = {}) {
    const c = animate(mv, to, opts);
    running.current.add(c);
    return c.then(() => void running.current.delete(c));
  }

  useEffect(() => {
    alive.current = true;
    const set = running.current;
    return () => {
      alive.current = false;
      for (const c of set) c.stop();
      set.clear();
    };
  }, []);

  /* ── چهره ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const c = animate(squint, face.squint, { duration: 0.18, ease: "easeOut" });
    if (!busy.current) tilt.set(face.tilt);
    return () => c.stop();
  }, [face.squint, face.tilt, squint, tilt]);

  /* پلک زدن: فاصله‌ها عمداً نامنظم‌اند؛ گاهی دو پلکِ پشتِ هم. */
  useEffect(() => {
    let t: number;
    let t2: number;
    const once = () =>
      animate(blink, [0, 1, 1, 0], { duration: 0.2, times: [0, 0.35, 0.5, 1], ease: "easeInOut" });
    const loop = () => {
      t = window.setTimeout(() => {
        once();
        if (Math.random() < 0.18) t2 = window.setTimeout(once, 260);
        loop();
      }, rand(2200, 5800));
    };
    loop();
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [blink]);

  /* حرکتِ بیکار: نگاهِ گاه‌به‌گاه به اطراف، جابه‌جاییِ جزئیِ وزن و تابِ آرامِ
     دستمال. وقتی کاربر تعامل دارد یا شخصیت مشغول است، دست نگه می‌دارد. */
  useEffect(() => {
    if (reduced) return;
    const sway = animate(idleSway, [-2.5, 2.5], {
      duration: 2.8,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    });
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (!busy.current && performance.now() - lastLook.current > 1600 && performance.now() > sulkUntil.current) {
          if (Math.random() < 0.45) {
            gazeX.set(0);
            gazeY.set(0);
            gazeTurn.set(0);
          } else {
            const gx = rand(-3.6, 3.6);
            gazeX.set(gx);
            gazeY.set(rand(-2.2, 2.6));
            gazeTurn.set(gx * 0.7);
          }
          if (Math.random() < 0.3) lean.set(rand(-2.5, 2.5));
        }
        loop();
      }, rand(1800, 4200));
    };
    loop();
    return () => {
      sway.stop();
      window.clearTimeout(t);
    };
  }, [reduced, idleSway, gazeX, gazeY, gazeTurn, lean]);

  /* ── مختصات ───────────────────────────────────────────────────────────── */
  const toLocal = (clientX: number, clientY: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: (clientX - r.left - anchor.x) / anchor.s, y: (clientY - r.top - anchor.y) / anchor.s };
  };

  function lookLocal(x: number, y: number) {
    const vx = x - bodyX.get();
    const vy = y - EYE_Y;
    const d = Math.hypot(vx, vy) || 1;
    const k = Math.min(4.2, d / 32) / d;
    gazeX.set(vx * k);
    gazeY.set(vy * k * 0.8);
    gazeTurn.set(clamp(vx / 50, -5, 5));
  }

  /**
   * سُر خوردن پشتِ کارت: بدن با شتابِ نرم می‌رود، سر چند قدمِ کوتاه بالا-پایین
   * می‌شود و دستِ آزاد با کمی تأخیر روی لبهٔ کارت دنبالش می‌آید.
   */
  function walk(to: number, free: FreeHand) {
    const from = slide.get();
    const dist = Math.abs(to - from);
    if (dist < 2) return Promise.resolve();
    const duration = clamp(0.18 + dist / 700, 0.26, 0.55);
    const steps = Math.max(1, Math.round(dist / 70));
    const bob: number[] = [0];
    for (let i = 0; i < steps; i++) bob.push(-2.6, 0);
    lean.set(clamp((to - from) * 0.03, -4, 4));
    tilt.set(clamp((to - from) * 0.02, -4, 4));
    return Promise.all([
      run(slide, to, { duration, ease: [0.45, 0, 0.25, 1] }),
      run(bodyY, bob, { duration, ease: "easeInOut" }),
      run(free.x, free.rest.x + to, { duration: duration * 0.92, delay: duration * 0.08, ease: [0.45, 0, 0.25, 1] }),
      run(free.y, [free.rest.y, free.rest.y - 6, free.rest.y], { duration, times: [0, 0.45, 1], ease: "easeInOut" }),
      run(free.lift, [0, 0.6, 0], { duration, times: [0, 0.45, 1] }),
    ]).then(() => {
      lean.set(0);
      tilt.set(0);
    });
  }

  const later = (fn: () => void, ms: number) =>
    window.setTimeout(() => {
      if (alive.current) fn();
    }, ms);

  /** واکنشِ بدن به ضربه؛ `side` سمتی است که خورده (‎-1 چپِ صفحه). */
  function react(zone: HitZone, side: -1 | 1) {
    const free = !busy.current && !reduced;
    const flinch = (y: number) => free && void run(headY, [headY.get(), y, -y * 0.3, 0], { duration: 0.45, times: [0, 0.2, 0.6, 1] });
    const turn = (deg: number, ms: number) => {
      if (!free) return;
      gazeTurn.set(deg);
      later(() => gazeTurn.set(0), ms);
    };
    switch (zone) {
      case "head":
        flinch(7);
        turn(-side * 9, 280);
        void run(squint, [squint.get(), 1, 1, face.squint], { duration: 0.7, times: [0, 0.12, 0.6, 1] });
        if (!reduced) {
          void run(dizzy, [0, 1, 1, 0], { duration: 1.6, times: [0, 0.1, 0.75, 1] });
          void run(dizzyRot, [0, 600], { duration: 1.6, ease: "linear" });
        }
        break;
      case "eye": {
        const [wink, tear] = side < 0 ? [winkL, tearL] : [winkR, tearR];
        void run(wink, [0, 1, 1, 0], { duration: 1.25, times: [0, 0.07, 0.82, 1] });
        if (!reduced) void run(tear, [0, 1], { duration: 1, delay: 0.25, ease: "easeIn" }).then(() => tear.set(0));
        flinch(4);
        turn(-side * 7, 320);
        break;
      }
      case "cheek":
        void run(side < 0 ? slapL : slapR, [0, 1, 0], { duration: 1.5, times: [0, 0.06, 1] });
        turn(-side * 18, 460);
        if (free) {
          lean.set(-side * 5);
          later(() => lean.set(0), 420);
        }
        break;
      case "mouth":
        flinch(3);
        void run(squint, [squint.get(), 0.7, face.squint], { duration: 0.6 });
        break;
      case "tuft":
        if (!reduced) void run(tuftRot, [0, side * 36, -side * 24, side * 13, -side * 6, 0], { duration: 0.95, ease: "easeOut" });
        flinch(5);
        break;
      case "belly":
        /* قلقلک: بدن تند تند می‌لرزد و سر می‌پرد. */
        if (free) {
          void run(lean, [0, 3.5, -3.5, 3, -3, 2, -1.5, 0], { duration: 0.85 });
          void run(headY, [0, -3.5, 0, -3, 0, -2, 0], { duration: 0.85 });
        }
        break;
      case "hand": {
        if (!free) break;
        const [hx, hy, lift, rest] = side < 0 ? [lx, ly, lLift, REST.L] : [rx, ry, rLift, REST.R];
        void run(hy, [hy.get(), rest.y - 24, rest.y - 15, rest.y - 20, rest.y], { duration: 0.8, times: [0, 0.18, 0.42, 0.62, 1] });
        void run(hx, [hx.get(), rest.x + side * 5, rest.x - side * 4, rest.x + side * 3, rest.x], { duration: 0.8 });
        void run(lift, [0, 1, 1, 0], { duration: 0.8, times: [0, 0.2, 0.7, 1] });
        flinch(3);
        break;
      }
      case "cloth": {
        if (!free) break;
        /* تکانِ دست؛ تابِ پارچه خودش از سرعتِ دست می‌آید. */
        const [hx, rest] = holder.get() >= 0.5 ? [lx, REST.L] : [rx, REST.R];
        void run(hx, [hx.get(), rest.x + 11, rest.x - 9, rest.x + 5, rest.x], { duration: 0.65 });
        break;
      }
    }
  }

  function hit(zone: HitZone, e: ReactPointerEvent, sideOf?: -1 | 1) {
    e.stopPropagation();
    const p = toLocal(e.clientX, e.clientY);
    const side: -1 | 1 = sideOf ?? (p && p.x < bodyX.get() ? -1 : 1);
    react(zone, side);
    onPoke?.(zone);
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    const id = ++burstSeq.current;
    setBursts((b) => [
      ...b.slice(-2),
      /* کمی بیرون‌تر از نقطهٔ ضربه، تا خودِ واکنش (اشک، سرخی) زیرش نماند. */
      { id, x: e.clientX - r.left + side * 18, y: e.clientY - r.top - 16, word: HIT_WORD[zone], rot: rand(-16, 16) },
    ]);
    later(() => setBursts((b) => b.filter((x) => x.id !== id)), 620);
  }

  useImperativeHandle(ref, () => ({
    lookAt(clientX, clientY) {
      if (busy.current || performance.now() < sulkUntil.current) return;
      const p = toLocal(clientX, clientY);
      if (!p) return;
      lastLook.current = performance.now();
      lookLocal(p.x, p.y);
    },

    lookAway() {
      lastLook.current = 0;
    },

    sulk(ms) {
      sulkUntil.current = performance.now() + ms;
      const away = Math.random() < 0.5 ? -1 : 1;
      gazeX.set(away * 4);
      gazeY.set(-1.5);
      gazeTurn.set(away * 10);
      later(() => {
        if (performance.now() < sulkUntil.current) return;
        gazeX.set(0);
        gazeY.set(0);
        gazeTurn.set(0);
      }, ms);
    },

    startle() {
      if (reduced) return;
      void run(headY, [0, -5, 0], { duration: 0.34, times: [0, 0.3, 1], ease: ["easeOut", "easeInOut"] });
    },

    cheer() {
      if (reduced) return;
      /* دستِ آزاد (همانی که دستمال ندارد) مشتِ کوچکی بالا می‌برد و با ضربه‌ای
         به لبهٔ کارت برمی‌گردد؛ سر هم یک تکانِ کوتاه. از همان جایی شروع
         می‌شود که دست الان هست، حتی اگر هنوز از پاک کردنِ قبلی برنگشته. */
      const leftFree = holder.get() < 0.5;
      const [hx, hy, lift, rest] = leftFree ? [lx, ly, lLift, REST.L] : [rx, ry, rLift, REST.R];
      const out = leftFree ? -5 : 5;
      void run(hx, [hx.get(), rest.x + out, rest.x + out * 0.6, rest.x], { duration: 0.62, times: [0, 0.3, 0.6, 1] });
      void run(hy, [hy.get(), rest.y - 22, rest.y - 17, rest.y], {
        duration: 0.62,
        times: [0, 0.3, 0.62, 1],
        ease: ["easeOut", "easeInOut", "easeIn"],
      });
      void run(lift, [0, 1, 1, 0], { duration: 0.62, times: [0, 0.3, 0.62, 1] });
      void run(headY, [0, -6, 0.5, 0], { duration: 0.5, times: [0, 0.35, 0.75, 1] });
    },

    async wipe(target, opts) {
      const tl = toLocal(target.left, target.top);
      const br = toLocal(target.right, target.bottom);
      const stage = stageRef.current;
      if (!tl || !br || !stage) return;
      busy.current = true;
      const my = ++gen.current;
      const left = tl.x;
      const right = br.x;
      const cx = (left + right) / 2;
      const cy = (tl.y + br.y) / 2;
      const emit = (p: number, dir: "rtl" | "ltr") => opts.onProgress(clamp(p, 0, 1), dir);
      stainRef.current?.style.setProperty("--ra-stain", opts.stain);

      if (reduced) {
        lookLocal(cx, cy);
        const c = animate(0, 1, { duration: 0.32, delay: 0.15, ease: "easeOut", onUpdate: (v) => emit(v, "rtl") });
        running.current.add(c);
        await c;
        busy.current = false;
        return;
      }

      /* ۰) کدام دست؟ اگر واژه آن سمتِ بدن است، دستمال اول دست‌به‌دست می‌شود. */
      const want = cx < -12 ? 1 : cx > 12 ? 0 : Math.round(holder.get());
      if (Math.round(holder.get()) !== want) {
        const meet = { duration: 0.17, ease: [0.4, 0, 0.3, 1] as const };
        await Promise.all([
          run(lx, -1.5, meet),
          run(ly, -13, meet),
          run(rx, 1.5, meet),
          run(ry, -13, meet),
          run(lLift, 1, { duration: 0.17 }),
          run(rLift, 1, { duration: 0.17 }),
        ]);
        if (!alive.current) return;
        holder.set(want);
        const [fx, fy, fl, frest] = want === 1 ? [rx, ry, rLift, REST.R] : [lx, ly, lLift, REST.L];
        void run(fx, frest.x, RETURN_SPRING);
        void run(fy, frest.y, RETURN_SPRING);
        void run(fl, 0, { duration: 0.3 });
      }

      const [hx, hy, lift, rest] = want === 1 ? [lx, ly, lLift, REST.L] : [rx, ry, rLift, REST.R];
      const free: FreeHand =
        want === 1 ? { x: rx, y: ry, lift: rLift, rest: REST.R } : { x: lx, y: ly, lift: lLift, rest: REST.L };
      const side = want === 1 ? -1 : 1;

      /* ۱) سُر خوردن به طرفِ واژه، تا شانه کمی کنارِ آن بایستد. حد: سر
         پشتِ کارت می‌ماند و حباب از صحنه بیرون نمی‌زند. */
      const s = anchor.s;
      const stageLeft = -anchor.x / s;
      const stageRight = (stage.clientWidth - anchor.x) / s;
      const bubbleW = (bubbleRef.current?.offsetWidth ?? 0) / s;
      const minSlide = stageLeft + Math.max(HEAD_HALF + 22, BUBBLE_GAP + bubbleW + 12);
      const maxSlide = stageRight - HEAD_HALF - 22;
      const desired = clamp(cx - side * (SHOULDER.x + 22), Math.min(minSlide, 0), Math.max(maxSlide, 0));
      const to = Math.abs(desired - slide.get()) > 24 ? desired : slide.get();

      lookLocal(cx, cy);
      const x0 = hx.get();
      const y0 = hy.get();
      await Promise.all([
        walk(to, free),
        /* مکثِ پیش از حرکت: دست بالا و کمی عقب، همراهِ بدن. */
        run(hx, x0 + (to - slide.get()) - side * 7, { duration: 0.22, ease: [0.3, 0, 0.35, 1] }),
        run(hy, y0 - 20, { duration: 0.22, ease: [0.3, 0, 0.35, 1] }),
        run(lift, 1, { duration: 0.2 }),
      ]);
      if (!alive.current) return;
      lookLocal(cx, cy);
      lean.set(clamp((cx - slide.get()) * 0.05, -6, 6));
      tilt.set(clamp((cx - slide.get()) * 0.04, -7, 7));

      /* ۲) رسیدن: x با شتابِ کاهنده و y روی یک قوس — دست از بالای کارت رد
         می‌شود و بالای واژه فرود می‌آید. */
      const pad = 11;
      const dir: "rtl" | "ltr" = hx.get() >= cx ? "rtl" : "ltr";
      let a = dir === "rtl" ? right - pad : left + pad;
      let b = dir === "rtl" ? left + pad : right - pad;
      const minSpan = 26;
      if (Math.abs(a - b) < minSpan) {
        const sgn = dir === "rtl" ? -1 : 1;
        a = cx - (sgn * minSpan) / 2;
        b = cx + (sgn * minSpan) / 2;
      }
      const hover = cy - 20;
      const contact = cy - 11;
      const reach = Math.hypot(a - hx.get(), hover - hy.get());
      const travel = clamp(0.2 + reach / 1100, 0.26, 0.42);
      const peak = Math.min(hy.get(), hover) - clamp(reach * 0.1, 6, 24);
      await Promise.all([
        run(hx, a, { duration: travel, ease: [0.25, 0.8, 0.3, 1] }),
        run(hy, [hy.get(), peak, hover], { duration: travel, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] }),
      ]);
      if (!alive.current) return;

      /* ۳) تماس: دست پایین می‌آید و پارچه روی کاغذ پهن می‌شود. */
      await Promise.all([
        run(hy, contact, { duration: 0.08, ease: "easeIn" }),
        run(squash, 1, { duration: 0.09, ease: "easeOut" }),
        run(lift, 0.15, { duration: 0.08 }),
      ]);
      if (!alive.current) return;
      opts.onContact?.();

      /* ۴) مالیدن: رفت‌وبرگشت‌هایی که هر بار جلوتر می‌روند. رنگ فقط تا جایی
         پاک می‌شود که لبهٔ پارچه واقعاً رسیده، نه یکجا. */
      const edge = dir === "rtl" ? right : left;
      const width = Math.max(1, right - left);
      const coverage = 15;
      const reachOf = (x: number) => (dir === "rtl" ? edge - (x - coverage) : x + coverage - edge) / width;
      let progress = 0;
      const unsub = hx.on("change", (x) => {
        const p = reachOf(x);
        if (p > progress) {
          progress = p;
          emit(p, dir);
        }
      });
      emit(reachOf(a), dir);
      void run(stain, 0.85, { duration: 0.6 });
      const span = b - a;
      const strokes = [0, 0.55, 0.28, 0.86, 0.6, 1.06, 0.94];
      const lean0 = lean.get();
      await Promise.all([
        run(
          hx,
          strokes.map((f) => a + span * f),
          { duration: 0.62, ease: "easeInOut" },
        ),
        run(hy, [contact, contact + 1.6, contact - 1.2, contact + 1.8, contact - 0.6, contact + 1.2, contact], {
          duration: 0.62,
          ease: "easeInOut",
        }),
        /* بدن هم با هر ضربه کمی همراهی می‌کند. */
        run(
          lean,
          strokes.map((f) => lean0 + (f - 0.5) * Math.sign(span) * 3),
          { duration: 0.62, ease: "easeInOut" },
        ),
      ]);
      unsub();
      emit(1, dir);
      if (!alive.current) return;

      /* ۵) برداشتن. همین‌جا رنگ کاملاً پاک شده، پس promise برمی‌گردد و بازی
         ورودی را آزاد می‌کند؛ برگشتِ دست و بدن در پس‌زمینه ادامه دارد. اگر
         کاربر زودتر ضربهٔ تازه‌ای بزند، حرکتِ تازه از همان نقطه و با همان
         سرعت ادامه می‌دهد و این نسل کنار می‌رود. */
      await Promise.all([
        run(squash, 0, { duration: 0.12, ease: "easeOut" }),
        run(hy, contact - 12, { duration: 0.14, ease: "easeOut" }),
        run(lift, 1, { duration: 0.12 }),
      ]);
      if (!alive.current) return;
      busy.current = false;
      gazeX.set(0);
      gazeY.set(0);
      gazeTurn.set(0);
      void walk(0, free);
      void run(hx, rest.x, RETURN_SPRING);
      void run(hy, rest.y, RETURN_SPRING);
      void run(lift, 0, { duration: 0.45, ease: "easeOut" });
      /* ⚠️ با تایمر و نه با انتظار برای پایانِ انیمیشن‌ها: انیمیشنِ متوقف‌شده
         در motion هرگز resolve نمی‌شود، و این پایان‌بندی نباید به آن گره
         بخورد. */
      window.setTimeout(() => {
        if (!alive.current || gen.current !== my) return;
        lean.set(0);
        tilt.set(0);
        /* واکنشِ آخر: یک سر تکان دادنِ کوتاه — «تمام شد». */
        void run(headY, [headY.get(), 2.6, 0], { duration: 0.34, ease: "easeInOut" });
      }, 420);
      /* لکه آرام کم‌رنگ می‌شود؛ بعد از چند اشتباهِ پشتِ هم، دستمال هنوز
         کمی رنگی است. */
      void run(stain, 0, { duration: 3.2, delay: 0.6, ease: "easeIn" });
    },
  }));

  const t = `translate(${anchor.x} ${anchor.y}) scale(${anchor.s})`;

  return (
    <>
      <svg className="ra-char-back" aria-hidden>
        <defs>
          <clipPath id={`${uid}head`}>
            <path d={HEAD} />
          </clipPath>
          <clipPath id={`${uid}body`}>
            <path d={BODY} />
          </clipPath>
          <linearGradient id={`${uid}occl`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="ra-stop-occl" stopOpacity="0" />
            <stop offset="1" className="ra-stop-occl" stopOpacity="0.34" />
          </linearGradient>
          {/* ⚠️ بدن زیرِ لبهٔ کارت رسم نمی‌شود: کارت شیشهٔ مات است و بدنِ پشتش
              یک لکهٔ تارِ فیروزه‌ای زیرِ متن می‌ساخت، و نفس کشیدنش شیشه را هر
              فریم دوباره تار می‌کرد. */}
          <clipPath id={`${uid}above`}>
            <rect x="-4000" y="-4000" width="8000" height="4000" />
          </clipPath>
          <clipPath id={`${uid}eyeL`}>
            <ellipse cx={-18} cy={EYE_Y} rx="10" ry="12" />
          </clipPath>
          <clipPath id={`${uid}eyeR`}>
            <ellipse cx={18} cy={EYE_Y} rx="10" ry="12" />
          </clipPath>
        </defs>
        <g transform={t}>
          <g clipPath={`url(#${uid}above)`}>
          <g className="ra-breathe">
            <motion.g style={{ x: bodyX, y: bodyY }}>
              {/* بدن: پایه، سایهٔ هلالی، و تیرگیِ نرمِ نزدیکِ لبهٔ کارت که «پشتِ
                  کارت بودن» را می‌فروشد. */}
              <g clipPath={`url(#${uid}body)`}>
                <rect x="-60" y="-70" width="120" height="170" className="ra-f-shade" />
                <path d={BODY} transform="translate(-7 -2)" className="ra-f-char" />
                <rect x="-60" y="-15" width="120" height="17" fill={`url(#${uid}occl)`} />
              </g>
              <path d={BODY} className="ra-hit" onPointerDown={(e) => hit("belly", e)} />

              <motion.g style={{ rotate: headRot, y: headY, originX: 0.5, originY: 1 }}>
                <g className="ra-breathe-head">
                  {/* کاکلِ بته‌جقه‌ای — همان سروِ خمیدهٔ نقش‌های ایرانی، و همان
                      سروی که در نشانِ سرواست. با ضربه دورِ پایه‌اش فنر می‌خورد. */}
                  <motion.g style={{ rotate: tuftRot, originX: 0.35, originY: 1 }}>
                    <path d={TUFT} className="ra-f-deep" />
                    <path d="M-4.5 -146C-8 -152 -7.5 -159 -3 -164" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.6" strokeLinecap="round" />
                  </motion.g>
                  <g clipPath={`url(#${uid}head)`}>
                    <rect x="-60" y="-150" width="120" height="110" className="ra-f-shade" />
                    <path d={HEAD} transform="translate(-6 -6)" className="ra-f-char" />
                    <ellipse cx="-24" cy="-125" rx="13" ry="6" transform="rotate(-24 -24 -125)" fill="#fff" opacity="0.16" />
                  </g>

                  <motion.ellipse cx="-33" cy="-76" rx="7.5" ry="4.4" className="ra-f-cheek" initial={false} animate={{ opacity: face.cheek }} transition={{ duration: 0.3 }} />
                  <motion.ellipse cx="33" cy="-76" rx="7.5" ry="4.4" className="ra-f-cheek" initial={false} animate={{ opacity: face.cheek }} transition={{ duration: 0.3 }} />
                  {/* جای سیلی: سرخیِ پررنگ‌تر که آرام محو می‌شود. */}
                  <motion.ellipse cx="-33" cy="-77" rx="10" ry="6.5" className="ra-f-slap" style={{ opacity: slapL }} />
                  <motion.ellipse cx="33" cy="-77" rx="10" ry="6.5" className="ra-f-slap" style={{ opacity: slapR }} />

                  {/* چشم‌ها: سفیدی، مردمک (نگاه)، پلکِ بالا (پلک‌زدن + تنگ کردن)
                      و پلکِ پایین (لبخند). */}
                  {([-18, 18] as const).map((ex) => (
                    <g key={ex}>
                      <ellipse cx={ex} cy={EYE_Y} rx="10" ry="12" className="ra-f-sclera" />
                      <g clipPath={`url(#${uid}eye${ex < 0 ? "L" : "R"})`}>
                        <motion.g style={{ x: gazeX, y: gazeY }}>
                          <circle cx={ex} cy={EYE_Y + 1} r="6.2" className="ra-f-ink" />
                          <circle cx={ex + 2.2} cy={EYE_Y - 1.4} r="2" fill="#fff" />
                          <circle cx={ex - 1.8} cy={EYE_Y + 3.6} r="0.9" fill="#fff" opacity="0.55" />
                        </motion.g>
                        <motion.rect x={ex - 12} y={EYE_Y - 40} width="24" height="28" className="ra-f-char" style={{ y: ex < 0 ? lidL : lidR }} />
                        <motion.rect
                          x={ex - 12}
                          y={EYE_Y + 12}
                          width="24"
                          height="20"
                          className="ra-f-char"
                          initial={false}
                          animate={{ y: -face.smile * 11 }}
                          transition={FACE_SPRING}
                        />
                      </g>
                      <ellipse cx={ex} cy={EYE_Y} rx="10" ry="12" fill="none" className="ra-s-ink" strokeOpacity="0.14" strokeWidth="0.9" />
                    </g>
                  ))}

                  <motion.path
                    d="M-26 -113C-21 -117 -15 -117.5 -10 -114.5"
                    fill="none"
                    className="ra-s-ink"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ y: face.bl[0], rotate: face.bl[1] }}
                    transition={FACE_SPRING}
                  />
                  <motion.path
                    d="M10 -114.5C15 -117.5 21 -117 26 -113"
                    fill="none"
                    className="ra-s-ink"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ y: face.br[0], rotate: face.br[1] }}
                    transition={FACE_SPRING}
                  />

                  <g transform="translate(0 -70)">
                    <motion.path
                      className="ra-f-ink ra-s-ink"
                      strokeWidth="2.6"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ d: MOUTH[face.mouth] }}
                      transition={{ duration: 0.2, ease: [0.3, 0.7, 0.3, 1] }}
                    />
                  </g>

                  <Tear x={-22} progress={tearL} />
                  <Tear x={22} progress={tearR} />
                  <DizzyStars rot={dizzyRot} opacity={dizzy} />

                  {/* ناحیه‌های ضربه؛ کوچک‌ترها آخر می‌آیند تا روی سر اولویت داشته باشند. */}
                  <path d={HEAD} className="ra-hit" onPointerDown={(e) => hit("head", e)} />
                  <path d={TUFT} className="ra-hit ra-hit-wide" onPointerDown={(e) => hit("tuft", e)} />
                  {([-1, 1] as const).map((sd) => (
                    <g key={sd}>
                      <ellipse cx={sd * 33} cy="-76" rx="11" ry="8" className="ra-hit" onPointerDown={(e) => hit("cheek", e, sd)} />
                      <ellipse cx={sd * 18} cy={EYE_Y} rx="11" ry="13" className="ra-hit" onPointerDown={(e) => hit("eye", e, sd)} />
                    </g>
                  ))}
                  <ellipse cx="0" cy="-70" rx="12" ry="7" className="ra-hit" onPointerDown={(e) => hit("mouth", e)} />
                </g>
              </motion.g>
            </motion.g>
          </g>
          </g>
        </g>
      </svg>

      {/* ⚠️ دو لایه: motion با x/y کلِ `transform` را می‌نویسد، پس جابه‌جاییِ
          همراهِ سر روی لایهٔ بیرونی است و چسبیدنِ لبهٔ راستِ حباب به این نقطه
          روی لایهٔ درونی. */}
      <motion.div
        className="ra-bubble-pos"
        style={{
          left: anchor.x - BUBBLE_GAP * anchor.s,
          top: anchor.y + BUBBLE_Y * anchor.s,
          x: bubbleX,
          y: bubbleY,
        }}
      >
        <div
          ref={bubbleRef}
          className="ra-bubble-anchor"
          style={{ maxWidth: `min(15.5rem, ${Math.max(120, anchor.x - BUBBLE_GAP * anchor.s - 8)}px)` }}
        >
          {bubble}
        </div>
      </motion.div>

      {/* حبابِ کمیکِ ضربه، همان جایی که خورد. */}
      <div className="ra-hits" aria-hidden>
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.div
              key={b.id}
              className="ra-hit-burst"
              style={{ left: b.x, top: b.y }}
              initial={{ scale: 0.2, opacity: 0, rotate: b.rot - 24 }}
              animate={{ scale: [0.2, 1.18, 1], opacity: 1, rotate: b.rot }}
              exit={{ scale: 1.25, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <svg viewBox="-50 -50 100 100">
                <path d={BURST} />
              </svg>
              <span>{b.word}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <svg className="ra-char-front" aria-hidden>
        <defs>
          <pattern id={`${uid}yazdi`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <rect width="6" height="6" fill="#f8f2e7" />
            <rect width="6" height="3" fill="#cd5f55" opacity="0.38" />
            <rect width="3" height="6" fill="#cd5f55" opacity="0.38" />
          </pattern>
          <clipPath id={`${uid}cloth`}>
            <path d={CLOTH} />
          </clipPath>
        </defs>
        <g transform={t}>
          <HandShadow x={lx} y={ly} lift={lLift} />
          <HandShadow x={rx} y={ry} lift={rLift} />
          <ClothShadow x={clothX} y={clothY} squash={squash} />

          {/* بازوها مثلِ یک لوله سایه می‌خورند (نور از بالا-چپ)، نه با خطِ دور:
              بدن هم خطِ دور ندارد و دو سبک کنارِ هم نمی‌نشینند. همین سایهٔ
              یک‌طرفه بازو را روی بدن هم جدا نشان می‌دهد. */}
          {[armL, armR].map((d, i) => (
            <g key={i}>
              <motion.path d={d} transform="translate(1.3 1.6)" className="ra-f-shade" />
              <motion.path d={d} className="ra-f-char" />
            </g>
          ))}

          {/* دستمالِ یزدی: چهارخانهٔ کرم و قرمز، آویزان از یک گوشه. */}
          <motion.g style={{ x: clothX, y: clothY }}>
            <motion.g
              style={{
                rotate: clothRot,
                skewX: clothSkew,
                scaleX: clothSX,
                scaleY: clothSY,
                originX: 0.5,
                originY: 0,
              }}
            >
              <g transform="scale(1.22)">
              <path d={CLOTH} fill={`url(#${uid}yazdi)`} />
              <g clipPath={`url(#${uid}cloth)`}>
                <motion.g ref={stainRef} className="ra-f-stain" style={{ opacity: stain }}>
                  <circle cx="-5" cy="21" r="6.5" />
                  <circle cx="5.5" cy="17" r="4.6" />
                  <circle cx="1" cy="26.5" r="4.2" />
                  <circle cx="9" cy="24" r="2.4" />
                </motion.g>
                <path d={CLOTH_HEM} fill="none" stroke="#b44a42" strokeOpacity="0.55" strokeWidth="1.1" />
                <path d="M0 1C-1 12 -1 22 1.5 33" stroke="#5a2a20" strokeOpacity="0.16" strokeWidth="1.6" fill="none" />
                <path d="M1 1C5 8 9 12 14 14" stroke="#5a2a20" strokeOpacity="0.1" strokeWidth="1.2" fill="none" />
                <path d="M3 0L10 0L24 40L3 40Z" fill="#5a2a20" opacity="0.07" />
              </g>
              <path d={CLOTH} fill="none" stroke="#a9564d" strokeOpacity="0.55" strokeWidth="0.8" />
              <path d={CLOTH} className="ra-hit ra-hit-wide" onPointerDown={(e) => hit("cloth", e)} />
              </g>
            </motion.g>
          </motion.g>

          <Hand x={lx} y={ly} side={-1} onHit={(e) => hit("hand", e, -1)} />
          <Hand x={rx} y={ry} side={1} onHit={(e) => hit("hand", e, 1)} />
        </g>
      </svg>
    </>
  );
}

/** دستکش: بیضی و شست با سایهٔ یک‌طرفه، و دو خطِ انگشت که روی لبهٔ کارت خم شده‌اند. */
function Hand({
  x,
  y,
  side,
  onHit,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  side: -1 | 1;
  onHit: (e: ReactPointerEvent) => void;
}) {
  return (
    <motion.g style={{ x, y }}>
      <ellipse cx="1.2" cy="1.5" rx="10.5" ry="9.4" className="ra-f-shade" />
      <ellipse cx="0" cy="0" rx="10.5" ry="9.4" className="ra-f-char" />
      <ellipse cx={side * -8.2 + 1} cy="-2.8" rx="3.6" ry="4.6" className="ra-f-shade" />
      <ellipse cx={side * -8.2} cy="-4" rx="3.4" ry="4.4" className="ra-f-char" />
      <path d={`M${side * -1} 3.2V8M${side * 3.6} 2.4V7.2`} fill="none" className="ra-s-shade" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="13" ry="12" className="ra-hit" onPointerDown={onHit} />
    </motion.g>
  );
}

/** اشکی که از زیرِ چشمِ ضربه‌خورده روی لپ سُر می‌خورد. */
function Tear({ x, progress }: { x: number; progress: MotionValue<number> }) {
  const y = useTransform(progress, (p) => EYE_Y + 9 + p * 30);
  const opacity = useTransform(progress, (p) => (p > 0 && p < 1 ? 1 - p * 0.55 : 0));
  const scale = useTransform(progress, [0, 0.3, 1], [0.4, 1, 0.9]);
  return (
    <motion.g style={{ x, y, opacity, scale }}>
      <path d="M0 -4.5C2.6 -1.2 3.4 1 3.4 2.4A3.4 3.4 0 0 1 -3.4 2.4C-3.4 1 -2.6 -1.2 0 -4.5Z" className="ra-f-tear" />
    </motion.g>
  );
}

/** سه ستاره که بعد از ضربه به سر، روی یک مدارِ بیضی دورِ سر می‌چرخند. */
function DizzyStars({ rot, opacity }: { rot: MotionValue<number>; opacity: MotionValue<number> }) {
  return (
    <motion.g style={{ opacity }}>
      {[0, 120, 240].map((phase) => (
        <DizzyStar key={phase} rot={rot} phase={phase} />
      ))}
    </motion.g>
  );
}

function DizzyStar({ rot, phase }: { rot: MotionValue<number>; phase: number }) {
  const a = useTransform(rot, (r) => ((r + phase) * Math.PI) / 180);
  const x = useTransform(a, (v) => Math.cos(v) * 40);
  const y = useTransform(a, (v) => -150 + Math.sin(v) * 9);
  /* ستارهٔ پشتِ سر کوچک‌تر و کم‌رنگ‌تر: عمق. */
  const scale = useTransform(a, (v) => 0.75 + (Math.sin(v) + 1) * 0.2);
  return (
    <motion.g style={{ x, y, scale }}>
      <path d="M0 -6C0.8 -2 2 -0.8 6 0C2 0.8 0.8 2 0 6C-0.8 2 -2 0.8 -6 0C-2 -0.8 -0.8 -2 0 -6Z" className="ra-f-star" />
    </motion.g>
  );
}

/**
 * سایهٔ دست روی کارت. وقتی دست روی لبه است سایه زیرِ انگشت‌هاست؛ وقتی بالا
 * می‌آید، سایه پایین‌تر، پهن‌تر و کم‌رنگ‌تر می‌شود. بالای لبهٔ کارت سایه‌ای
 * نیست — آنجا پشتِ دست فضای خالی است.
 */
function HandShadow({ x, y, lift }: { x: MotionValue<number>; y: MotionValue<number>; lift: MotionValue<number> }) {
  const cx = useTransform(() => x.get() + lift.get() * 5);
  const cy = useTransform(() => y.get() + 9 + lift.get() * 13);
  const rx = useTransform(() => 10 + lift.get() * 4);
  const opacity = useTransform(() => {
    const onCard = clamp((y.get() + 9 + lift.get() * 13 - 3) / 6, 0, 1);
    return onCard * (0.16 - lift.get() * 0.07);
  });
  return <motion.ellipse cx={cx} cy={cy} rx={rx} ry="3.4" className="ra-f-shadow" style={{ opacity }} />;
}

function ClothShadow({ x, y, squash }: { x: MotionValue<number>; y: MotionValue<number>; squash: MotionValue<number> }) {
  const cy = useTransform(() => y.get() + 38 - squash.get() * 12);
  const opacity = useTransform(() => clamp((y.get() + 20) / 10, 0, 1) * (0.1 + squash.get() * 0.06));
  return <motion.ellipse cx={x} cy={cy} rx="15" ry="3.2" className="ra-f-shadow" style={{ opacity }} />;
}
