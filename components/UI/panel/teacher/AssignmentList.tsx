"use client";

import { useState, useTransition } from "react";
import { fa, jalali, relativeDay } from "@/lib/panel/format";
import { teacherCancelAssignment } from "@/lib/teacher/assignment-actions";
import { STATUS_LABEL, resultSummary, type AssignmentStatus } from "@/lib/teacher/assignment-rules";
import type { AssignmentView } from "@/lib/teacher/assignments";

/** رنگ فقط برای «انجام شد»؛ بقیه خنثی — همان قاعدهٔ `primitives.tsx`. */
const STATUS_CLASS: Record<AssignmentStatus, string> = {
  pending: "border-border text-muted-foreground",
  started: "border-foreground/25 text-foreground",
  done: "border-primary/40 bg-primary/10 text-primary",
  cancelled: "border-border text-muted-foreground line-through",
};

export function StatusChip({ status }: { status: AssignmentStatus }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** یک خط: نتیجه اگر انجام شده، وگرنه تاریخِ گذاشتن/شروع. */
export function AssignmentMeta({ a }: { a: AssignmentView }) {
  const summary = a.status === "done" ? resultSummary(a.kind, a.result) : null;
  const weakWeights = a.status === "done" && a.kind === "aruz_quiz" ? missedWeights(a.result) : [];
  return (
    <div className="flex flex-col gap-0.5 text-[12px] text-muted-foreground">
      {summary && (
        <span className="panel-num text-[13px] text-foreground">
          {summary.text}
          {summary.clientReported && (
            <span className="ms-2 text-[11px] text-muted-foreground">(گزارش خودِ بازی)</span>
          )}
        </span>
      )}
      {weakWeights.length > 0 && <span>غلط در: {weakWeights.join("، ")}</span>}
      <span className="panel-num">
        {a.completedAt
          ? `انجام: ${jalali(a.completedAt)}`
          : a.startedAt
            ? `شروع: ${relativeDay(a.startedAt)}`
            : `ثبت: ${relativeDay(a.createdAt)}`}
      </span>
    </div>
  );
}

/** وزن‌هایی که دست‌کم یک غلط داشته‌اند، بیشترین غلط اول. */
function missedWeights(result: Record<string, unknown> | null): string[] {
  const by = result?.byWeight;
  if (!by || typeof by !== "object") return [];
  return Object.entries(by as Record<string, { total?: number; correct?: number }>)
    .map(([w, b]) => ({ w, miss: (b.total ?? 0) - (b.correct ?? 0), total: b.total ?? 0 }))
    .filter((x) => x.miss > 0)
    .sort((a, b) => b.miss - a.miss)
    .slice(0, 3)
    .map((x) => `${x.w} (${fa(x.miss)} از ${fa(x.total)})`);
}

/* ⚠️ «مدتِ انجام» عمداً نشان داده نمی‌شود: `started_at` لحظهٔ بازشدنِ صفحه
   است و نه شروعِ کار، پس تفریقش از زمانِ تحویل عددی می‌سازد که دبیر
   «زمانِ صرف‌شده» می‌خواندش و نیست. */

export default function AssignmentList({ initial }: { initial: AssignmentView[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /* فهرستِ تازه پس از ساختِ تکلیف از سرور می‌آید (revalidatePath). */
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setItems(initial);
  }

  const cancel = (id: string) => {
    setError(null);
    start(async () => {
      const r = await teacherCancelAssignment(id);
      if (!r.ok) setError(r.errors.join(" "));
      else setItems((prev) => prev.filter((a) => a.id !== id));
    });
  };

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-[13px] text-muted-foreground">
        هنوز تکلیف یا آزمونی برای این دانش‌آموز نگذاشته‌اید.
      </p>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-2 text-[12px] text-destructive">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-border">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold">{a.title}</span>
                <StatusChip status={a.status} />
              </span>
              <AssignmentMeta a={a} />
            </div>
            {a.status !== "done" && (
              <button
                type="button"
                onClick={() => cancel(a.id)}
                disabled={pending}
                className="rounded-lg px-2 py-1 text-[12px] text-muted-foreground outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                لغو
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
