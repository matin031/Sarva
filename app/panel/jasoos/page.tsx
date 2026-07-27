import Link from "next/link";
import { redirect } from "next/navigation";
import { getJasoosAnswers, getPanelUser } from "@/lib/panel/queries";
import { fa, groupIntoSessions, pct, relativeDay } from "@/lib/panel/format";
import {
  Card,
  EmptyState,
  PanelHeader,
  ScoreBar,
  StatTile,
} from "@/components/UI/panel/primitives";

export default async function JasoosPanelPage() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const answers = await getJasoosAnswers(user.id);
  const correct = answers.filter((a) => a.isCorrect).length;
  const sessions = groupIntoSessions(answers, (a) => a.answeredAt);

  /** Which grammatical / literary categories trip the student up. */
  const byCategory = new Map<string, { c: number; t: number }>();
  for (const a of answers) {
    const row = byCategory.get(a.category) ?? { c: 0, t: 0 };
    row.t += 1;
    if (a.isCorrect) row.c += 1;
    byCategory.set(a.category, row);
  }
  const categories = [...byCategory.entries()].sort(
    (a, b) => a[1].c / a[1].t - b[1].c / b[1].t,
  );

  const wrong = answers.filter((a) => !a.isCorrect).slice(0, 30);

  return (
    <>
      <PanelHeader
        title="جاسوسِ نقش‌ها"
        subtitle="نقش‌ها و آرایه‌هایی که تشخیص داده‌ای — و آن‌هایی که هنوز نه."
        action={
          <Link
            href="/game/jasoos"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            بازیِ تازه
          </Link>
        }
      />

      {answers.length === 0 ? (
        <EmptyState
          icon="🕵️"
          title="هنوز جاسوس بازی نکرده‌ای"
          body="در این بازی باید ادعای نادرست دربارهٔ یک بیت را پیدا کنی. هر پاسخ اینجا ثبت می‌شود تا ببینی کدام آرایه‌ها را باید مرور کنی."
          cta={
            <Link
              href="/game/jasoos"
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground transition-all hover:brightness-90"
            >
              شروع بازی
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
              hint={`${fa(correct)} درست`}
              index={1}
            />
            <StatTile
              label="دقت"
              value={pct(correct, answers.length)}
              token="--color-lapis-light"
              index={2}
            />
            <StatTile
              label="دسته‌های دیده‌شده"
              value={fa(byCategory.size)}
              token="--color-gold"
              index={3}
            />
          </div>

          <Card className="mt-6 p-5">
            <h2 className="mb-1 text-sm font-black text-foreground">
              به تفکیکِ دسته
            </h2>
            <p className="mb-4 text-[11px] text-muted-foreground">
              از ضعیف‌ترین به قوی‌ترین مرتب شده — بالای فهرست همان چیزی است که
              باید مرور کنی.
            </p>
            <ul className="space-y-4">
              {categories.map(([cat, row]) => (
                <li key={cat}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {cat}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fa(row.c)}/{fa(row.t)} — {pct(row.c, row.t)}
                    </span>
                  </div>
                  <ScoreBar
                    correct={row.c}
                    total={row.t}
                    token="--color-lapis-light"
                  />
                </li>
              ))}
            </ul>
          </Card>

          {wrong.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 text-sm font-black text-foreground">
                اشتباه‌های اخیر
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {wrong.map((a, i) => (
                  <li key={a.id}>
                    <Card index={i} className="p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {a.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {relativeDay(a.answeredAt)}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs text-muted-foreground">
                        پاسخِ تو:{" "}
                        <span className="font-bold text-destructive">
                          {a.chosenRole}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        پاسخِ درست:{" "}
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {a.correctRole}
                        </span>
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}
