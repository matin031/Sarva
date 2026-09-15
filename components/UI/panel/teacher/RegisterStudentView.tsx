"use client";

import { useEffect, useRef } from "react";
import { teacherRegisterStudentView } from "@/lib/teacher/view-actions";

/**
 * ثبتِ بازدیدِ دبیر — یک بار، و فقط وقتی صفحه واقعاً باز شده.
 *
 * ⚠️ این کامپوننت هیچ چیزی رندر نمی‌کند و وجودش فقط برای همین است:
 * `useEffect` تنها چیزی است که در prefetch، در رندرِ سمتِ سرور، و در
 * خزندهٔ موتورِ جست‌وجو اجرا **نمی‌شود**.
 *
 * پیش از این، ثبت در بدنهٔ Server Component بود و هر prefetchِ `<Link>` —
 * یعنی هر بار که موسِ دبیر روی دکمهٔ «عملکرد» می‌رفت — یک بازدید می‌ساخت.
 *
 * ⚠️ `useRef` و نه فقط آرایهٔ وابستگی: در حالتِ توسعه، React هر effect را
 * عمداً دو بار اجرا می‌کند (StrictMode) و بدونِ این، هر باز کردنِ صفحه دو
 * ردیف می‌ساخت.
 */
export default function RegisterStudentView({
  classId,
  studentId,
}: {
  classId: string;
  studentId: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    /* ⚠️ شکستش هیچ چیزی را نباید بشکند: صفحهٔ عملکرد باید دیده شود حتی
       اگر ثبتِ بازدید ناموفق باشد. خودِ اکشن هم چیزی برنمی‌گرداند. */
    void teacherRegisterStudentView(classId, studentId).catch(() => {});
  }, [classId, studentId]);

  return null;
}
