"use client";

import { useState, useTransition } from "react";
import { Pencil, Archive, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { Button } from "@/components/UI/kit/button";
import { fa, jalali } from "@/lib/panel/format";
import {
  teacherArchiveFeedback,
  teacherCreateFeedback,
  teacherUpdateFeedback,
} from "@/lib/teacher/feedback-actions";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABEL,
  MAX_FEEDBACK_LENGTH,
  type FeedbackCategory,
} from "@/lib/teacher/feedback-rules";
import type { FeedbackEntry } from "@/lib/teacher/feedback";

/**
 * نوشتن و مدیریتِ بازخورد، از صفحهٔ عملکردِ دانش‌آموز.
 *
 * ⚠️ همهٔ اعتبارسنجی‌های واقعی سمتِ سرورند (`lib/teacher/feedback.ts`):
 * مالکیتِ کلاس، عضویتِ دانش‌آموز، و اینکه فعالیتِ ارجاع‌شده مالِ همان
 * دانش‌آموز باشد. آنچه اینجاست فقط برای این است که کاربر پیش از رفت‌وبرگشت
 * بفهمد چه اشکالی هست — نه به‌عنوانِ دفاع.
 *
 * ⚠️ «حذف» نداریم، «بایگانی» داریم. بازخوردی که یک نوجوان خوانده، نباید
 * بتواند ناپدید شود.
 */
export default function FeedbackPanel({
  studentId,
  classId,
  initial,
}: {
  studentId: string;
  classId: string;
  initial: FeedbackEntry[];
}) {
  const [items, setItems] = useState(initial);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pending, startTransition] = useTransition();

  const remaining = MAX_FEEDBACK_LENGTH - message.length;

  const submit = () => {
    setError(null);
    const text = message.trim();
    if (!text) {
      setError("متن بازخورد را بنویسید.");
      return;
    }

    startTransition(async () => {
      const result = await teacherCreateFeedback({ studentId, classId, category, message: text });
      if (!result.ok) {
        setError(result.errors.join(" "));
        return;
      }
      /* ⚠️ ردیفِ تازه به‌صورت محلی اضافه می‌شود تا دبیر همان لحظه ببیندش.
         `revalidatePath` سمتِ سرور هم زده می‌شود، پس ناوبریِ بعدی نسخهٔ
         واقعی را می‌آورد. */
      const now = new Date().toISOString();
      setItems((prev) => [
        {
          id: result.data.id,
          teacherName: null,
          className: "",
          category,
          message: text,
          relatedType: null,
          relatedId: null,
          createdAt: now,
          updatedAt: now,
        },
        ...prev,
      ]);
      setMessage("");
      setCategory("general");
    });
  };

  const saveEdit = (id: string) => {
    const text = editText.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await teacherUpdateFeedback(id, text);
      if (!result.ok) {
        setError(result.errors.join(" "));
        return;
      }
      setItems((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, message: text, updatedAt: new Date().toISOString() } : f,
        ),
      );
      setEditing(null);
    });
  };

  const archive = (id: string) => {
    startTransition(async () => {
      const result = await teacherArchiveFeedback(id);
      if (!result.ok) {
        setError(result.errors.join(" "));
        return;
      }
      setItems((prev) => prev.filter((f) => f.id !== id));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>بازخورد</CardTitle>
        <CardDescription>
          آنچه می‌نویسید برای این دانش‌آموز اعلان می‌شود و در پنل خودش می‌ماند.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* ── فرم ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  category === c
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {FEEDBACK_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
            rows={4}
            placeholder="مثلاً: وزن «مفاعیلن» را بیشتر تمرین کن؛ در بقیهٔ وزن‌ها خوب پیش رفته‌ای."
            className="w-full rounded-xl border border-border bg-transparent p-3 text-[13px] outline-none focus:border-primary"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* شمارنده فقط وقتی نزدیکِ سقف است دیده می‌شود — یک عددِ همیشگی
                فقط نویز است. */}
            <span className="panel-num text-[11px] text-muted-foreground">
              {remaining < 200 ? `${fa(remaining)} نویسه باقی مانده` : ""}
            </span>
            <Button size="sm" onClick={submit} disabled={pending || message.trim().length === 0}>
              {pending ? "در حال ثبت…" : "ثبت بازخورد"}
            </Button>
          </div>

          {error && (
            <p role="alert" className="text-[12px] text-destructive">
              {error}
            </p>
          )}
        </div>

        {/* ── فهرست ───────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <p className="py-2 text-center text-[13px] text-muted-foreground">
            هنوز بازخوردی برای این دانش‌آموز ننوشته‌اید.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px]">
                    {FEEDBACK_CATEGORY_LABEL[f.category]}
                  </span>
                  <span className="panel-num text-[11px] text-muted-foreground">
                    {jalali(f.createdAt)}
                    {f.updatedAt !== f.createdAt && " · ویرایش‌شده"}
                  </span>

                  <span className="ms-auto flex items-center gap-1">
                    {editing === f.id ? (
                      <>
                        <button
                          type="button"
                          aria-label="ذخیره"
                          onClick={() => saveEdit(f.id)}
                          disabled={pending}
                          className="grid size-7 place-items-center rounded-lg text-primary hover:bg-primary/10"
                        >
                          <Check aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="انصراف"
                          onClick={() => setEditing(null)}
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-label="ویرایش"
                          onClick={() => {
                            setEditing(f.id);
                            setEditText(f.message);
                          }}
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5"
                        >
                          <Pencil aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="بایگانی"
                          onClick={() => archive(f.id)}
                          disabled={pending}
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5"
                        >
                          <Archive aria-hidden className="size-4" />
                        </button>
                      </>
                    )}
                  </span>
                </div>

                {editing === f.id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-transparent p-3 text-[13px] outline-none focus:border-primary"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[13px]">{f.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
