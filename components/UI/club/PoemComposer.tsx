"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClubPost, updateClubPost } from "@/lib/club/actions";
import {
  MAX_BODY,
  MAX_TAGS,
  MAX_TITLE,
  POST_FORMS,
  POST_TAGS,
  type ClubPost,
} from "@/lib/club/types";

/** The «سرودهٔ تازه» form.
 *
 *  Two things here are not decoration. The بی‌نام switch exists because the
 *  section was asked for on behalf of people who write and never show anyone —
 *  the poem goes up, the name does not. And the وزن button runs the site's own
 *  عروض engine on the first line, so a poet who has no idea what their metre is
 *  called can still label it; `lib/aruz` is a third of a megabyte of lexicon,
 *  so it is imported only when that button is pressed. */
export default function PoemComposer({
  authorName,
  editing,
  onDone,
  onCancel,
}: {
  authorName: string;
  /** present when editing an existing سروده instead of writing a new one */
  editing?: ClubPost;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [form, setForm] = useState(editing?.form ?? "ghazal");
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [meter, setMeter] = useState(editing?.meter ?? "");
  const [anonymous, setAnonymous] = useState(editing?.isAnonymous ?? false);
  const [alias, setAlias] = useState(
    editing?.isAnonymous ? (editing?.authorName ?? "") : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggleTag = (id: string) =>
    setTags((prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length >= MAX_TAGS
          ? prev
          : [...prev, id],
    );

  const detectMeter = async () => {
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError("اول شعرت را بنویس تا وزنش را پیدا کنم.");
      return;
    }
    setDetecting(true);
    setError(null);
    try {
      const { findMeterLocally } = await import("@/lib/aruz");
      const guess = findMeterLocally(lines[0], lines[1]);
      if (guess) setMeter(guess.rhythm);
      else setError("وزنی پیدا نشد؛ می‌توانی خودت بنویسی یا خالی بگذاری.");
    } catch {
      setError("تشخیص وزن ممکن نشد؛ می‌توانی خودت بنویسی یا خالی بگذاری.");
    } finally {
      setDetecting(false);
    }
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = {
        title,
        body,
        form,
        tags,
        meter,
        isAnonymous: anonymous,
        alias,
      };
      const res = editing
        ? await updateClubPost(editing.id, payload)
        : await createClubPost(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!editing) {
        setTitle("");
        setBody("");
        setMeter("");
        setTags([]);
      }
      router.refresh();
      onDone?.();
    });
  };

  const inputClass =
    "min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/60";

  return (
    <div dir="rtl" className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          {editing ? "ویرایش سروده" : "سرودهٔ تازه"}
        </h2>
        <p className="text-xs text-muted-foreground">
          پس از تأیید مدیر روی سایت منتشر می‌شود.
        </p>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-muted-foreground">
          عنوان (اختیاری)
        </span>
        <input
          value={title}
          maxLength={MAX_TITLE}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: باران"
          className={inputClass}
        />
      </label>

      <label className="mb-1 block">
        <span className="mb-1 block text-xs text-muted-foreground">
          متن سروده — هر مصراع در یک سطر
        </span>
        <textarea
          value={body}
          maxLength={MAX_BODY}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          dir="rtl"
          placeholder={"بشنو این نی چون شکایت می‌کند\nاز جدایی‌ها حکایت می‌کند"}
          className="w-full resize-y rounded-xl border border-border bg-card p-3 text-center font-serif text-[15px] leading-[2.2] outline-none focus:border-primary/60"
        />
      </label>
      <p className="mb-4 text-left text-[11px] text-muted-foreground">
        {body.length.toLocaleString("fa-IR")} / {MAX_BODY.toLocaleString("fa-IR")}
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">قالب</span>
          <select
            value={form}
            onChange={(e) => setForm(e.target.value as ClubPost["form"])}
            className={inputClass}
          >
            {POST_FORMS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            وزن (اختیاری)
          </span>
          <div className="flex gap-2">
            <input
              value={meter}
              onChange={(e) => setMeter(e.target.value)}
              placeholder="مثلاً: فاعلاتن فاعلاتن فاعلن"
              className={inputClass}
            />
            <button
              type="button"
              onClick={detectMeter}
              disabled={detecting}
              className="shrink-0 rounded-xl border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {detecting ? "…" : "وزن‌یاب"}
            </button>
          </div>
        </label>
      </div>

      <div className="mb-4">
        <span className="mb-2 block text-xs text-muted-foreground">
          موضوع (تا {MAX_TAGS.toLocaleString("fa-IR")} برچسب)
        </span>
        <div className="flex flex-wrap gap-2">
          {POST_TAGS.map((t) => {
            const on = tags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  on
                    ? "border-primary bg-primary/12 font-semibold text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="mt-1 size-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm">
            بی‌نام منتشر شود
            <span className="mt-0.5 block text-xs text-muted-foreground">
              نام حساب تو جای دیگری دیده نمی‌شود؛ فقط مدیر سایت می‌داند سروده از
              کیست.
            </span>
          </span>
        </label>
        {anonymous ? (
          <input
            value={alias}
            maxLength={40}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="تخلص یا نام مستعار (خالی بگذاری «ناشناس» می‌شود)"
            className={`mt-3 ${inputClass}`}
          />
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            با نام <span className="font-semibold text-foreground">{authorName}</span>{" "}
            منتشر می‌شود.
          </p>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
        >
          {pending
            ? "در حال ارسال…"
            : editing
              ? "ذخیره و ارسال دوباره برای بررسی"
              : "ارسال برای بررسی"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            انصراف
          </button>
        )}
      </div>
    </div>
  );
}
