import { redirect } from "next/navigation";
import RangAraPanel, { type LessonCard, type Play } from "@/components/UI/panel/RangAraPanel";
import { getPanelUser, getRangAraAnswers, getRangAraLessonTotals } from "@/lib/panel/queries";
import { toSkillTiles } from "@/lib/panel/skills";
import { CONCEPTS, type GradeKey } from "@/lib/rang-ara/content";
import { GRADE_KEYS, bookLabel, isGradeKey } from "@/lib/rang-ara/verse";

export const dynamic = "force-dynamic";

/** رنگِ هر آرایه در پنل؛ همان خانوادهٔ پالتِ بازی، با روشنیِ میانه تا در هر دو تم خوانا باشد. */
const TONE: Record<string, string> = {
  sky: "oklch(0.72 0.12 246)",
  rose: "oklch(0.7 0.14 8)",
  peach: "oklch(0.75 0.13 55)",
  iris: "oklch(0.66 0.13 276)",
  butter: "oklch(0.8 0.13 92)",
  sage: "oklch(0.72 0.11 150)",
  lilac: "oklch(0.7 0.13 304)",
  aqua: "oklch(0.74 0.1 200)",
  berry: "oklch(0.68 0.15 342)",
  lime: "oklch(0.76 0.14 125)",
};

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [answers, totals] = await Promise.all([getRangAraAnswers(user.id), getRangAraLessonTotals()]);

  const catalog = Object.values(CONCEPTS).map((c) => ({ key: c.id, label: c.label, hint: c.hint, color: TONE[c.color] }));
  const tiles = toSkillTiles(
    answers.map((a) => ({
      key: a.concept,
      label: CONCEPTS[a.concept as keyof typeof CONCEPTS]?.label ?? a.concept,
      correct: a.isCorrect,
      at: a.answeredAt,
    })),
    catalog,
  );

  // گام‌های هر بار بازی کنارِ هم؛ پاسخ‌ها از تازه به قدیم آمده‌اند.
  const byPlay = new Map<string, Play>();
  for (const a of answers) {
    const play = byPlay.get(a.playId) ?? {
      id: a.playId,
      verse: a.verse,
      book: isGradeKey(a.grade) && a.lesson ? bookLabel(a.grade, a.lesson) : null,
      at: a.answeredAt,
      steps: [],
    };
    play.steps.push({
      label: CONCEPTS[a.concept as keyof typeof CONCEPTS]?.label ?? a.concept,
      color: TONE[CONCEPTS[a.concept as keyof typeof CONCEPTS]?.color] ?? "var(--primary)",
      mistakes: a.mistakes,
    });
    byPlay.set(a.playId, play);
  }

  const lessons: LessonCard[] = totals
    .filter((t) => isGradeKey(t.grade))
    .map((t) => {
      const mine = answers.filter((a) => a.grade === t.grade && a.lesson === t.lesson);
      return {
        grade: t.grade as GradeKey,
        lesson: t.lesson,
        title: bookLabel(t.grade as GradeKey, t.lesson),
        verses: t.verses,
        played: new Set(mine.map((a) => a.verseKey)).size,
        steps: mine.length,
        clean: mine.filter((a) => a.isCorrect).length,
      };
    })
    .sort((a, b) => GRADE_KEYS.indexOf(a.grade) - GRADE_KEYS.indexOf(b.grade) || a.lesson - b.lesson);

  return (
    <RangAraPanel
      tiles={tiles}
      plays={[...byPlay.values()]}
      lessons={lessons}
      history={answers.map((a) => ({ at: a.answeredAt, ok: a.isCorrect }))}
    />
  );
}
