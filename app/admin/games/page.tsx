import type { Metadata } from "next";
import Link from "next/link";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { pairsAdminCounts } from "@/lib/admin/pairs-actions";
import { ninjaAdminOverview } from "@/lib/admin/ninja-actions";
import { jasoosAdminList } from "@/lib/admin/jasoos-actions";
import { gcAdminTotals } from "@/lib/admin/grammar-circuit-actions";
import { aruzRapidAdminTotals } from "@/lib/admin/aruz-rapid-actions";
import { roleHuntAdminTotals } from "@/lib/admin/role-hunt-actions";
import { JASOOS_SUSPECT_COUNT } from "@/lib/jasoos-data";

export const metadata: Metadata = {
  title: "مدیریت بازی‌ها",
  robots: { index: false, follow: false },
};

// شمارش‌ها باید همان چیزی باشند که همین الان در دیتابیس است.
export const dynamic = "force-dynamic";

const fa = (n: number) => n.toLocaleString("fa-IR");

async function loadOverview() {
  const [pairCounts, ninja, jasoos, circuit, rapid, roleHunt] = await Promise.all([
    pairsAdminCounts(),
    ninjaAdminOverview(),
    jasoosAdminList(),
    gcAdminTotals(),
    aruzRapidAdminTotals(),
    roleHuntAdminTotals(),
  ]);

  const pairTotal = Object.values(pairCounts).reduce((a, b) => a + b, 0);
  const emptyDecks = 6 - Object.values(pairCounts).filter((n) => n > 0).length;

  const ninjaWords = ninja.reduce((sum, c) => sum + c.words.length, 0);
  const emptyRoles = ninja.filter((c) => c.enabled && c.words.length === 0).length;

  const brokenLevels = jasoos.filter(
    (l) => l.suspectCount !== JASOOS_SUSPECT_COUNT || l.spyCount !== 1,
  ).length;

  return {
    pairs: { total: pairTotal, emptyDecks },
    ninja: { roles: ninja.length, words: ninjaWords, emptyRoles },
    jasoos: {
      total: jasoos.length,
      published: jasoos.filter((l) => l.isPublished).length,
      broken: brokenLevels,
    },
    circuit,
    rapid,
    roleHunt,
  };
}

