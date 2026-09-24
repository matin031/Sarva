import { requireAdmin } from "@/lib/require-admin";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { AdminAccessDenied, loadAdminData } from "@/components/admin/AdminGate";
import AdminShell from "@/components/admin/AdminShell";
import MaintenanceBanner from "@/components/admin/MaintenanceBanner";

/**
 * گاردِ دفاع‌در-عمقِ کلِ `/admin`.
 *
 * =============================================================================
 * ⚠️ این گارد جایگزینِ `requireAdmin()` در اکشن‌ها **نیست**
 * =============================================================================
 *
 * و نمی‌تواند باشد. یک Server Action از مسیرِ رندرِ layout رد نمی‌شود؛ هر
 * کسی می‌تواند مستقیم به آن POST بزند. پس اگر روزی این گارد به‌عنوانِ
 * «حالا دیگر لازم نیست» برداشتنِ گاردِ اکشن‌ها خوانده شود، کلِ پنل باز
 * می‌شود. هر تابع در `lib/admin/*` گاردِ خودش را دارد و باید داشته باشد.
 *
 * پس این برای چیست؟ برای صفحه‌ای که *فراموش* می‌کند.
 *
 * تا امروز، «ادمین بودن» هر صفحهٔ `/admin` از این می‌آمد که آن صفحه اتفاقاً
 * تابعی صدا بزند که `requireAdmin()` دارد. صفحه‌ای که فقط متنِ ایستا نشان
 * دهد، یا دادهٔ عمومی بخواند، یا کوئری‌اش را به یک کامپوننتِ کلاینت بسپارد،
 * هیچ گاردی ندارد — و هیچ‌چیز در کد این را به نویسنده‌اش نمی‌گوید. همان
 * استدلالِ بالای `proxy.ts`: گاردی که باید در بیست فایل تکرار شود، همان
 * گاردی است که در فایلِ بیست‌ویکم فراموش می‌شود.
 *
 * ⚠️ و پیامدِ جانبی‌اش عمدی است: خواندنِ کوکی در layout یعنی کلِ زیردرختِ
 * `/admin` پویا می‌شود. پنجِ صفحه‌ای که `force-dynamic` نداشتند هم دیگر
 * هیچ‌وقت به شکلِ ایستا تولید نمی‌شوند — که برای پنلِ مدیریت همان چیزِ
 * درست است.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  /* ⚠️ `loadAdminData` و نه یک `try/catch` دستی: همان تمایزی که صفحه‌ها
     می‌گذارند. «ادمین نیستی» یک صفحهٔ آرام می‌شود، ولی خطای واقعیِ دیتابیس
     دوباره پرتاب می‌شود تا در error boundary دیده شود و نه اینکه به‌شکلِ
     «دسترسی ندارید» پنهان شود. */
  const gate = await loadAdminData(() => requireAdmin());
  if (!gate.ok) return <AdminAccessDenied title={gate.title} message={gate.message} />;

  return (
    <AdminToastProvider>
      <AdminShell>
        {/* وقتی سایت بسته نیست، چیزی رندر نمی‌کند. چراییِ جایش در خودِ فایل. */}
        <MaintenanceBanner />
        {children}
      </AdminShell>
    </AdminToastProvider>
  );
}
