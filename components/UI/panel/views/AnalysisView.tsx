import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import ErrorPatterns from "../analysis/ErrorPatterns";
import Improvements from "../analysis/Improvements";
import MasteryCard from "../analysis/MasteryCard";
import SkillBars from "../analysis/SkillBars";
import TopicMap from "../analysis/TopicMap";
import WeeklyTrendChart from "../analysis/WeeklyTrendChart";
import { RingRow } from "../skill/SkillMap";
import PanelPageHeader from "../PanelPageHeader";
import SarvaBuddy from "../SarvaBuddy";
import styles from "../panel-design.module.css";
import { fa } from "@/lib/panel/format";
import type { getTodayPlan, getWeightAnalysis, getRoleAnalysis, getMistakeBook, getProgressTrend } from "@/lib/plus/analysis";
import type { Insights } from "@/lib/plus/insights";

/**
 * ترتیبِ بخش‌ها عمدی است و از بالا به پایین یک استدلال را دنبال می‌کند:
 *
 *   امروز چه کنم؟ (برنامه) → کجای کارم؟ (شاخص) → کجا ضعیفم؟ (نقشه)
 *   → بهتر شدم؟ (تغییرها، روند) → اشتباهم چه شکلی است؟ (الگو، دفتر)
 *
 * ⚠️ «امروز برای تو» بالای همه می‌ماند. کسی که صفحه را باز می‌کند یک *کار*
 * می‌خواهد و نه یک گزارش؛ گزارش دلیلِ آن کار است و بعدش می‌آید.
 *
 * ⚠️ و فقط همان یک بخش طلایی است. نسخه‌ای که شاخصِ تسلط را هم طلایی کرد،
 * دو کارتِ هم‌رنگِ پشتِ سرِ هم ساخت و هیچ‌کدام دیگر «مهم» خوانده نمی‌شدند —
 * همان چیزی که `primitives.tsx` یک بار دربارهٔ رنگ‌کردنِ هر بلوک نوشت.
 */
