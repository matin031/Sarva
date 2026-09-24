"use client";

import { useEffect, useSyncExternalStore } from "react";
import confetti from "canvas-confetti";
import styles from "../panel-design.module.css";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { fa } from "@/lib/panel/format";
import { useReducedMotion } from "@/lib/perf/use-perf";

const GOALS = [10, 20, 40] as const;
const GOAL_KEY = "sarva-daily-goal";
const PARTY_KEY = "sarva-daily-goal-party";
const GOAL_EVENT = "sarva-daily-goal";
const DEFAULT_GOAL = 20;

function readGoal(): number {
  try {
    const saved = Number(localStorage.getItem(GOAL_KEY));
    return GOALS.includes(saved as (typeof GOALS)[number]) ? saved : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

/** تغییر در همین تب (رویدادِ خودمان) و در تب‌های دیگر (`storage`). */
function subscribe(onChange: () => void) {
  window.addEventListener(GOAL_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(GOAL_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * هدفِ روزانه — عددش را خودِ کاربر انتخاب می‌کند.
 *
 * ⚠️ در `localStorage` و نه دیتابیس: یک ترجیحِ شخصی و بی‌خطر است که اگر پاک
 * شود فقط به پیش‌فرض برمی‌گردد. هدفی که سایت از خودش تعیین کند همان «عددی
 * که هیچ‌کس تعیینش نکرده» است؛ این یکی را کاربر می‌گذارد.
 *
 * جشن (کاغذرنگی) روزی یک بار: کلیدِ روزِ تهران در `PARTY_KEY` نوشته می‌شود.
 */
export default function DailyGoal({ today, todayKey }: { today: number; todayKey: string }) {
  const goal = useSyncExternalStore(subscribe, readGoal, () => DEFAULT_GOAL);
  const reduced = useReducedMotion();

  const done = today >= goal;
  const percent = Math.min(100, Math.round((today / goal) * 100));

  useEffect(() => {
    if (!done || reduced) return;
    try {
      if (localStorage.getItem(PARTY_KEY) === todayKey) return;
      localStorage.setItem(PARTY_KEY, todayKey);
    } catch {
      return;
    }
    const t = setTimeout(() => {
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.35 }, colors: ["#008687", "#e9c875", "#89d7ad", "#efb7af"] });
    }, 700);
    return () => clearTimeout(t);
  }, [done, reduced, todayKey]);

  const pick = (g: number) => {
    try {
      localStorage.setItem(GOAL_KEY, String(g));
    } catch {}
    window.dispatchEvent(new Event(GOAL_EVENT));
  };

  return (
    <>
      <div className="mt-3 flex items-center gap-3.5">
        <AnimatedCircularProgress
          value={percent}
          color={done ? ["var(--gold)", "var(--primary)"] : undefined}
          label={`هدف امروز: ${fa(today)} از ${fa(goal)} پاسخ`}
          className="size-16 shrink-0"
        />
        <div className="min-w-0">
          <p className="panel-num text-sm font-semibold">
            {fa(Math.min(today, goal))} از {fa(goal)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {done ? "هدف امروز انجام شد." : `${fa(goal - today)} پاسخ دیگر`}
          </p>
        </div>
      </div>
      <div role="radiogroup" aria-label="هدف روزانه" className={styles.goalPicker}>
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={goal === g}
            onClick={() => pick(g)}
            className="panel-num"
          >
            {fa(g)}
          </button>
        ))}
      </div>
    </>
  );
}
