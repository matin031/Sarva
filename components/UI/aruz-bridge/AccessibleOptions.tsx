"use client";

import type { PreparedStep, Side } from "@/lib/aruz-bridge/types";

/**
 * دو گزینه، این بار به‌صورتِ HTML.
 *
 * ⚠️ چرا لازم است: وزن‌ها فقط *داخلِ بوم* نوشته می‌شوند. ممیزی نشان داد در
 * حینِ بازی هیچ‌کدام از این‌ها وجود ندارند:
 *
 *   • هیچ عنصرِ فوکوس‌پذیری برای گزینه‌ها — فهرستِ کاملِ فوکوس‌پذیرها فقط
 *     نشانِ سروا، دکمهٔ گزارش، کلیدِ صدا و خروج بود.
 *   • هیچ‌کدام از وزن‌ها در `document.body.innerText` نبودند.
 *   • خودِ `<canvas>` نه `role` داشت نه `aria-label`.
 *
 * یعنی کسی که با صفحه‌خوان کار می‌کند، پرسش را می‌شنود ولی *گزینه‌ها را
 * اصلاً نمی‌داند*. میان‌بُرهای A/D هم فقط وقتی کمک می‌کنند که کاربر بداند
 * روی هر سمت چه نوشته شده.
 *
 * پس این دکمه‌ها همان دو کاشی‌اند، به زبانِ DOM: همان متن، همان ترتیب، همان
 * کاری که کلیک روی کاشی می‌کند.
 *
 * `sr-only` است ولی با فوکوس دیده می‌شود (`focus-within:not-sr-only`): برای
 * کسی که با Tab کار می‌کند، دکمه‌ای که فوکوس دارد و دیده نمی‌شود بدتر از
 * نبودنش است.
 *
 * ⚠️ ترتیبِ DOM با ترتیبِ دیداری یکی است: «چپ» اولی است چون در صحنهٔ سه‌بعدی
 * سمتِ چپِ تصویر می‌نشیند. اینجا جهتِ متنِ فارسی دخالت نمی‌کند — همان قاعده‌ای
 * که `useGameControls` هم بر پایه‌اش پیکان‌ها را برعکس نمی‌کند.
 */
export function AccessibleOptions({
  step,
  disabled,
  onChoose,
}: {
  step: PreparedStep | null;
  /** وقتی ماشین پاسخ نمی‌پذیرد، این‌ها هم نباید بپذیرند. */
  disabled: boolean;
  onChoose: (side: Side) => void;
}) {
  if (!step) return null;

  const options: { side: Side; label: string; pattern: string }[] = [
    { side: "left", label: "سمتِ چپ", pattern: step.leftPattern },
    { side: "right", label: "سمتِ راست", pattern: step.rightPattern },
  ];

  return (
    <div
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-0 focus-within:bottom-0 focus-within:z-40 focus-within:flex focus-within:gap-2 focus-within:bg-card/95 focus-within:p-3"
      dir="rtl"
    >
      <p id="aruz-bridge-options-label" className="sr-only">
        وزنِ درست را انتخاب کن. میان‌بُر: کلیدِ ← یا A برای چپ، → یا D برای راست.
      </p>
      {options.map(({ side, label, pattern }) => (
        <button
          key={side}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(side)}
          aria-describedby="aruz-bridge-options-label"
          className="min-h-11 flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50"
        >
          {label}: {pattern}
        </button>
      ))}
    </div>
  );
}
