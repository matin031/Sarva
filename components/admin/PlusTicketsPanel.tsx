"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  adminGetTicket,
  adminListTickets,
  adminReplyTicket,
  adminSetTicketStatus,
  type AdminTicketDetail,
  type AdminTicketRow,
} from "@/lib/plus/admin-actions";
import { useAdminToast } from "@/components/admin/AdminToast";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/plus/labels";
import { clock, jalaliLong } from "@/lib/panel/format";
import type { TicketStatus } from "@/lib/plus/types";

/**
 * صفِ پشتیبانی.
 *
 * ⚠️ **پشتیبان اینجا به تاریخچهٔ آموزشیِ کاربر دسترسی ندارد و نباید داشته
 * باشد.** برای پاسخ به «پرداختم فعال نشد» هیچ نیازی به پاسخ‌های عروضِ او
 * نیست، و دسترسیِ لازم‌نداشته دقیقاً همان چیزی است که روزی نشت می‌کند. تنها
 * دادهٔ فراتر از رشتهٔ گفت‌وگو، سفارشی است که خودِ کاربر ضمیمه کرده.
 *
 * ⚠️ و پاسخِ پشتیبان همیشه با `author_role = 'admin'` ثبت می‌شود — از سرور و
 * نه از این فرم. کاربر نمی‌تواند پیامی به نامِ پشتیبانی جعل کند.
 */

const STATUS_OPTIONS: TicketStatus[] = [
  "waiting_for_user",
  "waiting_for_support",
  "resolved",
  "closed",
];

export default function PlusTicketsPanel({ initial }: { initial: { tickets: AdminTicketRow[]; total: number } }) {
  const toast = useAdminToast();
  const [, startTransition] = useTransition();

  const [list, setList] = useState(initial);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState<AdminTicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [nextStatus, setNextStatus] = useState<TicketStatus>("waiting_for_user");
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    adminListTickets({ status: status || undefined, search })
      .then(setList)
      .catch(() => {});

  async function openTicket(id: string) {
    const detail = await adminGetTicket(id);
    if (!detail) return toast("تیکت پیدا نشد.");
    setOpen(detail);
    setReply("");
    setNextStatus("waiting_for_user");
    startTransition(() => void refresh());
  }

  async function send() {
    if (!open || busy) return;
    setBusy(true);
    const result = await adminReplyTicket({
      ticketId: open.id,
      message: reply,
      status: nextStatus,
    });
    setBusy(false);
    if (!result.ok) return toast(result.errors.join("\n"));
    toast("پاسخ ثبت شد.", "success");
    setReply("");
    await openTicket(open.id);
  }

  return (
    <div dir="rtl" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">تیکت‌های پشتیبانی</h1>
        <Link href="/admin/plus" className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold">
          ← سروا پلاس
        </Link>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => void refresh());
        }}
        className="flex flex-wrap gap-2"
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((key) => (
            <option key={key} value={key}>
              {TICKET_STATUS_LABEL[key]}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="شمارهٔ تیکت، عنوان یا ایمیل"
          className="min-w-40 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl border border-border px-4 py-2 text-sm font-bold">
          جست‌وجو
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── صف ─────────────────────────────────────────────────── */}
        <ul className="space-y-2">
          {list.tickets.length === 0 && (
            <li className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
              تیکتی نیست.
            </li>
          )}
          {list.tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => openTicket(ticket.id)}
                className={`glass w-full rounded-2xl p-4 text-right transition-all hover:bg-accent/10 ${
                  open?.id === ticket.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-bold">{ticket.subject}</span>
                  {ticket.adminUnread && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                      تازه
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ticket.ticketNumber} • {ticket.userEmail}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {TICKET_CATEGORY_LABEL[ticket.category]} •{" "}
                  {TICKET_STATUS_LABEL[ticket.status]} • {jalaliLong(ticket.lastActivityAt)}
                  {ticket.orderNumber ? ` • سفارش ${ticket.orderNumber}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {/* ── رشتهٔ گفت‌وگو ───────────────────────────────────────── */}
        <div className="space-y-3">
          {!open ? (
            <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
              یک تیکت را باز کنید.
            </p>
          ) : (
            <>
              <div className="glass rounded-2xl p-4">
                <h2 className="break-words font-bold">{open.subject}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {open.ticketNumber} • {open.userEmail} •{" "}
                  {TICKET_CATEGORY_LABEL[open.category]}
                </p>
                {open.orderNumber && (
                  <p className="mt-1 text-xs plus-ink">سفارش ضمیمه: {open.orderNumber}</p>
                )}
              </div>

              <ol className="max-h-96 space-y-2 overflow-y-auto">
                {open.messages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-2xl p-3 text-sm ${
                      message.authorRole === "admin" ? "plus-surface" : "glass"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-bold">
                        {message.authorRole === "admin" ? "پشتیبانی" : "کاربر"}
                      </span>
                      <span>
                        {jalaliLong(message.createdAt)} — {clock(message.createdAt)}
                      </span>
                    </div>
                    {/* متنِ کاربر همیشه به‌صورت متنِ ساده رندر می‌شود. */}
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </li>
                ))}
              </ol>

              <div className="glass space-y-2 rounded-2xl p-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="پاسخ پشتیبانی"
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as TicketStatus)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {TICKET_STATUS_LABEL[key]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {busy ? "در حال ارسال…" : "ارسال پاسخ"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await adminSetTicketStatus(open.id, "closed");
                      if (!result.ok) return toast(result.errors.join("\n"));
                      toast("تیکت بسته شد.", "success");
                      await openTicket(open.id);
                    }}
                    className="rounded-xl border border-border px-4 py-2 text-sm"
                  >
                    بستن تیکت
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
