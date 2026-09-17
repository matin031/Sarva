import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import styles from "./panel-design.module.css";
import SarvaBuddy from "./SarvaBuddy";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import { CoolMode } from "@/components/UI/kit/cool-mode";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/UI/kit/card";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import AreaCards from "@/components/UI/panel/home/AreaCards";
import BadgeRow from "@/components/UI/panel/home/BadgeRow";
import ResumeSection from "@/components/UI/panel/home/ResumeSection";
import StatCards from "@/components/UI/panel/home/StatCards";
import { fa, jalaliLong, relativeDay } from "@/lib/panel/format";
import {
  bucketsFromDayCounts,
  correctFromDayCounts,
  streakFromDayCounts,
  totalFromDayCounts,
} from "@/lib/panel/day-counts";
import { answersInLastDays, badges, bestStreak, resumeItems, weekStrip } from "@/lib/panel/derive";
import type { PanelOverview } from "@/lib/panel/types";
import { DAILY_UNAVAILABLE_NOTE } from "@/lib/analytics/daily";

/**
 * صفحهٔ خانهٔ پنل.
 *
 * ⚠️ دیگر `"use client"` نیست. نسخهٔ قبلی کلِ صفحه را کلاینت می‌کرد تا
 * چهار کارت با `motion` یکی‌یکی ظاهر شوند — یعنی کلِ محاسبه و کلِ درختِ
 * صفحه به مرورگر می‌رفت، برای انیمیشنی که کاربر یک بار می‌بیند. حالا تنها
 * جزیرهٔ کلاینتِ این صفحه نمودار است (Recharts) و حلقهٔ دقت.
 *
 * ترتیبِ صفحه یک ادعاست: «امروز چه کار کنم» قبل از «تا امروز چه کردم».
 */
