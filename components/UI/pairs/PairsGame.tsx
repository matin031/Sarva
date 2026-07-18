"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { buildMemoryDeck, type MemoryCard } from "@/lib/literary-pairs";

const PAIR_COUNT = 6; // 12 cards → tidy 3×4 / 4×3 grid on any screen

type Phase = "study" | "playing";

/** A spinning gold arc around a card's border — a rotating conic-gradient
 *  clipped by the card's rounded corners, so a bright band of gold travels
 *  around the edge. Sits behind the card face, which is inset by ~2px. */
function GoldBorder() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-70"
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0deg, var(--color-gold) 35deg, transparent 80deg, transparent 360deg)",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
    />
  );
}

function PairsGame() {
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [phase, setPhase] = useState<Phase>("study");
  const [flipped, setFlipped] = useState<number[]>([]); // indices face-up, unmatched
  const [matched, setMatched] = useState<Set<number>>(new Set()); // matched pairIds
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const newGame = () => {
    setDeck(buildMemoryDeck(PAIR_COUNT));
    setPhase("study");
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLocked(false);
  };

  // deal the first game on mount (client-only: buildMemoryDeck is random)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    newGame();
  }, []);

  // reconstruct the {work, author} pairs from the dealt deck for the study
  // screen (so the player learns them before the memory round)
  const studyPairs = useMemo(() => {
    const map = new Map<number, { work: string; author: string }>();
    deck.forEach((c) => {
      const e = map.get(c.pairId) ?? { work: "", author: "" };
      e[c.kind] = c.text;
      map.set(c.pairId, e);
    });
    return [...map.values()];
  }, [deck]);

  const won = deck.length > 0 && matched.size === PAIR_COUNT;

  const handleFlip = (index: number) => {
    if (locked) return;
    const card = deck[index];
    if (!card || matched.has(card.pairId) || flipped.includes(index)) return;

    const next = [...flipped, index];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((i) => deck[i]);
      if (a.pairId === b.pairId) {
        setMatched((prev) => new Set(prev).add(a.pairId));
        setFlipped([]);
      } else {
        setLocked(true);
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 850);
      }
    }
  };

  const cols = useMemo(() => (deck.length <= 12 ? "grid-cols-3 xs:grid-cols-4" : "grid-cols-4"), [deck.length]);

  // ---- study screen: learn the works and their authors first ----
  if (phase === "study") {
    return (
      <div dir="rtl" className="container mx-auto my-8 max-w-xl sm:my-12">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold text-primary sm:text-2xl">جفت‌های ادبی</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اول این آثار و پدیدآورندگانشان را به‌خاطر بسپار، بعد در بازی آن‌ها را جفت کن.
          </p>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="flex flex-col gap-2.5"
        >
          {studyPairs.map((p, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="glass relative z-20 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
            >
              <span className="rounded-lg bg-gold/15 px-3 py-1.5 text-sm font-bold text-foreground">
                {p.work}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
              </svg>
              <span className="rounded-lg bg-lapis-light/15 px-3 py-1.5 text-sm font-bold text-foreground">
                {p.author}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setDeck(buildMemoryDeck(PAIR_COUNT))}
            className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            آثار دیگر
          </button>
          <button
            onClick={() => setPhase("playing")}
            className="min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
          >
            شروع بازی
          </button>
        </div>
      </div>
    );
  }

  // ---- win screen ----
  if (won) {
    return (
      <div className="container mx-auto my-10 max-w-2xl text-center sm:my-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass relative z-20 rounded-2xl p-8 sm:p-12"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/15 text-3xl">
            🎉
          </div>
          <h2 className="text-2xl font-bold text-primary">آفرین! همه را جفت کردی</h2>
          <p className="mt-2 text-muted-foreground">
            با {moves.toLocaleString("fa-IR")} حرکت همهٔ آثار را به پدیدآورنده‌شان رساندی.
          </p>
          <button
            onClick={newGame}
            className="mt-6 min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
          >
            یک دور دیگر
          </button>
        </motion.div>
      </div>
    );
  }

  // ---- memory board ----
  return (
    <div dir="rtl" className="container mx-auto my-8 max-w-2xl sm:my-12">
      <div className="mb-6 flex items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">جفت‌های ادبی</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">هر اثر را به پدیدآورنده‌اش جفت کن.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {matched.size.toLocaleString("fa-IR")} / {PAIR_COUNT.toLocaleString("fa-IR")}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {moves.toLocaleString("fa-IR")} حرکت
          </span>
        </div>
      </div>

      <div className={`grid ${cols} gap-2.5 sm:gap-3`}>
        {deck.map((card, index) => {
          const isMatched = matched.has(card.pairId);
          const isUp = isMatched || flipped.includes(index);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlip(index)}
              disabled={isUp || locked}
              className="relative aspect-[3/4] overflow-hidden rounded-xl bg-border p-[2px] [perspective:800px]"
            >
              {!isUp && <GoldBorder />}
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* back */}
                <span className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-card text-2xl text-primary/40 [backface-visibility:hidden]">
                  ؟
                </span>
                {/* front */}
                <span
                  className={`absolute inset-0 flex items-center justify-center rounded-[10px] p-2 text-center text-xs font-semibold leading-snug [transform:rotateY(180deg)] [backface-visibility:hidden] sm:text-sm ${
                    isMatched
                      ? "bg-primary/10 text-primary"
                      : card.kind === "work"
                        ? "bg-gold/15 text-foreground"
                        : "bg-lapis-light/15 text-foreground"
                  }`}
                >
                  {card.text}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => setPhase("study")}
          className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
        >
          مرور آثار
        </button>
        <button
          onClick={newGame}
          className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
        >
          چیدن دوباره
        </button>
      </div>
    </div>
  );
}

export default PairsGame;
