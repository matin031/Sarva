"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/UI/Header";
import Footer from "@/components/UI/Footer";
import { GeometricPattern } from "@/components/persian-patterns";
import { useImmersiveMode } from "@/lib/immersive-mode";

/** /admin/* is a back-office tool, not a marketing page — it gets its own
 *  chrome (components/admin/AdminShell.tsx: sidebar + topbar) and skips
 *  the public site's Header/Footer/decorative pattern entirely. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  /* صفحه‌ای که بازیِ فعال را نشان می‌دهد می‌تواند پوسته را جمع کند. هیچ
     صفحهٔ دیگری تحتِ تأثیر نیست: تا وقتی کسی صریحاً روشنش نکند خاموش است. */
  const immersive = useImmersiveMode();

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header compact={immersive} />
      <main className="flex-1">{children}</main>
      {/* پاورقیِ بزرگ نباید با بازیِ در جریان رقابت کند. */}
      {!immersive && <Footer />}
      <GeometricPattern className="z-10 fixed text-gold h-screen" opacity={0.06} />
    </>
  );
}
