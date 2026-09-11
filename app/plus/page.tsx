import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/UI/Header";
import Footer from "@/components/UI/Footer";
import AnnouncementBar from "@/components/site/AnnouncementBar";
import PlanCards from "@/components/UI/plus/PlanCards";
import PlusScrollPage from "@/components/UI/plus/scroll/PlusScrollPage";
import { PLUS_CYCLE, PLUS_REASONS } from "@/components/UI/plus/scroll/plus-content";
import { listSellableOffers } from "@/lib/plus/plans";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { isPlusEnabled, purchaseTerms } from "@/lib/plus/config";
import { jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سروا پلاس",
  description:
    "سروا پلاس به تو می‌گوید کدام وزن و کدام نقش دستوری را باید مرور کنی — بر پایهٔ پاسخ‌های خودت.",
  alternates: { canonical: "/plus" },
};

/**
 * صفحهٔ عمومیِ «سروا پلاس».
 *
 * ⚠️ این صفحه عمداً با جدولِ قیمت شروع نمی‌شود. کاربری که هنوز نمی‌داند بابتِ
 * چه نتیجه‌ای پول می‌دهد، از دیدنِ قیمت فقط یک چیز می‌فهمد: «گران است یا
 * ارزان؟» — و آن سؤال به تنهایی هیچ‌وقت به خرید نمی‌رسد.
 *
 * پس ترتیب این است: ارزش → چرخهٔ کار → دلیل‌ها → قیمت.
 *
 * ⚠️ و در فهرستِ دلیل‌ها فقط قابلیت‌هایی هستند که **واقعاً ساخته شده‌اند**.
 * فروختنِ قابلیتِ آینده با ظاهرِ «فعال»، یعنی کاربری که همان روز پول می‌دهد و
 * همان روز می‌فهمد چیزی که خریده وجود ندارد. متنشان در
 * `components/UI/plus/scroll/plus-content.ts` است.
 *
 * ── چرا سربرگ و پاورقی از اینجا پاس داده می‌شوند ──────────────────────────
 * این صفحه ScrollSmoother دارد و ScrollSmoother باید *تنها* اسکرول‌کنندهٔ
 * صفحه باشد: بستهٔ محتوا به کادرِ دید `fixed` می‌شود. هرچه بیرونِ آن بماند
 * اسکرول نمی‌شود. پس `SiteChrome` برای این مسیر کنار می‌رود و سربرگ و
 * پاورقی *درونِ* همان بسته رندر می‌شوند. جزئیاتِ کامل کنارِ شرطِ همین مسیر در
 * `components/SiteChrome.tsx`.
 *
 * ⚠️ و این تنها صفحه‌ای است که ScrollSmoother می‌گیرد. هیچ صفحهٔ دیگری از
 * سایت — نه خانه، نه پنل، نه بازی‌ها — رفتار اسکرولش عوض نمی‌شود.
 */
export default async function Page() {
  // ⚠️ وقتی مالک پلاس را از پنل خاموش کرده، این صفحه اصلاً وجود ندارد. اگر
  // فقط دکمهٔ خرید را پنهان می‌کردیم، صفحه‌ای می‌ماند که از محصولی حرف
  // می‌زند که فروخته نمی‌شود.
  if (!(await isPlusEnabled())) notFound();

  const [offers, status, terms] = await Promise.all([
    listSellableOffers(),
    getPlusStatus(),
    purchaseTerms(),
  ]);

  return (
    <PlusScrollPage
      reasons={PLUS_REASONS}
      cycle={PLUS_CYCLE}
      header={
        <>
          <AnnouncementBar />
          <Header />
        </>
      }
      footer={<Footer />}
      plans={
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-xl font-bold">انتخاب مدت</h2>

          {status.state === "active" && (
            <p className="mb-5 text-center text-sm plus-ink">
              اشتراک تو فعال است
              {status.expiresAt ? ` تا ${jalaliLong(status.expiresAt)}` : " و محدودیت زمانی ندارد"}.
            </p>
          )}

          <PlanCards offers={offers} state={status.state} />

          {terms ? (
            <p className="mx-auto mt-5 max-w-2xl rounded-xl border border-border/60 p-4 text-center text-xs leading-relaxed text-muted-foreground">
              {terms}
            </p>
          ) : (
            /* ⚠️ متنِ حقوقی ساختگی تولید نمی‌شود. تا وقتی مالک شرایطِ خودش را
               ننوشته، همین جملهٔ صادقانه نمایش داده می‌شود. */
            <p className="mx-auto mt-5 max-w-2xl text-center text-xs text-muted-foreground">
              شرایط خرید هنوز ثبت نشده است. پیش از خرید می‌توانی از بخش پشتیبانی
              بپرسی.
            </p>
          )}

          <p className="mt-10 text-center text-sm text-muted-foreground">
            سؤالی داری؟{" "}
            <Link href="/panel/support" className="text-primary underline underline-offset-4">
              از پشتیبانی بپرس
            </Link>{" "}
            — پیش از خرید و بعد از آن.
          </p>
        </div>
      }
    />
  );
}
