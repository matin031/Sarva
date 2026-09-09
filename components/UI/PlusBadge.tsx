"use client";

import Link from "next/link";
import { usePlusSummary } from "@/lib/auth/use-current-user";

/**
 * نشانِ «سروا پلاس» کنارِ لوگو.
 *
 * ⚠️ چیزهایی که این نشان را **نمی‌سازند** — و هر کدامشان یک اشتباهِ رایج:
 *
 *   ✗ localStorage یا هر چیزی که در مرورگر ذخیره شده
 *   ✗ query string («?plus=1»)
 *   ✗ نقشِ admin
 *   ✗ وجود یک سفارشِ پرداخت‌نشده
 *
 * تنها منبعش `plus.state === "active"` است که خودش از entitlement واقعی در
 * سرور می‌آید. یعنی برای «پلاس دیده شدن» راهی جز داشتنِ اشتراک نیست.
 *
 * ── چرا چشمک نمی‌زند و جا را جابه‌جا نمی‌کند ────────────────────────────────
 * تا وقتی پاسخِ `/me` نرسیده `loading` است و نشان رندر نمی‌شود؛ ولی جای آن
 * از قبل رزرو است (`min-width` در `.plus-badge`)، پس ظاهر شدنش چیدمانِ هدر
 * را تکان نمی‌دهد. لوگوی سروا هم دست‌نخورده می‌ماند — این یک sub-brand کوچک
 * است، نه یک لوگوی دوم.
 */
export default function PlusBadge({ compact = false }: { compact?: boolean }) {
  const { plus, loading } = usePlusSummary();

  // در حالِ بارگذاری، یا وقتی کلِ پلاس از پنل مدیریت خاموش است، هیچ نشانی
  // نیست. (خاموش بودن یعنی سایت رایگان است و «پلاس» معنایی ندارد.)
  if (loading || plus.state !== "active") return null;

  const expiring = plus.expiringSoon;

  const label = compact ? "+" : "PLUS";
  const title = plus.isTrial
    ? "دسترسی آزمایشی سروا پلاس"
    : expiring
      ? "سروا پلاس — نزدیک پایان"
      : "سروا پلاس فعال است";

  return (
    <Link
      href="/panel/subscription"
      /* ⚠️ متنِ نشان («PLUS» یا «+») همیشه هست: نشان نباید فقط با رنگ
         تشخیص داده شود. aria-label جملهٔ کامل را برای صفحه‌خوان می‌گوید،
         چون «PLUS» به‌تنهایی وضعیت را نمی‌رساند. */
      aria-label={title}
      title={title}
      className={`plus-badge ${compact ? "plus-badge--compact" : ""} ${
        expiring ? "plus-badge--expiring" : ""
      } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink`}
    >
      {/* ستاره تزئینی است و صفحه‌خوان نباید بخواندش. */}
      {!compact && (
        <span className="plus-badge__spark" aria-hidden="true">
          ✦
        </span>
      )}
      <span>{label}</span>
    </Link>
  );
}
