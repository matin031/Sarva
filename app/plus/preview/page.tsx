import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/UI/Header";
import Footer from "@/components/UI/Footer";
import AnnouncementBar from "@/components/site/AnnouncementBar";
import PlusScrollPage from "@/components/UI/plus/scroll/PlusScrollPage";
import { PLUS_CYCLE, PLUS_REASONS } from "@/components/UI/plus/scroll/plus-content";
import styles from "@/components/UI/plus/scroll/plus-scroll.module.css";
import AnimatedPlanCard from "@/components/UI/plus/AnimatedPlanCard";

/**
 * پیش‌نمایشِ صفحهٔ اسکرولیِ سروا پلاس — فقط برای بررسیِ محلی.
 *
 * ⚠️ در production اصلاً وجود ندارد (۴۰۴ می‌دهد)، مثل `/design-preview`.
 * نه دیتابیس می‌خواند، نه احراز هویت را دور می‌زند و نه چیزی می‌فروشد: به‌جای
 * `PlanCards` واقعی یک جدولِ نمونه می‌گذارد، تا بشود انیمیشن را بدونِ
 * دیتابیسِ بالا و بدونِ اینکه پلاس روشن باشد دید.
 *
 * کلیدهای دیباگ: `?markers=1` نشانگرهای ScrollTrigger و `?path=1` خطِ مسیرِ
 * توپ. هر دو از سرور خوانده می‌شوند — اگر در کلاینت خوانده می‌شدند، اولین
 * رندر بدونشان ساخته می‌شد و ScrollTrigger که این مقدار را فقط یک بار در
 * زمانِ ساخت می‌خواند، هیچ‌وقت آن را نمی‌دید.
 */

export const metadata: Metadata = {
  title: "پیش‌نمایش اسکرول سروا پلاس",
  robots: { index: false, follow: false },
};

/** جای `PlanCards` — همان شکل، بدونِ قیمتِ واقعی و بدونِ دکمهٔ خرید. */
function SamplePlans() {
  /* ⚠️ همان سه مدتی که در `scripts/seed-plus-plans.ts` ساخته می‌شوند، تا
     پیش‌نمایش همان چیدمانی را نشان بدهد که صفحهٔ واقعی دارد. قیمت‌ها اینجا
     خط تیره‌اند چون قیمتِ واقعی از دیتابیس می‌آید و این صفحه به دیتابیس
     وصل نمی‌شود. */
  const sample = [
    { title: "یک‌ماهه", price: "—", note: "برای امتحان کردن" },
    { title: "دوماهه", price: "—", note: "کمتر از دو برابرِ یک‌ماهه" },
    { title: "سه‌ماهه", price: "—", note: "کمترین هزینهٔ ماهانه" },
  ];
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-center text-xl font-bold">انتخاب مدت</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {sample.map((p, index) => (
          <AnimatedPlanCard key={p.title} index={index} className="rounded-2xl p-7 text-center">
            <h3 className="text-base font-bold">{p.title}</h3>
            <p className="mt-2 text-2xl font-extrabold plus-ink">{p.price}</p>
            <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>
            <div className="mt-6 rounded-xl bg-primary/10 px-3 py-3 text-xs text-primary">همراهِ مسیر یادگیری تو</div>
          </AnimatedPlanCard>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        نمونه — قیمت و دکمهٔ خرید در صفحهٔ واقعی از دیتابیس می‌آید.
      </p>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ markers?: string; path?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();

  const q = await searchParams;
  const markers = q.markers === "1";
  const showPath = q.path === "1";

  return (
    <>
      {/* ⚠️ سربرگ و پاورقیِ *واقعی* پاس داده می‌شوند و نه چیزی ساده‌تر.
          چیدمانی که باید امتحان شود دقیقاً همین است: هر دو داخلِ بستهٔ
          ScrollSmoother. پیش‌نمایشی که آن‌ها را نداشته باشد، تنها چیزی را
          که ممکن است بشکند امتحان نمی‌کند. */}
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
        plans={<SamplePlans />}
        markers={markers}
        showPath={showPath}
      />
      <div className={styles.debugBar} dir="rtl">
        <span>دیباگ</span>
        <a href="?markers=1" data-on={markers && !showPath ? "1" : "0"}>
          markers
        </a>
        <a href="?path=1" data-on={showPath && !markers ? "1" : "0"}>
          مسیر
        </a>
        <a href="?markers=1&path=1" data-on={markers && showPath ? "1" : "0"}>
          هر دو
        </a>
        <a href="?" data-on={!markers && !showPath ? "1" : "0"}>
          خاموش
        </a>
      </div>
    </>
  );
}
