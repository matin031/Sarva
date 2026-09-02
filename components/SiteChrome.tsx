"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/UI/Header";
import Footer from "@/components/UI/Footer";
import { GeometricPattern } from "@/components/persian-patterns";
import { useChromeMode } from "@/lib/immersive-mode";
import { SiteContentProvider } from "@/lib/site/use-site-content";
import AnnouncementBar from "@/components/site/AnnouncementBar";

/** /admin/* is a back-office tool, not a marketing page — it gets its own
 *  chrome (components/admin/AdminShell.tsx: sidebar + topbar) and skips
 *  the public site's Header/Footer/decorative pattern entirely. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  /** صفحهٔ کهکشانِ بازی‌ها پس‌زمینهٔ خودش را دارد — ستاره‌ها، هالهٔ کهکشانی و
   *  کابل. نقشِ هندسیِ ثابتِ سایت آنجا یک لایهٔ ترکیبِ تمام‌صفحهٔ *چهارم* روی
   *  همان‌ها می‌گذاشت، بی‌آنکه دیده شود. فقط در همین یک مسیر کنار می‌رود. */
  const isGalaxy = pathname === "/game";
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

     برای همین همیشه همان پنج جایگاه رندر می‌شوند و فقط *محتوایشان* شرطی
     است؛ `false` یک جایگاهِ خالیِ معتبر است و ترتیب را حفظ می‌کند. */
  return (
    <SiteContentProvider>
      {/* بالاترین چیزِ صفحه، بالاتر از هدر و در جریانِ عادیِ صفحه — نه شناور
          رویش. دلیلِ کاملش بالای AnnouncementBar است. در حالتِ تمام‌صفحهٔ
          بازی کنار می‌رود، چون آنجا هیچ‌چیز جز بازی نباید باشد. */}
      {chrome !== "fullscreen" && <AnnouncementBar />}
      {chrome !== "fullscreen" && <Header compact={chrome === "compact"} />}
      <main className="flex-1">{children}</main>
      {/* پاورقیِ بزرگ نباید با بازیِ در جریان رقابت کند. */}
      {chrome === "off" && <Footer />}
      {chrome !== "fullscreen" && !isGalaxy && (
        <GeometricPattern className="z-10 fixed text-gold h-screen" opacity={0.06} />
      )}
    </SiteContentProvider>
  );
}
