"use client";

import { useId, useState, useTransition } from "react";
import Modal from "@/components/UI/Modal";
import { reportClubContent } from "@/lib/club/actions";
import { REPORT_REASONS } from "@/lib/club/types";

/** «گزارش» — how a reader tells the admin that something got through review
 *  that should not have. Plagiarism is the first reason on the list on purpose:
 *  in a place where students publish their own poetry, the commonest problem is
 *  someone posting a famous شاعر's بیت as their own.
 *
 *  پنجره از `Modal` می‌آید و نه از یک `fixed inset-0` محلی: کارتِ هر سروده
 *  داخل `TiltCard` است، `TiltCard` روی خودش transform دارد، و هر عنصرِ
 *  `fixed` داخل یک جدِ transform-دار به همان جد چسبیده می‌شود — یعنی این
 *  پنجره وسطِ کارت باز می‌شد و لبه‌هایش بریده می‌شد. توضیح کامل در
 *  `components/UI/Modal.tsx`. */
export default function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: "post" | "comment";
  targetId: string;
  onClose: () => void;
}) {
  const titleId = useId();
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

  const what = targetType === "post" ? "سروده" : "دیدگاه";

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="max-w-md p-5">
      {done ? (
        <>
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
          </div>
          <h3 id={titleId} className="mb-2 text-lg font-bold">
            گزارشت ثبت شد
          </h3>
          <p className="mb-5 text-sm leading-7 text-muted-foreground">
            مدیران سایت آن را بررسی می‌کنند. ممنون که حواست هست.
          </p>
          <button
            onClick={onClose}
            className="min-h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            بستن
          </button>
        </>
      ) : (
        <>
          <h3 id={titleId} className="mb-1 text-lg font-bold">
            گزارش {what}
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">چه مشکلی دارد؟</p>

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
              className="min-h-11 flex-1 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {pending ? "در حال ارسال…" : "ارسال گزارش"}
            </button>
            <button
              onClick={onClose}
              className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted-foreground"
            >
              انصراف
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
