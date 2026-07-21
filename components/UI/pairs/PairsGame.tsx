"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { buildMemoryDeck, type MemoryCard } from "@/lib/literary-pairs";

const PAIR_COUNT = 6; // 12 cards → tidy 3×4 / 4×3 grid on any screen

type Phase = "study" | "playing";

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L12 3.5Z"
      />
    </svg>
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

  const cols = useMemo(
    () => (deck.length <= 12 ? "grid-cols-3 xs:grid-cols-4" : "grid-cols-4"),
    [deck.length],
  );

  // ---- study screen: learn the works and their authors first ----
  if (phase === "study") {
    return (
      <div dir="rtl" className="container mx-auto my-8 max-w-xl sm:my-12">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold text-primary sm:text-2xl">
            جفت‌های ادبی
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اول این آثار و پدیدآورندگانشان را به‌خاطر بسپار، بعد در بازی آن‌ها
            را جفت کن.
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
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              className="glass relative z-20 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
            >
              <span className="rounded-lg bg-gold/15 px-3 py-1.5 text-sm font-bold text-foreground">
                {p.work}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                className="size-4 shrink-0 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6 3 12l6 6M21 12H4"
                />
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
          <h2 className="text-2xl font-bold text-primary">
            آفرین! همه را جفت کردی
          </h2>
          <p className="mt-2 text-muted-foreground">
            با {moves.toLocaleString("fa-IR")} حرکت همهٔ آثار را به
            پدیدآورنده‌شان رساندی.
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
          <h1 className="text-xl font-bold text-primary sm:text-2xl">
            جفت‌های ادبی
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            هر اثر را به پدیدآورنده‌اش جفت کن.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {matched.size.toLocaleString("fa-IR")} /{" "}
            {PAIR_COUNT.toLocaleString("fa-IR")}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {moves.toLocaleString("fa-IR")} حرکت
          </span>
        </div>
      </div>

      <div className={`grid ${cols} gap-2.5 sm:gap-3.5`}>
        {deck.map((card, index) => {
          const isMatched = matched.has(card.pairId);
          const isUp = isMatched || flipped.includes(index);
          const isWork = card.kind === "work";
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlip(index)}
              disabled={isUp || locked}
              className="group relative z-20 aspect-3/4 [perspective:900px] focus:outline-none"
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* back — dark, minimal, star + سروا watermark */}
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2130] to-[#0b0f18] shadow-lg ring-1 ring-inset ring-white/10 transition-all duration-300 group-enabled:group-hover:-translate-y-0.5 group-enabled:group-hover:ring-white/25 group-active:scale-[0.97] [backface-visibility:hidden]">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-6 opacity-[0.05] [background-image:radial-gradient(white_0.5px,transparent_1px)] [background-size:13px_13px]"
                  />
                  <StarIcon className="size-6 text-white/25 transition-colors duration-300 group-enabled:group-hover:text-gold/70" />
                  <span className="text-[10px] font-bold tracking-[0.35em] text-white/20">سَروا</span>
                </span>

                {/* front — neon glow by category, small label + name */}
                <span
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2130] to-[#0b0f18] p-2 text-center ring-1 [transform:rotateY(180deg)] [backface-visibility:hidden] ${
                    isWork
                      ? "ring-gold/70 shadow-[0_0_28px_-8px_var(--color-gold)]"
                      : "ring-primary/70 shadow-[0_0_28px_-8px_var(--color-primary)]"
                  } ${isMatched ? "opacity-90" : ""}`}
                >
                  <span
                    className={`text-[9px] font-bold tracking-[0.2em] ${isWork ? "text-gold" : "text-primary"}`}
                  >
                    {isWork ? "اثر" : "پدیدآورنده"}
                  </span>
                  <span className="text-balance px-0.5 text-xs font-black leading-tight text-white sm:text-sm">
                    {card.text}
                  </span>
                  {isMatched && (
                    <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-green-500/20 text-[9px] text-green-400">
                      ✓
                    </span>
                  )}
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
