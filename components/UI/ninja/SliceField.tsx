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
const CHIP_COLORS = [
  "bg-primary/85 text-primary-foreground",
  "bg-gold/85 text-[#241d05]",
  "bg-lapis-light/85 text-white",
  "bg-turquoise/85 text-white",
  "bg-accent/85 text-accent-foreground",
];

type WordObj = {
  id: number;
  text: string;
  isTarget: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sliced: boolean;
  el: HTMLDivElement | null;
  colorClass: string;
};

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
  const trailRef = useRef<SVGPolylineElement>(null);
  const [renderWords, setRenderWords] = useState<
    { id: number; text: string; colorClass: string; x0: number; y0: number }[]
  >([]);
  const [timeLeft, setTimeLeft] = useState(1);

  const wordsRef = useRef<WordObj[]>([]);
  const idCounter = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const trailPointsRef = useRef<{ x: number; y: number }[]>([]);
  const trailFadeTimeout = useRef<number | null>(null);

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

  const sliceWord = useCallback(
    (w: WordObj) => {
      w.sliced = true;
      onSliceRef.current(w.text, w.isTarget);
      if (w.el) {
        w.el.style.transition = "transform 0.35s ease-in, opacity 0.35s ease-in";
        w.el.style.transform += " scale(1.5) rotate(35deg)";
        w.el.style.opacity = "0";
      }
      window.setTimeout(() => removeWord(w.id), 350);
    },
    [removeWord],
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
      sliced: false,
      el: null,
      colorClass: CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)],
    };
    wordsRef.current.push(word);
    setRenderWords((ws) => [
      ...ws,
      { id, text, colorClass: word.colorClass, x0: word.x, y0: word.y },
    ]);
  }, [GRAVITY]);

  const updateTrailDom = () => {
    if (!trailRef.current) return;
    trailRef.current.setAttribute(
      "points",
      trailPointsRef.current.map((p) => `${p.x},${p.y}`).join(" "),
    );
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
    if (trailRef.current) trailRef.current.style.opacity = "1";
    updateTrailDom();
  };

  const handlePointerMove: React.PointerEventHandler = (e) => {
    if (!draggingRef.current) return;
    const p = getRelativePoint(e.clientX, e.clientY);
    if (lastPointRef.current) {
      checkSliceSegment(lastPointRef.current.x, lastPointRef.current.y, p.x, p.y);
    }
    lastPointRef.current = p;
    trailPointsRef.current.push(p);
    if (trailPointsRef.current.length > 10) trailPointsRef.current.shift();
    updateTrailDom();
  };

  const endDrag = () => {
    draggingRef.current = false;
    lastPointRef.current = null;
    if (trailRef.current) trailRef.current.style.opacity = "0";
    trailFadeTimeout.current = window.setTimeout(() => {
      trailPointsRef.current = [];
      updateTrailDom();
    }, 200);
  };

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
        if (w.el) {
          w.el.style.transform = `translate(-50%, -50%) translate(${w.x}px, ${w.y}px)`;
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

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      className="relative w-full aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden glass select-none touch-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,oklch(0.22_0.03_260),oklch(0.08_0.02_260))]" />

      {/* timer bar */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-black/30 z-30">
        <div
          className="h-full bg-gold transition-[width] duration-100 ease-linear"
          style={{ width: `${timeLeft * 100}%` }}
        />
      </div>

      <div className="pointer-events-none absolute top-4 inset-x-4 z-20 text-center">
        <span className="glass rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold">
          فقط کلمات دسته‌ی «{round.category}» را برش بزن!
        </span>
      </div>

      <svg className="absolute inset-0 z-20 pointer-events-none w-full h-full">
        <polyline
          ref={trailRef}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0, transition: "opacity 0.2s" }}
        />
      </svg>

      {renderWords.map((w) => (
        <div
          key={w.id}
          ref={(node) => {
            const word = wordsRef.current.find((x) => x.id === w.id);
            if (word) word.el = node;
          }}
          className={`absolute left-0 top-0 z-10 whitespace-nowrap rounded-full px-4 py-2 font-bold text-sm sm:text-base shadow-lg ${w.colorClass}`}
          style={{ transform: `translate(-50%, -50%) translate(${w.x0}px, ${w.y0}px)` }}
        >
          {w.text}
        </div>
      ))}
    </div>
  );
}

export default SliceField;
