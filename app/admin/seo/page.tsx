import type { Metadata } from "next";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import SeoCenter from "@/components/admin/SeoCenter";
import {
  adminSeoExternalChecks,
  adminSeoInternalChecks,
  adminSeoMarkTask,
  adminSeoOverview,
  adminSeoRecordAiCheck,
  adminSeoSubmitIndexNow,
} from "@/lib/admin/seo-actions";

export const metadata: Metadata = {
  title: "سئو و هوش مصنوعی",
  robots: { index: false, follow: false },
};

// وضعیتِ چک‌لیست و آزمون‌ها باید همیشه تازه باشد.
export const dynamic = "force-dynamic";

/**
 * مرکزِ سئو — برای مالکی که متخصصِ سئو نیست.
 *
 * هرچه از دستِ کد برمی‌آمد در کد انجام شده (متادیتا، دادهٔ ساختاریافته،
 * sitemap، llms.txt). این صفحه فقط کارهایی را نشان می‌دهد که *فقط مالک*
 * می‌تواند بکند — ثبت در Search Console، معرفیِ صفحه‌های رسمی، گرفتنِ لینک،
 * نوشتنِ درسِ بعدی — با قدم‌به‌قدمِ هرکدام و یادآوریِ دوره‌ای.
 */
export default async function Page() {
  const result = await loadAdminData(adminSeoOverview);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return (
    <SeoCenter
      data={result.data}
      actions={{
        internalChecks: adminSeoInternalChecks,
        externalChecks: adminSeoExternalChecks,
        markTask: adminSeoMarkTask,
        recordAiCheck: adminSeoRecordAiCheck,
        submitIndexNow: adminSeoSubmitIndexNow,
      }}
    />
  );
}
