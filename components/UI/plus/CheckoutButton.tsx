"use client";

import { useRef, useState } from "react";
import { apiPost } from "@/lib/api/client";
import type { PlusOrderSummary } from "@/lib/plus/types";

/**
 * دکمهٔ پرداخت.
 *
 * ⚠️ دو محافظت اینجاست و **هیچ‌کدام به‌تنهایی کافی نیست**:
 *
 *   ۱) `disabled` هنگام ارسال. این فقط UX است: جلوی دوبار کلیکِ *تصادفی* را
 *      می‌گیرد و بس. کسی که کنسول را باز کند یا اینترنتش کند باشد، از آن رد
 *      می‌شود.
 *   ۲) idempotency سمتِ سرور. این محافظتِ واقعی است: دو ایندکس یکتا در
 *      دیتابیس تضمین می‌کنند حتی چند درخواستِ کاملاً هم‌زمان هم بیش از یک
 *      سفارشِ باز نسازند.
 *
 * کلیدِ idempotency هنگام *ساختِ* کامپوننت تولید می‌شود و نه هنگام کلیک؛ پس
 * دو کلیکِ پشت‌سرهم یک کلید دارند. با رفرشِ صفحه کلید عوض می‌شود، ولی آنجا
 * ایندکسِ «یک سفارشِ باز برای هر پلن» کار را تمام می‌کند.
 */
export default function CheckoutButton({ planCode }: { planCode: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idempotencyKey = useRef<string | null>(null);

  /** ⚠️ کلید هنگام *کلیک* ساخته می‌شود و نه هنگام رندر: ساختنِ مقدارِ
   *  تصادفی در بدنهٔ کامپوننت، رندر را ناخالص می‌کند (و ESLint هم درست
   *  می‌گیردش). این ترتیب چیزی را خراب نمی‌کند: کلیکِ دوم پیش از رسیدنِ
   *  پاسخ به `busy` می‌خورد و برمی‌گردد، پس کلید همان یکی می‌ماند. */
  function keyForThisPurchase(): string {
    idempotencyKey.current ??=
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
    return idempotencyKey.current;
  }

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const created = await apiPost<{ order: PlusOrderSummary }>("/api/v1/plus/checkout", {
      planCode,
      idempotencyKey: keyForThisPurchase(),
    });
    if (!created.ok) {
      setError(created.errors.join("\n"));
      setBusy(false);
      return;
    }

    const paid = await apiPost<{ redirectUrl: string }>(
      `/api/v1/plus/orders/${created.data.order.id}/pay`,
    );
    if (!paid.ok) {
      setError(paid.errors.join("\n"));
      setBusy(false);
      return;
    }

    /* ⚠️ عمداً `assign` و نه `replace`: کاربر باید بتواند با دکمهٔ back از
       صفحهٔ درگاه برگردد. و چون دکمه در حالتِ بارگذاری می‌ماند، برگشتنِ او
       سفارشِ دومی نمی‌سازد — همان سفارشِ باز دوباره برگردانده می‌شود. */
    window.location.assign(paid.data.redirectUrl);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        aria-busy={busy}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {busy ? "در حال انتقال به درگاه…" : "پرداخت و فعال‌سازی"}
      </button>

      {error && (
        /* ⚠️ خطا فقط با رنگ مشخص نمی‌شود: هم آیکن دارد، هم role="alert" تا
           صفحه‌خوان بلافاصله بخواندش. */
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
