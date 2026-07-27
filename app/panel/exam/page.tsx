import Link from "next/link";
import { redirect } from "next/navigation";
import { getExamAttempts, getPanelUser } from "@/lib/panel/queries";
import { clock, fa, jalaliLong, pct, relativeDay } from "@/lib/panel/format";
import {
  BarRow,
  Block,
  Card,
  EmptyState,
  PanelHeader,
  StatRow,
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
          <StatRow
            items={[
              { label: "آزمون‌ها", value: fa(attempts.length) },
              {
                label: "میانگین",
                value: pct(scored, maxed),
                hint: `${fa(Math.round(scored * 10) / 10)} از ${fa(maxed)}`,
              },
              {
                label: "بهترین نتیجه",
                value: `${fa(Math.round(best * 100))}٪`,
              },
              {
                label: "آخرین آزمون",
                value: relativeDay(attempts[0].createdAt),
              },
            ]}
          />

          <Block title="روندِ نمره‌ها">
            <Card className="space-y-5 p-5">
              {[...attempts]
                .slice(0, 8)
                .reverse()
                .map((a) => (
                  <BarRow
                    key={a.id}
                    label={`${a.examTitle} · ${jalaliLong(a.createdAt)}`}
                    correct={a.totalScore}
                    total={a.maxScore}
                  />
                ))}
            </Card>
          </Block>

          <Block title="کارنامه‌ها">
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
          </Block>
        </>
      )}
    </>
  );
}
