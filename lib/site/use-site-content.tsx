"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SiteContent } from "@/lib/site/content";

/**
 * محتوای قابل‌ویرایشِ سایت، یک بار برای همهٔ مصرف‌کننده‌ها.
 *
 * نوار اعلان بالای صفحه است و بخش حامیان پایین‌ترِ صفحهٔ اصلی — دو کامپوننت
 * کاملاً جدا که هر دو به یک پاسخ نیاز دارند. بدون این Context، هر کدام
 * درخواست خودش را می‌زد.
 *
 * حالتِ «هنوز نیامده» و حالتِ «نبود» عمداً از هم جدا نیستند: هر دو یعنی چیزی
 * نشان نده. یک اسکلتِ خاکستری برای نواری که شاید اصلاً وجود نداشته باشد، فقط
 * صفحه را می‌پراند.
 */

const SiteContentContext = createContext<SiteContent | null>(null);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent | null>(null);

  useEffect(() => {
    // AbortController تا اگر کاربر سریع از صفحه رفت، setState روی کامپوننتِ
    // برچیده‌شده صدا زده نشود.
    const controller = new AbortController();

    fetch("/api/v1/site-content", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { ok: boolean; data: SiteContent } | null) => {
        if (json?.ok) setContent(json.data);
      })
      .catch(() => {
        // شبکه یا دیتابیس در دسترس نیست. سایت باید بدون این دو تکه هم کامل
        // کار کند، پس اینجا هیچ خطایی به کاربر نشان داده نمی‌شود.
      });

    return () => controller.abort();
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): SiteContent | null {
  return useContext(SiteContentContext);
}
