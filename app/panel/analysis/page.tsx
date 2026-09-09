import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { getPlusStatus } from "@/lib/plus/entitlement";
import {
  getMistakeBook,
  getProgressTrend,
  getRoleAnalysis,
  getTodayPlan,
  getWeightAnalysis,
  type SkillAnalysis,
} from "@/lib/plus/analysis";
import { fa, jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "برنامهٔ من",
  robots: { index: false, follow: false },
};

/**
 * «برنامهٔ من» — قابلیتِ اصلیِ سروا پلاس.
 *
 * ⚠️ **گاردِ دسترسی روی سرور است و نه در رابط کاربری.**
 *
 * دقت کنید که وقتی کاربر اجازه ندارد، هیچ‌کدام از توابعِ تحلیل **اصلاً صدا
 * زده نمی‌شوند**. یعنی دادهٔ پولی نه‌تنها نمایش داده نمی‌شود، بلکه ساخته هم
 * نمی‌شود و به مرورگر نمی‌رسد. قفلِ بصری (`.plus-locked-preview`) فقط برای
 * حالتی است که *واقعاً چیزی برای پنهان کردن نداریم* — یک نمونهٔ ثابت.
 *
 * ⚠️ و سه حالت با هم فرق دارند و نباید قاطی شوند:
 *   • خاموش بودنِ کلِ پلاس  → صفحه باز است، چون سایت رایگان است.
 *   • نداشتنِ اشتراک        → دعوت به آشنایی، با متنی که به همین صفحه ربط دارد.
 *   • خطا در خواندنِ وضعیت  → «مشکلی پیش آمد»، هرگز «اشتراک نداری، بخر».
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/analysis");

  const status = await getPlusStatus();

  /* ── خطای زیرساخت ─────────────────────────────────────────────── */
  if (status.state === "unavailable") {
    return (
      <div dir="rtl" className="glass space-y-3 rounded-2xl border border-destructive/40 p-6">
        <h1 className="font-bold">در بررسی وضعیت اشتراک مشکلی پیش آمد</h1>
        <p className="text-sm text-muted-foreground">
          این اشکال از سمتِ ماست، نه از حساب شما. اگر اشتراکی دارید سرِ جایش
          است — فقط لحظه‌ای بعد دوباره تلاش کنید.
        </p>
        <Link
          href="/panel/analysis"
          className="inline-block rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          تلاش دوباره
        </Link>
      </div>
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

  return (
    <div dir="rtl" className="space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold">برنامهٔ من</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          بر پایهٔ پاسخ‌های خودت — نه یک برنامهٔ عمومی
        </p>
      </header>

      {/* ── امروز برای تو ─────────────────────────────────────────── */}
      <section className="plus-surface rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-extrabold plus-ink">
          <span aria-hidden="true">✦</span> امروز برای تو
        </h2>

        {plan.items.length === 0 ? (
          /* ⚠️ وقتی شواهد کافی نیست، پیشنهادِ ساختگی ساخته نمی‌شود. یک
             پیشنهادِ بی‌پایه، وقتِ دانش‌آموز را روی چیزی می‌گذارد که مشکلش
             نبوده و بعد او به کلِ تحلیل بی‌اعتماد می‌شود. */
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {plan.emptyReason}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {plan.items.map((item) => (
              <li key={item.kind} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">{item.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    حدود {fa(item.minutes)} دقیقه
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                <Link
                  href={item.href}
                  className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  شروع تمرین
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── تحلیل وزن ─────────────────────────────────────────────── */}
      <SkillSection
        title="وزن‌ها"
        hint="از «عروض سماعی» و «پل وزن» با هم"
        analysis={weights}
        emptyText="هنوز تمرینِ کافی برای تحلیل وزن‌ها نداری."
      />

      {/* ── تحلیل نقش دستوری ──────────────────────────────────────── */}
      <SkillSection
        title="نقش‌های دستوری"
        hint="از «جاسوس» و «مدار دستور» با هم"
        analysis={roles}
        emptyText="هنوز تمرینِ کافی برای تحلیل نقش‌ها نداری."
      />

      {/* ── دفتر اشتباه‌ها ─────────────────────────────────────────── */}
      <section id="mistakes" className="glass rounded-2xl p-5">
        <h2 className="font-extrabold">دفتر اشتباه‌ها</h2>
        {mistakes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            هنوز اشتباهی ثبت نشده — یا همه را درست زده‌ای.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mistakes.slice(0, 20).map((entry, index) => (
              <li
                key={`${entry.area}-${entry.at}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  {entry.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                    {entry.areaLabel}
                  </span>
                  <Link href={entry.practiceHref} className="text-primary underline underline-offset-4">
                    تمرین
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── روند ──────────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-5">
        <h2 className="font-extrabold">تمرینت نتیجه داد؟</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          دقتِ کلی به تفکیک هفته — هر پنج تمرینِ سروا با هم.
        </p>

        {trend.length < 2 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            برای دیدنِ روند، دستِ‌کم دو هفته تمرین لازم است.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {trend.map((point) => {
              const percent = point.total ? Math.round((point.correct / point.total) * 100) : 0;
              return (
                <li key={point.week} className="text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-muted-foreground">{jalaliLong(point.week)}</span>
                    {/* عدد کنارِ نوار: نمودار نباید تنها راهِ خواندنِ مقدار باشد. */}
                    <span className="font-bold">
                      {fa(percent)}٪ از {fa(point.total)} تمرین
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`دقت هفتهٔ ${jalaliLong(point.week)}: ${percent} درصد`}
                  >
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ────────────────────────── بخشِ یک مهارت ──────────────────────────────── */

function SkillSection({
  title,
  hint,
  analysis,
  emptyText,
}: {
  title: string;
  hint: string;
  analysis: SkillAnalysis;
  emptyText: string;
}) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-extrabold">{title}</h2>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>

      {!analysis.hasEnoughEvidence ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {analysis.buckets.slice(0, 6).map((bucket) => {
              const percent = Math.round(bucket.accuracy * 100);
              return (
                <li key={bucket.key}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-bold">{bucket.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {fa(bucket.correct)} از {fa(bucket.total)} — {fa(percent)}٪
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${bucket.label}: ${percent} درصد درست`}
                  >
                    <div
                      className={`h-full ${percent < 50 ? "bg-destructive" : percent < 75 ? "bg-gold" : "bg-primary"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {/* شفافیتِ منبع: کاربر باید بداند این عدد از کجا آمده. */}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {bucket.bySource
                      .map((s) => `${s.source}: ${fa(s.correct)}/${fa(s.total)}`)
                      .join(" • ")}
                  </p>
                </li>
              );
            })}
          </ul>

          {analysis.ignoredBuckets > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {fa(analysis.ignoredBuckets)} مورد دیگر هنوز تمرینِ کافی ندارند و در
              این فهرست نیامده‌اند.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ────────────────────────── نمای قفل‌شده ───────────────────────────────── */

/**
 * ⚠️ متنِ دعوت به همین صفحه ربط دارد و یک «خرید اشتراک» عمومی نیست.
 * کاربری که آمده دفتر اشتباه‌هایش را ببیند، باید بخواند «مرور اشتباه‌ها با
 * سروا پلاس» — نه یک پیامِ تبلیغاتیِ بی‌ربط که در همهٔ سایت یکی است.
 */
function LockedView({ expired }: { expired: boolean }) {
  return (
    <div dir="rtl" className="space-y-4">
      <section className="plus-surface rounded-2xl p-6 text-center">
        <span className="text-xs font-bold plus-ink">✦ سروا پلاس</span>
        <h1 className="mt-2 text-xl font-extrabold">
          {expired ? "مرور اشتباه‌ها را دوباره روشن کن" : "مرور اشتباه‌ها با سروا پلاس"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          اشتباه‌های ثبت‌شده‌ات را دوباره تمرین کن و نتیجهٔ مرور را ببین. سروا
          پلاس از پاسخ‌های خودت می‌فهمد کدام وزن و کدام نقش دستوری را باید مرور
          کنی.
          {expired && " همهٔ سابقهٔ تمرینت دست‌نخورده باقی مانده است."}
        </p>
        <Link
          href="/plus"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {expired ? "تمدید سروا پلاس" : "فعال‌سازی سروا پلاس"}
        </Link>
      </section>

      {/* پیش‌نمایشِ محو — از دادهٔ نمونه و نه از دادهٔ واقعیِ کاربر. */}
      <section className="glass relative overflow-hidden rounded-2xl p-5">
        <span className="absolute left-4 top-4 z-10 rounded-full border border-border bg-background px-3 py-0.5 text-[11px] font-bold text-muted-foreground">
          نمونه
        </span>
        <div className="plus-locked-preview" aria-hidden="true">
          <h2 className="font-extrabold">وزن‌ها</h2>
          <ul className="mt-4 space-y-3">
            {["مفاعیلن", "فاعلاتن", "مستفعلن"].map((weight, index) => (
              <li key={weight}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-bold">{weight}</span>
                  <span className="text-xs text-muted-foreground">۶ از ۱۴</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${40 + index * 15}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
