"use client";

import { useId, useState } from "react";
import Modal from "@/components/UI/Modal";
import {
  REASONS_BY_AREA,
  REPORT_AREA_LABELS,
  REPORT_NOTE_MAX,
  REPORT_REASON_LABELS,
  type ReportArea,
  type ReportReason,
} from "@/lib/reports/constants";

/**
 * «این پرسش ایراد دارد» — از هر جای سایت.
 *
 * سه تصمیم که ارزشِ توضیح دارند:
 *
 *   ۱) **برای مهمان هم دیده می‌شود.** برخلاف نشان‌کردن — که بدونِ حساب جایی
 *      برای ذخیره ندارد — گزارش را سرور نگه می‌دارد. بیشترِ کسانی که به
 *      سؤالِ غلط برمی‌خورند اصلاً وارد نشده‌اند؛ پنهان کردنِ دکمه از آن‌ها
 *      یعنی همان گزارشی که بیشتر از همه لازم است هرگز نمی‌آید.
 *
 *   ۲) **متنِ محتوا در خودِ فرم نشان داده می‌شود.** کاربر باید ببیند دارد
 *      دقیقاً چه چیزی را گزارش می‌کند، و همان متن به‌عنوان `snapshot` ذخیره
 *      می‌شود تا مدیر بعداً — حتی اگر سؤال ویرایش یا حذف شده باشد — بتواند
 *      با جست‌وجوی یک مصراع پیدایش کند.
 *
 *   ۳) **دلیل‌ها به بخش بستگی دارند.** نشان دادنِ «مشکل صوت» در بازی‌ای که
 *      صوت ندارد فقط گزارشِ بی‌ربط می‌سازد.
 *
 * پنجره از `Modal` می‌آید که portal می‌شود، فوکوس را حبس می‌کند و روی
 * `z-[400]` می‌نشیند — یعنی هرگز زیرِ هدر یا پاورقی نمی‌ماند.
 */

export type ReportTarget = {
  area: ReportArea;
  /** شناسهٔ محتوا در همان بخش. هر شکلی می‌تواند داشته باشد. */
  targetId?: string | null;
  /** متنی که کاربر همین حالا می‌بیند — بیت، عبارت، واژه. */
  snapshot?: string | null;
  /** مکان‌یاب: پایه، درس، شمارهٔ پرسش… */
  targetRef?: Record<string, unknown>;
};

const PILL =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-destructive/40 hover:text-destructive";

export default function ReportButton({
  target,
  className = "",
  compact = false,
  variant = "pill",
}: {
  target: ReportTarget;
  className?: string;
  /** فقط آیکون — برای نوارهای شلوغِ بازی. */
  compact?: boolean;
  /**
   * `"bare"` یعنی هیچ کلاسِ ظاهری از اینجا نمی‌آید و `className` تمامِ
   * ظاهر را می‌دهد.
   *
   * ⚠️ چرا prop و نه فقط override با `className`: در Tailwind برندهٔ دو
   * کلاسِ متضاد، ترتیبِ *شیوه‌نامه* است نه ترتیبِ رشته. پس نوارِ بالای هر
   * بازی نمی‌تواند با افزودنِ یک کلاس، `bg-card/60` را مطمئن خنثی کند —
   * باید بتواند اصلاً آن را نگیرد.
   */
  variant?: "pill" | "bare";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="گزارش مشکلِ این پرسش"
        title="گزارش مشکلِ این پرسش"
        className={variant === "bare" ? className : `${PILL} ${className}`}
      >
        <FlagIcon />
        {!compact && "گزارش مشکل"}
      </button>

      {open && (
        <ReportDialog target={target} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function FlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      className="size-3.5 shrink-0"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 21V4.5m0 0c3.5-1.8 6.5 1.8 10 0v9c-3.5 1.8-6.5-1.8-10 0"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

type Phase = "form" | "sending" | "done";

function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const titleId = useId();
  const reasons = REASONS_BY_AREA[target.area] ?? REASONS_BY_AREA.other;

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          area: target.area,
          reason,
          targetId: target.targetId ?? null,
          targetRef: target.targetRef ?? {},
          snapshot: target.snapshot ?? null,
          note: note.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; errors?: string[] };
      if (!json.ok) {
        setError(json.errors?.join("\n") ?? "ثبت گزارش ممکن نشد.");
        setPhase("form");
        return;
      }
      setPhase("done");
      // پنجره خودش بعد از یک لحظه بسته می‌شود؛ کاربر لازم نیست کاری بکند.
      setTimeout(onClose, 1600);
    } catch {
      setError("ارتباط برقرار نشد. اتصالت را بررسی کن و دوباره بزن.");
      setPhase("form");
    }
  };

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="max-w-lg">
      <div dir="rtl" className="flex flex-col">
        {/* سربرگ */}
        <div className="flex items-start gap-3 border-b border-border p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
            <FlagIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold">
              گزارش مشکل
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {REPORT_AREA_LABELS[target.area]} — چه ایرادی دارد؟
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {phase === "done" ? (
          <Done />
        ) : (
          <>
            <div className="flex flex-col gap-4 p-5">
              {/* آنچه گزارش می‌شود */}
              {target.snapshot && (
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                    موردی که گزارش می‌کنی
                  </p>
                  <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed">
                    {target.snapshot}
                  </p>
                </div>
              )}

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-xs font-semibold">دلیل گزارش</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reasons.map((r) => {
                    const active = reason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        aria-pressed={active}
                        className={`rounded-xl border p-3 text-right transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {REPORT_REASON_LABELS[r].label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                          {REPORT_REASON_LABELS[r].hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between text-xs font-semibold">
                  توضیح (اختیاری)
                  <span className="font-normal text-muted-foreground">
                    {note.length.toLocaleString("fa-IR")}/
                    {REPORT_NOTE_MAX.toLocaleString("fa-IR")}
                  </span>
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, REPORT_NOTE_MAX))}
                  rows={3}
                  placeholder="اگر می‌دانی پاسخِ درست چیست یا کجای کار می‌لنگد، همین‌جا بنویس."
                  className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                />
              </label>

              {error && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-border p-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-xl border border-border text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={!reason || phase === "sending"}
                onClick={submit}
                className="min-h-11 flex-[2] rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
              >
                {phase === "sending" ? "در حال ارسال…" : "ارسال گزارش"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Done() {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4.5 4.5L19 7" />
        </svg>
      </span>
      <p className="text-base font-bold">ممنون! گزارشت ثبت شد.</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        بررسی می‌شود و اگر ایراد داشته باشد اصلاح می‌شود. همین گزارش‌ها هستند که
        محتوای سروا را درست نگه می‌دارند.
      </p>
    </div>
  );
}
