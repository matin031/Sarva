"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api/client";
import { ShinyButton } from "@/components/UI/kit/magic-shiny-button";
import { useBfcacheReset } from "./use-bfcache-reset";

/**
 * «پرداخت دوباره» برای همان سفارش — بعد از پرداختِ ناموفق یا لغوشده.
 *
 * ⚠️ همان سفارش و نه سفارشِ تازه: شمارهٔ سفارش همان می‌ماند و اگر کاربر
 * دربارهٔ تلاشِ قبلی تیکت زده، پشتیبانی همه را کنارِ هم می‌بیند.
 *
 * اگر سفارش دیگر قابلِ پرداخت نیست (قیمت عوض شده، مهلتش گذشته) سرور پیامِ
 * روشن می‌دهد و اینجا راهِ انتخابِ دوبارهٔ پلن نشان داده می‌شود.
 */
export default function PayOrderButton({
  orderId,
  planCode,
  label = "پرداخت دوباره",
}: {
  orderId: string;
  planCode: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBfcacheReset(useCallback(() => setBusy(false), []));

  async function pay() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const started = await apiPost<{ redirectUrl: string }>(`/api/v1/plus/orders/${orderId}/pay`);
    if (!started.ok) {
      setError(started.errors.join("\n"));
      setBusy(false);
      return;
    }
    window.location.assign(started.data.redirectUrl);
  }

  return (
    <div className="space-y-2">
      <ShinyButton
        type="button"
        onClick={pay}
        disabled={busy}
        aria-busy={busy}
        className="w-full border-primary/50 py-3 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {busy ? "در حال انتقال به درگاه…" : label}
      </ShinyButton>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}{" "}
          <Link
            href={`/checkout?plan=${encodeURIComponent(planCode)}`}
            className="font-bold underline underline-offset-4"
          >
            انتخاب دوبارهٔ پلن
          </Link>
        </p>
      )}
    </div>
  );
}
