"use client";

/**
 * چاپِ رسید.
 *
 * ⚠️ عمداً یک PDF ساخته نمی‌شود. تولید PDF یعنی یک کتابخانهٔ سنگین، یک فونت
 * فارسی جاسازی‌شده و یک مسیرِ سروری تازه — برای کاری که خودِ مرورگر بهتر
 * انجامش می‌دهد و کاربر می‌تواند نتیجه‌اش را هم چاپ کند و هم به‌صورت PDF
 * ذخیره کند.
 *
 * استایلِ چاپ در همان صفحه با `print:` تعریف شده، پس آنچه چاپ می‌شود فقط
 * خودِ رسید است و نه ناوبری و دکمه‌ها.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      چاپ رسید
    </button>
  );
}
