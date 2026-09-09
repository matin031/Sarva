"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dismissPlusWelcome } from "@/lib/plus/user-actions";
import type { PlusNotificationKind } from "@/lib/plus/types";

/**
 * پیامِ خوش‌آمدِ سروا پلاس — دقیقاً یک بار.
 *
 * ⚠️ «یک بار» یعنی یک بار برای *حساب*، نه یک بار برای هر دستگاه. برای همین
 * وضعیتِ دیده‌شدن در دیتابیس است (یک ردیفِ اعلانِ خوانده‌شده) و نه در
 * localStorage. اگر در مرورگر بود، همان کاربر روی گوشی‌اش دوباره پیام را
 * می‌دید.
 *
 * ⚠️ و تمدید، onboarding را تکرار نمی‌کند: `plus_renewed` فقط یک تأییدِ
 * کوتاه می‌گیرد. کسی که سه ماه است پلاس دارد، لازم نیست دوباره یاد بگیرد
 * پلاس چیست.
 */
export default function PlusWelcome({
  notificationId,
  kind,
}: {
  notificationId: string;
  kind: PlusNotificationKind;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const renewal = kind === "plus_renewed";

  if (hidden) return null;

  async function dismiss() {
    // بلافاصله پنهان می‌شود تا کاربر منتظرِ رفت‌وبرگشتِ شبکه نماند؛ اگر
    // درخواست شکست بخورد بدترین حالت این است که در بارگذاری بعدی دوباره
    // دیده شود — که از یک کارتِ گیرکرده بهتر است.
    setHidden(true);
    await dismissPlusWelcome(notificationId);
    router.refresh();
  }

  return (
    <section
      dir="rtl"
      role="status"
      className="plus-surface mb-5 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-extrabold plus-ink">
          <span aria-hidden="true">✦</span>
          {renewal ? "سروا پلاس تمدید شد" : "سروا پلاس فعال شد"}
        </h2>
        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن پیام"
          className="rounded-lg px-2 text-muted-foreground transition-all hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ✕
        </button>
      </div>

      {!renewal && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            از این به بعد می‌توانی از سابقهٔ تمرینت برای مرور و تمرینِ هدفمند
            استفاده کنی — سروا می‌گوید کدام وزن و کدام نقش دستوری را باید
            تمرین کنی.
          </p>
          <Link
            href="/panel/analysis"
            className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            مشاهدهٔ برنامهٔ من
          </Link>
        </>
      )}

      {renewal && (
        <p className="mt-1 text-sm text-muted-foreground">
          دورهٔ تازه به انتهای اشتراک قبلی‌ات اضافه شد.
        </p>
      )}
    </section>
  );
}