export default function HomePanel({
  name,
  memberSince,
  overview,
  todayPlan,
}: {
  name: string;
  memberSince: string | null;
  overview: PanelOverview;
  /** پیشنهادِ «برنامهٔ من» — فقط وقتی کاربر سروا پلاس فعال دارد. */
  todayPlan?: { title: string; detail: string; href: string; minutes: number } | null;
}) {
  const { dayCounts, dayState, bookmarks, exams } = overview;

  /* ⚠️ گروه‌بندیِ روز ممکن نبوده — جدول‌های منطقهٔ زمانی روی سرور نیستند.
  
     در آن حالت `dayCounts` **خالی** است و خالی بودنش معنایش «کاری نکرده‌ای»
     نیست. پس هر چیزی که از روزها ساخته می‌شود (رشتهٔ روزها، نوارِ هفته،
     نمودار) پنهان می‌شود و به‌جایش دلیلش نوشته می‌شود — ولی شمارنده‌ها
     می‌مانند، چون `counts` هیچ ربطی به منطقهٔ زمانی ندارد. */
  const daysUsable = dayState === "ready";

  /* ⚠️ جمع‌ها از `counts` و نه از `dayCounts`.
  
     تا دیروز از `dayCounts` می‌آمدند و روی سروری بدونِ جدول‌های منطقه،
     کلِ صفحه صفر می‌شد — «هنوز تمرینی نکرده‌ای» به کسی که صدها پاسخ
     داده. `counts` همان ردیف‌ها را بدونِ گروه‌بندیِ روز می‌شمارد. */
  const total = daysUsable
    ? totalFromDayCounts(dayCounts)
    : Object.values(overview.counts).reduce((n, c) => n + c.total, 0);
  const correct = daysUsable
    ? correctFromDayCounts(dayCounts)
    : Object.values(overview.counts).reduce((n, c) => n + c.correct, 0);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const streak = streakFromDayCounts(dayCounts);
  const best = bestStreak(dayCounts);
  const week = weekStrip(dayCounts);

  const last7 = answersInLastDays(dayCounts, 7);
  const last14 = answersInLastDays(dayCounts, 14);

  const lastAt = dayCounts.reduce<string | null>(
    (m, d) => (d.total > 0 && (!m || d.day > m) ? d.day : m),
    null,
  );

  /* ⚠️ روی سرور حساب می‌شود و صفحه `force-dynamic` است، پس تاریخ در
     کش گیر نمی‌کند. `jalaliLong` هم منطقهٔ تهران را صریح می‌دهد، پس
     سرورِ UTC هم همان روزی را می‌نویسد که کاربر در ایران می‌بیند. */
  const today = jalaliLong(new Date().toISOString());

  return (
    <>
      {/* ── خوش‌آمد ───────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
        {/* ⚠️ این خط پیش‌تر «هر روز، یک قدم به دانستن نزدیک‌تر» بود —
            جمله‌ای که هیچ خبری نداشت و هر روزِ سال درست بود. تاریخِ
            امروز دست‌کم یک چیزِ واقعی است. */}
        <p className={styles.eyebrow}>{today}</p>
        <h1>سلام {name}</h1>
        <p className={styles.heroDescription}>
          {/* ⚠️ ترتیبِ این شرط‌ها مهم است: بدونِ گروه‌بندیِ روز، `lastAt`
              همیشه null است — و پیامِ «اولین تمرینت از همین‌جا شروع می‌شود»
              به کسی که صدها پاسخ داده، غلط‌ترین جمله‌ای است که می‌شد نوشت.
              پس اول وضعیتِ روزها سنجیده می‌شود و بعد خودِ تاریخ. */}
          {!daysUsable ? (
            total > 0 ? (
              <>تا اینجا {fa(total)} تمرین ثبت کرده‌ای.</>
            ) : (
              <>هنوز تمرینی ثبت نکرده‌ای. از همین دکمه شروع کن.</>
            )
          ) : lastAt ? (
            streak > 0 ? (
              <>
                آخرین تمرینت {relativeDay(lastAt)} بود؛{" "}
                <span className="panel-num font-semibold text-primary">{fa(streak)} روز</span>{" "}
                پشت سر هم تمرین کرده‌ای.
              </>
            ) : (
              <>آخرین تمرینت {relativeDay(lastAt)} بود. یک تمرینِ امروز، زنجیره را دوباره راه می‌اندازد.</>
            )
          ) : (
            <>هنوز تمرینی ثبت نکرده‌ای. از همین دکمه شروع کن.</>
          )}
        </p>
        {/* ⚠️ «عضو از …» از وسطِ جملهٔ بالا درآمد. آنجا با یک خط تیره به
            جمله‌ای چسبیده بود که ربطی به آن نداشت. */}
        {memberSince && (
          <p className="mt-1.5 text-[12px] text-muted-foreground/75">
            عضو از {relativeDay(memberSince)}
          </p>
        )}
        {/* دکمهٔ اصلیِ پنل — همان Shiny Buttonی که در صفحهٔ خانهٔ سایت
            هست، پس دو دکمهٔ «شروع» در دو جای سایت یک شکل‌اند. Cool Mode هم
            فقط روی همین یک دکمه می‌نشیند: جلوهٔ جشن، اگر همه‌جا باشد، دیگر
            جشن نیست. */}
        <CoolMode options={{ glyphs: ["✦", "✧", "❋", "۱", "۰"], count: 22 }}>
          <ShinyButton asChild className={styles.heroButton}>
            <Link href="/game">
              شروع تمرین
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </ShinyButton>
        </CoolMode>
        </div>
        <div className={styles.heroArt}><SarvaBuddy /></div>
      </header>

      <StatCards
        streak={streak}
        best={best}
        week={week}
        accuracy={accuracy}
        correct={correct}
        total={total}
        weekTotal={last7.total}
        prevWeekTotal={last14.total - last7.total}
      />

      <div className={styles.workspace}>
      <div className="flex min-w-0 flex-col gap-4">
        <ResumeSection items={resumeItems(overview)} />

        {/* پیشنهادِ برنامهٔ من — یک نوارِ باریک زیرِ تمرکزِ اصلی، نه یک کارتِ
            هم‌وزنِ کنارِ آن. اینجا فقط *یک* مورد می‌آید؛ فهرستِ کاملش در
            «برنامهٔ من» است. */}
        {todayPlan && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3">
            <Sparkles aria-hidden className="size-4 shrink-0 text-gold" />
            <p className="min-w-0 flex-1 text-[13.5px]">
              <span className="font-semibold text-gold">{todayPlan.title}</span> — {todayPlan.detail}
            </p>
            <Link
              href={todayPlan.href}
              className="panel-num shrink-0 text-[13px] font-semibold text-gold underline-offset-[6px] hover:underline"
            >
              شروع مرور ({fa(todayPlan.minutes)} دقیقه)
            </Link>
          </div>
        )}
      </div>

      <AreaCards overview={overview} />
      </div>

      <BadgeRow
        badges={badges({
          streak,
          best,
          total,
          bookmarks,
          examBest: exams.best,
        })}
      />

      {/* ── روندِ سی روز ─────────────────────────────────────────────── */}
      <Card className="bg-surface/60">
        <CardHeader>
          <CardTitle>۳۰ روز گذشته</CardTitle>
          <CardDescription>
            هر ستون یک روز است؛ بخشِ پررنگ، پاسخ‌های درست.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {daysUsable ? (
            <PanelTrendChart buckets={bucketsFromDayCounts(dayCounts, 30)} days={30} />
          ) : (
            /* ⚠️ یک نمودارِ صفر اینجا دروغ می‌گفت. جملهٔ صریح بهتر است. */
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              {DAILY_UNAVAILABLE_NOTE}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ⚠️ شمارندهٔ نشان‌شده‌ها از کارت‌های بالا برداشته شد و به سایدبار
          رفت؛ این یک خطِ ساده است تا لینکش از خانه هم در دسترس بماند. */}
      {bookmarks > 0 && (
        <p className="text-center text-[13px] text-muted-foreground">
          <Link href="/panel/bookmarks" className="text-primary underline-offset-[6px] hover:underline">
            {fa(bookmarks)} مورد نشان‌شده
          </Link>{" "}
          داری.
        </p>
      )}
    </>
  );
}
