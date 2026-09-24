"use client";

import { useEffect, useState } from "react";
import type { LessonAnalysis } from "@/lib/doroos/types";

/**
 * بخشِ پولیِ یک درس (نقش‌ها، آرایه‌ها، یا نقش‌های هوشواره) از سرور.
 *
 * ⚠️ یک درخواست برای کلِ صفحه. هر کارتِ بیت این قلّاب را جدا صدا می‌زند؛
 * `cache`ِ ماژول‌سطح همان `Promise` را بینشان تقسیم می‌کند، پس ده بیت یعنی
 * یک درخواست و نه ده تا.
 *
 * ⚠️ `fetch`ِ خام و نه `apiGet`: باید فرقِ ۴۰۳ («اشتراک نداری») و ۵۰۳
 * («نتوانستیم بررسی کنیم») را بدانیم، و `apiGet` کدِ وضعیت را برنمی‌گرداند.
 * این دو هرگز نباید یک پیام بگیرند — دومی به کسی که پول داده نمی‌گوید «بخر».
 */

export type AnalysisSource = "base" | "ai";

export type AnalysisResult =
  | { status: "ready"; units: LessonAnalysis }
  | { status: "forbidden" | "unavailable" | "error" };

const cache = new Map<string, Promise<AnalysisResult>>();

export function fetchAnalysis(
  grade: string,
  lesson: number,
  source: AnalysisSource,
): Promise<AnalysisResult> {
  const key = `${grade}/${lesson}/${source}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const url = `/api/v1/doroos/analysis?grade=${encodeURIComponent(grade)}&lesson=${lesson}${
    source === "ai" ? "&source=ai" : ""
  }`;

  const task: Promise<AnalysisResult> = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (response.status === 403) return { status: "forbidden" } as const;
      if (response.status === 503) return { status: "unavailable" } as const;
      const body = (await response.json().catch(() => null)) as
        | { ok: true; data: { units: LessonAnalysis } }
        | { ok: false }
        | null;
      if (!response.ok || !body || !body.ok) return { status: "error" } as const;
      return { status: "ready", units: body.data.units } as const;
    })
    .catch(() => ({ status: "error" }) as const)
    .then((result) => {
      /* ⚠️ فقط پاسخِ موفق نگه داشته می‌شود. «نه» یا «نشد» نباید تا پایانِ
         عمرِ صفحه بماند: کاربری که همین حالا اشتراک خرید یا شبکه‌اش برگشت،
         باید با کلیکِ بعدی جواب بگیرد. */
      if (result.status !== "ready") cache.delete(key);
      return result;
    });

  cache.set(key, task);
  return task;
}

/**
 * ⚠️ state فقط در callbackِ `then` نوشته می‌شود و هرگز همگام در بدنهٔ افکت:
 * «در حال بارگذاری» از خودِ نبودِ نتیجه مشتق می‌شود. این همان چیزی است که
 * `react-hooks/set-state-in-effect` می‌خواهد و یک رندرِ آبشاری را حذف می‌کند.
 */
export function useLessonAnalysis({
  grade,
  lesson,
  source,
  enabled,
}: {
  grade: string;
  lesson: number;
  source: AnalysisSource;
  enabled: boolean;
}): { status: "idle" | "loading" | AnalysisResult["status"]; units?: LessonAnalysis } {
  const key = `${grade}/${lesson}/${source}`;
  const [result, setResult] = useState<{ key: string; value: AnalysisResult } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void fetchAnalysis(grade, lesson, source).then((value) => {
      if (alive) setResult({ key, value });
    });
    return () => {
      alive = false;
    };
  }, [enabled, grade, lesson, source, key]);

  if (!enabled) return { status: "idle" };
  if (!result || result.key !== key) return { status: "loading" };
  return result.value.status === "ready"
    ? { status: "ready", units: result.value.units }
    : { status: result.value.status };
}
