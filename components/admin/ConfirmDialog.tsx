"use client";

import { useId, useState } from "react";
import Modal from "@/components/UI/Modal";

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

  const typingSatisfied = !requireTyping || typed.trim() === requireTyping.trim();

  return (
    <Modal
      role="alertdialog"
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={bodyId}
      className="max-w-md p-6"
    >
      <div className="flex flex-col gap-4">
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

        {/* «انصراف» عمداً اولین دکمه در DOM است: `Modal` فوکوس را به اولین
            موردِ قابل فوکوس می‌دهد، پس Enterِ ناخواسته دیالوگ را می‌بندد و
            کارِ برگشت‌ناپذیر را انجام نمی‌دهد. (وقتی `requireTyping` هست،
            اولین مورد آن ورودی است — که باز هم بی‌خطر است.) */}
        <div className="flex flex-wrap justify-end gap-2">
          <button
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
    </Modal>
  );
}
