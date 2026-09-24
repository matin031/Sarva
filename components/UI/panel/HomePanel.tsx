import Link from "next/link";
import { Sparkles, ArrowLeft, Compass, Flame } from "lucide-react";
import styles from "./panel-design.module.css";
import SarvaBuddy from "./SarvaBuddy";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";
import { CoolMode } from "@/components/UI/kit/cool-mode";
import { BorderBeam } from "@/components/UI/kit/magic/border-beam";
import { BlurFade } from "@/components/UI/kit/magic/blur-fade";
import AreaCards from "@/components/UI/panel/home/AreaCards";
import ActivityHeatmap from "@/components/UI/panel/home/ActivityHeatmap";
import BadgeRow from "@/components/UI/panel/home/BadgeRow";
import LevelBar from "@/components/UI/panel/home/LevelBar";
import ResumeSection from "@/components/UI/panel/home/ResumeSection";
import StatCards from "@/components/UI/panel/home/StatCards";
import TrendCard from "@/components/UI/panel/home/TrendCard";
import { fa, jalaliLong, relativeDay } from "@/lib/panel/format";
import {
  bucketsFromDayCounts,
  correctFromDayCounts,
  streakFromDayCounts,
  tehranDayKey,
  totalFromDayCounts,
} from "@/lib/panel/day-counts";
import { answersInLastDays, badges, bestStreak, levelOf, resumeItems, weekStrip } from "@/lib/panel/derive";
import type { PanelOverview } from "@/lib/panel/types";
import { DAILY_UNAVAILABLE_NOTE } from "@/lib/analytics/daily";

/** سلامِ متناسب با ساعتِ تهران — روی سرور، پس با ساعتِ دستگاهِ کاربر عوض نمی‌شود. */
function greeting(now: Date): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", hour: "numeric", hourCycle: "h23" }).format(now));
  if (h >= 5 && h < 12) return "صبح بخیر";
  if (h >= 12 && h < 17) return "ظهر بخیر";
  if (h >= 17 && h < 20) return "عصر بخیر";
  return "شب بخیر";
}

