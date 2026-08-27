"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/UI/Header";
import Footer from "@/components/UI/Footer";
import { GeometricPattern } from "@/components/persian-patterns";
import { useChromeMode } from "@/lib/immersive-mode";

/** /admin/* is a back-office tool, not a marketing page — it gets its own
 *  chrome (components/admin/AdminShell.tsx: sidebar + topbar) and skips
 *  the public site's Header/Footer/decorative pattern entirely. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  /* صفحه‌ای که بازیِ فعال را نشان می‌دهد می‌تواند پوسته را جمع کند یا کاملاً
     بردارد. هیچ صفحهٔ دیگری تحتِ تأثیر نیست: تا وقتی کسی صریحاً چیزی جز
     `off` نگذارد، همه‌چیز عادی است. */
  const chrome = useChromeMode();

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  /* ⚠️ شکلِ این درخت *نباید* با عوض‌شدنِ حالت تغییر کند.
     React فرزندانِ یک Fragment را بر اساسِ جایگاه تطبیق می‌دهد. اگر برای
     حالتِ تمام‌قد زودهنگام یک `<main>` تنها برگردانیم، شکلِ درخت عوض می‌شود و
     React کلِ زیردرخت — یعنی خودِ بازی — را برمی‌چیند و از نو می‌سازد. نتیجه
     در عمل: بازیکن «شروع» را می‌زد، بازی یک لحظه بالا می‌آمد، حالتِ پوسته
     عوض می‌شد، کامپوننت remount می‌شد و reducer به صفحهٔ تنظیمات برمی‌گشت.

     برای همین همیشه همان چهار جایگاه رندر می‌شوند و فقط *محتوایشان* شرطی
     است؛ `false` یک جایگاهِ خالیِ معتبر است و ترتیب را حفظ می‌کند. */
  return (
    <>
      {chrome !== "fullscreen" && <Header compact={chrome === "compact"} />}
      <main className="flex-1">{children}</main>
      {/* پاورقیِ بزرگ نباید با بازیِ در جریان رقابت کند. */}
      {chrome === "off" && <Footer />}
      {chrome !== "fullscreen" && (
        <GeometricPattern className="z-10 fixed text-gold h-screen" opacity={0.06} />
      )}
    </>
  );
}
