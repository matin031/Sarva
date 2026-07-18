"use client";
import { motion } from "motion/react";

/** Symbolic, looping animated previews for each game — a taste of the
 *  gameplay shown on the hub, not the game itself. All are pure motion,
 *  no state, safe to mount many at once. */

function Frame({ children, glow }: { children: React.ReactNode; glow: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(120% 90% at 50% 15%, ${glow}, transparent 60%)` }}
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

/** جاسوس: a reticle sweeps across three suspects and locks onto one with a
 *  pulse, mimicking the aim-and-shoot loop. */
export function JasoosPreview() {
  const suspects = ["نهاد", "قید", "مفعول"];
  const xs = ["18%", "50%", "82%"];
  return (
    <Frame glow="rgba(37,99,235,0.20)">
      <div className="absolute inset-x-0 bottom-6 flex items-end justify-around px-6">
        {suspects.map((label, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center gap-1"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          >
            <div className="size-9 rounded-full bg-lapis-light/70" />
            <div className="h-7 w-11 rounded-t-2xl bg-lapis-light/60" />
            <span className="rounded-md bg-card/80 px-1.5 text-[10px] font-bold text-foreground">{label}</span>
          </motion.div>
        ))}
      </div>
      {/* reticle */}
      <motion.div
        className="absolute top-[38%] -ml-6"
        animate={{ left: xs, marginLeft: -24 }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
        style={{ left: "18%" }}
      >
        <motion.div
          className="relative flex size-12 items-center justify-center rounded-full border-2 border-primary"
          animate={{ scale: [1, 1, 0.82, 1], opacity: [0.9, 0.9, 1, 0.9] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="absolute h-full w-0.5 bg-primary/70" />
          <span className="absolute h-0.5 w-full bg-primary/70" />
          <span className="size-1.5 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </Frame>
  );
}

/** نینجا: word chips arc up while a bright slash sweeps through and one
 *  splits, mimicking slicing the right words out of the air. */
export function NinjaPreview() {
  const chips = [
    { t: "تند", x: "20%", d: 0 },
    { t: "زیبا", x: "45%", d: 0.7 },
    { t: "و", x: "68%", d: 1.3 },
    { t: "او", x: "84%", d: 0.4 },
  ];
  return (
    <Frame glow="rgba(0,165,166,0.22)">
      {chips.map((c, i) => (
        <motion.span
          key={i}
          className="absolute rounded-lg bg-primary/85 px-2 py-1 text-[11px] font-bold text-primary-foreground shadow"
          style={{ left: c.x, bottom: 0 }}
          animate={{ y: [40, -120, 40], rotate: [0, 15, 30] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: c.d, ease: "easeInOut" }}
        >
          {c.t}
        </motion.span>
      ))}
      {/* slash */}
      <motion.div
        className="absolute top-1/2 h-0.5 w-40 -rotate-[24deg] rounded-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_12px_var(--color-gold)]"
        animate={{ x: ["-40%", "140%"], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
      />
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
          <div key={i} className="h-24 w-16 [perspective:700px] sm:h-28 sm:w-20">
            <motion.div
              className="relative h-full w-full [transform-style:preserve-3d]"
              animate={{ rotateY: [0, 180, 180, 0, 0] }}
              transition={{ duration: 4, repeat: Infinity, times, ease: "easeInOut", delay: i * 0.12 }}
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </span>
      </motion.div>
    </Frame>
  );
}
