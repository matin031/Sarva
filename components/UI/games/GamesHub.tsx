"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import JasoosGame from "@/components/UI/jasoos/JasoosGame";
import NinjaGame from "@/components/UI/ninja/NinjaGame";

type GameId = "jasoos" | "ninja";

const GAMES: {
  id: GameId;
  title: string;
  description: string;
  cta: string;
}[] = [
  {
    id: "jasoos",
    title: "جاسوسِ نقش‌ها",
    description:
      "وارد مدرسه شو، پشتِ هر در یک بیت هست و چهار مظنون؛ جاسوسی را که نقشی دستوری یا آرایه‌ای ادعا می‌کند که در بیت وجود ندارد، نشانه بگیر و شلیک کن.",
    cta: "شروع بازی",
  },
  {
    id: "ninja",
    title: "نینجای دستور زبان",
    description:
      "کلماتِ یک دسته‌ی دستوری (قید، صفت، حرف ربط، ضمیر) را حفظ کن، بعد از بین صدها کلمه‌ی دیگر که توی هوا پرت می‌شوند، فقط همان‌ها را برش بزن.",
    cta: "شروع بازی",
  },
];

function GamesHub() {
  const [active, setActive] = useState<GameId | null>(null);

  if (active) {
    return (
      <div>
        <div className="container max-w-4xl mx-auto pt-6">
          <button
            onClick={() => setActive(null)}
            className="text-sm text-muted-foreground hover:text-primary transition-all inline-flex items-center gap-x-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            بازگشت به فهرستِ بازی‌ها
          </button>
        </div>
        {active === "jasoos" && <JasoosGame />}
        {active === "ninja" && <NinjaGame />}
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto my-10 sm:my-16">
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold mb-3 text-primary">
          بازی
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto">
          یاد گرفتن نقش‌های دستوری و آرایه‌های ادبی، این بار به‌شکل بازی.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <AnimatePresence>
          {GAMES.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setActive(g.id)}
              className="glass rounded-2xl p-6 sm:p-8 text-right hover:brightness-105 active:scale-[0.98] transition-all flex flex-col"
            >
              <h2 className="text-lg sm:text-2xl font-bold mb-2 text-primary">
                {g.title}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 flex-1">
                {g.description}
              </p>
              <span
                className="self-start inline-flex items-center justify-center font-medium text-primary-foreground
                  bg-primary hover:brightness-90 transition-all rounded-xl px-6 py-2.5 text-sm sm:text-base"
              >
                {g.cta}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default GamesHub;
