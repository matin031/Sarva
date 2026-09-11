import Link from "next/link";
import { Sparkles, ArrowLeft, Sprout } from "lucide-react";
import styles from "./panel-design.module.css";
import SarvaBuddy from "./SarvaBuddy";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/UI/kit/card";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import AreaCards from "@/components/UI/panel/home/AreaCards";
import BadgeRow from "@/components/UI/panel/home/BadgeRow";
import ResumeSection from "@/components/UI/panel/home/ResumeSection";
import StatCards from "@/components/UI/panel/home/StatCards";
import { fa, relativeDay } from "@/lib/panel/format";
import {
  bucketsFromDayCounts,
  correctFromDayCounts,
  streakFromDayCounts,
  totalFromDayCounts,
} from "@/lib/panel/day-counts";
import { answersInLastDays, badges, bestStreak, resumeItems, weekStrip } from "@/lib/panel/derive";
import type { PanelOverview } from "@/lib/panel/types";

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
  const { dayCounts, bookmarks, exams } = overview;

  const total = totalFromDayCounts(dayCounts);
  const correct = correctFromDayCounts(dayCounts);
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

  return (
    <>
      {/* ── خوش‌آمد ───────────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><Sprout aria-hidden className="size-4" /> هر روز، یک قدم به دانستن نزدیک‌تر</p>
        <h1>درود، {name}</h1>
        <p className={styles.heroDescription}>
          {lastAt ? (
            streak > 0 ? (
              <>
                آخرین تمرینت {relativeDay(lastAt)} بود و{" "}
                <span className="font-semibold text-[#d6eac0]">{fa(streak)} روز</span> است
                زنجیره‌ات را نبریده‌ای.
              </>
            ) : (
              <>آخرین تمرینت {relativeDay(lastAt)} بود — امروز دوباره شروع کن.</>
            )
          ) : (
            <>خوش آمدی. اولین تمرینت از همین‌جا شروع می‌شود.</>
          )}
          {memberSince && (
            <span> — عضو از {relativeDay(memberSince)}</span>
          )}
        </p>
        <Link href="/game" className={styles.heroButton}>بریم سراغ یادگیری <ArrowLeft aria-hidden className="size-4" /></Link>
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
          <CardTitle>پیشرفت تو در ۳۰ روز گذشته</CardTitle>
          <CardDescription>
            هر ستون یک روز است؛ بخشِ پررنگ همان‌قدر که درست بوده.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <PanelTrendChart buckets={bucketsFromDayCounts(dayCounts, 30)} days={30} />
        </CardContent>
      </Card>

      {/* ⚠️ شمارندهٔ نشان‌شده‌ها از کارت‌های بالا برداشته شد و به سایدبار
          رفت؛ این یک خطِ ساده است تا لینکش از خانه هم در دسترس بماند. */}
      {bookmarks > 0 && (
        <p className="text-center text-[13px] text-muted-foreground">
          <Link href="/panel/bookmarks" className="text-primary underline-offset-[6px] hover:underline">
            {fa(bookmarks)} مورد نشان‌شده
          </Link>{" "}
          داری — بیت‌ها و واژه‌هایی که خواسته‌ای دوباره ببینی.
        </p>
      )}
    </>
  );
}
