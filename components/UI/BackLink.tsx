import Link from "next/link";

/**
 * کنترلِ «بازگشت» — یک الگو برای کلِ سایت.
 *
 * ⚠️ چرا ساخته شد: هر صفحه فلشِ خودش را داشت و همه‌شان به **چپ** اشاره
 * می‌کردند — GameShell، صفحهٔ سروده، صفحهٔ درس، و رشته‌های «← بازگشت» در
 * بازی‌های واژه. در یک رابطِ راست‌به‌چپ این یعنی «جلو»، نه «عقب».
 *
 * ── قاعده ────────────────────────────────────────────────────────────────
 * در فارسی خواندن از راست شروع می‌شود، پس «عقب» یعنی سمتِ راست. فلش به راست
 * اشاره می‌کند و خودِ کنترل در ابتدای ظرف — که در RTL همان لبهٔ راست است —
 * می‌نشیند.
 *
 * ⚠️ و چیزی که *آینه نمی‌شود*: این قاعده فقط برای «بازگشت در ناوبری» است.
 * جهتِ فیزیکیِ بازی، دکمهٔ «ادامه»، بازکردنِ منو و پیمایشِ صفحه‌بندی هر کدام
 * معنای خودشان را دارند و با یک قاعدهٔ کور آینه نمی‌شوند. صفحه‌بندی نمونهٔ
 * خوبی است: در RTL «صفحهٔ بعد» به چپ می‌رود، نه راست.
 *
 * ── ترتیبِ خواندن ────────────────────────────────────────────────────────
 * آیکون اول در DOM می‌آید و بعد متن. در جریانِ RTL همین باعث می‌شود آیکون
 * سمتِ راستِ متن دیده شود، بدونِ هیچ `flex-row-reverse` ای. ترتیبِ DOM،
 * ترتیبِ دیداری و ترتیبِ فوکوس هر سه یکی می‌مانند.
 */
export default function BackLink({
  href,
  children,
  className = "",
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const shared =
    "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground " +
    "transition-colors hover:text-primary " +
    className;

  const inner = (
    <>
      <BackArrow />
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={shared} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={shared}>
      {inner}
    </button>
  );
}

/**
 * فلشِ بازگشت، رو به **راست**.
 *
 * ⚠️ عمداً یک SVG جدا و نه کاراکترِ «←» داخلِ رشته. رشته‌ها در بازی‌های واژه
 * دقیقاً همین‌طور نوشته شده بودند («← بازگشت») و سه ایراد داشتند: جهتشان
 * غلط بود، با فونت عوض می‌شدند، و صفحه‌خوان آن‌ها را به‌عنوان متن می‌خواند.
 */
export function BackArrow({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden
    >
      {/* سرِ فلش در x=21 (راست)، بدنه تا x=3 — یعنی رو به راست. */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l6 6-6 6M21 12H3" />
    </svg>
  );
}
