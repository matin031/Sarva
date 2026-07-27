import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ARUZ_TYPE_LABEL,
  getAruzActivity,
  getAruzAttempts,
  getPanelUser,
  type AruzQuestionType,
} from "@/lib/panel/queries";
import { dailyBuckets, fa, pct } from "@/lib/panel/format";
import {
  ActivityStrip,
  Card,
  EmptyState,
  PanelHeader,
  ScoreBar,
  StatTile,
} from "@/components/UI/panel/primitives";
import AruzAttemptList from "@/components/UI/panel/AruzAttemptList";

const TYPE_TOKENS: Record<AruzQuestionType, string> = {
  "poem-to-audio": "--color-primary",
  "audio-to-poem": "--color-gold",
  "weight-to-audio": "--color-lapis-light",
};

export default async function AruzPanelPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [attempts, activity] = await Promise.all([
    getAruzAttempts(user.id),
    getAruzActivity(user.id),
  ]);

  const total = attempts.reduce((s, a) => s + a.total, 0);
  const correct = attempts.reduce((s, a) => s + a.correct, 0);

  /** Accuracy per question type — the breakdown that tells a student which
   *  kind of عروض question they actually struggle with. */
  const byType = new Map<AruzQuestionType, { c: number; t: number }>();
  for (const a of attempts) {
    for (const ans of a.answers) {
      if (!ans.type) continue;
      const row = byType.get(ans.type) ?? { c: 0, t: 0 };
      row.t += 1;
      if (ans.isCorrect) row.c += 1;
      byType.set(ans.type, row);
    }
  }

  const best = attempts.reduce(
    (b, a) => (a.total && a.correct / a.total > b ? a.correct / a.total : b),
    0,
  );

  return (
    <>
      <PanelHeader
        title="عروض"
        subtitle="آزمون‌های صوتی‌ای که داده‌ای، به تفکیکِ نوعِ سؤال."
        action={
          <Link
            href="/quiz"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            آزمون تازه
          </Link>
        }
      />

      {attempts.length === 0 ? (
        <EmptyState
          icon="🎧"
          title="هنوز آزمون عروضی نداده‌ای"
          body="در آزمون عروض، وزنِ بیت را با گوش تشخیص می‌دهی. هر آزمونی که بدهی همین‌جا با ریزِ پاسخ‌هایت ذخیره می‌شود."
          cta={
            <Link
              href="/quiz"
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90"
            >
              شروع آزمون عروض
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="آزمون‌ها" value={fa(attempts.length)} index={0} />
            <StatTile
              label="کلِ سؤال‌ها"
              value={fa(total)}
              hint={`${fa(correct)} درست`}
              index={1}
            />
            <StatTile
              label="دقتِ کلی"
              value={pct(correct, total)}
              token="--color-gold"
              index={2}
            />
            <StatTile
              label="بهترین آزمون"
              value={`${fa(Math.round(best * 100))}٪`}
              token="--color-lapis-light"
              index={3}
            />
          </div>

          <Card className="mt-6 p-5">
            <h2 className="mb-4 text-sm font-black text-foreground">
              روندِ پیشرفت — دو هفتهٔ گذشته
            </h2>
            <ActivityStrip days={dailyBuckets(activity, 14)} />
          </Card>

          <Card className="mt-4 p-5">
            <h2 className="mb-1 text-sm font-black text-foreground">
              به تفکیکِ نوعِ سؤال
            </h2>
            <p className="mb-4 text-[11px] text-muted-foreground">
              نشان می‌دهد کدام نوع سؤال برایت سخت‌تر است.
            </p>
            {byType.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                نوعِ سؤال‌های این آزمون‌ها ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-4">
                {(Object.keys(ARUZ_TYPE_LABEL) as AruzQuestionType[]).map(
                  (t) => {
                    const row = byType.get(t);
                    if (!row) return null;
                    return (
                      <li key={t}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {ARUZ_TYPE_LABEL[t]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {fa(row.c)}/{fa(row.t)} — {pct(row.c, row.t)}
                          </span>
                        </div>
                        <ScoreBar
                          correct={row.c}
                          total={row.t}
                          token={TYPE_TOKENS[t]}
                        />
                      </li>
                    );
                  },
                )}
              </ul>
            )}
          </Card>

          <h2 className="mt-8 mb-3 text-sm font-black text-foreground">
            آزمون‌های گذشته
          </h2>
          <AruzAttemptList attempts={attempts} />
        </>
      )}
    </>
  );
}
