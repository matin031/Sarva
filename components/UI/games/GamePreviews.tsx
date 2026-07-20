"use client";
import { motion } from "motion/react";
import HandsUpFigure from "@/components/UI/jasoos/HandsUpFigure";

/** Symbolic, looping animated previews for each game — a taste of the
 *  gameplay shown on the hub, not the game itself. All are pure motion,
 *  no state, safe to mount many at once. */

function Frame({
  children,
  glow,
}: {
  children: React.ReactNode;
  glow: string;
}) {
  return (
    <div className="relative h-[300px] xs:h-[350px] w-full overflow-hidden rounded-2xl border border-border z-20 bg-card">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(120% 90% at 50% 15%, ${glow}, transparent 60%)`,
        }}
      />
      {/* faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {children}
    </div>
  );
}

// one shared 5s clock so the reticle, muzzle flash and the spy's death stay
// in sync without any orchestration state
const SUSPECTS = [
  { role: "صفت", left: "84%", spy: false },
  { role: "مفعول", left: "62%", spy: false },
  { role: "متمم", left: "40%", spy: false },
  { role: "مضاف‌الیه", left: "18%", spy: true },
];

/** جاسوس: a real bayt above four suspects drawn with the game's own
 *  HandsUpFigure. The reticle scans, locks on the liar (مضاف‌الیه) and
 *  shoots — that figure is hit and topples exactly like an in-game
 *  "shot-correct" (rotate + drop + fade + red), then it loops. */
export function JasoosPreview() {
  return (
    <Frame glow="rgba(37,99,235,0.20)">
      {/* the bayt */}
      <div
        className="absolute inset-x-0 top-3 text-center 
       font-bold leading-5 text-foreground text-lg sm:text-xl px-10"
      >
        <p className=" text-right">برو شیر درنده باش ای دغل</p>
        <p className=" text-left">مینداز خود را چو روباه شل</p>
      </div>

      {/* suspects */}
      {SUSPECTS.map((s, i) => (
        <div
          key={i}
          className="absolute bottom-5"
          style={{ left: s.left, transform: "translateX(-50%)" }}
        >
          <motion.div
            className="mx-auto  w-17 origin-bottom h-32 sm:w-20"
            style={{ color: "var(--color-lapis-light)" }}
            animate={
              s.spy
                ? {
                    rotate: [0, 0, 14, 14, 0],
                    y: [0, 0, 44, 44, 0],
                    opacity: [1, 1, 0, 0, 1],
                    color: [
                      "var(--color-lapis-light)",
                      "var(--color-lapis-light)",
                      "var(--color-destructive)",
                      "var(--color-destructive)",
                      "var(--color-lapis-light)",
                    ],
                  }
                : { y: [0, -4, 0] }
            }
            transition={
              s.spy
                ? {
                    duration: 5,
                    repeat: Infinity,
                    times: [0, 0.55, 0.68, 0.9, 1],
                    ease: "easeIn",
                  }
                : {
                    duration: 2.4,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut",
                  }
            }
          >
            <HandsUpFigure />
          </motion.div>
          <span
            className="mt-1 block rounded-full bg-card/85 px-2 py-0.5 
          text-center text-[10px] xs:text-sm font-bold text-foreground"
          >
            {s.role}
          </span>
        </div>
      ))}

      {/* reticle: scans, then locks on the spy */}
      <motion.div
        className="absolute top-[46%]"
        style={{ left: "84%", marginLeft: -22 }}
        animate={{ left: ["84%", "50%", "18%", "18%", "84%"] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          times: [0, 0.22, 0.45, 0.9, 1],
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="relative flex size-11 items-center justify-center rounded-full border-2 border-primary"
          animate={{
            scale: [1, 1, 0.8, 1, 1],
            opacity: [0.85, 0.85, 1, 1, 0.85],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            times: [0, 0.45, 0.55, 0.7, 1],
            ease: "easeInOut",
          }}
        >
          <span className="absolute h-full w-0.5 bg-primary/70" />
          <span className="absolute h-0.5 w-full bg-primary/70" />
          {/* muzzle flash on the shot */}
          <motion.span
            className="absolute size-8 rounded-full bg-gold"
            animate={{
              opacity: [0, 0, 0, 0.9, 0, 0],
              scale: [0.3, 0.3, 0.3, 1.3, 0.3, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              times: [0, 0.5, 0.53, 0.56, 0.62, 1],
              ease: "easeOut",
            }}
          />
          <span className="relative size-1.5 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </Frame>
  );
}

/** A word launched fruit-ninja style: it arcs up from below, gets sliced
 *  near the apex (a blade streak flashes across, the word splits into two
 *  clipped halves that spin apart and fall). `delay` staggers each word so
 *  they're cut one at a time; the shared cycle keeps them permanently
 *  offset (same duration + repeatDelay, different initial delay). */
function FlyingSlicedWord({
  text,
  left,
  delay,
}: {
  text: string;
  left: string;
  delay: number;
}) {
  const DUR = 1.8;
  const CYCLE = 3.9; // must match across all words → stable stagger
  const loop = {
    duration: DUR,
    repeat: Infinity,
    repeatDelay: CYCLE - DUR,
    delay,
    ease: "easeOut" as const,
  };
  const face =
    "absolute inset-0 flex items-center justify-center rounded-lg bg-primary/90 text-[12px] font-bold text-primary-foreground shadow-lg";

  return (
    <motion.div
      className="absolute h-8 w-16"
      style={{ left, bottom: 0 }}
      // the launch arc: up from below the frame, high, then falling back down
      animate={{
        y: [50, -230, -200, 60],
        x: [0, 10, 16, 26],
        rotate: [0, 6, 10, 18],
      }}
      transition={{ ...loop, times: [0, 0.42, 0.5, 1] }}
    >
      {/* intact word — visible on the way up, gone at the cut */}
      <motion.span
        className={face}
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ ...loop, times: [0, 0.44, 0.48, 1] }}
      >
        {text}
      </motion.span>
      {/* top half flies up-left */}
      <motion.span
        className={face}
        style={{ clipPath: "inset(0 0 50% 0)" }}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          x: [0, 0, -8, -22, -30],
          y: [0, 0, -4, -20, -34],
          rotate: [0, 0, -12, -34, -46],
        }}
        transition={{ ...loop, times: [0, 0.46, 0.5, 0.85, 1] }}
      >
        {text}
      </motion.span>
      {/* bottom half flies down-right */}
      <motion.span
        className={face}
        style={{ clipPath: "inset(50% 0 0 0)" }}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          x: [0, 0, 8, 22, 30],
          y: [0, 0, 4, 22, 40],
          rotate: [0, 0, 12, 34, 46],
        }}
        transition={{ ...loop, times: [0, 0.46, 0.5, 0.85, 1] }}
      >
        {text}
      </motion.span>
      {/* the blade streak across the cut */}
      <motion.span
        className="absolute left-1/2 top-1/2 h-0.5 w-24 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] rounded-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_12px_var(--color-gold)]"
        animate={{ opacity: [0, 0, 1, 0], scaleX: [0.2, 0.2, 1, 1] }}
        transition={{ ...loop, times: [0, 0.45, 0.5, 0.6] }}
      />
    </motion.div>
  );
}

/** نینجا: three grammar words are tossed up one after another and a blade
 *  slices each in mid-air — pieces spin apart and fall, fruit-ninja style. */
export function NinjaPreview() {
  return (
    <Frame glow="rgba(0,165,166,0.22)">
      <FlyingSlicedWord text="تند" left="22%" delay={0} />
      <FlyingSlicedWord text="زیبا" left="46%" delay={1.3} />
      <FlyingSlicedWord text="او" left="70%" delay={2.6} />
    </Frame>
  );
}

/** جفت‌های ادبی: two cards flip up to reveal a work and its author, a gold
 *  check confirms the match, then they reset. */
export function PairsPreview() {
  const times = [0, 0.15, 0.7, 0.85, 1];
  return (
    <Frame glow="rgba(212,160,23,0.20)">
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        {[
          { text: "شاهنامه", cls: "bg-gold/20" },
          { text: "فردوسی", cls: "bg-lapis-light/20" },
        ].map((c, i) => (
          <div
            key={i}
            className="h-24 w-16 [perspective:700px] sm:h-28 sm:w-20"
          >
            <motion.div
              className="relative h-full w-full [transform-style:preserve-3d]"
              animate={{ rotateY: [0, 180, 180, 0, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                times,
                ease: "easeInOut",
                delay: i * 0.12,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card text-xl text-gold/50 [backface-visibility:hidden]">
                ؟
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center rounded-xl border border-border p-1 text-center text-[11px] font-bold text-foreground [transform:rotateY(180deg)] [backface-visibility:hidden] ${c.cls}`}
              >
                {c.text}
              </span>
            </motion.div>
          </div>
        ))}
      </div>
      {/* match check */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.4, 0.4, 1.1, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, times, ease: "easeInOut" }}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        </span>
      </motion.div>
    </Frame>
  );
}
