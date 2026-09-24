"use client";

import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import MainLogo from "@/components/svgs/mainLogo";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { BorderBeam } from "@/components/UI/kit/magic/border-beam";
import { NumberTicker } from "@/components/UI/kit/magic/number-ticker";
import {
  accuracy,
  averageResponseTime,
  type QuestionStats,
  type SessionStats,
} from "@/lib/aruz-rapid/machine";
import type { RapidAruzQuestion } from "@/lib/aruz-rapid/types";
import { Sparkle } from "./LicenseNote";

const fa = (n: number) => n.toLocaleString("fa-IR");
const EASE = [0.22, 1, 0.36, 1] as const;

/** زمان به ثانیه (یک رقمِ اعشار) یا، از یک دقیقه به بالا، به دقیقه. */
function duration(ms: number | null): { value: number | null; unit: string; decimals: number } {
  if (ms === null) return { value: null, unit: "", decimals: 0 };
  if (ms >= 60_000) return { value: Math.round(ms / 6000) / 10, unit: "دقیقه", decimals: 1 };
  return { value: Math.round(ms / 100) / 10, unit: "ثانیه", decimals: 1 };
}

function Stat({
  label,
  value,
  unit,
  decimals = 0,
  delay,
}: {
  label: string;
  value: number | null;
  unit?: string;
  decimals?: number;
  delay: number;
}) {
  return (
    <div className="aruzr-res-stat">
      <dt>{label}</dt>
      <dd>
        {value === null ? "—" : <NumberTicker value={value} decimalPlaces={decimals} delay={delay} />}
        {unit && value !== null ? <span className="aruzr-res-stat-unit">{unit}</span> : null}
      </dd>
    </div>
  );
}

/**
 * صفحهٔ نتیجه: شیشهٔ مات با نشانِ سروا پشتش، مثلِ بقیهٔ بازی‌های سایت.
 *
 * هیچ عددی اینجا محاسبه نمی‌شود جز قالب‌بندی؛ همه از آمارِ reducer می‌آید.
 * این صفحه یک صفحهٔ معمولیِ سروا است — نه بازیِ تمام‌صفحه — پس سربرگ و
 * پابرگِ سایت دوباره سرِ جایشان برمی‌گردند.
 */
