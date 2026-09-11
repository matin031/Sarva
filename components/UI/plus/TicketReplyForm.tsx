"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeTicket, replyToTicket } from "@/lib/plus/support-actions";
import styles from "@/components/UI/panel/panel-design.module.css";
import { Button } from "@/components/UI/kit/button";

/**
 * پاسخ در یک تیکت.
 *
 * ⚠️ اینجا **optimistic UI نداریم** و این عمدی است. نمایشِ فوریِ پیام پیش از
 * تأیید سرور یعنی کاربری که پیامش نرسیده، فکر می‌کند رسیده — و در یک تیکتِ
 * پرداخت، همین یعنی روزها انتظار برای پاسخی که هیچ‌وقت خواسته نشده. پیام
 * وقتی نشان داده می‌شود که سرور ثبتش کرده باشد.
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
  const [errors, setErrors] = useState<string[]>([]);

  if (closed) {
    return (
      <p className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">
        این تیکت بسته شده است. اگر باز هم مشکلی هست، تیکت تازه بساز.
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
    router.refresh();
  }

  return (
    <form onSubmit={send} data-panel-card="" className={`${styles.formCard} space-y-4}`}>
      <label className="block text-sm">
        <span className="text-muted-foreground">پاسخ تو</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={4000}
          required
          className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2"
        />
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-xs text-destructive">
          {errors.map((error) => (
            <li key={error}>⚠ {error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "در حال ارسال…" : "ارسال"}
        </Button>
        <Button variant="outline"
          data-preview-write=""
          type="button"
          onClick={finish}
          disabled={busy}
          className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-60"
        >
          مشکلم حل شد، ببند
        </Button>
      </div>
    </form>
  );
}
