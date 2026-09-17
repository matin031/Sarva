"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTicket } from "@/lib/plus/support-actions";
import { TICKET_CATEGORY_LABEL } from "@/lib/plus/labels";
import type { TicketCategory } from "@/lib/plus/types";
import { MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { AnimatedSelect } from "@/components/UI/kit/animated-select";
import { Field, Input } from "@/components/UI/kit/field";
import styles from "@/components/UI/panel/panel-design.module.css";

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
        className={styles.composerTrigger}
      >
        <span className="flex items-center gap-3"><span className={styles.sticker}><MessageCircle aria-hidden className="size-5" /></span><span><span className="block text-sm font-bold">تیکت تازه</span><span className="mt-1 block text-xs text-muted-foreground">موضوع را بنویس؛ پاسخ همین‌جا و در ایمیلت می‌آید.</span></span></span>
        <Plus aria-hidden className="size-5 shrink-0 text-primary" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} data-panel-card="" className={`${styles.formCard} space-y-4`}>
      <h2 className="flex items-center gap-3 font-bold"><span className={styles.sticker}><MessageCircle aria-hidden className="size-5" /></span>تیکت تازه</h2>

      {/* ⚠️ سقفِ عرض دارد. «موضوع» پنج گزینهٔ کوتاه است و یک کنترلِ
          تمام‌عرض در کارتِ ۱۴۰۰ پیکسلی، فقط فاصلهٔ خالی تولید می‌کند. */}
      <Field label="موضوع" htmlFor="ticket-category" className="max-w-xs">
        <AnimatedSelect
          id="ticket-category"
          heading="موضوع گفت‌وگو"
          value={category}
          options={(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((key) => ({
            value: key,
            label: TICKET_CATEGORY_LABEL[key],
          }))}
          onValueChange={(v) => setCategory(v as TicketCategory)}
        />
      </Field>

      {/* ⚠️ تفکیکِ صریح با «گزارش محتوا»: اگر این گفته نشود، صفِ پشتیبانی پر
          می‌شود از گزارشِ غلطِ یک سؤال و صفِ ویراستار خالی می‌ماند. */}
      {category === "content" && (
        <p className="rounded-xl border border-border/60 p-3 text-xs leading-relaxed text-muted-foreground">
          اگر می‌خواهی بگویی «این سؤال یا این بیت غلط است»، از دکمهٔ «گزارش
          محتوا» کنارِ خودِ سؤال استفاده کن — مستقیم به ویراستار می‌رسد. این
          بخش برای وقتی است که پاسخِ سروا را نمی‌فهمی یا با آن موافق نیستی.
        </p>
      )}

      <Field
        label="عنوان"
        htmlFor="ticket-subject"
        hint={`${subject.length.toLocaleString("fa-IR")} از ۱۶۰ نویسه`}
      >
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={160}
          required
          placeholder="در یک جمله: چه شده؟"
        />
      </Field>

      <Field
        label="توضیح"
        htmlFor="ticket-message"
        hint={`${message.length.toLocaleString("fa-IR")} از ۴۰۰۰ نویسه`}
      >
        <textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          required
          rows={5}
          className="w-full resize-y rounded-xl border border-border bg-background/40 px-4 py-3 text-sm leading-relaxed transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/50 hover:border-muted-foreground/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
          placeholder="چه کار کردی، چه انتظار داشتی، و چه دیدی؟"
        />
      </Field>

      {orders.length > 0 && (
        <Field label="سفارش مرتبط (اختیاری)" htmlFor="ticket-order" className="max-w-sm">
          <AnimatedSelect
            id="ticket-order"
            heading="کدام سفارش؟"
            placeholder="بدون سفارش"
            value={orderId}
            options={[
              { value: "", label: "بدون سفارش" },
              ...orders.map((order) => ({
                value: order.id,
                label: order.orderNumber,
                description: order.planTitle,
              })),
            ]}
            onValueChange={setOrderId}
          />
        </Field>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {errors.map((error) => (
            <li key={error}>⚠ {error}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        {/* ⚠️ کلاس‌های دستی برداشته شدند. `Button` خودش ارتفاع، شعاع،
            رنگ و حالتِ disabled را دارد؛ نوشتنِ دوباره‌شان فقط این دو دکمه را
            از بقیهٔ پنل جدا می‌کرد (ارتفاعِ ۳۸ در برابرِ ۴۴). */}
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "در حال ارسال…" : "ارسال تیکت"}
        </Button>
        <Button variant="outline" type="button" disabled={busy} onClick={() => setOpen(false)}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
