"use client";
import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";

export const toFa = (n: number | string): string =>
  String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export interface CircularProgressProps {
  /** تعداد کل سؤال */
  total: number | 0;
  /** تعداد پاسخ‌های صحیح */
  correct: number | 0;
  /** قطر دایره برحسب px (پیش‌فرض 200) */
  size?: number;
  /** ضخامت خط (پیش‌فرض 8) */
  strokeWidth?: number;
  /** مدت انیمیشن برحسب ثانیه (پیش‌فرض 1.2) */
  duration?: number;
  /** نمایش «x از y» زیر درصد (پیش‌فرض true) */
  showFraction?: boolean;
  /** اعداد فارسی (پیش‌فرض true) */
  persian?: boolean;
  /** رنگ مسیر زمینه (پیش‌فرض "#2a2a2a") */
  trackColor?: string;
  /** رنگ ثابت حلقه؛ اگر ندهی بر اساس درصد خودکار رنگ می‌گیرد */
  color?: string;
  /** متن جایگزین زیر درصد */
  label?: string;
  isPanel?: boolean;
}

export default function CircularProgress({
  total,
  correct,
  size = 200,
  strokeWidth = 8,
  duration = 1.2,
  showFraction = true,
  persian = true,
  isPanel = false,

  label,
}: CircularProgressProps) {
  const safeTotal = Math.max(1, total);
  const safeCorrect = Math.max(0, Math.min(correct, safeTotal));
  const pct = Math.round((safeCorrect / safeTotal) * 100);

  const reduceMotion = useReducedMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const autoColor = "#00a5a6 ";

  const progress = useMotionValue(0);
  const dashOffset = useTransform(
    progress,
    (p) => circumference * (1 - p / 100),
  );
  const display = useTransform(progress, (p) => {
    const r = Math.round(p);
    return (persian ? toFa(r) : r) + "٪";
  });

  useEffect(() => {
    const controls = animate(progress, pct, {
      duration: reduceMotion ? 0 : duration,
      ease: [0.4, 0, 0.2, 1],
    });
    return controls.stop;
  }, [pct, duration, reduceMotion, progress]);

  const fmt = (n: number) => (persian ? toFa(n) : n);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
      transition={{ type: "spring" }}
      className={`${isPanel && " size-full flex items-center justify-center"} size-48 *:text-primary`}
    >
      {" "}
      <motion.div
        className="relative inline-flex items-center justify-center stroke-[#ddd7c9] dark:stroke-[#222935]"
        style={{ width: size, height: size }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        role="progressbar"
        aria-valuenow={safeCorrect}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
      >
        <svg
          className="-rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={autoColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        <div className="absolute -space-y-7 inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`${isPanel ? " text-2xl" : "text-5xl"}  font-bold text-black dark:text-white leading-none`}
          >
            {display}
          </motion.span>
          {!isPanel &&
            (label ? (
              <span className="mt-1 text-sm text-muted-foreground">
                {label}
              </span>
            ) : (
              showFraction && (
                <div className="mt-1 flex gap-x-1 items-center text-sm text-muted-foreground">
                  <span>{fmt(safeTotal)}</span>
                  <span>از</span>
                  <span>{fmt(safeCorrect)}</span>
                </div>
              )
            ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
