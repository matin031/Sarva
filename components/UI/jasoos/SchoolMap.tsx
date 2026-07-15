"use client";
import { motion } from "motion/react";
import type { JasoosLevel } from "@/lib/jasoos-data";
import PlayerFigure from "./PlayerFigure";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="size-6 sm:size-8">
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
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="size-6 sm:size-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="size-6 sm:size-8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 21V4.6a1 1 0 0 1 .8-.98l9-2A1 1 0 0 1 15 2.6V21M4 21h11M4 21H2.5M15 21h6M15 21h1.5M11.5 12.5h.01"
      />
    </svg>
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
  return (
    <div className="relative z-20 w-full rounded-2xl overflow-hidden glass p-5 sm:p-10">
      {/* <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0.22_0.03_260)_0%,transparent_55%)]" /> */}
      <h2 className="text-lg sm:text-2xl font-bold text-center mb-2">
        مدرسه‌ی جاسوس‌یاب
      </h2>
      <p className="text-center text-muted-foreground mb-8 sm:mb-12 text-xs sm:text-base">
        در راهرو جلو برو و وارد درِ روشن شو تا جاسوس را پیدا کنی.
      </p>

      <div className="flex items-end justify-center gap-x-2 xs:gap-x-4 sm:gap-x-8 flex-wrap gap-y-10">
        {levels.map((lvl, i) => {
          const cleared = i < clearedCount;
          const active = i === clearedCount;
          return (
            <div key={lvl.id} className="flex flex-col items-center gap-y-2">
              <div className="h-10 sm:h-14 flex items-end">
                {active && (
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
                    className="w-8 sm:w-10 text-gold"
                  >
                    <PlayerFigure />
                  </motion.div>
                )}
              </div>
              <button
                type="button"
                disabled={!active}
                onClick={() => active && onEnter(i)}
                className={`relative w-16 sm:w-24 h-24 sm:h-32 rounded-t-2xl border-4 flex items-center justify-center transition-all
                  ${
                    cleared
                      ? "border-primary bg-primary/15 text-primary"
                      : active
                        ? "border-gold bg-gold/10 text-gold shadow-[0_0_30px_rgba(224,178,60,0.4)] hover:scale-105 active:scale-95"
                        : "border-border/60 bg-secondary/40 text-muted-foreground/60 opacity-60 cursor-not-allowed"
                  }`}
              >
                {cleared ? <CheckIcon /> : active ? <DoorIcon /> : <LockIcon />}
              </button>
              <span className="text-[10px] sm:text-sm font-medium text-center">
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
  );
}

export default SchoolMap;
