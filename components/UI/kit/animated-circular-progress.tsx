"use client";

import * as React from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/perf/use-perf";

/**
 * Magic UI's Animated Circular Progress Bar, adapted to Sarva.
 * Source: https://magicui.design/docs/components/animated-circular-progress-bar
 * MIT notice: components/home/MAGIC-UI-LICENSE.md.
 *
 * دو چیز از نسخهٔ اصلی گرفته شده و بقیه‌اش از نو نوشته شده:
 *
 *   ۱. **شکافِ بینِ دو کمان.** ریلِ خاکستری تا تهِ دایره کشیده نمی‌شود؛
 *      از چند درصد بعد از نوکِ کمانِ رنگی شروع می‌شود. همین یک فاصلهٔ
 *      کوچک است که حلقه را از «نمودارِ دونات» به «سنج» تبدیل می‌کند.
 *
 *   ۲. **عددی که بالا می‌رود**، هم‌زمان با پر شدنِ کمان و با همان منحنی.
 *
 * ── ۱۰۰٪ ───────────────────────────────────────────────────────────────────
 * ⚠️ مسئلهٔ اصلیِ حلقهٔ قبلی همین بود. «۱۰۰٪» چهار نویسه است و «۷۹٪» سه‌تا،
 * ولی هر دو با یک `text-2xl` ثابت کشیده می‌شدند — پس در حلقهٔ ۵۶ پیکسلی،
 * ۱۰۰٪ به لبه‌ها می‌چسبید و از حلقه بیرون می‌زد.
 *
 * دو چیز حلش می‌کند:
 *
 *   • اندازهٔ قلم با `cqw` نوشته می‌شود و نه با پیکسل — یعنی درصدی از عرضِ
 *     *خودِ حلقه*. یک کامپوننت، از ۴۴ تا ۱۴۰ پیکسل، بدونِ `size`ِ دستی.
 *   • و برای سه رقم یک پله کوچک‌تر می‌شود.
 *
 * ⚠️ و در ۱۰۰٪ ریل کاملاً پنهان می‌شود. با شکافِ ثابت، آخرین درصد یک تکهٔ
 * خاکستریِ چند پیکسلی باقی می‌گذاشت که شبیهِ «تمام نشده» بود.
 */

const R = 42;
const C = 2 * Math.PI * R;
/** شکاف در هر سرِ کمان، برحسب درصدِ محیط. */
const GAP = 3;

export type AnimatedCircularProgressProps = {
  value: number;
  /** وقتی داده‌ای نیست — «—» به‌جای یک صفرِ دروغین. */
  ready?: boolean;
  /** رنگِ کمان. یک رشته، یا دو تا برای گرادیان. پیش‌فرض: رنگِ برند. */
  color?: string | [string, string];
  /** نویسهٔ وسط، وقتی `ready` نیست یا به‌جای عدد. */
  glyph?: string;
  /** برچسبِ دسترس‌پذیر — چیزی که صفحه‌خوان می‌خواند. */
  label?: string;
  /** رنگِ عددِ وسط. پیش‌فرض: رنگِ متنِ عادی. */
  valueColor?: string;
  className?: string;
};

const toFa = (n: number | string): string =>
  String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export function AnimatedCircularProgress({
  value,
  ready = true,
  color,
  glyph,
  label,
  valueColor,
  className = "size-20",
}: AnimatedCircularProgressProps) {
  const reduced = useReducedMotion();
  const gradientId = React.useId();

  const target = Math.max(0, Math.min(100, Math.round(value)));
  const pct = useMotionValue(reduced ? target : 0);

  React.useEffect(() => {
    if (!ready) return;
    const controls = animate(pct, target, {
      duration: reduced ? 0 : 1.1,
      /* ⚠️ منحنیِ «بیرون‌رونده» و نه خطی: کمان سریع راه می‌افتد و آرام
         می‌ایستد. حرکتِ خطی، حلقه را شبیهِ نوارِ بارگذاری می‌کند. */
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [target, ready, reduced, pct]);

  /* کمانِ رنگی: از بالا، به‌اندازهٔ درصد. */
  const arc = useTransform(pct, (p) => `${(p / 100) * C} ${C}`);
  /* ⚠️ در صفر، `strokeLinecap="round"` یک نقطه می‌کشد حتی وقتی طولِ کمان صفر
     است — و آن نقطه شبیهِ «کمی پیشرفت» خوانده می‌شود، به کسی که هیچ پاسخِ
     درستی نداشته. زیرِ نیم درصد کاملاً محو می‌شود. */
  const arcOpacity = useTransform(pct, [0, 0.5], [0, 1]);

  /* ریل: فقط روی بخشِ *باقی‌مانده*، با یک شکاف در هر سر. */
  const railDash = useTransform(pct, (p) => {
    const rest = Math.max(0, 100 - p - GAP * 2);
    return `${(rest / 100) * C} ${C}`;
  });
  const railOffset = useTransform(pct, (p) => -((p + GAP) / 100) * C);
  const railOpacity = useTransform(pct, [96, 100], [1, 0]);

  const digits = useTransform(pct, (p) => toFa(Math.round(p)));

  const [from, to] = Array.isArray(color)
    ? color
    : color
      ? [color, color]
      : ["var(--primary)", "var(--gold)"];

  /* ⚠️ «٪» کوچک‌تر از رقم‌هاست (`0.62em`) و نه هم‌اندازه. با هم‌اندازه بودن،
     یک‌چهارمِ پهنای «۱۰۰٪» را نشانه‌ای می‌گرفت که هیچ اطلاعاتی ندارد — و
     همان بود که عدد را به لبهٔ حلقه می‌چسباند. حالا سه رقم هم جا می‌شود و
     پلهٔ کوچک‌شدن فقط ۴ واحد است، نه ۶. */
  const fontSize = target >= 100 ? "22cqw" : "26cqw";

  return (
    <div
      role="img"
      aria-label={label ?? (ready ? `${toFa(target)} درصد` : "بدون داده")}
      /* ⚠️ `inline-size` لازم است تا `cqw` معنی پیدا کند؛ بدونِ آن، اندازهٔ
         قلم به نزدیک‌ترین container بالادست می‌افتد یا به viewport. */
      style={{ containerType: "inline-size" }}
      className={cn("relative shrink-0", className)}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>

        {ready ? (
          <>
            <motion.circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              className="stroke-border"
              style={{
                strokeDasharray: railDash,
                strokeDashoffset: railOffset,
                opacity: railOpacity,
              }}
            />
            <motion.circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke={`url(#${gradientId})`}
              style={{ strokeDasharray: arc, opacity: arcOpacity }}
            />
          </>
        ) : (
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="4 10"
            className="stroke-border"
          />
        )}
      </svg>

      <span className="absolute inset-0 grid place-items-center">
        {ready ? (
          <span
            className="panel-num flex items-baseline font-bold tracking-tight"
            style={{ fontSize, color: valueColor }}
          >
            <motion.span>{digits}</motion.span>
            <span aria-hidden className="text-[0.62em] font-semibold opacity-70">
              ٪
            </span>
          </span>
        ) : (
          <span
            aria-hidden
            className="text-muted-foreground/70"
            style={{ fontSize: glyph ? "36cqw" : "26cqw" }}
          >
            {glyph ?? "—"}
          </span>
        )}
      </span>
    </div>
  );
}
