"use client";

import { useState, useTransition } from "react";
import { reportClubContent } from "@/lib/club/actions";
import { REPORT_REASONS } from "@/lib/club/types";

/** «گزارش» — how a reader tells the admin that something got through review
 *  that should not have. Plagiarism is the first reason on the list on purpose:
 *  in a place where students publish their own poetry, the commonest problem is
 *  someone posting a famous شاعر's بیت as their own. */
export default function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "post" | "comment";
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(REPORT_REASONS[0].id);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = () => {
    setError(null);
    startTransition(async () => {
      const res = await reportClubContent(targetType, targetId, reason, note);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="بستن"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        {done ? (
          <>
            <h3 className="mb-2 text-lg font-bold">گزارشت ثبت شد</h3>
            <p className="mb-5 text-sm text-muted-foreground">
              مدیران سایت آن را بررسی می‌کنند. ممنون که حواست هست.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              بستن
            </button>
          </>
        ) : (
          <>
            <h3 className="mb-1 text-lg font-bold">
              گزارش {targetType === "post" ? "سروده" : "دیدگاه"}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              چه مشکلی دارد؟
            </p>

            <div className="mb-4 flex flex-col gap-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors ${
                    reason === r.id
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="club-report-reason"
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="mt-0.5 size-4 accent-[var(--color-primary)]"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="توضیح بیشتر (اختیاری) — مثلاً نام شاعر اصلی"
              className="mb-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary/60"
            />

            {error && (
              <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={pending}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {pending ? "در حال ارسال…" : "ارسال گزارش"}
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-4 text-sm text-muted-foreground"
              >
                انصراف
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
