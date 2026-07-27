import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAruzActivity,
  getAruzAttempts,
  getBookmarks,
  getExamAttempts,
  getJasoosAnswers,
  getPanelUser,
  getVocabAnswers,
} from "@/lib/panel/queries";
import { dailyBuckets, fa, pct, relativeDay, streak } from "@/lib/panel/format";
import {
  ActivityStrip,
  BarRow,
  Block,
  Card,
  EmptyState,
  PanelHeader,
  StatRow,
} from "@/components/UI/panel/primitives";

export default async function OverviewPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [aruzAttempts, aruzActivity, vocab, jasoos, exams, bookmarks] =
    await Promise.all([
      getAruzAttempts(user.id),
      getAruzActivity(user.id),
      getVocabAnswers(user.id),
      getJasoosAnswers(user.id),
      getExamAttempts(user.id),
      getBookmarks(user.id),
    ]);

  const aruzTotal = aruzAttempts.reduce((s, a) => s + a.total, 0);
  const aruzCorrect = aruzAttempts.reduce((s, a) => s + a.correct, 0);
  const vocabCorrect = vocab.filter((v) => v.isCorrect).length;
  const jasoosCorrect = jasoos.filter((j) => j.isCorrect).length;

  const totalAnswers = aruzTotal + vocab.length + jasoos.length;
  const totalCorrect = aruzCorrect + vocabCorrect + jasoosCorrect;

  const days = dailyBuckets(
    [
      ...aruzActivity,
      ...vocab.map((v) => ({ at: v.answeredAt, ok: v.isCorrect })),
      ...jasoos.map((j) => ({ at: j.answeredAt, ok: j.isCorrect })),
    ],
    14,
  );

  const recent: { when: string; label: string; detail: string; href: string }[] =
    [];
  if (aruzAttempts[0])
    recent.push({
      when: aruzAttempts[0].createdAt,
      label: "آزمون عروض",
      detail: `${fa(aruzAttempts[0].correct)} از ${fa(aruzAttempts[0].total)} درست`,
      href: "/panel/aruz",
    });
  if (vocab[0])
    recent.push({
      when: vocab[0].answeredAt,
      label: "واژه‌یاب",
      detail: vocab[0].word,
      href: "/panel/vocab",
    });
  if (jasoos[0])
    recent.push({
      when: jasoos[0].answeredAt,
      label: "جاسوس نقش‌ها",
      detail: jasoos[0].category,
      href: "/panel/jasoos",
    });
  if (exams[0])
    recent.push({
      when: exams[0].createdAt,
      label: exams[0].examTitle,
      detail: `${fa(exams[0].totalScore)} از ${fa(exams[0].maxScore)}`,
      href: "/panel/exam",
    });
  recent.sort((a, b) => Date.parse(b.when) - Date.parse(a.when));

  if (totalAnswers === 0 && exams.length === 0) {
    return (
      <>
        <PanelHeader title="نمای کلی" />
        <EmptyState
          title="هنوز چیزی اینجا نیست"
          body="با اولین آزمون یا بازی، کارنامه‌ات همین‌جا ساخته می‌شود."
          cta={
            <Link
              href="/quiz"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-95"
            >
              آزمون عروض
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PanelHeader title="نمای کلی" />

      <StatRow
        items={[
          {
            label: "کلِ پاسخ‌ها",
            value: fa(totalAnswers),
            hint: `${pct(totalCorrect, totalAnswers)} درست`,
          },
          {
            label: "روزهای پیاپی",
            value: fa(
              streak([
                ...aruzActivity.map((a) => a.at),
                ...vocab.map((v) => v.answeredAt),
                ...jasoos.map((j) => j.answeredAt),
              ]),
            ),
          },
          { label: "آزمون‌های نهایی", value: fa(exams.length) },
          { label: "نشان‌شده‌ها", value: fa(bookmarks.length) },
        ]}
      />

      <Block title="فعالیت دو هفتهٔ گذشته">
        <Card className="p-5">
          <ActivityStrip days={days} />
        </Card>
      </Block>

      <Block title="دقت به تفکیکِ بخش">
        <Card className="space-y-5 p-5">
          <BarRow label="عروض" correct={aruzCorrect} total={aruzTotal} />
          <BarRow label="واژه‌یاب" correct={vocabCorrect} total={vocab.length} />
          <BarRow label="جاسوس" correct={jasoosCorrect} total={jasoos.length} />
        </Card>
      </Block>

      {recent.length > 0 && (
        <Block title="آخرین فعالیت‌ها">
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {recent.slice(0, 5).map((r, i) => (
              <li key={i}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">
                      {r.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeDay(r.when)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </>
  );
}
