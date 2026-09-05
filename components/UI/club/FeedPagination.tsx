import Link from "next/link";
import { feedPath, type FeedQuery } from "@/lib/club/feed-url";

/**
 * پیمایشِ صفحه‌های فهرست — با لینکِ واقعی.
 *
 * ⚠️ سرور-کامپوننت است، عمداً. این لینک‌ها باید در *HTMLِ اولیه* باشند تا هم
 * خزنده ببیندشان و هم کسی که جاوااسکریپتش هنوز نیامده بتواند جلو برود.
 * دکمهٔ «سروده‌های بیشتر» سرِ جایش می‌ماند و تجربهٔ روان‌تر را می‌دهد؛ این
 * پایه‌ای است که آن دکمه رویش سوار می‌شود، نه رقیبش.
 *
 * `rel="prev"/"next"` را گوگل دیگر برای صفحه‌بندی استفاده نمی‌کند، ولی
 * نوشتنش ضرری ندارد و برای مرورگرها و بقیهٔ خزنده‌ها معنا دارد.
 *
 * ⚠️ جهتِ فلش‌ها *برعکسِ* دکمهٔ «بازگشت» است و این عمدی است.
 *
 * «بازگشت» یعنی عقب رفتن در ناوبری، که در RTL سمتِ راست است. ولی
 * صفحه‌بندی حرکت در خودِ فهرست است و از جهتِ خواندن پیروی می‌کند: در
 * فارسی جلو رفتن یعنی به چپ. پس «صفحهٔ بعد» به چپ و «صفحهٔ پیش» به راست
 * اشاره می‌کند.
 *
 * نسخهٔ اولِ همین فایل هر دو را برعکس داشت — همان اشتباهی که از آینه کردنِ
 * کورِ یک قاعده در می‌آید.
 */
export default function FeedPagination({
  query,
  hasMore,
}: {
  query: FeedQuery;
  hasMore: boolean;
}) {
  const hasPrev = query.page > 1;
  if (!hasPrev && !hasMore) return null;

  return (
    <nav
      aria-label="صفحه‌های فهرست"
      className="mt-10 flex items-center justify-between gap-4 border-t border-border/60 pt-6"
    >
      {hasPrev ? (
        <Link
          href={feedPath({ ...query, page: query.page - 1 })}
          rel="prev"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l6 6-6 6M21 12H3" />
          </svg>
          صفحهٔ پیش
        </Link>
      ) : (
        <span />
      )}

      <span className="text-sm text-muted-foreground">صفحهٔ {query.page}</span>

      {hasMore ? (
        <Link
          href={feedPath({ ...query, page: query.page + 1 })}
          rel="next"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          صفحهٔ بعد
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H3" />
          </svg>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
