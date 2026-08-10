"use client";
import { motion } from "motion/react";
import { staggerContainer, fadeUpSmall } from "@/lib/motion";
import type { NinjaRound } from "@/lib/ninja-data";

/** صفحهٔ «این‌ها را حفظ کن»، درست پیش از برش‌زنی.
 *
 *  تنها کارش این است که چند کلمه را در حافظه بنشاند، پس خودِ کلمه‌ها باید
 *  مهم‌ترین چیزِ صفحه باشند: کارت‌های برجسته با شماره، که یکی‌یکی می‌آیند.
 *  نسخهٔ قبلی همه را با یک کلاس `glass` تخت نشان می‌داد و از متنِ توضیح
 *  تفکیک نمی‌شدند. */
function StudyTable({
  round,
  roundNumber,
  totalRounds,
  onStart,
}: {
  round: NinjaRound;
  roundNumber: number;
  totalRounds: number;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass relative z-20 overflow-hidden rounded-2xl p-6 text-center sm:p-10"
    >
      {/* همان حال‌وهوای زمین بازی، تا این صفحه وصله به نظر نرسد */}
      <span aria-hidden className="ninja-aurora ninja-aurora-a absolute inset-0 opacity-40" />
      <span aria-hidden className="ninja-grain pointer-events-none absolute inset-0 opacity-[0.05]" />

      <div className="relative">
        <span className="mb-3 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary sm:text-sm">
          مرحله {roundNumber} از {totalRounds}
        </span>
        <h2 className="mb-2 text-xl font-bold sm:text-3xl">
          این‌ها را بشناس: «<span className="text-primary">{round.category}</span>»
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground sm:text-base">
          {round.hint} این کلمات را خوب نگاه کن، چون الان بین صدها کلمه‌ی دیگر پرت
          می‌شوند و باید فقط همین‌ها را با کشیدن انگشت یا موس برش بزنی.
        </p>

        <motion.div
          variants={staggerContainer(0.05)}
          initial="hidden"
          animate="visible"
          className="xs:grid-cols-4 mb-8 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3"
        >
          {round.targetWords.map((w, i) => (
            <motion.div
              key={w}
              variants={fadeUpSmall}
              // شماره فقط تزئین نیست: کمک می‌کند بازیکن بداند چندتا را حفظ
              // کرده و چندتا مانده
              className="ninja-study-card group relative rounded-xl px-2 py-3 text-sm font-bold sm:text-base"
            >
              <span className="absolute right-1.5 top-1 text-[10px] font-normal text-primary/50">
                {(i + 1).toLocaleString("fa-IR")}
              </span>
              {w}
            </motion.div>
          ))}
        </motion.div>

        <button
          onClick={onStart}
          className="ninja-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground transition-transform active:scale-95 sm:text-lg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20 20 4M14 4h6v6" />
          </svg>
          شروع برش‌زنی
        </button>
      </div>
    </motion.div>
  );
}

export default StudyTable;
