"use client";
import { motion, useReducedMotion } from "motion/react";
import type { JasoosLevel } from "@/lib/jasoos-data";
import PlayerFigure from "./PlayerFigure";

/**
 * راهروی مدرسه.
 *
 * نسخهٔ قبلی پنج مستطیلِ گِردِ توخالی با یک آیکون وسطشان بود — نه راهرویی
 * وجود داشت، نه دری. اینجا سه چیز اضافه شده و هیچ‌کدام منطق را دست نمی‌زند:
 *
 *   • خودِ راهرو: دیوار، کفِ چوبی با خطوطِ پرسپکتیو، و چراغ‌های سقفی که
 *     روی کف بازتاب دارند.
 *   • در، به‌جای آیکونِ در: قاب، دو قابِ داخلی، دستگیره، و شکافِ نور از زیرِ
 *     درِ باز.
 *   • حالت‌ها با نور بیان می‌شوند نه فقط با رنگِ حاشیه: درِ فعال نور می‌تاباند
 *     و آرام نفس می‌کشد، درِ رد شده مهرِ سبز دارد، درِ قفل تاریک و بی‌نور است.
 */

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="size-5 sm:size-7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.4} stroke="currentColor" className="size-5 sm:size-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

/** یک درِ واقعی: قاب بیرونی، دو قابِ فرورفته، و دستگیره. */
function Door({ state }: { state: "cleared" | "active" | "locked" }) {
  const panel =
    state === "active"
      ? "border-gold/70 bg-[linear-gradient(160deg,#3a2f12,#1b1608)]"
      : state === "cleared"
        ? "border-primary/50 bg-[linear-gradient(160deg,#0e2b2a,#071a19)]"
        : "border-white/10 bg-[linear-gradient(160deg,#161b24,#0c1016)]";

  return (
    <span className={`absolute inset-2 rounded-t-xl border ${panel}`}>
      {/* دو قابِ فرورفتهٔ کلاسیکِ یک درِ چوبی */}
      <span className="absolute inset-x-2 top-2 h-[42%] rounded-md border border-white/10 bg-black/20" />
      <span className="absolute inset-x-2 bottom-2 h-[42%] rounded-md border border-white/10 bg-black/20" />
      {/* دستگیره — سمت چپ، چون در راست‌به‌چپ از سمت راست باز می‌شود */}
      <span
        className={`absolute left-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full sm:size-2 ${
          state === "active" ? "bg-gold" : state === "cleared" ? "bg-primary/70" : "bg-white/20"
        }`}
      />
    </span>
  );
}

function SchoolMap({
  levels,
  clearedCount,
  onEnter,
}: {
  levels: JasoosLevel[];
  clearedCount: number;
  onEnter: (index: number) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="jasoos-hall relative z-20 w-full overflow-hidden rounded-2xl p-5 sm:p-10">
      {/* ---------- خودِ راهرو ---------- */}
      {/* دیوارِ ته راهرو، کفِ چوبی با خطوطِ همگرا، و یک هالهٔ نور در انتها.
          همه‌شان گرادیان‌اند: نه تصویری بارگذاری می‌شود نه چیزی می‌چرخد. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0a0f18_0%,#111826_45%,#0b1017_46%,#070b11_100%)]" />
        <div
          className="absolute inset-x-0 bottom-0 h-[54%]"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 7%)",
            maskImage: "linear-gradient(to top, black, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black, transparent)",
          }}
        />
        {/* نورِ ته راهرو */}
        <div
          className="absolute left-1/2 top-[38%] size-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 32%, transparent), transparent)",
          }}
        />
        <div className="jasoos-dust absolute inset-0 opacity-[0.05]" />
      </div>

      <div className="relative">
        <h2 className="mb-2 text-center text-lg font-bold sm:text-2xl">مدرسه‌ی جاسوس‌یاب</h2>
        <p className="mb-8 text-center text-xs text-muted-foreground sm:mb-12 sm:text-base">
          در راهرو جلو برو و وارد درِ روشن شو تا جاسوس را پیدا کنی.
        </p>

        {/* روی گوشی، راهرو افقی اسکرول می‌شود و نمی‌شکند.
            با `flex-wrap` درِ پنجم به سطر دوم می‌افتاد و چون هر ستون یک جای
            خالی برای بازیکن رزرو می‌کند، بینشان یک شکافِ بزرگِ خالی می‌ماند —
            که هم زشت بود و هم راهرو را دو تکه می‌کرد. روی صفحهٔ بزرگ همان
            چیدمانِ وسط‌چینِ قبلی می‌ماند. */}
        <div className="xs:gap-x-4 -mx-2 flex snap-x snap-mandatory items-end gap-x-3 overflow-x-auto px-2 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-10 sm:overflow-x-visible sm:px-0">
          {levels.map((lvl, i) => {
            const cleared = i < clearedCount;
            const active = i === clearedCount;
            const state = cleared ? "cleared" : active ? "active" : "locked";

            return (
              <div
                key={lvl.id}
                className="flex shrink-0 snap-center flex-col items-center gap-y-2"
              >
                {/* بازیکن روی درِ فعال می‌ایستد */}
                <div className="flex h-10 items-end sm:h-14">
                  {active && (
                    <motion.div
                      animate={reduced ? undefined : { y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
                      className="w-8 text-gold drop-shadow-[0_0_10px_rgba(224,178,60,0.6)] sm:w-10"
                    >
                      <PlayerFigure />
                    </motion.div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!active}
                  onClick={() => active && onEnter(i)}
                  aria-label={`${lvl.title}${active ? "" : cleared ? " — گذرانده‌شده" : " — قفل"}`}
                  className={`jasoos-door relative h-24 w-16 rounded-t-2xl border-2 transition-transform duration-200 sm:h-32 sm:w-24
                    ${
                      cleared
                        ? "border-primary/60 text-primary"
                        : active
                          ? "jasoos-door-active border-gold text-gold hover:scale-105 active:scale-95"
                          : "cursor-not-allowed border-white/10 text-white/25"
                    }`}
                >
                  <Door state={state} />

                  {/* شکافِ نور از زیرِ درِ باز — همان چیزی که «این در باز است»
                      را بدون هیچ کلمه‌ای می‌گوید */}
                  {active && (
                    <span
                      aria-hidden
                      className="jasoos-doorlight absolute inset-x-3 -bottom-1 h-1.5 rounded-full bg-gold"
                    />
                  )}

                  <span className="absolute inset-0 flex items-center justify-center">
                    {cleared ? <CheckIcon /> : active ? null : <LockIcon />}
                  </span>
                </button>

                <span className="text-center text-[10px] font-medium sm:text-sm">
                  {lvl.title}
                  <br />
                  <span className="text-muted-foreground">
                    {lvl.category === "دستوری" ? "نقش دستوری" : "آرایه‌ی ادبی"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SchoolMap;
