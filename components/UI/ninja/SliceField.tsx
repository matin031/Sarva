"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { NinjaRound } from "@/lib/ninja-data";
import type { NinjaDifficulty } from "./NinjaSettingsModal";

// Difficulty tunes two levers: gravity (lower = slower rise/fall, more
// hang time to react) and how often words are launched. "easy" is
// noticeably slower and sparser than the old fixed feel; "hard" is faster
// and busier.
const DIFFICULTY: Record<NinjaDifficulty, { gravity: number; spawnBase: number; spawnJitter: number }> = {
  easy: { gravity: 480, spawnBase: 780, spawnJitter: 400 },
  medium: { gravity: 780, spawnBase: 560, spawnJitter: 350 },
  hard: { gravity: 1120, spawnBase: 380, spawnJitter: 260 },
};

const SLICE_RADIUS = 48;

/**
 * پالت کلمه‌ها.
 *
 * قبلاً هر کلمه یک کلاس تخت مثل `bg-primary/85` بود و همه‌شان مثل هم و بی‌عمق
 * دیده می‌شدند. حالا هر رنگ سه چیز دارد: یک گرادیان (بالا روشن‌تر)، یک لبهٔ
 * نورانی، و رنگِ همان خانواده برای جرقه‌هایی که موقع برش می‌پاشند — پس وقتی
 * کلمه‌ای می‌ترکد، ترکشش هم‌رنگ خودش است.
 */
const CHIP_TONES = [
  { from: "#2fb6a8", to: "#137e77", ink: "#04201f", spark: "#5fe6d6" },
  { from: "#e8c04a", to: "#b8862a", ink: "#2a1f04", spark: "#ffe08a" },
  { from: "#6b9ce8", to: "#33569f", ink: "#06152e", spark: "#a8c8ff" },
  { from: "#d4708f", to: "#9b3a5c", ink: "#2b0713", spark: "#ffa8c0" },
  { from: "#8f7ee0", to: "#54419e", ink: "#150a2e", spark: "#c0b0ff" },
] as const;

type Tone = (typeof CHIP_TONES)[number];

type WordObj = {
  id: number;
  text: string;
  isTarget: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** چرخش فعلی و سرعت چرخش — کلمه در هوا می‌چرخد، مثل هر چیزی که پرتاب شود */
  rot: number;
  vrot: number;
  sliced: boolean;
  el: HTMLDivElement | null;
  tone: Tone;
};

/** یک کلمهٔ بریده‌شده: دو نیمه که از هم جدا می‌شوند. عمر کوتاهی دارد و بعد
 *  خودش پاک می‌شود. */
type Debris = {
  id: number;
  text: string;
  tone: Tone;
  x: number;
  y: number;
  /** زاویهٔ خودِ تیغه، تا برش در همان راستایی باشد که بازیکن کشیده */
  blade: number;
};

/** جرقه‌های ریزی که از محل برش می‌پاشند. */
type Spark = { id: number; x: number; y: number; dx: number; dy: number; color: string; size: number };

/** «+۱» یا «−۱» که از محل برش بالا می‌رود و محو می‌شود. */
type Popup = { id: number; x: number; y: number; text: string; good: boolean };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * ردِ تیغه، به‌صورت یک نوارِ باریک‌شونده.
 *
 * قبلاً یک `polyline` با ضخامت ثابت ۴ پیکسل بود که شبیه خط‌کش دیده می‌شد. یک
 * تیغه در انتهایش پهن است و در ابتدایش نازک — پس از نقطه‌ها یک چندضلعی ساخته
 * می‌شود: از هر نقطه به اندازهٔ نصفِ عرضِ آن نقطه به دو طرفِ عمود بر مسیر
 * می‌رویم، یک طرف را رفت و طرف دیگر را برگشت وصل می‌کنیم.
 */
function ribbonPath(points: { x: number; y: number }[], maxWidth: number): string {
  if (points.length < 2) return "";
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    // عمود بر مسیر
    const nx = -dy / len;
    const ny = dx / len;
    // نوک تیغه (آخرین نقطه) پهن‌ترین جاست و دنباله‌اش به صفر می‌رسد
    const w = (maxWidth / 2) * (i / (points.length - 1)) ** 0.7;
    left.push(`${p.x + nx * w},${p.y + ny * w}`);
    right.unshift(`${p.x - nx * w},${p.y - ny * w}`);
  }

  return `M ${left.join(" L ")} L ${right.join(" L ")} Z`;
}

