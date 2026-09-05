import type { Metadata } from "next";

/**
 * ⚠️ این لایوت فقط برای متادیتاست، چون خودِ صفحه client component است و
 * client component نمی‌تواند `metadata` صادر کند.
 *
 * پیش از این، `/reset-password` هیچ متادیتایی نداشت. نتیجه‌اش دو چیز بود که
 * هر دو غلط‌اند:
 *
 *   • `index: true` را از لایوتِ ریشه به ارث می‌برد، یعنی صفحه‌ای که فقط با
 *     یک توکنِ یک‌بارمصرف معنا دارد، کاندیدِ ایندکس شدن بود.
 *   • `canonical: "/"` را هم ارث می‌برد، یعنی خودش را نسخهٔ تکراریِ صفحهٔ
 *     خانه اعلام می‌کرد.
 *
 * ⚠️ noindex اینجا محافظِ امنیتی نیست و جای بررسیِ توکن را نمی‌گیرد؛ اعتبارِ
 * توکن سمتِ سرور سنجیده می‌شود. این فقط جلوی نشستنِ یک آدرسِ بی‌معنا در
 * نتایج جست‌وجو را می‌گیرد.
 */
export const metadata: Metadata = {
  title: "بازنشانی رمز عبور",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
