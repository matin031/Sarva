import Link from "next/link";
import { redirect } from "next/navigation";
import { getExamAttempts, getPanelUser } from "@/lib/panel/queries";
import { clock, fa, jalaliLong, pct, relativeDay } from "@/lib/panel/format";
import {
  Card,
  EmptyState,
  PanelHeader,
  ScoreBar,
  StatTile,
} from "@/components/UI/panel/primitives";
import ExamAttemptCard from "@/components/UI/panel/ExamAttemptCard";

export default async function ExamPanelPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const attempts = await getExamAttempts(user.id);
  const scored = attempts.reduce((s, a) => s + a.totalScore, 0);
  const maxed = attempts.reduce((s, a) => s + a.maxScore, 0);
  const best = attempts.reduce(
    (b, a) => (a.maxScore && a.totalScore / a.maxScore > b ? a.totalScore / a.maxScore : b),
    0,
  );

  return (
    <>
      <PanelHeader
        title="امتحان نهایی"
        subtitle="کارنامهٔ آزمون‌های نهایی، سؤال‌به‌سؤال."
        action={
          <Link
            href="/exam"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            آزمون تازه
          </Link>
        }
      />

      {attempts.length === 0 ? (
        <EmptyState
          icon="📄"
          title="هنوز امتحان نهایی نداده‌ای"
          body="آزمون‌های نهایی سال‌های گذشته با تصحیحِ خودکار برگزار می‌شوند؛ نمرهٔ هر سؤال همین‌جا نگه داشته می‌شود."
          cta={
            <Link
              href="/exam"
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90"
            >
              دیدن آزمون‌ها
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="آزمون‌ها" value={fa(attempts.length)} index={0} />
            <StatTile
              label="میانگین"
              value={pct(scored, maxed)}
              hint={`${fa(Math.round(scored * 10) / 10)} از ${fa(maxed)}`}
              index={1}
            />
            <StatTile
              label="بهترین نتیجه"
              value={`${fa(Math.round(best * 100))}٪`}
              token="--color-gold"
              index={2}
            />
            <StatTile
              label="آخرین آزمون"
              value={relativeDay(attempts[0].createdAt)}
              token="--color-lapis-light"
              index={3}
            />
          </div>

          <Card className="mt-6 p-5">
            <h2 className="mb-4 text-sm font-black text-foreground">
              روندِ نمره‌ها
            </h2>
            <ul className="space-y-3">
              {[...attempts]
                .slice(0, 8)
                .reverse()
                .map((a) => (
                  <li key={a.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">
                        {a.examTitle}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {fa(Math.round(a.totalScore * 10) / 10)}/
                        {fa(a.maxScore)} — {jalaliLong(a.createdAt)}
                      </span>
                    </div>
                    <ScoreBar correct={a.totalScore} total={a.maxScore} />
                  </li>
                ))}
            </ul>
          </Card>

          <h2 className="mt-8 mb-3 text-sm font-black text-foreground">
            کارنامه‌ها
          </h2>
          <ul className="space-y-3">
            {attempts.map((a, i) => (
              <li key={a.id}>
                <ExamAttemptCard
                  attempt={{
                    id: a.id,
                    examTitle: a.examTitle,
                    totalScore: a.totalScore,
                    maxScore: a.maxScore,
                    createdAt: a.createdAt,
                    results: a.results,
                  }}
                  index={i}
                  when={`${relativeDay(a.createdAt)} — ${jalaliLong(a.createdAt)} ساعت ${clock(a.createdAt)}`}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