function SliceField({
  round,
  durationMs,
  difficulty,
  onSlice,
  onMiss,
  onRoundComplete,
}: {
  round: NinjaRound;
  durationMs: number;
  difficulty: NinjaDifficulty;
  onSlice: (word: string, isTarget: boolean) => void;
  onMiss: (word: string) => void;
  onRoundComplete: () => void;
}) {
  const { gravity: GRAVITY, spawnBase, spawnJitter } = DIFFICULTY[difficulty];
  const containerRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const [renderWords, setRenderWords] = useState<
    { id: number; text: string; tone: Tone; x0: number; y0: number }[]
  >([]);
  const [debris, setDebris] = useState<Debris[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [timeLeft, setTimeLeft] = useState(1);
  const [combo, setCombo] = useState(0);
  /** یک تک‌فریم قرمز وقتی کلمهٔ اشتباه بریده می‌شود */
  const [wrongFlash, setWrongFlash] = useState(0);

  const wordsRef = useRef<WordObj[]>([]);
  const idCounter = useRef(0);
  const fxCounter = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const trailPointsRef = useRef<{ x: number; y: number }[]>([]);
  const trailFadeTimeout = useRef<number | null>(null);
  /** زاویهٔ آخرین حرکتِ تیغه، برای اینکه برش هم‌راستای آن باشد */
  const bladeAngleRef = useRef(0);
  const comboTimer = useRef<number | null>(null);

  const onSliceRef = useRef(onSlice);
  const onMissRef = useRef(onMiss);
  const onRoundCompleteRef = useRef(onRoundComplete);
  useEffect(() => {
    onSliceRef.current = onSlice;
    onMissRef.current = onMiss;
    onRoundCompleteRef.current = onRoundComplete;
  }, [onSlice, onMiss, onRoundComplete]);

  const removeWord = useCallback((id: number) => {
    wordsRef.current = wordsRef.current.filter((w) => w.id !== id);
    setRenderWords((ws) => ws.filter((w) => w.id !== id));
  }, []);

  /** جرقه‌ها و «+۱» — همه خودشان بعد از پایان انیمیشن پاک می‌شوند. */
  const burst = useCallback((x: number, y: number, tone: Tone, good: boolean) => {
    const made: Spark[] = [];
    const n = good ? 12 : 8;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const speed = 26 + Math.random() * 46;
      made.push({
        id: fxCounter.current++,
        x,
        y,
        dx: Math.cos(a) * speed,
        dy: Math.sin(a) * speed,
        color: good ? tone.spark : "#ff6b6b",
        size: 3 + Math.random() * 4,
      });
    }
    setSparks((s) => [...s, ...made]);
    const ids = new Set(made.map((m) => m.id));
    window.setTimeout(() => setSparks((s) => s.filter((m) => !ids.has(m.id))), 620);

    const pid = fxCounter.current++;
    setPopups((p) => [...p, { id: pid, x, y, text: good ? "+۱" : "−۱", good }]);
    window.setTimeout(() => setPopups((p) => p.filter((m) => m.id !== pid)), 750);
  }, []);

  const sliceWord = useCallback(
    (w: WordObj) => {
      w.sliced = true;
      onSliceRef.current(w.text, w.isTarget);

      // چیپ اصلی فوراً می‌رود و جایش دو نیمه می‌نشیند
      removeWord(w.id);

      const did = fxCounter.current++;
      setDebris((d) => [
        ...d,
        { id: did, text: w.text, tone: w.tone, x: w.x, y: w.y, blade: bladeAngleRef.current },
      ]);
      window.setTimeout(() => setDebris((d) => d.filter((x) => x.id !== did)), 700);

      burst(w.x, w.y, w.tone, w.isTarget);

      if (w.isTarget) {
        setCombo((c) => c + 1);
        if (comboTimer.current) window.clearTimeout(comboTimer.current);
        // کمبو بعد از یک مکث می‌خوابد؛ ارزشش به پشت‌سرهم بودن است
        comboTimer.current = window.setTimeout(() => setCombo(0), 1800);
      } else {
        setCombo(0);
        setWrongFlash((n) => n + 1);
      }
    },
    [removeWord, burst],
  );

  const checkSliceSegment = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      for (const w of wordsRef.current) {
        if (w.sliced) continue;
        if (distToSegment(w.x, w.y, x1, y1, x2, y2) <= SLICE_RADIUS) {
          sliceWord(w);
        }
      }
    },
    [sliceWord],
  );

  const spawnWord = useCallback((text: string, isTarget: boolean) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const id = idCounter.current++;
    const x0 = 50 + Math.random() * Math.max(1, width - 100);
    // pick the launch speed from the box's actual height so the apex
    // reaches near the top of the play area before gravity pulls it back
    const targetRise = height * (0.85 + Math.random() * 0.12) + 40;
    const speedUp = Math.sqrt(2 * GRAVITY * targetRise);
    const vx = (Math.random() - 0.5) * 140;
    const word: WordObj = {
      id,
      text,
      isTarget,
      x: x0,
      y: height + 40,
      vx,
      vy: -speedUp,
      rot: (Math.random() - 0.5) * 30,
      // چرخش با جهت پرتاب هم‌سو است: چیزی که به راست پرتاب می‌شود، به راست هم می‌چرخد
      vrot: vx * 0.5 + (Math.random() - 0.5) * 60,
      sliced: false,
      el: null,
      tone: CHIP_TONES[Math.floor(Math.random() * CHIP_TONES.length)],
    };
    wordsRef.current.push(word);
    setRenderWords((ws) => [...ws, { id, text, tone: word.tone, x0: word.x, y0: word.y }]);
  }, [GRAVITY]);

  const updateTrailDom = () => {
    const d = ribbonPath(trailPointsRef.current, 15);
    ribbonRef.current?.setAttribute("d", d);
    glowRef.current?.setAttribute("d", d);
  };

  const getRelativePoint = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown: React.PointerEventHandler = (e) => {
    draggingRef.current = true;
    if (trailFadeTimeout.current) window.clearTimeout(trailFadeTimeout.current);
    const p = getRelativePoint(e.clientX, e.clientY);
    lastPointRef.current = p;
    trailPointsRef.current = [p];
    if (ribbonRef.current) ribbonRef.current.style.opacity = "1";
    if (glowRef.current) glowRef.current.style.opacity = "1";
    updateTrailDom();
  };

  const handlePointerMove: React.PointerEventHandler = (e) => {
    if (!draggingRef.current) return;
    const p = getRelativePoint(e.clientX, e.clientY);
    if (lastPointRef.current) {
      const dx = p.x - lastPointRef.current.x;
      const dy = p.y - lastPointRef.current.y;
      if (dx || dy) bladeAngleRef.current = (Math.atan2(dy, dx) * 180) / Math.PI;
      checkSliceSegment(lastPointRef.current.x, lastPointRef.current.y, p.x, p.y);
    }
    lastPointRef.current = p;
    trailPointsRef.current.push(p);
    if (trailPointsRef.current.length > 14) trailPointsRef.current.shift();
    updateTrailDom();
  };

  const endDrag = () => {
    draggingRef.current = false;
    lastPointRef.current = null;
    if (ribbonRef.current) ribbonRef.current.style.opacity = "0";
    if (glowRef.current) glowRef.current.style.opacity = "0";
    trailFadeTimeout.current = window.setTimeout(() => {
      trailPointsRef.current = [];
      updateTrailDom();
    }, 200);
  };

  /**
   * تکانِ صحنه هنگام برشِ اشتباه.
   *
   * با Web Animations API و نه با یک کلاس CSS: کلاس برای اینکه دوباره پخش شود
   * به یک `key` تازه نیاز دارد، و `key` تازه روی این عنصر یعنی unmount شدن کلِ
   * زمین بازی وسط بازی — همهٔ کلمه‌های در هوا و حلقهٔ فیزیک با آن می‌رفتند.
   * این‌طور فقط یک انیمیشن روی همان گره اجرا می‌شود.
   */
  useEffect(() => {
    if (!wrongFlash) return;
    containerRef.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-7px, 4px)" },
        { transform: "translate(6px, -3px)" },
        { transform: "translate(-4px, 2px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 260, easing: "ease-out" },
    );
  }, [wrongFlash]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let spawning = true;
    let spawnCount = 0;
    let spawnTimeout: number | null = null;
    let graceTimeout: number | null = null;
    const targetQueue = shuffle(round.targetWords);
    const startedAt = performance.now();

    function tick(now: number) {
      if (cancelled) return;
      const dt = lastTimeRef.current ? Math.min((now - lastTimeRef.current) / 1000, 0.033) : 0;
      lastTimeRef.current = now;
      const { height } = sizeRef.current;
      for (const w of wordsRef.current) {
        if (w.sliced) continue;
        w.vy += GRAVITY * dt;
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.rot += w.vrot * dt;
        if (w.el) {
          w.el.style.transform = `translate(-50%, -50%) translate(${w.x}px, ${w.y}px) rotate(${w.rot}deg)`;
        }
        if (w.y > height + 70) {
          removeWord(w.id);
          if (w.isTarget) onMissRef.current(w.text);
        }
      }
      setTimeLeft(Math.max(0, 1 - (now - startedAt) / durationMs));
      rafRef.current = requestAnimationFrame(tick);
    }

    function scheduleNext() {
      if (cancelled || !spawning) return;
      const delay = spawnBase + Math.random() * spawnJitter;
      spawnTimeout = window.setTimeout(() => {
        spawnCount++;
        let text: string;
        let isTarget: boolean;
        if (spawnCount % 4 === 0 && targetQueue.length) {
          text = targetQueue.shift()!;
          isTarget = true;
        } else if (targetQueue.length === 0 && Math.random() < 0.08) {
          text = round.targetWords[Math.floor(Math.random() * round.targetWords.length)];
          isTarget = true;
        } else {
          text = round.decoyWords[Math.floor(Math.random() * round.decoyWords.length)];
          isTarget = false;
        }
        spawnWord(text, isTarget);
        scheduleNext();
      }, delay);
    }
    scheduleNext();

    const endTimer = window.setTimeout(() => {
      spawning = false;
      if (spawnTimeout) window.clearTimeout(spawnTimeout);
      graceTimeout = window.setTimeout(() => {
        if (!cancelled) onRoundCompleteRef.current();
      }, 2500);
    }, durationMs);

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (spawnTimeout) window.clearTimeout(spawnTimeout);
      if (graceTimeout) window.clearTimeout(graceTimeout);
      window.clearTimeout(endTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const urgent = timeLeft < 0.2;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      className="ninja-field relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-2xl sm:aspect-video"
    >
      {/* ---------- آسمانِ صحنه ---------- */}
      {/* سه لایه روی هم: یک شیبِ عمیقِ شب، دو هالهٔ رنگی که آرام نفس می‌کشند، و
          یک بافتِ نقطه‌ای. قبلاً فقط یک radial-gradient تخت بود و زمین بازی
          شبیه یک مستطیل سیاه دیده می‌شد. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,oklch(0.26_0.05_255),oklch(0.11_0.03_265)_55%,oklch(0.06_0.02_265))]" />
      <div className="ninja-aurora ninja-aurora-a absolute inset-0" />
      <div className="ninja-aurora ninja-aurora-b absolute inset-0" />
      <div className="ninja-grain pointer-events-none absolute inset-0 opacity-[0.06]" />

      {/* ماه: یک قرصِ کوچکِ گرم با هالهٔ جداگانه. نسخهٔ اول یک دایرهٔ بزرگِ
          blur-دار بود که به‌جای ماه، شبیه لکهٔ خاکستری روی شیشه دیده می‌شد. */}
      <div aria-hidden className="pointer-events-none absolute left-[16%] top-[13%]">
        <span
          className="absolute -inset-6 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(253,246,221,0.16), transparent)" }}
        />
        <span
          className="relative block size-10 rounded-full"
          style={{
            background: "radial-gradient(circle at 34% 32%, #fffaf0, #e8dcae 70%, #c9b980)",
            boxShadow: "0 0 22px rgba(253,246,221,0.35)",
            opacity: 0.75,
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      {/* ویگنت: گوشه‌ها را می‌خواباند تا نگاه وسط بماند */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.55)" }}
      />

      {/* فلاشِ قرمزِ برشِ اشتباه */}
      <div key={`flash-${wrongFlash}`} className={wrongFlash ? "ninja-wrong-flash" : ""} />

      {/* ---------- نوار زمان ---------- */}
      <div className="absolute inset-x-0 top-0 z-30 h-1.5 bg-black/40">
        <div
          className={`h-full transition-[width] duration-100 ease-linear ${urgent ? "ninja-urgent" : ""}`}
          style={{
            width: `${timeLeft * 100}%`,
            background: urgent
              ? "linear-gradient(90deg,#ff6b6b,#ff3b3b)"
              : "linear-gradient(90deg,var(--color-gold),#ffe08a)",
            boxShadow: urgent ? "0 0 12px #ff3b3b" : "0 0 10px var(--color-gold)",
          }}
        />
      </div>

      {/* ---------- سربرگ و کمبو ---------- */}
      <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-col items-center gap-2">
        <span className="rounded-full border border-white/15 bg-black/45 px-4 py-1.5 text-xs font-bold text-white/90 shadow-lg backdrop-blur-sm sm:text-sm">
          فقط کلمات دسته‌ی «{round.category}» را برش بزن!
        </span>
        {combo >= 2 && (
          <span
            key={combo}
            className="ninja-combo rounded-full bg-gold px-3 py-1 text-xs font-black text-[#2a1f04] shadow-[0_0_18px_rgba(224,178,60,0.7)]"
          >
            {combo.toLocaleString("fa-IR")} پشت سر هم!
          </span>
        )}
      </div>

      {/* ---------- ردِ تیغه ---------- */}
      <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
        <path
          ref={glowRef}
          fill="var(--color-gold)"
          opacity={0}
          style={{ filter: "blur(6px)", transition: "opacity 0.2s" }}
        />
        <path
          ref={ribbonRef}
          fill="rgba(255,253,242,0.92)"
          opacity={0}
          style={{ transition: "opacity 0.2s" }}
        />
      </svg>

      {/* ---------- کلمه‌ها ---------- */}
      {renderWords.map((w) => (
        <div
          key={w.id}
          ref={(node) => {
            const word = wordsRef.current.find((x) => x.id === w.id);
            if (word) word.el = node;
          }}
          className="ninja-chip absolute left-0 top-0 z-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold sm:text-base"
          style={{
            transform: `translate(-50%, -50%) translate(${w.x0}px, ${w.y0}px)`,
            background: `linear-gradient(160deg, ${w.tone.from}, ${w.tone.to})`,
            color: w.tone.ink,
          }}
        >
          {w.text}
        </div>
      ))}

      {/* ---------- نیمه‌های بریده‌شده ---------- */}
      {debris.map((d) => (
        <div
          key={d.id}
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ transform: `translate(-50%, -50%) translate(${d.x}px, ${d.y}px) rotate(${d.blade}deg)` }}
        >
          {/* دو نیمه در راستای تیغه بریده می‌شوند و از هم دور می‌شوند. متنِ
              داخل هر نیمه به اندازهٔ همان زاویه برعکس می‌چرخد تا هنگام جدا
              شدن هنوز خوانده شود. */}
          {[0, 1].map((half) => (
            <div
              key={half}
              className={half === 0 ? "ninja-half-top" : "ninja-half-bottom"}
              style={{ clipPath: half === 0 ? "inset(0 0 50% 0)" : "inset(50% 0 0 0)" }}
            >
              <div
                className="ninja-chip whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold sm:text-base"
                style={{
                  background: `linear-gradient(160deg, ${d.tone.from}, ${d.tone.to})`,
                  color: d.tone.ink,
                  transform: `rotate(${-d.blade}deg)`,
                }}
              >
                {d.text}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* ---------- جرقه‌ها ---------- */}
      {sparks.map((s) => (
        <span
          key={s.id}
          className="ninja-spark pointer-events-none absolute left-0 top-0 z-20 rounded-full"
          style={
            {
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 8px ${s.color}`,
              transform: `translate(-50%,-50%) translate(${s.x}px, ${s.y}px)`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* ---------- «+۱» ---------- */}
      {popups.map((p) => (
        <span
          key={p.id}
          className={`ninja-popup pointer-events-none absolute left-0 top-0 z-30 text-2xl font-black ${
            p.good ? "text-[#ffd76a]" : "text-[#ff7a7a]"
          }`}
          style={{ transform: `translate(-50%,-50%) translate(${p.x}px, ${p.y}px)` }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
}

export default SliceField;
