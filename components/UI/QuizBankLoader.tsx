"use client";

import { useCallback, useEffect, useState } from "react";
import type { Question } from "@/app/quiz/page";
import Quiz from "@/components/UI/Quiz";
import SarvaLoader from "@/components/UI/SarvaLoader";

type BankResponse = { ok: true; data: { questions: Question[] } } | { ok: false };

/**
 * بانکِ سؤالِ دورِ آزاد را از `/api/v1/quiz/bank` می‌گیرد و بعد همان `Quiz`
 * قبلی را با آن رندر می‌کند.
 *
 * ⚠️ خودِ `Quiz` دست نخورده: همان `data` را می‌گیرد که قبلاً صفحه در HTML
 * می‌گذاشت. تنها تفاوت این است که بانک حالا جدا و کش‌شونده می‌رسد (چرایی در
 * lib/quiz/bank.ts). تا رسیدنش همان لودرِ «در حال آماده‌سازی آزمون» دیده
 * می‌شود که `Quiz` خودش هم پیش از شناختنِ کاربر نشان می‌داد.
 */
export default function QuizBankLoader() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/quiz/bank", { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<BankResponse>) : null))
      .then((json) => {
        if (json?.ok) setQuestions(json.data.questions);
        else setFailed(true);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (questions) return <Quiz data={questions} />;

  if (failed) {
    return (
      <div className="container my-15 flex flex-col items-center gap-4 text-center">
        <p>سؤال‌های آزمون بارگذاری نشد. اتصال را بررسی کنید و دوباره تلاش کنید.</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-xl bg-primary px-6 py-2 font-bold text-primary-foreground hover:brightness-90"
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className=" container my-15 flex flex-col items-center">
      <SarvaLoader size={110} label="در حال آماده‌سازی آزمون" />
    </div>
  );
}
