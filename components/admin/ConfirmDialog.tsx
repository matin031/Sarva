"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * دیالوگ تأیید عملیات.
 *
 * جایگزین `confirm()` مرورگر، که تا امروز در پنل استفاده می‌شد و چهار مشکل
 * داشت:
 *
 *   ۱) چپ‌چین و انگلیسی‌محور است؛ وسط یک پنل راست‌چین فارسی وصله می‌زند.
 *   ۲) مرورگرها اجازه می‌دهند کاربر «دیگر نشان نده» را بزند — و بعد از آن،
 *      `confirm()` بدون هیچ پرسشی `true` برمی‌گرداند. یعنی محافظ ناپدید
 *      می‌شود بی‌آنکه کسی بفهمد.
 *   ۳) حذف یک واژه و حذف یک حساب کاربری دقیقاً یک‌شکل دیده می‌شوند، در حالی
 *      که یکی برگشت‌پذیر است و دیگری نه.
 *   ۴) رشتهٔ کاری را می‌بندد (blocking) و در بعضی مرورگرها داخل promise
 *      نادیده گرفته می‌شود.
 *
 * برای خطرناک‌ترین کارها (حذف حساب، حذف آزمونی که کارنامه دارد) حالت
 * `requireTyping` وجود دارد: کاربر باید یک عبارت را دستی بنویسد. این عمداً
 * کُند است — کاری که برگشت ندارد نباید با یک کلیکِ رفلکسی انجام شود.
 */

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  /** پیامدی که باید پررنگ دیده شود، مثل «۱۲ کارنامه هم حذف می‌شود». */
  consequence?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** ظاهر دکمهٔ تأیید. `danger` برای کارهای برگشت‌ناپذیر. */
  tone?: "danger" | "primary";
  /** اگر مقدار داشته باشد، کاربر باید دقیقاً همین را تایپ کند. */
  requireTyping?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * پوستهٔ بیرونی فقط تصمیم می‌گیرد که دیالوگ رندر بشود یا نه.
 *
 * وضعیتِ فرم (متنِ تایپ‌شده) عمداً داخل کامپوننتِ درونی است: با بسته شدن
 * دیالوگ آن کامپوننت unmount می‌شود و وضعیتش خودبه‌خود پاک می‌شود. جایگزینش
 * — پاک کردن با useEffect روی تغییر `open` — همان کاری بود که نسخهٔ اول کرد و
 * یک رندرِ آبشاریِ اضافه می‌ساخت. اینجا React خودش کار را می‌کند.
 */
export default function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null;
  return <ConfirmDialogPanel {...props} />;
}

function ConfirmDialogPanel({
  title,
  body,
  consequence,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  tone = "danger",
  requireTyping,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // فوکوس روی «انصراف» و نه روی دکمهٔ خطرناک: اگر کاربر ناخواسته Enter بزند،
  // نتیجه‌اش بستنِ دیالوگ باشد نه انجام دادنِ کار.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      // نگه داشتن فوکوس داخل دیالوگ: بدون این، Tab کاربر را به صفحهٔ پشت
      // می‌برد در حالی که دیالوگ هنوز باز است.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    // اسکرول صفحهٔ پشت قفل می‌شود تا دیالوگ واقعاً مودال به نظر برسد.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  const typingSatisfied = !requireTyping || typed.trim() === requireTyping.trim();

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // فقط کلیک روی خودِ پس‌زمینه می‌بندد، نه کلیکی که از داخل پنل بالا آمده.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-bold">
              {title}
            </h2>
            <p id={bodyId} className="mt-1 text-sm text-muted-foreground">
              {body}
            </p>
          </div>
        </div>

        {consequence && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {consequence}
          </p>
        )}

        {requireTyping && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">
              برای تأیید، عبارت <b className="text-foreground">{requireTyping}</b> را بنویسید:
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="min-h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-destructive"
            />
          </label>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!typingSatisfied}
            onClick={onConfirm}
            className={`min-h-11 rounded-xl px-5 text-sm font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
              tone === "danger"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