export default async function Page() {
  const result = await loadAdminData(loadOverview);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  const { pairs, ninja, jasoos, circuit, rapid, roleHunt } = result.data;

  const rejectedCount = Object.values(roleHunt.rejected).reduce((a, b) => a + b, 0);

  const cards = [
    {
      href: "/admin/games/pairs",
      title: "جفت‌های ادبی",
      desc: "برای هر پایه و هر نوبت (دی و خرداد) نویسنده و اثرش را وارد کن؛ هر جفت دو کارت می‌شود.",
      stat: `${fa(pairs.total)} جفت`,
      warn:
        pairs.emptyDecks > 0
          ? `${fa(pairs.emptyDecks)} آزمون هنوز هیچ کارتی ندارد`
          : null,
    },
    {
      href: "/admin/games/ninja",
      title: "نینجای دستور زبان",
      desc: "نقش‌ها (قید، صفت، …) و کلماتِ هر نقش. هر کلمه را می‌توانی به نقش دیگری ارجاع بدهی.",
      stat: `${fa(ninja.roles)} نقش · ${fa(ninja.words)} کلمه`,
      warn:
        ninja.emptyRoles > 0
          ? `${fa(ninja.emptyRoles)} نقشِ فعال بدون کلمه است`
          : null,
    },
    {
      href: "/admin/games/jasoos",
      title: "جاسوسِ نقش‌ها",
      desc: "پرونده‌ها: یک بیت، چهار مظنون و یک جاسوس. هر نقش را با یک کلیک به کلمهٔ بیت وصل کن.",
      stat: `${fa(jasoos.published)} از ${fa(jasoos.total)} پرونده منتشر شده`,
      warn:
        jasoos.broken > 0 ? `${fa(jasoos.broken)} پروندهٔ ناقص` : null,
    },
    {
      href: "/admin/games/grammar-circuit",
      title: "مدار دستور",
      desc: "پرسش‌ها به تفکیک پایه و درس. جمله را می‌نویسی و نقشِ هر واژه را با یک کلیک می‌دهی.",
      stat: `${fa(circuit.published)} از ${fa(circuit.total)} پرسش منتشر شده`,
      warn:
        circuit.total - circuit.published > 0
          ? `${fa(circuit.total - circuit.published)} پرسشِ منتشرنشده`
          : null,
    },
    {
      href: "/admin/games/aruz-rapid",
      title: "کوتاه یا بلند؟",
      desc: "مصراع‌های تقطیع: متنِ اعراب‌گذاری‌شده و هجاهایش. هر هجا با یک کلیک کوتاه یا بلند می‌شود.",
      /* ⚠️ «جدول نیست» با «خالی است» یکی نیست و نباید یک پیام بگیرند.

         خالی بودن عادی است — بازی با دادهٔ نمایشی کار می‌کند و مدیر هر وقت
         خواست مصراع اضافه می‌کند. ولی روی هاست جدول اصلاً ساخته نشده بود
         (migration ۰۰۸ اجرا نشده) و آن را هیچ کاری از داخلِ پنل درست
         نمی‌کند. اگر هر دو «هنوز خالی» می‌گرفتند، مدیر مصراع وارد می‌کرد و
         ذخیره‌اش خطا می‌داد، بی‌آنکه بفهمد چرا. */
      stat: rapid.missingTable
        ? "جدولِ این بازی روی دیتابیس نیست"
        : rapid.total === 0
          ? "هنوز خالی — بازی با دادهٔ نمایشی"
          : `${fa(rapid.published)} از ${fa(rapid.total)} مصراع منتشر شده`,
      warn: rapid.missingTable
        ? `فایل sarva-database-update.sql را در phpMyAdmin وارد کنید (جدولِ ${rapid.missingTable} ساخته نشده)`
        : rapid.total > 0 && rapid.published === 0
          ? "هیچ مصراعی منتشر نشده"
          : rapid.total - rapid.published > 0
            ? `${fa(rapid.total - rapid.published)} مصراعِ منتشرنشده`
            : null,
    },
    {
      href: "/admin/games/role-hunt",
      title: "شکار نقش‌ها",
      /* ⚠️ توضیح صریح می‌گوید بانکِ جدا ندارد. بدونِ این جمله، مدیر دنبالِ
         «افزودنِ مصراع» می‌گردد و پیدایش نمی‌کند. */
      desc: "بانکِ جدا ندارد؛ از مصراع‌های «مدار دستور» ساخته می‌شود. اینجا می‌بینی کدام مصراع به بازی می‌رسد و کدام نه — و چرا.",
      stat: roleHunt.missingTable
        ? "جدولِ پاسخ‌ها روی دیتابیس نیست"
        : `${fa(roleHunt.eligible)} از ${fa(roleHunt.poetry)} مصراع وارد بازی می‌شود`,
      warn: roleHunt.missingTable
        ? `مهاجرتِ ۰۱۷ اجرا نشده (جدولِ ${roleHunt.missingTable})`
        : roleHunt.eligible === 0
          ? "هیچ مصراعی واجدِ شرایط نیست"
          : rejectedCount > 0
            ? `${fa(rejectedCount)} مصراع وارد بازی نمی‌شود`
            : null,
    },
    {
      href: "/admin/vocab",
      title: "واژه‌یاب",
      desc: "واژگان تصویریِ درس‌های فارسی دهم تا دوازدهم.",
      stat: "مدیریت واژه‌ها",
      warn: null,
    },
  ];

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">بازی‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          محتوای هر بازی از همین‌جا اضافه و ویرایش می‌شود. تا وقتی چیزی وارد
          نکرده‌ای، بازی همان محتوای پیش‌فرضِ داخل سایت را نشان می‌دهد.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{c.title}</h2>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {c.stat}
              </span>
              {c.warn && (
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
                  {c.warn}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
