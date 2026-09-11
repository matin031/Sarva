import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import SkillBars from "../analysis/SkillBars";
import WeeklyTrendChart from "../analysis/WeeklyTrendChart";
import PanelPageHeader from "../PanelPageHeader";
import SarvaBuddy from "../SarvaBuddy";
import styles from "../panel-design.module.css";
import { fa } from "@/lib/panel/format";
import type { getTodayPlan, getWeightAnalysis, getRoleAnalysis, getMistakeBook, getProgressTrend } from "@/lib/plus/analysis";

export function AnalysisView({plan,weights,roles,mistakes,trend}:{
plan: Awaited<ReturnType<typeof getTodayPlan>>;
weights: Awaited<ReturnType<typeof getWeightAnalysis>>;
roles: Awaited<ReturnType<typeof getRoleAnalysis>>;
mistakes: Awaited<ReturnType<typeof getMistakeBook>>;
trend: Awaited<ReturnType<typeof getProgressTrend>>;
}) {
  return (
    <>
      <PanelPageHeader title="قدم بعدی‌ات را پیدا کنیم" description="برنامه‌ای از دل پاسخ‌های خودت؛ چند تمرین کوچک برای بهتر شدن." eyebrow="برنامهٔ من" tone="gold" />

      {/* ── امروز برای تو ─────────────────────────────────────────── */}
      <section data-panel-card="" data-tone="gold" className="rounded-3xl border border-gold/25 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <Sparkles aria-hidden className="size-5 text-gold" />
          <h2 className="text-xl font-bold">امروز برای تو</h2>
        </div>

        {plan.items.length === 0 ? (
          /* ⚠️ وقتی شواهد کافی نیست، پیشنهادِ ساختگی ساخته نمی‌شود. یک
             پیشنهادِ بی‌پایه، وقتِ دانش‌آموز را روی چیزی می‌گذارد که مشکلش
             نبوده و بعد او به کلِ تحلیل بی‌اعتماد می‌شود. */
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.emptyReason}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {plan.items.map((item) => (
              <li
                key={item.kind}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/70 bg-background/45 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="panel-num text-[11.5px] text-muted-foreground">
                      حدود {fa(item.minutes)} دقیقه
                    </span>
                  </div>
                  <p className="panel-num mt-1 text-[12.5px] text-muted-foreground">{item.detail}</p>
                </div>
                <Button asChild variant="push" size="sm">
                  <Link href={item.href}>شروع تمرین</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkillBars
          title="وزن‌ها"
          hint="از «عروض سماعی» و «پل وزن» با هم"
          analysis={weights}
          emptyText="هنوز تمرینِ کافی برای تحلیل وزن‌ها نداری."
        />
        <SkillBars
          title="نقش‌های دستوری"
          hint="از «جاسوس» و «مدار دستور» با هم"
          analysis={roles}
          emptyText="هنوز تمرینِ کافی برای تحلیل نقش‌ها نداری."
        />
      </div>

      {/* ── روند ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>تمرینت نتیجه داد؟</CardTitle>
          <CardDescription>دقتِ کلی به تفکیک هفته — هر پنج تمرینِ سروا با هم.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {trend.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              برای دیدنِ روند، دستِ‌کم دو هفته تمرین لازم است.
            </p>
          ) : (
            <WeeklyTrendChart points={trend} />
          )}
        </CardContent>
      </Card>

      {/* ── دفتر اشتباه‌ها ─────────────────────────────────────────── */}
      <Card id="mistakes">
        <CardHeader>
          <CardTitle>دفتر اشتباه‌ها</CardTitle>
          <CardDescription>آخرین چیزهایی که اشتباه زدی — با لینکِ تمرینِ همان‌ها.</CardDescription>
        </CardHeader>
        <CardContent>
          {mistakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز اشتباهی ثبت نشده — یا همه را درست زده‌ای.
            </p>
          ) : (
            <ul className="flex flex-col">
              {mistakes.slice(0, 20).map((entry, index) => (
                <li
                  key={`${entry.area}-${entry.at}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    {/* بیت با نسخ نوشته می‌شود؛ بقیهٔ رابط با وزیرمتن. */}
                    <p className="panel-verse truncate text-sm">{entry.title}</p>
                    {entry.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {entry.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5 text-xs">
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">
                      {entry.areaLabel}
                    </span>
                    <Link
                      href={entry.practiceHref}
                      className="font-semibold text-primary underline-offset-[6px] hover:underline"
                    >
                      تمرین
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ────────────────────────── نمای قفل‌شده ───────────────────────────────── */

/**
 * ⚠️ متنِ دعوت به همین صفحه ربط دارد و یک «خرید اشتراک» عمومی نیست.
 * کاربری که آمده دفتر اشتباه‌هایش را ببیند، باید بخواند «مرور اشتباه‌ها با
 * سروا پلاس» — نه یک پیامِ تبلیغاتیِ بی‌ربط که در همهٔ سایت یکی است.
 */
export function LockedView({ expired }: { expired: boolean }) {
  return (
    <>
      <section className={styles.emptyState}>
        <SarvaBuddy />
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold">
          <Sparkles aria-hidden className="size-3.5" /> سروا پلاس
        </span>
        <h1 className="mt-2 text-xl font-bold">
          {expired ? "مرور اشتباه‌ها را دوباره روشن کن" : "مرور اشتباه‌ها با سروا پلاس"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          اشتباه‌های ثبت‌شده‌ات را دوباره تمرین کن و نتیجهٔ مرور را ببین. سروا پلاس از
          پاسخ‌های خودت می‌فهمد کدام وزن و کدام نقش دستوری را باید مرور کنی.
          {expired && " همهٔ سابقهٔ تمرینت دست‌نخورده باقی مانده است."}
        </p>
        <Button asChild variant="gold" className="mt-5">
          <Link href="/plus">{expired ? "تمدید سروا پلاس" : "فعال‌سازی سروا پلاس"}</Link>
        </Button>
      </section>

      {/* پیش‌نمایشِ محو — از دادهٔ نمونه و نه از دادهٔ واقعیِ کاربر. */}
      <Card className="relative overflow-hidden">
        <span className="absolute start-4 top-4 z-10 rounded-full border border-border bg-background px-3 py-0.5 text-[11px] font-bold text-muted-foreground">
          نمونه
        </span>
        <CardContent className="plus-locked-preview" aria-hidden="true">
          <h2 className="font-bold">وزن‌ها</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {["مفاعیلن", "فاعلاتن", "مستفعلن"].map((weight, index) => (
              <li key={weight}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold">{weight}</span>
                  <span className="panel-num text-xs text-muted-foreground">۶ از ۱۴</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/8">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${40 + index * 15}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
