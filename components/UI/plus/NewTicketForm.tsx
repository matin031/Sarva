"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTicket } from "@/lib/plus/support-actions";
import { TICKET_CATEGORY_LABEL } from "@/lib/plus/labels";
import type { TicketCategory } from "@/lib/plus/types";

/**
 * فرمِ تیکتِ تازه.
 *
 * ⚠️ هیچ اعتبارسنجیِ اینجا «امنیت» نیست — همه‌اش UX است. Server Action یک
 * endpoint شبکه است و هر کسی می‌تواند مستقیم صدایش بزند، پس همین بررسی‌ها
 * دوباره و به‌طور کامل در `lib/plus/support-actions.ts` انجام می‌شوند. اگر
 * روزی این دو با هم اختلاف پیدا کردند، حرفِ سرور درست است.
 *
 * ⚠️ ضمیمه کردنِ سفارش با *انتخاب از فهرستِ سفارش‌های خودِ کاربر* انجام
 * می‌شود و نه با تایپِ شناسه — و سرور هم دوباره مالکیت را بررسی می‌کند. بدونِ
 * آن بررسی، کاربر می‌توانست شناسهٔ سفارشِ کسِ دیگری را بفرستد و پشتیبان
 * ناخواسته اطلاعات مالیِ یک نفرِ سوم را در پاسخ می‌نوشت.
 */
export default function NewTicketForm({
  orders,
}: {
  orders: { id: string; orderNumber: string; planTitle: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [category, setCategory] = useState<TicketCategory>("payment");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors([]);

    const result = await createTicket({
      category,
      subject,
      message,
      orderId: orderId || undefined,
    });

    if (!result.ok) {
      setErrors(result.errors);
      setBusy(false);
      return;
    }

    setSubject("");
    setMessage("");
    setOrderId("");
    setOpen(false);
    setBusy(false);
    router.refresh();
    router.push(`/panel/support/${result.data.id}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-bold transition-all hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        + تیکت جدید
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-5">
      <h2 className="font-bold">تیکت جدید</h2>

      <label className="block text-sm">
        <span className="text-muted-foreground">موضوع</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
        >
          {(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((key) => (
            <option key={key} value={key}>
              {TICKET_CATEGORY_LABEL[key]}
            </option>
          ))}
        </select>
      </label>

      {/* ⚠️ تفکیکِ صریح با «گزارش محتوا»: اگر این گفته نشود، صفِ پشتیبانی پر
          می‌شود از گزارشِ غلطِ یک سؤال و صفِ ویراستار خالی می‌ماند. */}
      {category === "content" && (
        <p className="rounded-xl border border-border/60 p-3 text-xs leading-relaxed text-muted-foreground">
          اگر می‌خواهی بگویی «این سؤال یا این بیت غلط است»، از دکمهٔ «گزارش
          محتوا» کنارِ خودِ سؤال استفاده کن — مستقیم به ویراستار می‌رسد. این
          بخش برای وقتی است که پاسخِ سروا را نمی‌فهمی یا با آن موافق نیستی.
        </p>
      )}

      <label className="block text-sm">
        <span className="text-muted-foreground">عنوان</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={160}
          required
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
          placeholder="خیلی کوتاه بنویس چه شده"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted-foreground">توضیح</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          required
          rows={5}
          className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2"
          placeholder="هرچه به فهمیدن ماجرا کمک می‌کند"
        />
        <span className="mt-1 block text-left text-[11px] text-muted-foreground">
          {message.length.toLocaleString("fa-IR")} / ۴۰۰۰
        </span>
      </label>

      {orders.length > 0 && (
        <label className="block text-sm">
          <span className="text-muted-foreground">سفارش مرتبط (اختیاری)</span>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
          >
            <option value="">— بدون سفارش —</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNumber} — {order.planTitle}
              </option>
            ))}
          </select>
        </label>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {errors.map((error) => (
            <li key={error}>⚠ {error}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "در حال ارسال…" : "ارسال تیکت"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-border px-4 py-2 text-sm"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
