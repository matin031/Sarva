"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeTicket, replyToTicket } from "@/lib/plus/support-actions";
import styles from "@/components/UI/panel/panel-design.module.css";
import { Button } from "@/components/UI/kit/button";
import { Field } from "@/components/UI/kit/field";

/**
 * پاسخ در یک تیکت.
 *
 * ⚠️ اینجا **optimistic UI نداریم** و این عمدی است. نمایشِ فوریِ پیام پیش از
 * تأیید سرور یعنی کاربری که پیامش نرسیده، فکر می‌کند رسیده — و در یک تیکتِ
 * پرداخت، همین یعنی روزها انتظار برای پاسخی که هیچ‌وقت خواسته نشده. پیام
 * وقتی نشان داده می‌شود که سرور ثبتش کرده باشد.
 *
 * ── سه چیزی که اینجا درست شد ───────────────────────────────────────────────
 *
 * ۱. **یک `}` اضافه در رشتهٔ کلاس‌ها**: ``className={`${styles.formCard}
 *    space-y-4}`}`` — آن آکولادِ آخر داخلِ *متن* بود و نه در JSX، پس کلاسِ
 *    واقعی `space-y-4}` می‌شد و Tailwind هیچ قاعده‌ای برایش نداشت. یعنی
 *    فاصلهٔ عمودیِ کلِ فرم بی‌صدا از بین رفته بود: برچسب، جعبهٔ متن و
 *    دکمه‌ها همه به هم چسبیده بودند.
 *
 * ۲. **«ببند» حالا تأیید می‌خواهد.** بستنِ تیکت از سمتِ کاربر برگشت ندارد و
 *    دکمه‌اش درست کنارِ «ارسال» بود. یک کلیکِ اشتباه، گفت‌وگوی پرداختش را
 *    می‌بست و چاره‌اش ساختنِ تیکتِ تازه بود.
 *
 * ۳. **ظاهرِ جعبهٔ متن و دکمه‌ها** از خودِ پنل می‌آید و نه از کلاس‌های دستی.
 */
export default function TicketReplyForm({
  ticketId,
  closed,
}: {
  ticketId: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  if (closed) {
    return (
      <p
        data-panel-card=""
        className="rounded-2xl border border-border/70 p-4 text-center text-sm text-muted-foreground"
      >
        این گفت‌وگو بسته شده. اگر باز هم مشکلی هست، یک تیکت تازه بزن.
      </p>
    );
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors([]);

    const result = await replyToTicket({ ticketId, message: body });
    if (!result.ok) {
      setErrors(result.errors);
      setBusy(false);
      return;
    }

    setBody("");
    setBusy(false);
    router.refresh();
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    const result = await closeTicket(ticketId);
    if (!result.ok) setErrors(result.errors);
    setBusy(false);
    setConfirmClose(false);
    router.refresh();
  }

  return (
    <form onSubmit={send} data-panel-card="" className={`${styles.formCard} space-y-4`}>
      <Field
        label="پاسخ تو"
        htmlFor="ticket-reply"
        hint={`${body.length.toLocaleString("fa-IR")} از ۴۰۰۰ نویسه`}
      >
        <textarea
          id="ticket-reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={4000}
          required
          placeholder="جواب یا توضیح تازه‌ات را اینجا بنویس."
          className="w-full resize-y rounded-xl border border-border bg-background/40 px-4 py-3 text-sm leading-relaxed transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/50 hover:border-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
        />
      </Field>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-destructive">
          {errors.map((error) => (
            <li key={error}>⚠ {error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* ⚠️ `!body.trim()` و نه فقط `required`: دکمه‌ای که کلیک می‌شود و
            بعد مرورگر می‌گوید «این فیلد لازم است»، یک رفت‌وبرگشتِ اضافه است
            وقتی می‌شد از اول غیرفعال بود. */}
        <Button type="submit" disabled={busy || !body.trim()} aria-busy={busy}>
          {busy ? "در حال ارسال…" : "ارسال پاسخ"}
        </Button>

        {confirmClose ? (
          <span className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.08] px-3 py-1.5 text-[13px]">
            بستن این گفت‌وگو؟
            <Button
              data-preview-write=""
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={finish}
            >
              بله، ببند
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmClose(false)}
            >
              پشیمان شدم
            </Button>
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmClose(true)}
          >
            مشکلم حل شد، ببند
          </Button>
        )}
      </div>
    </form>
  );
}
