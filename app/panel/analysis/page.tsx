import { AnalysisView, LockedView } from "@/components/UI/panel/views/AnalysisView";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import { getPanelUser } from "@/lib/panel/queries";
import { getPlusStatus } from "@/lib/plus/entitlement";
import {
  getMistakeBook,
  getProgressTrend,
  getRoleAnalysis,
  getTodayPlan,
  getWeightAnalysis,
} from "@/lib/plus/analysis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "برنامهٔ من",
  robots: { index: false, follow: false },
};

/**
 * «برنامهٔ من» — قابلیتِ اصلیِ سروا پلاس.
 *
 * ⚠️ **گاردِ دسترسی روی سرور است و نه در رابط کاربری.** وقتی کاربر اجازه
 * ندارد، هیچ‌کدام از توابعِ تحلیل **اصلاً صدا زده نمی‌شوند** — دادهٔ پولی نه
 * نمایش داده می‌شود و نه ساخته. قفلِ بصری (`.plus-locked-preview`) فقط برای
 * حالتی است که واقعاً چیزی برای پنهان کردن نداریم: یک نمونهٔ ثابت.
 *
 * ⚠️ و سه حالت با هم فرق دارند و نباید قاطی شوند:
 *   • خاموش بودنِ کلِ پلاس  → صفحه باز است، چون سایت رایگان است.
 *   • نداشتنِ اشتراک        → دعوت به آشنایی، با متنی که به همین صفحه ربط دارد.
 *   • خطا در خواندنِ وضعیت  → «مشکلی پیش آمد»، هرگز «اشتراک نداری، بخر».
 *
 * تغییرِ این نسخه فقط ظاهری است: همان سه حالت، همان گاردها، با کارت‌ها و
 * نمودارِ پوستهٔ تازه.
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/analysis");

  const status = await getPlusStatus();

  /* ── خطای زیرساخت ─────────────────────────────────────────────── */
  if (status.state === "unavailable") {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>در بررسی وضعیت اشتراک مشکلی پیش آمد</CardTitle>
          <CardDescription>
            این اشکال از سمتِ ماست، نه از حساب تو. اگر اشتراکی داری سرِ جایش است —
            فقط لحظه‌ای بعد دوباره تلاش کن.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/panel/analysis">تلاش دوباره</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── بدون اشتراک ──────────────────────────────────────────────── */
  if (status.state !== "off" && !status.isActive) {
    return <LockedView expired={status.state === "expired" || status.state === "revoked"} />;
  }

  /* ── دسترسی دارد (یا سایت رایگان است) ─────────────────────────── */
  const [plan, weights, roles, mistakes, trend] = await Promise.all([
    getTodayPlan(user.id),
    getWeightAnalysis(user.id),
    getRoleAnalysis(user.id),
    getMistakeBook(user.id, 8),
    getProgressTrend(user.id, 8),
  ]);

  return <AnalysisView plan={plan} weights={weights} roles={roles} mistakes={mistakes} trend={trend} />;
}
