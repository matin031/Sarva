"use client";

import { useEffect } from "react";
import Link from "next/link";
import { studentStartAssignment } from "@/lib/teacher/assignment-actions";

/**
 * نوارِ کوچکِ «تکلیف» بالای بازی.
 *
 * ⚠️ «شروع شد» از همین‌جا — یعنی از مرورگر و پس از باز شدنِ واقعیِ صفحه —
 * ثبت می‌شود و نه از رندرِ سرور؛ چراییِ کامل کنارِ `studentStartAssignment`.
 */
export default function AssignmentNotice({
  assignmentId,
  save,
  title,
}: {
  assignmentId: string;
  save: "open" | "saved" | "failed";
  /** پیش از ثبت، اگر داده شود، عنوانِ تکلیف نشان داده می‌شود. */
  title?: string;
}) {
  useEffect(() => {
    void studentStartAssignment(assignmentId);
  }, [assignmentId]);

  if (save === "open") {
    return title ? (
      <p dir="rtl" className="mx-auto mb-3 max-w-xl text-center text-sm text-muted-foreground">
        تکلیف: {title}
      </p>
    ) : null;
  }

  return (
    <p
      role="status"
      dir="rtl"
      className={`mx-auto mb-3 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-sm ${
        save === "saved"
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-destructive/50 bg-destructive/10 text-foreground"
      }`}
    >
      {save === "saved" ? "تکلیف ثبت شد." : "ثبت تکلیف انجام نشد؛ دوباره امتحان کن."}
      <Link href="/panel/classes#assignments" className="font-semibold text-primary underline-offset-4 hover:underline">
        تکالیف من
      </Link>
    </p>
  );
}

const GONE_TEXT = {
  done: "این تکلیف را قبلاً انجام داده‌ای.",
  cancelled: "دبیر این تکلیف را لغو کرده است.",
  missing: "تکلیف پیدا نشد.",
} as const;

/** وقتی تکلیف دیگر باز نیست — به‌جای بازی. */
export function AssignmentGone({ state }: { state: keyof typeof GONE_TEXT }) {
  return (
    <div
      dir="rtl"
      className="container mx-auto my-16 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center"
    >
      <p className="text-base font-bold">{GONE_TEXT[state]}</p>
      <Link
        href="/panel/classes#assignments"
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
      >
        تکالیف من
      </Link>
    </div>
  );
}
