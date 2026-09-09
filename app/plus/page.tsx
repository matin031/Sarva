import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlanCards from "@/components/UI/plus/PlanCards";
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
 * پس ترتیب این است: ارزش → چرخهٔ کار → نمونه → مقایسه → قیمت.
 *
 * ⚠️ و در فهرستِ مقایسه فقط قابلیت‌هایی هستند که **واقعاً ساخته شده‌اند**.
 * فروختنِ قابلیتِ آینده با ظاهرِ «فعال»، یعنی کاربری که همان روز پول می‌دهد و
 * همان روز می‌فهمد چیزی که خریده وجود ندارد.
 */

const VALUE_CYCLE = [
  { title: "پاسخ‌های تو", body: "هر تمرینی که در سروا انجام می‌دهی ثبت می‌شود." },
  { title: "تشخیص نقطهٔ ضعف", body: "کدام وزن و کدام نقش دستوری بیشتر اشتباه می‌شود." },
  { title: "تمرین هدفمند", body: "به‌جای تمرینِ همه‌چیز، همان چند مورد." },
  { title: "مرور", body: "اشتباه‌های ثبت‌شده دوباره جلویت می‌آیند." },
  { title: "سنجش دوباره", body: "روند هفتگی می‌گوید تمرینت نتیجه داده یا نه." },
];

const COMPARISON: { feature: string; free: boolean; plus: boolean }[] = [
  { feature: "همهٔ بازی‌ها و تمرین‌ها", free: true, plus: true },
  { feature: "نتیجهٔ فوری هر تمرین", free: true, plus: true },
  { feature: "ثبت فعالیت و کارنامه‌ها", free: true, plus: true },
  { feature: "نشان‌کردن سؤال‌ها", free: true, plus: true },
  { feature: "تحلیل ضعف در وزن‌ها (عروض سماعی + پل وزن)", free: false, plus: true },
  { feature: "تحلیل ضعف در نقش‌های دستوری (جاسوس + مدار دستور)", free: false, plus: true },
  { feature: "دفتر اشتباه‌ها", free: false, plus: true },
  { feature: "پیشنهاد تمرین امروز", free: false, plus: true },
  { feature: "روند پیشرفت هفتگی", free: false, plus: true },
];

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
    <main dir="rtl" className="container relative z-20 mx-auto mb-32 mt-10 max-w-4xl">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-bold plus-ink">
          ✦ سروا پلاس
        </span>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">
          فقط بیشتر تمرین نکن؛
          <br />
          <span className="text-primary">بدان چه چیزی را باید مرور کنی.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          سروا پلاس از پاسخ‌های خودت می‌فهمد کجا می‌لنگی — کدام وزن، کدام نقش
          دستوری — و به‌جای فهرستِ بی‌پایانِ تمرین، همان چند مورد را جلویت
          می‌گذارد.
        </p>

        {status.state === "active" && (
          <p className="mt-4 text-sm plus-ink">
            اشتراک تو فعال است
            {status.expiresAt ? ` تا ${jalaliLong(status.expiresAt)}` : " و محدودیت زمانی ندارد"}.
          </p>
        )}
      </section>

      {/* ── چرخهٔ ارزش ───────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="mb-5 text-center text-xl font-bold">چطور کار می‌کند</h2>
        <ol className="grid gap-3 sm:grid-cols-5">
          {VALUE_CYCLE.map((step, i) => (
            <li key={step.title} className="glass rounded-2xl p-4">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
              <h3 className="mt-1 text-sm font-bold">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── نمونهٔ گزارش ─────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="mb-5 text-center text-xl font-bold">نمونهٔ گزارش</h2>
        {/* ⚠️ این نمونه با برچسبِ صریح «نمونه» می‌آید و از دادهٔ *ساختگی*
            ساخته شده. استفاده از دادهٔ واقعیِ یک کاربر رایگان برای تبلیغ —
            حتی داده‌های خودش — یعنی نشان دادنِ چیزی که خریدش نکرده و بعد
            گرفتنش. */}
        <div className="plus-surface relative overflow-hidden rounded-2xl p-6">
          <span className="absolute left-4 top-4 rounded-full border border-border bg-background px-3 py-0.5 text-[11px] font-bold text-muted-foreground">
            نمونه — داده‌های واقعی تو نیست
          </span>

          <h3 className="text-sm font-bold plus-ink">امروز برای تو</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="rounded-xl border border-border/60 p-3">
              <span className="font-bold">تمرین وزن «مفاعیلن»</span>
              <p className="mt-1 text-xs text-muted-foreground">
                از ۱۴ تمرینِ این وزن، ۶ تا درست بوده. — حدود ۶ دقیقه
              </p>
            </li>
            <li className="rounded-xl border border-border/60 p-3">
              <span className="font-bold">تمرین نقش «متمم»</span>
              <p className="mt-1 text-xs text-muted-foreground">
                دقتِ تو در این نقش ۵۲٪ است. — حدود ۷ دقیقه
              </p>
            </li>
            <li className="rounded-xl border border-border/60 p-3">
              <span className="font-bold">مرور دفتر اشتباه‌ها</span>
              <p className="mt-1 text-xs text-muted-foreground">
                ۹ اشتباهِ ثبت‌شده در یک ماه اخیر. — حدود ۴ دقیقه
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* ── مقایسه ──────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="mb-5 text-center text-xl font-bold">رایگان و پلاس</h2>
        {/* جدول در موبایل باید داخلِ خودش اسکرول شود، نه اینکه کلِ صفحه را
            به‌هم بریزد. */}
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th scope="col" className="p-3 text-right font-medium">
                  قابلیت
                </th>
                <th scope="col" className="p-3 font-medium">
                  رایگان
                </th>
                <th scope="col" className="p-3 font-medium plus-ink">
                  پلاس
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-border/30 last:border-0">
                  <th scope="row" className="p-3 text-right font-normal">
                    {row.feature}
                  </th>
                  {/* ⚠️ فقط رنگ کافی نیست: هر خانه متن هم دارد تا برای
                      صفحه‌خوان و برای کسی که رنگ را تشخیص نمی‌دهد هم
                      خوانده شود. */}
                  <td className="p-3 text-center">
                    {row.free ? (
                      <span className="text-primary">✓ دارد</span>
                    ) : (
                      <span className="text-muted-foreground">— ندارد</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="plus-ink">✓ دارد</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── قیمت ────────────────────────────────────────────────────── */}
      <section className="mt-14" id="plans">
        <h2 className="mb-5 text-center text-xl font-bold">انتخاب مدت</h2>
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
      </section>

      {/* ── پشتیبانی ────────────────────────────────────────────────── */}
      <section className="mt-12 text-center text-sm text-muted-foreground">
        سؤالی داری؟{" "}
        <Link href="/panel/support" className="text-primary underline underline-offset-4">
          از پشتیبانی بپرس
        </Link>{" "}
        — پیش از خرید و بعد از آن.
      </section>
    </main>
  );
}
