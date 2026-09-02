"use client";

import ReportButton from "@/components/UI/ReportButton";
import { useReportTarget } from "@/lib/reports/target";

/**
 * دکمهٔ گزارش برای نوارِ بالای بازی‌ها.
 *
 * ⚠️ چرا هر بازی این را *داخلِ نوارِ خودش* می‌گذارد و پوسته یک دکمهٔ شناور
 * نمی‌سازد:
 *
 * چند بازی وقتی شروع می‌شوند صفحه را کاملاً می‌گیرند — «مدارِ دستور» یک
 * پوستهٔ `fixed` روی `z-300` می‌سازد، و «کوتاه یا بلند» و «پلِ وزن» حالتِ
 * غرق‌شده را روشن می‌کنند و نوارِ بالای پوسته اصلاً رندر نمی‌شود. در هر سه
 * حالت دکمه‌ای که در `GameShell` نشسته باشد یا زیرِ بازی می‌ماند یا اصلاً
 * وجود ندارد؛ یعنی دقیقاً در بازی‌هایی که کاربر وسطِ پرسش است، راهِ گزارش
 * بسته است. دکمهٔ شناور هم روی تختهٔ بازی می‌افتد و لمس را می‌دزدد.
 *
 * پس هر نوار خودش این را کنارِ خروج و صدا می‌گذارد. اگر بازی هنوز نگفته
 * باشد چه چیزی روی صفحه است، چیزی رندر نمی‌شود.
 */
export default function GameReportButton({
  compact = false,
  className = "",
  variant = "pill",
}: {
  compact?: boolean;
  className?: string;
  variant?: "pill" | "bare";
}) {
  const target = useReportTarget();
  if (!target) return null;
  return (
    <ReportButton
      target={target}
      compact={compact}
      className={className}
      variant={variant}
    />
  );
}
