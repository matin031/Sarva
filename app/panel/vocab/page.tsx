import Link from "next/link";
import { redirect } from "next/navigation";
import { getPanelUser, getVocabAnswers } from "@/lib/panel/queries";
import { fa, groupIntoSessions, pct } from "@/lib/panel/format";
import {
  EmptyState,
  PanelHeader,
  StatTile,
} from "@/components/UI/panel/primitives";
import VocabPanelClient from "@/components/UI/panel/VocabPanelClient";

export default async function VocabPanelPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const answers = await getVocabAnswers(user.id);
  const sessions = groupIntoSessions(answers, (a) => a.answeredAt);
  const correct = answers.filter((a) => a.isCorrect).length;
  const distinctWords = new Set(answers.map((a) => a.word)).size;
  const stillWrong = new Set(
    answers.filter((a) => !a.isCorrect).map((a) => a.word),
  );
  // a word counts as learned once its most recent answer was right
  const latestByWord = new Map<string, boolean>();
  for (const a of answers) if (!latestByWord.has(a.word)) latestByWord.set(a.word, a.isCorrect);
  const mastered = [...latestByWord.values()].filter(Boolean).length;

  return (
    <>
      <PanelHeader
        title="واژه‌یاب"
        subtitle="هر آزمونی که داده‌ای، با همان سؤال‌هایی که پاسخ دادی."
        action={
          <Link
            href="/game/vocab"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            بازیِ تازه
          </Link>
        }
      />

      {answers.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="هنوز واژه‌یاب بازی نکرده‌ای"
          body="هر دوری که بازی کنی اینجا ذخیره می‌شود: تاریخش، واژه‌هایش و اینکه کدام را درست زدی."
          cta={
            <Link
              href="/game/vocab"
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90"
            >
              شروع واژه‌یاب
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="دورهای بازی" value={fa(sessions.length)} index={0} />
            <StatTile
              label="کلِ پاسخ‌ها"
              value={fa(answers.length)}
              hint={`${pct(correct, answers.length)} درست`}
              index={1}
            />
            <StatTile
              label="واژه‌های دیده‌شده"
              value={fa(distinctWords)}
              token="--color-gold"
              index={2}
            />
            <StatTile
              label="واژه‌های یادگرفته"
              value={fa(mastered)}
              hint={`${fa(stillWrong.size)} واژه هنوز مشکل‌دار`}
              token="--color-lapis-light"
              index={3}
            />
          </div>

          <VocabPanelClient answers={answers} />
        </>
      )}
    </>
  );
}
