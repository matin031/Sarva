import Link from "next/link";
import { redirect } from "next/navigation";
import { getAruzActivity, getAruzAttempts, getPanelUser } from "@/lib/panel/queries";
import { ARUZ_TYPE_LABEL, type AruzQuestionType } from "@/lib/panel/types";
import { dailyBuckets, fa, pct } from "@/lib/panel/format";
import {
  ActivityStrip,
  BarRow,
  Block,
  Card,
  EmptyState,
  PanelHeader,
  StatRow,
} from "@/components/UI/panel/primitives";
import AruzAttemptList from "@/components/UI/panel/AruzAttemptList";

export default async function AruzPanelPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const [attempts, activity] = await Promise.all([
    getAruzAttempts(user.id),
    getAruzActivity(user.id),
  ]);

  const total = attempts.reduce((s, a) => s + a.total, 0);
  const correct = attempts.reduce((s, a) => s + a.correct, 0);

  /** Accuracy per question type — which kind of عروض question is actually hard. */
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

  const startLink = (
    <Link
      href="/quiz"
      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-95"
    >
      آزمون تازه
    </Link>
  );

  if (attempts.length === 0) {
    return (
      <>
        <PanelHeader title="عروض" />
        <EmptyState
          title="هنوز آزمون عروضی نداده‌ای"
          body="هر آزمونی که بدهی همین‌جا با ریزِ سؤال‌ها و صوت‌هایش ذخیره می‌شود تا دوباره گوش بدهی."
          cta={startLink}
        />
      </>
    );
  }

  return (
    <>
      <PanelHeader title="عروض" action={startLink} />

      <StatRow
        items={[
          { label: "آزمون‌ها", value: fa(attempts.length) },
          { label: "کلِ سؤال‌ها", value: fa(total) },
          { label: "پاسخ درست", value: fa(correct) },
          { label: "دقت", value: pct(correct, total) },
        ]}
      />

      <Block title="روندِ پیشرفت" hint="دو هفتهٔ گذشته">
        <Card className="p-5">
          <ActivityStrip days={dailyBuckets(activity, 14)} />
        </Card>
      </Block>

      {byType.size > 0 && (
        <Block
          title="به تفکیکِ نوعِ سؤال"
          hint="نشان می‌دهد کدام نوع برایت سخت‌تر است"
        >
          <Card className="space-y-5 p-5">
            {(Object.keys(ARUZ_TYPE_LABEL) as AruzQuestionType[]).map((t) => {
              const row = byType.get(t);
              if (!row) return null;
              return (
                <BarRow
                  key={t}
                  label={ARUZ_TYPE_LABEL[t]}
                  correct={row.c}
                  total={row.t}
                />
              );
            })}
          </Card>
        </Block>
      )}

      <Block title="آزمون‌های گذشته" hint="هر آزمون را باز کن تا سؤال‌ها و صوت‌هایش را ببینی">
        <AruzAttemptList attempts={attempts} />
      </Block>
    </>
  );
}
