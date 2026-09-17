"use client";

import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";

/**
 * حلقهٔ درصدِ بالای صفحه‌های پنل.
 *
 * حالا فقط یک پوسته روی `AnimatedCircularProgress` است. پیش از این خودش
 * SVG می‌کشید و همان اشکالِ ۱۰۰٪ را داشت (توضیحش در همان فایل).
 *
 * ⚠️ رنگ عمداً همیشه گرادیانِ برند است و نه مقیاسِ قرمز→سبز. آن مقیاس مالِ
 * `AreaCards` است، جایی که عدد یک *قضاوت* دربارهٔ یک بخش است. اینجا عدد
 * «دقتِ تو»ست — یک هویت، نه یک نمره — و خلاصه‌ای که با هر پاسخ رنگ عوض
 * کند، شبیه هشدار خوانده می‌شود.
 */
export default function StatRing({
  percent,
  ready = true,
  label,
  className = "size-18 sm:size-22",
}: {
  percent: number;
  ready?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <AnimatedCircularProgress
      value={percent}
      ready={ready}
      label={label}
      className={className}
    />
  );
}
