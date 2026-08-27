import type { Metadata } from "next";
import RapidAruzGame from "@/components/UI/aruz-rapid/RapidAruzGame";

export const metadata: Metadata = {
  title: "تقطیعِ سریع | بازی‌های سروا",
  description:
    "متنِ اعراب‌گذاری‌شده را ببین، پوشانده می‌شود و واحدهای عروضی یکی‌یکی می‌آیند: کوتاه یا بلند؟ یک اشتباه، و از اول.",
};

/*
 * این بازی عمداً داخلِ GameShell نیست.
 *
 * GameShell یک لینکِ بازگشت بالای صفحه می‌گذارد و صفحه را در جریانِ عادیِ
 * سند نگه می‌دارد؛ ولی این بازی روی موبایل باید یک صفحهٔ بازیِ واقعی در
 * 100dvh و بدونِ هیچ اسکرولی باشد. راهِ خروج و تأییدش داخلِ خودِ بازی است
 * (نوارِ بالای بازی، و لینکِ بازگشت در صفحهٔ آغاز و نتیجه).
 */
export default function Page() {
  return <RapidAruzGame />;
}
