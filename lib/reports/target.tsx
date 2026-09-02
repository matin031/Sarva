"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReportTarget } from "@/components/UI/ReportButton";

/**
 * «کاربر همین حالا چه چیزی می‌بیند؟»
 *
 * ⚠️ چرا context و نه یک prop:
 *
 * دکمهٔ گزارش باید در نوارِ بالای *پوستهٔ بازی* بنشیند — یک جای ثابت و
 * قابلِ پیش‌بینی در همهٔ بازی‌ها. ولی چیزی که گزارش می‌شود عمیقاً داخلِ خودِ
 * بازی است و با هر پرسش عوض می‌شود. رساندنِ آن به بالا یعنی عبور دادنِ یک
 * prop از چند لایه در هفت بازیِ متفاوت، و اولین بازی‌ای که یادش برود، دکمهٔ
 * گزارشِ خالی نشان می‌دهد.
 *
 * با این context هر بازی فقط می‌گوید «الان این را نشان می‌دهم» و پوسته
 * خودش دکمه را می‌سازد یا پنهان می‌کند.
 */

type Ctx = {
  target: ReportTarget | null;
  setTarget: (t: ReportTarget | null) => void;
};

const ReportTargetContext = createContext<Ctx | null>(null);

export function ReportTargetProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return (
    <ReportTargetContext.Provider value={value}>
      {children}
    </ReportTargetContext.Provider>
  );
}

/** پوسته با این می‌خواند. بیرون از provider، `null` — یعنی دکمه‌ای نیست. */
export function useReportTarget(): ReportTarget | null {
  return useContext(ReportTargetContext)?.target ?? null;
}

/**
 * بازی با این اعلام می‌کند چه چیزی روی صفحه است.
 *
 * ⚠️ `target` را با `useMemo` بسازید یا مقادیرش را در وابستگی‌ها بیاورید:
 * یک شیءِ تازه در هر رندر، این افکت را در هر رندر اجرا می‌کند و یک حلقهٔ
 * به‌روزرسانی می‌سازد. برای همین اینجا روی *مقادیر* مقایسه می‌شود و نه روی
 * هویتِ شیء — تا یک فراخوانِ بی‌دقت هم حلقه نسازد.
 */
export function useSetReportTarget(target: ReportTarget | null): void {
  const ctx = useContext(ReportTargetContext);
  const setTarget = ctx?.setTarget;

  // امضای متنیِ مقادیر: تنها چیزی که واقعاً تعیین می‌کند «چیزِ تازه‌ای است یا
  // نه». بدون این، هر رندرِ بازی یک setState می‌ساخت.
  const signature = target
    ? `${target.area}|${target.targetId ?? ""}|${target.snapshot ?? ""}|${JSON.stringify(target.targetRef ?? {})}`
    : "";

  const stable = useCallback(() => target, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!setTarget) return;
    setTarget(stable());
    return () => setTarget(null);
  }, [setTarget, stable]);
}