export function AnalysisView({plan,weights,roles,mistakes,trend,insights}:{
plan: Awaited<ReturnType<typeof getTodayPlan>>;
weights: Awaited<ReturnType<typeof getWeightAnalysis>>;
roles: Awaited<ReturnType<typeof getRoleAnalysis>>;
mistakes: Awaited<ReturnType<typeof getMistakeBook>>;
trend: Awaited<ReturnType<typeof getProgressTrend>>;
insights: Insights;
}) {
  return (
    <>
      <PanelPageHeader title="برنامهٔ من" description="تحلیل ضعف‌ها و پیشرفت‌هایت، بر اساس پاسخ‌های خودت." tone="gold" />

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

      <MasteryCard mastery={insights.mastery} />

      <TopicMap data={insights.map} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Improvements deltas={insights.deltas} />
        <ErrorPatterns confusions={insights.confusions} shape={insights.errorShape} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SkillBars
          title="وزن‌ها"
          hint="از «عروض سماعی» و «پل وزن» با هم"
          analysis={weights}
          emptyText="هنوز تمرین کافی برای تحلیل وزن‌ها نداری."
        />
        <SkillBars
          title="نقش‌های دستوری"
          hint="از «جاسوس»، «مدار دستور» و «شکار نقش‌ها» با هم"
          analysis={roles}
          emptyText="هنوز تمرین کافی برای تحلیل نقش‌ها نداری."
        />
      </div>

      {/* ── روند ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>تمرینت نتیجه داد؟</CardTitle>
          <CardDescription>دقت کلی در هر هفته.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {trend.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              برای دیدن روند، دستِ‌کم دو هفته تمرین لازم است.
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
          <CardDescription>آخرین اشتباه‌هایت.</CardDescription>
        </CardHeader>
        <CardContent>
          {mistakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              اشتباهی ثبت نشده.
            </p>
          ) : (
            <>
              {/* ⚠️ هشت‌تای اول باز، بقیه در `<details>`: بیست سطرِ پشتِ سرِ هم
                  کلِ پایینِ صفحه را می‌گرفت. */}
              <ul className="flex flex-col">
                {mistakes.slice(0, 8).map((entry, index) => (
                  <MistakeRow key={`${entry.area}-${entry.at}-${index}`} entry={entry} />
                ))}
              </ul>
              {mistakes.length > 8 && (
                <details className="mt-2 border-t border-border/60 pt-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    بقیه ({fa(Math.min(mistakes.length, 20) - 8)})
                  </summary>
                  <ul className="mt-1 flex flex-col">
                    {mistakes.slice(8, 20).map((entry, index) => (
                      <MistakeRow key={`${entry.area}-${entry.at}-${index}`} entry={entry} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MistakeRow({ entry }: { entry: Awaited<ReturnType<typeof getMistakeBook>>[number] }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0">
        {/* بیت با نسخ نوشته می‌شود؛ بقیهٔ رابط با وزیرمتن. */}
        <p className="panel-verse truncate text-sm">{entry.title}</p>
        {entry.subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 text-xs">
        <span className="rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">{entry.areaLabel}</span>
        <Link href={entry.practiceHref} className="font-semibold text-primary underline-offset-[6px] hover:underline">
          تمرین
        </Link>
      </div>
    </li>
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
          {expired ? "اشتراک پلاس تمام شده" : "تحلیل ضعف‌ها با سروا پلاس"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          نقشهٔ مبحث‌ها، الگوی اشتباه‌ها و پیشرفت هر مبحث، مخصوص مشترکان سروا پلاس است.
          {expired && " سوابقت پاک نشده است."}
        </p>
        <Button asChild variant="gold" className="mt-5">
          <Link href="/plus">{expired ? "تمدید سروا پلاس" : "فعال‌سازی سروا پلاس"}</Link>
        </Button>
      </section>

      {/* ⚠️ فهرستِ زیر متنِ *ما*ست و نه دادهٔ کاربر — هیچ عددی از حساب او
          اینجا ساخته نمی‌شود. توابعِ تحلیل در این حالت اصلاً صدا زده
          نشده‌اند (گاردِ صفحه). */}
      <Card>
        <CardHeader>
          <CardTitle>چه چیزی می‌بینی</CardTitle>
          <CardDescription>همه از روی پاسخ‌های خودت ساخته می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed">
            {[
              ["نقشهٔ مبحث‌ها", "وزن، نقش دستوری، واژگانِ هر درس و قلمروهای آزمون، ضعیف‌ترین اول."],
              ["الگوی اشتباه‌ها", "اینکه کدام وزن یا نقش را با کدام یکی عوضی می‌گیری."],
              ["پیشرفت هر مبحث", "دو هفتهٔ اخیر در برابر دو هفتهٔ پیش از آن."],
              ["شاخص تسلط", "یک عدد از دقت، پوشش و استمرار — با اجزایش."],
              ["دفتر اشتباه‌ها", "تازه‌ترین پاسخ‌های نادرست در همهٔ تمرین‌ها."],
            ].map(([title, body]) => (
              <li key={title} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* پیش‌نمایشِ محو — از دادهٔ نمونه و نه از دادهٔ واقعیِ کاربر. */}
      <Card className="relative overflow-hidden">
        <span className="absolute start-4 top-4 z-10 rounded-full border border-border bg-background px-3 py-0.5 text-[11px] font-bold text-muted-foreground">
          نمونه
        </span>
        <CardContent className="plus-locked-preview" aria-hidden="true">
          <h2 className="font-bold">وزن‌ها</h2>
          <ul className="mt-2 flex flex-col">
            {["مفاعیلن", "فاعلاتن", "مستفعلن"].map((weight, index) => (
              <RingRow key={weight} label={weight} percent={40 + index * 15} color="var(--primary)" sub="۶ از ۱۴" />
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
