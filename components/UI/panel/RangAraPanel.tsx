"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Check } from "lucide-react";
import PanelPageHeader from "./PanelPageHeader";
import PracticeSummary from "./PracticeSummary";
import PanelSection from "./PanelSection";
import styles from "./panel-design.module.css";
import { FocusCard, MasteryLadder, SkillGrid } from "./skill/SkillMap";
import SkillRadar from "./skill/SkillRadar";
import { EmptyState } from "./primitives";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { fa, relativeDay, streak } from "@/lib/panel/format";
import { masteryOf, type SkillTile } from "@/lib/panel/skills";
import type { GradeKey } from "@/lib/rang-ara/content";

export type Play = {
  id: string;
  verse: string;
  book: string | null;
  at: string;
  steps: { label: string; color: string; mistakes: number }[];
};

export type LessonCard = {
  grade: GradeKey;
  lesson: number;
  title: string;
  verses: number;
  played: number;
  steps: number;
  clean: number;
};

const GRADE: Record<GradeKey, string> = { dahom: "دهم", yazdahom: "یازدهم", davazdahom: "دوازدهم" };
const EASE = [0.16, 1, 0.3, 1] as const;

export default function RangAraPanel({
  tiles,
  plays,
  lessons,
  history,
}: {
  tiles: SkillTile[];
  plays: Play[];
  lessons: LessonCard[];
  history: { at: string; ok: boolean }[];
}) {
  const steps = history.length;
  const clean = history.filter((h) => h.ok).length;
  const mastered = tiles.filter((t) => masteryOf(t.total, t.correct) === "mastered").length;
  const grades = [...new Set(lessons.map((l) => l.grade))];

  return (
    <div className={styles.pageStack}>
      <PanelPageHeader
        title="آرایه‌ها"
        description="آرایه‌هایی که در رنگ‌آرا پیدا کرده‌ای."
        tone="lilac"
        action={
          <ShinyButton asChild>
            <Link href="/game/rang-ara">
              بازی رنگ‌آرا
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </ShinyButton>
        }
      />

      <PracticeSummary
        items={[
          { label: "درست در بار اول", value: steps ? `${fa(Math.round((clean / steps) * 100))}٪` : "—" },
          { label: "بیت‌های کامل‌شده", value: fa(plays.length) },
          { label: "آرایه‌های مسلط", value: `${fa(mastered)} از ${fa(tiles.length)}` },
          { label: "زنجیرهٔ تمرین", value: `${fa(streak(history.map((h) => h.at)))} روز` },
        ]}
      />

      {!steps ? (
        <EmptyState
          title="هنوز بیتی را کامل نکرده‌ای"
          body="هر بیتی که در رنگ‌آرا تمام کنی، اینجا به تفکیک آرایه ثبت می‌شود."
          cta={
            <ShinyButton asChild>
              <Link href="/game/rang-ara">شروع بازی</Link>
            </ShinyButton>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <PanelSection title="سطح تسلط" icon="award">
            <div className="mt-4 flex flex-col gap-5">
              <MasteryLadder tiles={tiles} unit="آرایه" />
              <FocusCard tiles={tiles} href="/game/rang-ara" cta="تمرین" />
            </div>
          </PanelSection>
          <PanelSection title="نیم‌رخ آرایه‌ها" icon="chart" hint="درصد آرایه‌هایی که بار اول درست پیدا شدند.">
            <div className="mt-2">
              <SkillRadar tiles={tiles} color="var(--panel-lilac)" />
            </div>
          </PanelSection>
        </div>
      )}

      <PanelSection title="آرایه‌ها" icon="scale" hint="هر گامی که بدون رنگ اشتباه پیدا شد، درست حساب می‌شود.">
        <SkillGrid tiles={tiles} />
      </PanelSection>

      {lessons.length > 0 && (
        <PanelSection title="درس‌ها" icon="bookmark" hint="چند بیت از هر درس را کامل کرده‌ای.">
          {grades.map((g) => (
            <div key={g} className="mt-5">
              <h3 className="text-sm font-bold text-muted-foreground">پایهٔ {GRADE[g]}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lessons
                  .filter((l) => l.grade === g)
                  .map((l) => (
                    <li
                      key={`${l.grade}-${l.lesson}`}
                      className={`flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 ${l.played ? "" : "opacity-65"}`}
                    >
                      <AnimatedCircularProgress
                        value={l.verses ? Math.round((Math.min(l.played, l.verses) / l.verses) * 100) : 0}
                        ready={l.played > 0}
                        color={["var(--panel-lilac)", "var(--gold)"]}
                        className="size-12"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold">{fa(l.title)}</p>
                        <p className="panel-num mt-0.5 text-[12px] text-muted-foreground">
                          {fa(Math.min(l.played, l.verses))} از {fa(l.verses)} بیت
                          {l.steps > 0 && ` · ${fa(Math.round((l.clean / l.steps) * 100))}٪ بار اول`}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </PanelSection>
      )}

      {plays.length > 0 && (
        <PanelSection title="بیت‌های اخیر" icon="clipboard">
          <ul className="mt-4 flex flex-col gap-3">
            {plays.slice(0, 8).map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.04, ease: EASE }}
                className="rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="game-verse text-[15px] font-semibold leading-8">{p.verse}</p>
                  <p className="panel-num shrink-0 text-[11.5px] text-muted-foreground">
                    {p.book ? `${fa(p.book)} · ` : ""}
                    {relativeDay(p.at)}
                  </p>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.steps.map((s, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium"
                      style={{
                        borderColor: `color-mix(in oklch, ${s.color} 45%, transparent)`,
                        background: `color-mix(in oklch, ${s.color} 14%, transparent)`,
                      }}
                    >
                      {s.label}
                      {s.mistakes === 0 ? (
                        <Check aria-label="بار اول" className="size-3.5 text-primary" />
                      ) : (
                        <span className="panel-num text-[11px] text-destructive">{fa(s.mistakes)} غلط</span>
                      )}
                    </span>
                  ))}
                </div>
              </motion.li>
            ))}
          </ul>
        </PanelSection>
      )}
    </div>
  );
}
