"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import JasoosGame from "@/components/UI/jasoos/JasoosGame";
import NinjaGame from "@/components/UI/ninja/NinjaGame";
import PairsGame from "@/components/UI/pairs/PairsGame";
import VocabGame from "@/components/UI/vocab/VocabGame";
import { JasoosPreview, NinjaPreview, PairsPreview, VocabPreview } from "./GamePreviews";

type GameId = "jasoos" | "ninja" | "pairs" | "vocab";

const ACTIVE_GAME_KEY = "bazi-active-game";

const GAMES: {
  id: GameId;
  title: string;
  tagline: string;
  skill: string;
  how: string[];
  accent: string; // tailwind text color class for the number/accents
  chipBg: string;
  Preview: () => React.ReactNode;
}[] = [
  {
    id: "jasoos",
    title: "جاسوسِ نقش‌ها",
    tagline: "یک بیت، چهار مظنون، یک دروغگو.",
    skill: "نقش‌های دستوری و آرایه‌های ادبی",
    how: [
      "پشتِ هر در یک بیت باز می‌شود و چهار مظنون ادعایی دربارهٔ آن می‌کنند.",
      "یکی‌شان نقشی دستوری یا آرایه‌ای می‌گوید که در بیت وجود ندارد.",
      "جاسوسِ دروغگو را نشانه بگیر و شلیک کن.",
    ],
    accent: "text-lapis",
    chipBg: "bg-lapis-light/15 text-foreground",
    Preview: JasoosPreview,
  },
  {
    id: "ninja",
    title: "نینجای دستور زبان",
    tagline: "فقط کلمه‌های درست را برش بزن.",
    skill: "تشخیص دسته‌های دستوری",
    how: [
      "یک دستهٔ دستوری می‌گیری: قید، صفت، حرف ربط یا ضمیر.",
      "ده‌ها کلمه توی هوا پرت می‌شوند و باید سریع تصمیم بگیری.",
      "فقط کلمه‌های همان دسته را برش بزن و بقیه را رها کن.",
    ],
    accent: "text-primary",
    chipBg: "bg-primary/15 text-foreground",
    Preview: NinjaPreview,
  },
  {
    id: "pairs",
    title: "جفت‌های ادبی",
    tagline: "هر اثر را به خالقش برسان.",
    skill: "آثار و پدیدآورندگانِ ادب فارسی",
    how: [
      "اول آثار و نویسنده‌هایشان را مرور و حفظ می‌کنی.",
      "کارت‌ها برمی‌گردند و باید از حافظه‌ات کمک بگیری.",
      "هر اثر را به پدیدآورنده‌اش جفت کن تا همه باز شوند.",
    ],
    accent: "text-gold",
    chipBg: "bg-gold/15 text-foreground",
    Preview: PairsPreview,
  },
  {
    id: "vocab",
    title: "واژه‌یاب",
    tagline: "تصویر را ببین، واژه‌اش را بشناس.",
    skill: "واژگانِ درس‌های فارسی",
    how: [
      "پایه و درس را انتخاب می‌کنی.",
      "یک تصویر می‌بینی و سه واژه پیشِ روی توست.",
      "واژهٔ مربوط به تصویر را بزن و معنی کامل را یاد بگیر.",
    ],
    accent: "text-primary",
    chipBg: "bg-primary/15 text-foreground",
    Preview: VocabPreview,
  },
];

