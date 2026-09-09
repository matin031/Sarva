"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import type { PaymentState } from "@/lib/plus/types";

/**
 * «بررسی دوبارهٔ وضعیت پرداخت».
 *
 * ⚠️ این دکمه تفاوتِ بینِ «کاربر پولش را از دست داد» و «کاربر اشتراکش را
 * گرفت» است.
 *
 * سناریو: کاربر در صفحهٔ بانک پرداخت می‌کند، بانک پول را می‌گیرد، و پیش از
 * برگشتن به سروا اینترنتش قطع می‌شود. مرورگر هرگز به `/payment/return`
 * نمی‌رسد. بدونِ این دکمه، تنها راهِ فهمیدنِ ماجرا یک تیکتِ پشتیبانی بود.
 *
 * پس از تأییدِ موفق، `refreshCurrentUser()` صدا زده می‌شود تا نشانِ پلاس در
 * هدر بلافاصله ظاهر شود و کاربر مجبور نباشد صفحه را رفرش کند.
 */
export default function RecheckButton({
  orderId,
  label = "بررسی دوبارهٔ وضعیت",
}: {
  orderId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function recheck() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    const response = await apiPost<{ result: { state: PaymentState; message: string | null } }>(
      `/api/v1/plus/orders/${orderId}/recheck`,
    );

    if (!response.ok) {
      setMessage(response.errors.join("\n"));
      setBusy(false);
      return;
    }

    if (response.data.result.state === "verified") {
      refreshCurrentUser();
    }

    // صفحه از سرور دوباره خوانده می‌شود؛ وضعیتِ نمایش‌داده‌شده هیچ‌وقت از
    // پاسخِ این درخواست ساخته نمی‌شود.
    router.refresh();
    setMessage(response.data.result.message ?? null);
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={recheck}
        disabled={busy}
        aria-busy={busy}
        className="rounded-xl border border-border px-4 py-2 text-sm font-bold transition-all hover:bg-accent/20 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {busy ? "در حال بررسی…" : label}
      </button>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
