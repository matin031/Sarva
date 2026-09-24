import type { Metadata } from "next";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import PlusAdminPanel from "@/components/admin/PlusAdminPanel";
import {
  adminListEntitlements,
  adminListOrders,
  adminListPlans,
} from "@/lib/plus/admin-actions";
import { isPilotGrantEnabled, isPlusEnabled, paymentProviderName } from "@/lib/plus/config";

export const metadata: Metadata = {
  title: "سروا پلاس",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  // ⚠️ سه فراخوانی، و هر سه خودشان requireAdmin دارند. اینجا دوباره بررسی
  // نمی‌شود چون بررسیِ دوم به‌مرور با اولی اختلاف پیدا می‌کند؛ گاردِ واقعی
  // همان چیزی است که کنارِ کوئری نشسته.
  const result = await loadAdminData(async () => {
    const [plans, orders, entitlements, pilotEnabled, plusEnabled, provider] = await Promise.all([
      adminListPlans(),
      adminListOrders({ limit: 25 }),
      adminListEntitlements({ limit: 25 }),
      isPilotGrantEnabled(),
      isPlusEnabled(),
      paymentProviderName(),
    ]);
    return { plans, orders, entitlements, pilotEnabled, plusEnabled, provider };
  });

  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return (
    <PlusAdminPanel
      initialPlans={result.data.plans}
      initialOrders={result.data.orders}
      initialEntitlements={result.data.entitlements}
      pilotEnabled={result.data.pilotEnabled}
      plusEnabled={result.data.plusEnabled}
      gateway={{
        isTest: result.data.provider === "test",
        production: process.env.NODE_ENV === "production",
      }}
    />
  );
}
