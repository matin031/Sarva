"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import PanelSection from "@/components/UI/panel/PanelSection";
import PanelTrendChart from "@/components/UI/panel/PanelTrendChart";
import StatRing from "@/components/UI/panel/StatRing";
import { relativeDay, scoreColor } from "@/lib/panel/format";
import {
  bucketsFromDayCounts,
  correctFromDayCounts,
  streakFromDayCounts,
  totalFromDayCounts,
} from "@/lib/panel/day-counts";
import type { BookmarkArea, PanelOverview } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const AREAS: {
  area: BookmarkArea;
  title: string;
  href: string;
  glyph: string;
}[] = [
  { area: "aruz", title: "عروض سماعی", href: "/panel/aruz", glyph: "🎵" },
  { area: "vocab", title: "بازی واژه‌یاب", href: "/panel/vocab", glyph: "🖼️" },
  { area: "jasoos", title: "بازی جاسوس", href: "/panel/jasoos", glyph: "🕵️" },
  { area: "exam", title: "امتحان نهایی", href: "/panel/exam", glyph: "🏅" },
];

/** پنل کاربری، صفحهٔ نخست.
 *
 *  Everything here is measured, not decorative: the accuracy is over every
 *  graded answer the student has ever given, the chart is the real thirty days,
 *  and each section card carries that section's own numbers and links to it — so
 *  the front page is both a summary and the way in, which is what a panel is
 *  for. */
export default function HomePanel({
  name,
  memberSince,
  overview,
}: {
  name: string;
  memberSince: string | null;
  overview: PanelOverview;
}) {
  const { dayCounts, counts, bookmarks, exams } = overview;

  /* ⚠️ همهٔ این‌ها از شمارشِ روزانه درمی‌آیند، نه از ردیف‌های خام.
     پیش از این تا یازده هزار ردیف می‌آمد و همین‌جا یکی‌یکی شمرده می‌شد. */
  const total = totalFromDayCounts(dayCounts);
  const correct = correctFromDayCounts(dayCounts);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const days = streakFromDayCounts(dayCounts);
  // آخرین روزِ فعالیت. دقتش «روز» است نه «لحظه» — که برای «آخرین فعالیت: ۳
  // روز پیش» دقیقاً همان چیزی است که نشان داده می‌شود.
  const lastAt = dayCounts.reduce<string | null>(
    (m, d) => (d.total > 0 && (!m || d.day > m) ? d.day : m),
    null,
  );

  return (
    <div className=" cursor-default">
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        پنل کاربری
      </span>

      <div className=" glass rounded-xl p-4 sm:p-6">
        <h1 className=" group flex items-center gap-x-1 text-2xl sm:text-4xl lg:text-5xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className=" size-8 shrink-0 transition-all group-hover:rotate-45 sm:size-10 lg:size-12"
          >
            <path
              fillRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
              clipRule="evenodd"
            />
          </svg>
          درود، {name}
        </h1>
        <p className=" text-muted-foreground">
          {lastAt ? (
            <>آخرین تمرینت {relativeDay(lastAt)} بود.</>
          ) : (
            <>خوش اومدی :) هنوز تمرینی ثبت نشده.</>
          )}
          {memberSince && (
            <span className=" opacity-70"> — عضو از {relativeDay(memberSince)}</span>
          )}
        </p>

        <div className=" mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-7">
          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <StatRing percent={accuracy} />
            <span className=" text-base sm:text-lg">دقت در تمامی بخش‌ها</span>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                fillRule="evenodd"
                d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">{toFa(days)}</span>{" "}
              روز زنجیرۀ تلاش
            </div>
          </div>

          <div className=" flex items-center gap-x-4 rounded-xl bg-card p-4 shadow sm:gap-x-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                strokeLinecap="round"
                d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75Z"
              />
              <path
                fillRule="evenodd"
                d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Zm9.586 4.594a.75.75 0 0 0-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 0 0-1.06 1.06l1.5 1.5a.75.75 0 0 0 1.116-.062l3-3.75Z"
                clipRule="evenodd"
              />
            </svg>
            <div className=" text-base sm:text-lg">
              <span className=" text-2xl text-gold sm:text-3xl">{toFa(total)}</span>{" "}
              پاسخ ثبت‌شده
            </div>
          </div>

          {/* شمارندهٔ نشان‌شده‌ها حالا لینک است. قبلاً عددی بود که هیچ‌جا
              نمی‌برد — و صفحه‌ای هم برای رفتن وجود نداشت. */}
          <Link
            href="/panel/bookmarks"
            className=" flex items-center justify-between gap-x-4 rounded-xl bg-card p-4 shadow transition-all hover:brightness-105 active:scale-[0.99] sm:gap-x-6"
          >
            <div className=" flex items-center gap-x-4 sm:gap-x-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className=" size-9 shrink-0 text-gold sm:size-10"
              >
                <path
                  fillRule="evenodd"
                  d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
                  clipRule="evenodd"
                />
              </svg>
              <div className=" text-base sm:text-lg">
                <span className=" text-2xl text-gold sm:text-3xl">
                  {toFa(bookmarks)}
                </span>{" "}
                نشان‌شده
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className=" size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
            </svg>
          </Link>
        </div>
      </div>

      <PanelSection title="فعالیت در ۳۰ روز اخیر" icon="chart">
        <PanelTrendChart
          buckets={bucketsFromDayCounts(dayCounts, 30)}
          days={30}
        />
      </PanelSection>

      <PanelSection
        title="بخش‌ها"
        icon="scale"
        hint="روی هر بخش بزن تا کارنامه و آزمون‌های پیشینش را ببینی."
      >
        <div className=" mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AREAS.map((a, i) => {
            const c = counts[a.area];
            const isExam = a.area === "exam";
            const pct = isExam
              ? exams.average
              : c.total
                ? Math.round((c.correct / c.total) * 100)
                : 0;
            const has = isExam ? exams.attempts > 0 : c.total > 0;
            return (
              <motion.div
                key={a.area}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
              >
                <Link
                  href={a.href}
                  className=" flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow transition-all hover:brightness-105 active:scale-[0.99]"
                >
                  <div className=" flex min-w-0 items-center gap-3">
                    <span className=" flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl">
                      {a.glyph}
                    </span>
                    <div className=" min-w-0">
                      <p className=" truncate font-bold">{a.title}</p>
                      <p className=" text-xs text-muted-foreground">
                        {isExam
                          ? has
                            ? `${toFa(exams.attempts)} کارنامه`
                            : "هنوز آزمونی نداده‌ای"
                          : has
                            ? `${toFa(c.correct)} از ${toFa(c.total)} پاسخ درست`
                            : "هنوز تمرینی نکرده‌ای"}
                      </p>
                    </div>
                  </div>
                  {has && (
                    <span
                      style={{ color: scoreColor(pct) }}
                      className=" shrink-0 text-lg font-bold"
                    >
                      {toFa(pct)}%
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </PanelSection>
    </div>
  );
}
