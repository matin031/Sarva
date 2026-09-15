"use client";

import { useId, useState } from "react";
import Modal from "@/components/UI/Modal";

/**
 * تأییدِ «لغو دسترسی دبیری».
 *
 * =============================================================================
 * ⚠️ چرا `ConfirmDialog` استفاده نشد
 * =============================================================================
 *
 * آن دیالوگ دو حالت دارد: تأییدِ ساده، و `requireTyping` که یک عبارتِ
 * **مشخص** می‌خواهد. هیچ‌کدام یک متنِ آزاد نمی‌گیرند، و اینجا دلیل اجباری
 * است و باید در `admin_audit_log` بنشیند.
 *
 * پس یک دیالوگِ جدا — ولی روی همان `Modal` مشترک، که حبسِ فوکوس، Escape،
 * برگرداندنِ فوکوس و قفلِ اسکرول را دارد. (نسخهٔ قدیمیِ `NoteDialog` در
 * پنلِ درخواست‌ها یک `<div>` خام است و هیچ‌کدام را ندارد.)
 *
 * =============================================================================
 * ⚠️ چرا فهرستِ پیامدها این‌قدر صریح است
 * =============================================================================
 *
 * این کار سه چیزِ متفاوت را هم‌زمان عوض می‌کند و دو تای دیگر را عمداً دست
 * نمی‌زند. مدیری که فقط «مطمئنی؟» ببیند، نمی‌داند دارد اشتراکِ خریداری‌شدهٔ
 * کاربر را هم می‌سوزاند یا نه — و چون نمی‌داند، یا از کارِ درست می‌ترسد یا
 * کارِ اشتباه را با خیالِ راحت می‌کند.
 */
export default function RevokeTeacherDialog({
  who,
  busy,
  onConfirm,
  onCancel,
}: {
  /** نامِ نمایشی یا ایمیلِ کاربر — فقط برای متنِ دیالوگ. */
  who: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const titleId = useId();
  const bodyId = useId();
  const reasonId = useId();

  const ready = reason.trim().length >= 5;

  return (
    <Modal
      role="alertdialog"
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={bodyId}
      className="max-w-lg p-6"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 id={titleId} className="font-bold">
            لغو دسترسی دبیری
          </h2>
          <p id={bodyId} className="mt-1 text-sm text-muted-foreground">
            دسترسی دبیریِ {who} برداشته می‌شود.
          </p>
        </div>

        {/* ── چه چیزی عوض می‌شود ──────────────────────────────────── */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">این کار انجام می‌شود:</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 ps-4 text-destructive/90">
            <li>نقش «دبیر» برداشته می‌شود و پنل دبیر بسته می‌شود.</li>
            <li>سروا پلاسی که از تأیید دبیری آمده لغو می‌شود.</li>
            <li>عضوگیری کلاس‌هایش بسته می‌شود؛ کسی با کد وارد نمی‌شود.</li>
          </ul>
        </div>

        {/* ── و چه چیزی دست نمی‌خورد ──────────────────────────────── */}
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="font-medium">این‌ها دست نمی‌خورند:</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 ps-4 text-muted-foreground">
            <li>دانش‌آموزان کلاس و سابقهٔ عضویتشان حذف نمی‌شوند.</li>
            <li>بازخوردهایی که قبلاً نوشته حذف نمی‌شوند.</li>
            <li>اشتراک پلاسی که خودش خریده یا هدیهٔ دستی گرفته باقی می‌ماند.</li>
            <li>درخواست دبیری‌اش همچنان «تأییدشده» ثبت می‌ماند؛ این یک رویداد تازه است.</li>
          </ul>
        </div>

        <label htmlFor={reasonId} className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">
            دلیل لغو (در سابقهٔ مدیریت ثبت می‌شود، به کاربر نشان داده نمی‌شود):
          </span>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            autoComplete="off"
            placeholder="مثلاً: حکم کارگزینی جعلی بود."
            className="resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-destructive"
          />
        </label>

        {/* ⚠️ «انصراف» اولین دکمه در DOM است — همان قاعدهٔ `ConfirmDialog`:
            `Modal` فوکوس را به اولین موردِ قابلِ فوکوس می‌دهد، پس یک Enterِ
            ناخواسته کارِ برگشت‌ناپذیر را انجام نمی‌دهد. (اینجا اولین مورد
            خودِ متنِ دلیل است، که باز هم بی‌خطر است.) */}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-xl border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => onConfirm(reason.trim())}
            className="min-h-11 rounded-xl bg-destructive px-5 text-sm font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {busy ? "در حال لغو…" : "لغو دسترسی دبیری"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
