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
import { dailyBuckets, fa, groupIntoSessions, pct, relativeDay, streak } from "@/lib/panel/format";
import {
  ActivityStrip,
  Card,
  EmptyState,
  PanelHeader,
  ScoreBar,
  StatTile,
} from "@/components/UI/panel/primitives";
import { PANEL_SECTIONS } from "@/lib/panel/nav";

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
  const vocabSessions = groupIntoSessions(vocab, (v) => v.answeredAt);

  const allAnswerDates = [
    ...aruzActivity.map((a) => a.at),
    ...vocab.map((v) => v.answeredAt),
    ...jasoos.map((j) => j.answeredAt),
  ];
  const days = dailyBuckets(
    [
      ...aruzActivity,
      ...vocab.map((v) => ({ at: v.answeredAt, ok: v.isCorrect })),
      ...jasoos.map((j) => ({ at: j.answeredAt, ok: j.isCorrect })),
    ],
    14,
  );

  const totalAnswers = aruzTotal + vocab.length + jasoos.length;
  const totalCorrect = aruzCorrect + vocabCorrect + jasoosCorrect;
  const nothingYet = totalAnswers === 0 && exams.length === 0;

  const recent: {
    when: string;
    label: string;
    detail: string;
    href: string;
  }[] = [];
  if (aruzAttempts[0])
    recent.push({
      when: aruzAttempts[0].createdAt,
      label: "آزمون عروض",
      detail: `${fa(aruzAttempts[0].correct)} از ${fa(aruzAttempts[0].total)} درست`,
      href: "/panel/aruz",
    });
  if (vocabSessions[0]?.length)
    recent.push({
      when: vocabSessions[0][0].answeredAt,
      label: "واژه‌یاب",
      detail: `${fa(vocabSessions[0].length)} واژه`,
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

  return (
    <>
      <PanelHeader
        title="نمای کلی"
        subtitle="خلاصهٔ همهٔ کارهایی که در سروا انجام داده‌ای."
      />

      {nothingYet ? (
        <EmptyState
          icon="🌱"
          title="هنوز چیزی اینجا نیست"
          body="با اولین آزمون یا بازی، کارنامه‌ات همین‌جا ساخته می‌شود: هر پاسخ، هر واژه و هر نمره."
          cta={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/quiz"
                className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90"
              >
                آزمون عروض
              </Link>
              <Link
                href="/game/vocab"
                className="rounded-xl border border-border bg-card px-6 py-2.5 font-bold text-foreground transition-colors hover:border-primary/40"
              >
                واژه‌یاب
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="کلِ پاسخ‌ها"
              value={fa(totalAnswers)}
              hint={`${pct(totalCorrect, totalAnswers)} درست`}
              index={0}
            />
            <StatTile
              label="روزهای پیاپی"
              value={fa(streak(allAnswerDates))}
              hint="فعالیت بی‌وقفه"
              token="--color-gold"
              index={1}
            />
            <StatTile
              label="آزمون‌های نهایی"
              value={fa(exams.length)}
              hint={
                exams.length
                  ? `آخرین: ${fa(exams[0].totalScore)}/${fa(exams[0].maxScore)}`
                  : "هنوز نداده‌ای"
              }
              token="--color-lapis-light"
              index={2}
            />
            <StatTile
              label="نشان‌شده‌ها"
              value={fa(bookmarks.length)}
              hint="برای مرور بعدی"
              token="--color-gold"
              index={3}
            />
          </div>

          <Card className="mt-6 p-5">
            <h2 className="mb-4 text-sm font-black text-foreground">
              فعالیت دو هفتهٔ گذشته
            </h2>
            <ActivityStrip days={days} />
            <p className="mt-3 text-[11px] text-muted-foreground">
              ارتفاعِ هر ستون تعدادِ پاسخ‌های آن روز است؛ بخشِ پررنگ، پاسخ‌های
              درست.
            </p>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-black text-foreground">
                دقت به تفکیکِ بخش
              </h2>
              <ul className="space-y-4">
                {[
                  { label: "عروض", c: aruzCorrect, t: aruzTotal, token: "--color-primary", href: "/panel/aruz" },
                  { label: "واژه‌یاب", c: vocabCorrect, t: vocab.length, token: "--color-gold", href: "/panel/vocab" },
                  { label: "جاسوس", c: jasoosCorrect, t: jasoos.length, token: "--color-lapis-light", href: "/panel/jasoos" },
                ].map((r) => (
                  <li key={r.label}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <Link
                        href={r.href}
                        className="text-sm font-bold text-foreground hover:text-primary"
                      >
                        {r.label}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {r.t
                          ? `${fa(r.c)}/${fa(r.t)} — ${pct(r.c, r.t)}`
                          : "بدون پاسخ"}
                      </span>
                    </div>
                    <ScoreBar correct={r.c} total={r.t} token={r.token} />
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-black text-foreground">
                آخرین فعالیت‌ها
              </h2>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز چیزی نیست.</p>
              ) : (
                <ul className="space-y-2.5">
                  {recent.slice(0, 5).map((r, i) => (
                    <li key={i}>
                      <Link
                        href={r.href}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 transition-colors hover:border-primary/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">
                            {r.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {r.detail}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relativeDay(r.when)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      {/* quick links into every section */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PANEL_SECTIONS.filter((s) => s.href !== "/panel").map((s, i) => (
          <Card key={s.href} index={i} className="p-0">
            <Link
              href={s.href}
              className="flex items-center gap-3 p-4 transition-colors hover:text-primary"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
                style={{ color: `var(${s.token})` }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">
                  {s.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {s.hint}
                </span>
              </span>
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