/**
 * صفحهٔ خانهٔ پنل.
 *
 * ⚠️ خودش `"use client"` نیست: محاسبه‌ها روی سرور می‌مانند و فقط جزیره‌های
 * کوچک (شمارنده، کارتِ نورانی، نمودار، هدفِ روزانه) کلاینت‌اند.
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
     نیست. پس هر چیزی که از روزها ساخته می‌شود پنهان می‌شود، ولی شمارنده‌ها
     می‌مانند، چون `counts` هیچ ربطی به منطقهٔ زمانی ندارد. */
  const daysUsable = dayState === "ready";

  /* ⚠️ جمع‌ها از `counts` وقتی روزها در دسترس نیستند — وگرنه روی سروری بدونِ
     جدول‌های منطقه کلِ صفحه صفر می‌شد. */
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
  const today = answersInLastDays(dayCounts, 1).total;

  const lastAt = dayCounts.reduce<string | null>(
    (m, d) => (d.total > 0 && (!m || d.day > m) ? d.day : m),
    null,
  );

  const now = new Date();
  const level = levelOf(total);
  const firstName = name.trim().split(/\s+/)[0] || name;
  const mood = !daysUsable ? "happy" : today > 0 ? "proud" : "sleepy";

  return (
    <>
      {/* ── خوش‌آمد ───────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div aria-hidden className={styles.heroDots} />
        <div className={styles.heroCopy}>
          <div className="flex flex-wrap items-center gap-2">
            <p className={styles.eyebrow}>{jalaliLong(now.toISOString())}</p>
            {daysUsable && streak > 0 && (
              <p className={`${styles.eyebrow} ${styles.eyebrowGold}`}>
                <Flame aria-hidden className="size-3.5" />
                <span className="panel-num">{fa(streak)} روز پیاپی</span>
              </p>
            )}
          </div>
          <h1>
            {greeting(now)}، {firstName}
          </h1>
          <p className={styles.heroDescription}>
            {/* ⚠️ ترتیبِ این شرط‌ها مهم است: بدونِ گروه‌بندیِ روز، `lastAt`
                همیشه null است، پس اول وضعیتِ روزها سنجیده می‌شود. */}
            {!daysUsable ? (
              total > 0 ? <>تا اینجا {fa(total)} تمرین ثبت کرده‌ای.</> : <>هنوز تمرینی ثبت نکرده‌ای.</>
            ) : lastAt ? (
              today > 0 ? (
                <>امروز {fa(today)} پاسخ ثبت کرده‌ای.</>
              ) : (
                <>آخرین تمرینت {relativeDay(lastAt)} بود.</>
              )
            ) : (
              <>هنوز تمرینی ثبت نکرده‌ای.</>
            )}
            {memberSince && <span className="text-muted-foreground/75"> عضو از {relativeDay(memberSince)}.</span>}
          </p>

          <LevelBar level={level} total={total} />

          {/* Cool Mode فقط روی همین یک دکمه: جلوهٔ جشن اگر همه‌جا باشد، دیگر جشن نیست. */}
          <div className={styles.heroActions}>
            <CoolMode options={{ glyphs: ["✦", "✧", "❋", "۱", "۰"], count: 22 }}>
              <ShinyButton asChild>
                <Link href="/game">
                  شروع تمرین
                  <ArrowLeft aria-hidden className="size-4" />
                </Link>
              </ShinyButton>
            </CoolMode>
            <Link href="/panel/analysis" className={styles.heroGhost}>
              <Compass aria-hidden className="size-4" />
              برنامهٔ من
            </Link>
          </div>
        </div>
        <div className={styles.heroArt}>
          <SarvaBuddy mood={mood} />
        </div>
        <BorderBeam size={120} duration={9} borderWidth={1.5} colorFrom="var(--primary)" colorTo="var(--gold)" />
      </header>

      <StatCards
        daysUsable={daysUsable}
        streak={streak}
        best={best}
        week={week}
        accuracy={accuracy}
        correct={correct}
        total={total}
        today={today}
        weekTotal={last7.total}
        prevWeekTotal={last14.total - last7.total}
        weekBuckets={daysUsable ? bucketsFromDayCounts(dayCounts, 7, now) : []}
        todayKey={tehranDayKey(now)}
      />

      <div className={styles.workspace}>
        <BlurFade inView className="flex min-w-0 flex-col gap-4">
          <ResumeSection items={resumeItems(overview)} />

          {/* پیشنهادِ برنامهٔ من — فقط *یک* مورد؛ فهرستِ کاملش در «برنامهٔ من» است. */}
          {todayPlan && (
            <div className={styles.planStrip}>
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
        </BlurFade>

        <BlurFade inView delay={0.08}>
          <AreaCards overview={overview} />
        </BlurFade>
      </div>

      <div className={styles.chartsRow}>
        <BlurFade inView className="min-w-0">
          {daysUsable ? (
            <TrendCard buckets={bucketsFromDayCounts(dayCounts, 90, now)} />
          ) : (
            /* ⚠️ یک نمودارِ صفر اینجا دروغ می‌گفت. جملهٔ صریح بهتر است. */
            <p className={`${styles.focus} py-10 text-center text-[13px] text-muted-foreground`}>
              {DAILY_UNAVAILABLE_NOTE}
            </p>
          )}
        </BlurFade>
        {daysUsable && (
          <BlurFade inView delay={0.08} className="min-w-0">
            <ActivityHeatmap dayCounts={dayCounts} now={now} />
          </BlurFade>
        )}
      </div>

      <BlurFade inView>
        <BadgeRow badges={badges({ streak, best, total, bookmarks, examBest: exams.best })} />
      </BlurFade>

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
