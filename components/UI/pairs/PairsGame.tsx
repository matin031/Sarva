"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { buildMemoryDeck, type MemoryCard } from "@/lib/literary-pairs";

const PAIR_COUNT = 6; // 12 cards → tidy 3×4 / 4×3 grid on any screen

type Phase = "playing" | "won";

function PairsGame() {
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // indices face-up, unmatched
  const [matched, setMatched] = useState<Set<number>>(new Set()); // matched pairIds
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const newGame = () => {
    setDeck(buildMemoryDeck(PAIR_COUNT));
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

  const phase: Phase = deck.length > 0 && matched.size === PAIR_COUNT ? "won" : "playing";

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
        // a work and its correct author
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

  if (phase === "won") {
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

  return (
    <div dir="rtl" className="container mx-auto my-8 max-w-2xl sm:my-12">
      <div className="mb-6 flex items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">جفت‌های ادبی</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            هر اثر را به پدیدآورنده‌اش جفت کن.
          </p>
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
              className="relative aspect-[3/4] [perspective:800px]"
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={{ duration: 0.35 }}
              >
                {/* back */}
                <span className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card text-2xl text-primary/40 [backface-visibility:hidden]">
                  ؟
                </span>
                {/* front */}
                <span
                  className={`absolute inset-0 flex items-center justify-center rounded-xl border p-2 text-center text-xs font-semibold leading-snug [transform:rotateY(180deg)] [backface-visibility:hidden] sm:text-sm ${
                    isMatched
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : card.kind === "work"
                        ? "border-gold/50 bg-gold/10 text-foreground"
                        : "border-lapis-light/50 bg-lapis-light/10 text-foreground"
                  }`}
                >
                  {card.text}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
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
