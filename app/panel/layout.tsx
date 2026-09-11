import { ToastContainer } from "react-toastify";
import PanelQueryProvider from "@/components/UI/panel/shell/PanelQueryProvider";
import PanelSidebar from "@/components/UI/panel/shell/PanelSidebar";
import PanelTopbar from "@/components/UI/panel/shell/PanelTopbar";
import { GeometricPattern } from "@/components/persian-patterns";
import styles from "@/components/UI/panel/panel-design.module.css";

/**
 * پوستهٔ پنل: سایدبارِ ثابتِ راست + یک نوارِ بالا + ستونِ محتوا.
 *
 * ⚠️ پنل از `SiteChrome` کنار گذاشته شده (مثل `/admin`)، پس هدر و پاورقیِ
 * سایت اینجا رندر نمی‌شوند. اگر این را برگردانی، دو نوارِ چسبان روی هم
 * می‌نشینند.
 *
 * ⚠️ `panel-scope` فقط یک کلاسِ تزئینی نیست: قاعدهٔ `* { line-height: 2 }`
 * سراسریِ سایت را برای این زیردرخت پس می‌گیرد. دلیلش در globals.css نوشته
 * شده.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className={`panel-scope flex min-h-dvh ${styles.shell}`}>
      <div aria-hidden="true" className={styles.pattern}>
        <GeometricPattern opacity={0.025} />
      </div>
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <PanelQueryProvider>
        <PanelSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <PanelTopbar />
          <main id="panel-content" className={`mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 sm:px-6 lg:px-8 ${styles.content}`}>
            {children}
          </main>
        </div>
      </PanelQueryProvider>
    </div>
  );
}