function GamesHub() {
  const [active, setActive] = useState<GameId | null>(null);
  const [restored, setRestored] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // resume whichever game was open before a refresh — reading localStorage
  // requires the browser, so this can only happen after mount
  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_GAME_KEY);
    if (saved === "jasoos" || saved === "ninja" || saved === "pairs" || saved === "vocab") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(saved);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    if (active) {
      localStorage.setItem(ACTIVE_GAME_KEY, active);
    } else {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  }, [active, restored]);

  // intercept the browser's back button while a game is open, asking to
  // confirm instead of silently leaving mid-game
  useEffect(() => {
    if (!active) return;
    window.history.pushState({ baziGame: true }, "");
    const onPopState = () => {
      window.history.pushState({ baziGame: true }, "");
      setShowExitConfirm(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [active]);

  const requestExit = () => setShowExitConfirm(true);

  const confirmExit = () => {
    localStorage.removeItem("jasoos-progress");
    localStorage.removeItem("ninja-progress");
    setShowExitConfirm(false);
    setActive(null);
  };

  if (!restored) {
    return (
      <div className="container max-w-4xl mx-auto my-10 sm:my-16 text-center text-muted-foreground">
        در حال بارگذاری...
      </div>
    );
  }

  if (active) {
    return (
      <div>
        <div className="container max-w-4xl mx-auto pt-6">
          <button
            onClick={requestExit}
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
        {active === "pairs" && <PairsGame />}
        {active === "vocab" && <VocabGame />}

        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitConfirm(false)}
              className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 12 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="glass rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center"
              >
                <h3 className="text-lg sm:text-xl font-bold mb-2">
                  قصد بستن بازی را داری؟
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  اگه الان خارج بشی، پیشرفتِ این دور از دست می‌ره.
                </p>
                <div className="flex items-center gap-x-3">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full glass hover:brightness-110 active:scale-95 transition-all rounded-xl py-2.5 text-sm sm:text-base font-medium"
                  >
                    نه، ادامه بده
                  </button>
                  <button
                    onClick={confirmExit}
                    className="w-full bg-destructive text-white hover:brightness-110 active:scale-95 transition-all rounded-xl py-2.5 text-sm sm:text-base font-medium"
                  >
                    بله، خارج شو
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div dir="rtl" className="container mx-auto my-10 max-w-5xl sm:my-16">
      {/* hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-14 overflow-hidden rounded-3xl border border-border
         px-6 py-12 text-center sm:py-16 bg-card z-20"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 120% at 50% -10%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 60%)",
          }}
        />
        {/* floating glyphs */}
        {["∪", "—", "✦", "؟", "∪", "—"].map((g, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute text-2xl text-primary/15 sm:text-4xl"
            style={{ left: `${8 + i * 16}%`, top: `${i % 2 === 0 ? 15 : 60}%` }}
            animate={{ y: [0, -14, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {g}
          </motion.span>
        ))}
        <div className="relative">
          <span
            className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs
           font-semibold text-primary"
          >
            بازی و یادگیری
          </span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">
            زمینِ بازیِ <span className="text-primary">ادبیات</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-lg">
            دستور زبان، آرایه‌ها و بزرگانِ ادب فارسی را این بار بازی کن — سریع،
            رقابتی و ماندگار.
          </p>
        </div>
      </motion.div>

      {/* one lavish section per game */}
      <div className="flex flex-col gap-16 sm:gap-24">
        {GAMES.map((g, i) => {
          const reversed = i % 2 === 1;
          return (
            <motion.section
              key={g.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-col items-center gap-8 md:gap-12 ${reversed ? "md:flex-row-reverse" : "md:flex-row"}`}
            >
              {/* animated preview */}
              <div className="w-full md:w-1/2 max-h-[385px]!">
                <g.Preview />
              </div>

              {/* copy */}
              <div className="w-full text-right md:w-1/2">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className={`text-5xl font-black opacity-20 ${g.accent}`}
                  >
                    {(i + 1).toLocaleString("fa-IR")}
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold sm:text-3xl">
                      {g.title}
                    </h2>
                    <p className={`text-sm font-semibold ${g.accent}`}>
                      {g.tagline}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${g.chipBg}`}
                >
                  تقویت: {g.skill}
                </span>

                <ol className="mt-4 flex flex-col gap-2.5">
                  {g.how.map((step, s) => (
                    <li
                      key={s}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground sm:text-base"
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${g.chipBg}`}
                      >
                        {(s + 1).toLocaleString("fa-IR")}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>

                <button
                  onClick={() => setActive(g.id)}
                  className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 font-bold text-primary-foreground transition-all hover:brightness-90 active:scale-95"
                >
                  شروع بازی
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    className="size-4 transition-transform group-hover:-translate-x-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 6 3 12l6 6M21 12H4"
                    />
                  </svg>
                </button>
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

export default GamesHub;