export default function ResultsScreen({
  kind,
  question,
  shortSymbol,
  longSymbol,
  questionStats,
  sessionStats,
  sessionActiveTimeMs,
  questionNumber,
  questionCount,
  onNext,
  onRetry,
  onBackToIntro,
}: {
  kind: "question" | "session";
  question: RapidAruzQuestion | null;
  shortSymbol: string;
  longSymbol: string;
  questionStats: QuestionStats;
  sessionStats: SessionStats;
  sessionActiveTimeMs: number;
  questionNumber: number;
  questionCount: number;
  onNext: () => void;
  onRetry: () => void;
  onBackToIntro: () => void;
}) {
  const isSession = kind === "session";
  const acc = accuracy(isSession ? sessionStats : questionStats);
  const run = duration(questionStats.successfulRunTimeMs);
  const avg = duration(averageResponseTime(questionStats));
  const total = duration(sessionActiveTimeMs);
  const licensed = question?.units.some((u) => u.license) ?? false;

  return (
    <MotionConfig reducedMotion="user">
      <div dir="rtl" className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <motion.section
          className="aruzr-res"
          initial={{ opacity: 0, y: 16, scale: 0.985, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <div className="aruzr-res-glass" aria-hidden="true">
            <div className="aruzr-res-logo">
              <MainLogo />
            </div>
            <div className="aruzr-res-frost" />
            <div className="aruzr-res-sheen" />
          </div>
          <BorderBeam size={140} duration={10} colorFrom="var(--aruzr-accent)" colorTo="var(--aruzr-gold)" />

          <header className="aruzr-res-head">
            <span className="aruzr-badge">
              {isSession ? "پایان نشست" : `مصراع ${fa(questionNumber)} از ${fa(questionCount)}`}
            </span>
            <h2 className="aruzr-res-title">{isSession ? "نشست تمام شد" : "تقطیع کامل شد"}</h2>
          </header>

          <div className="aruzr-res-hero">
            <div className="aruzr-res-ring">
              <AnimatedCircularProgress
                value={acc * 100}
                label={`دقت: ${fa(Math.round(acc * 100))} درصد`}
                color={["var(--aruzr-accent)", "var(--aruzr-gold)"]}
                className="size-24 sm:size-28"
              />
              <span className="aruzr-res-ring-label">دقت</span>
            </div>

            <dl className="aruzr-res-stats">
              {isSession ? (
                <>
                  <Stat
                    label="مصراع"
                    value={sessionStats.questionsCompleted}
                    unit={`از ${fa(questionCount)}`}
                    delay={0.15}
                  />
                  <Stat label="پاسخ درست" value={sessionStats.totalCorrectInputs} delay={0.2} />
                  <Stat
                    label="خطا"
                    value={sessionStats.totalWrongChoices + sessionStats.totalTimeouts}
                    delay={0.25}
                  />
                  <Stat label="زمان کل" {...total} delay={0.3} />
                </>
              ) : (
                <>
                  <Stat label="دور موفق" {...run} delay={0.15} />
                  <Stat label="تلاش" value={questionStats.attemptCount} delay={0.2} />
                  <Stat label="خطا" value={questionStats.wrongChoices + questionStats.timeouts} delay={0.25} />
                  <Stat label="میانگین پاسخ" {...avg} delay={0.3} />
                </>
              )}
            </dl>
          </div>

          {question ? (
            <figure className="aruzr-res-verse">
              <p className="aruzr-result-text" lang="fa">
                {question.previewText}
              </p>
              {question.meter || question.attribution ? (
                <figcaption className="aruzr-res-meta">
                  {[question.meter, question.attribution].filter(Boolean).join(" · ")}
                </figcaption>
              ) : null}

              {/* تقطیعِ کامل، هجا به هجا — همان چیزی که دانش‌آموز باید می‌شنید. */}
              <ol className="aruzr-res-units" aria-label="تقطیع">
                {question.units.map((u, i) => (
                  <motion.li
                    key={u.id}
                    className="aruzr-res-tile"
                    data-length={u.length}
                    data-license={u.license ? "true" : undefined}
                    initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.035, ease: EASE }}
                  >
                    {u.license ? <Sparkle className="aruzr-res-tile-spark" /> : null}
                    <span className="aruzr-res-tile-text">{u.display}</span>
                    <span className="aruzr-res-tile-mark" aria-hidden="true">
                      {u.length === "short" ? shortSymbol : longSymbol}
                    </span>
                    <span className="sr-only">{u.length === "short" ? "کوتاه" : "بلند"}</span>
                  </motion.li>
                ))}
              </ol>

              {licensed ? (
                <p className="aruzr-res-legend">
                  <Sparkle className="size-3.5" />
                  اختیار شاعری
                </p>
              ) : null}
              {question.explanation ? <p className="aruzr-res-note">{question.explanation}</p> : null}
            </figure>
          ) : null}

          <div className="aruzr-res-actions">
            {isSession ? null : (
              <button type="button" onClick={onNext} className="aruzr-cta">
                مصراع بعدی
              </button>
            )}
            <button type="button" onClick={onRetry} className="aruzr-ghost-btn">
              همین را دوباره
            </button>
            <button type="button" onClick={onBackToIntro} className="aruzr-ghost-btn">
              نشست تازه
            </button>
          </div>

          <Link href="/game" className="aruzr-res-back">
            بازگشت به کهکشان بازی‌ها
          </Link>
        </motion.section>
      </div>
    </MotionConfig>
  );
}
