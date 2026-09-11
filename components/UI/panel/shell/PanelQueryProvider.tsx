"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query — فقط زیرِ `/panel`، و فقط برای چیزهایی که واقعاً روی
 * کلاینت خوانده و نوشته می‌شوند.
 *
 * ⚠️ چرا سراسری نیست: تقریباً همهٔ دادهٔ پنل روی سرور خوانده می‌شود
 * (`getPanelOverview` و همتاهایش در `lib/panel/queries.ts`). آوردنِ آن‌ها به
 * کلاینت یعنی همان کوئری‌ها دو بار اجرا شوند — یک بار در رندرِ سرور و یک
 * بار بعد از hydration — و صفحه‌ای که الان با HTMLِ کامل می‌آید، با
 * اسپینر شروع شود.
 *
 * آنچه از این provider استفاده می‌کند، سه چیز است که ذاتاً تعاملی‌اند:
 * دستگاه‌های وارد‌شده (خواندن + حذف)، تغییر نام، و تغییر رمز.
 */
export default function PanelQueryProvider({ children }: { children: React.ReactNode }) {
  // ⚠️ در state ساخته می‌شود و نه در ماژول: یک QueryClientِ سطحِ ماژول در
  // رندرِ سرور بین درخواست‌های کاربرانِ مختلف مشترک می‌شد.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // دادهٔ پنل با یک بار رفتن و برگشتن از صفحه کهنه نمی‌شود؛
            // نیم‌دقیقه جلوی رفت‌وبرگشتِ بی‌دلیل را می‌گیرد.
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
