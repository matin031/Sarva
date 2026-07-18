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

/** A hands-up stick figure. `dead` drives the fall/tint when shot. */
function HandsUp({ colorClass }: { colorClass: string }) {
  return (
    <svg viewBox="0 0 40 62" className={`h-full w-full ${colorClass}`} fill="none" stroke="currentColor">
      <circle cx="20" cy="10" r="6.5" fill="currentColor" stroke="none" />
      <path d="M20 17 L20 40" strokeWidth="6" strokeLinecap="round" />
      <path d="M20 22 L8 7 M20 22 L32 7" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 40 L12 60 M20 40 L28 60" strokeWidth="5" strokeLinecap="round" />
    </svg>
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

/** جاسوس: a real bayt is shown above four hands-up suspects; the reticle
 *  scans across, locks on the lying suspect (مضاف‌الیه) and shoots — that
 *  figure is hit and falls. Then it resets and loops. */
export function JasoosPreview() {
  return (
    <Frame glow="rgba(37,99,235,0.20)">
      {/* the bayt */}
      <div className="absolute inset-x-0 top-3 text-center text-[11px] font-bold leading-5 text-foreground sm:text-xs">
        <p>برو شیر درنده باش ای دغل</p>
        <p>مینداز خود را چو روباه شل</p>
      </div>

      {/* suspects */}
      {SUSPECTS.map((s, i) => (
        <div key={i} className="absolute bottom-6" style={{ left: s.left, transform: "translateX(-50%)" }}>
          <motion.div
            className="h-14 w-10 origin-bottom"
            animate={
              s.spy
                ? { rotate: [0, 0, 0, 84, 84, 0], y: [0, 0, 0, 8, 8, 0], opacity: [1, 1, 1, 1, 0, 1] }
                : { y: [0, -3, 0] }
            }
            transition={
              s.spy
                ? { duration: 5, repeat: Infinity, times: [0, 0.5, 0.56, 0.64, 0.9, 1], ease: "easeInOut" }
                : { duration: 1.7, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }
            }
          >
            <HandsUp colorClass={s.spy ? "text-destructive" : "text-lapis-light/80"} />
          </motion.div>
          <span className="mt-0.5 block rounded-md bg-card/85 px-1.5 text-center text-[10px] font-bold text-foreground">
            {s.role}
          </span>
        </div>
      ))}

      {/* reticle: scans, then locks on the spy */}
      <motion.div
        className="absolute top-[46%]"
        style={{ left: "84%", marginLeft: -22 }}
        animate={{ left: ["84%", "50%", "18%", "18%", "84%"] }}
        transition={{ duration: 5, repeat: Infinity, times: [0, 0.22, 0.45, 0.9, 1], ease: "easeInOut" }}
      >
        <motion.div
          className="relative flex size-11 items-center justify-center rounded-full border-2 border-primary"
          animate={{ scale: [1, 1, 0.8, 1, 1], opacity: [0.85, 0.85, 1, 1, 0.85] }}
          transition={{ duration: 5, repeat: Infinity, times: [0, 0.45, 0.55, 0.7, 1], ease: "easeInOut" }}
        >
          <span className="absolute h-full w-0.5 bg-primary/70" />
          <span className="absolute h-0.5 w-full bg-primary/70" />
          {/* muzzle flash on the shot */}
          <motion.span
            className="absolute size-8 rounded-full bg-gold"
            animate={{ opacity: [0, 0, 0, 0.9, 0, 0], scale: [0.3, 0.3, 0.3, 1.3, 0.3, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, times: [0, 0.5, 0.54, 0.57, 0.62, 1], ease: "easeOut" }}
          />
          <span className="relative size-1.5 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </Frame>
  );
}

/** A single word that gets sliced: two clipped halves (top/bottom) that
 *  fly apart when the blade passes at fraction `at` of the shared clock. */
function SlicedWord({ text, left, at }: { text: string; left: string; at: number }) {
  const times = [0, at, at + 0.06, 0.9, 1];
  const face =
    "absolute inset-0 flex items-center justify-center rounded-lg bg-primary/85 px-2.5 py-1.5 text-[12px] font-bold text-primary-foreground shadow";
  return (
    <div
      className="absolute top-1/2 h-8 w-16 -translate-y-1/2"
      style={{ left, transform: "translate(-50%, -50%)" }}
    >
      {/* top half */}
      <motion.span
        className={face}
        style={{ clipPath: "inset(0 0 50% 0)" }}
        animate={{ y: [0, 0, -16, -16, 0], x: [0, 0, -8, -8, 0], rotate: [0, 0, -14, -14, 0], opacity: [1, 1, 1, 0, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, times, ease: "easeOut" }}
      >
        {text}
      </motion.span>
      {/* bottom half */}
      <motion.span
        className={face}
        style={{ clipPath: "inset(50% 0 0 0)" }}
        animate={{ y: [0, 0, 16, 16, 0], x: [0, 0, 8, 8, 0], rotate: [0, 0, 14, 14, 0], opacity: [1, 1, 1, 0, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, times, ease: "easeOut" }}
      >
        {text}
      </motion.span>
    </div>
  );
}

/** نینجا: a blade sweeps across and actually slices three words in half,
 *  their pieces flying apart, mimicking cutting the right words. */
export function NinjaPreview() {
  return (
    <Frame glow="rgba(0,165,166,0.22)">
      <SlicedWord text="تند" left="26%" at={0.34} />
      <SlicedWord text="زیبا" left="52%" at={0.46} />
      <SlicedWord text="او" left="76%" at={0.58} />

      {/* blade sweep */}
      <motion.div
        className="absolute top-1/2 h-0.5 w-48 -rotate-[20deg] rounded-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_14px_var(--color-gold)]"
        animate={{ left: ["-30%", "130%"], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.2, 0.5, 0.66, 0.78], ease: "easeInOut" }}
        style={{ marginTop: -1 }}
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
