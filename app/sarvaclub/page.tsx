import type { Metadata } from "next";
import ClubFeed from "@/components/UI/club/ClubFeed";
import FeedPagination from "@/components/UI/club/FeedPagination";
import { absoluteUrl } from "@/lib/seo/site";
import {
  feedCanonicalPath,
  feedIsIndexable,
  parseFeedPage,
  type FeedQuery,
} from "@/lib/club/feed-url";
import ClubHero from "@/components/UI/club/ClubHero";
import { getClubFeed, getClubStats, getClubViewer } from "@/lib/club/queries";
import { POST_FORMS, POST_TAGS, type ClubFeedSort } from "@/lib/club/types";

/**
 * ⚠️ متادیتا دیگر ثابت نیست: canonical و تصمیمِ ایندکس به پارامترهای آدرس
 * بستگی دارند. سیاستِ کامل در lib/club/feed-url.ts نوشته شده.
 *
 * مهم‌ترین نکته‌اش: صفحهٔ دوم canonicalِ *خودش* را می‌گیرد و به صفحهٔ یک
 * فرستاده نمی‌شود. محتوایش فرق دارد؛ فرستادنش به صفحهٔ یک یعنی گفتن «این
 * سروده‌ها تکراری‌اند» و نتیجه‌اش این است که هیچ‌وقت ایندکس نشوند.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const q = readQuery(await searchParams);
  const canonical = absoluteUrl(feedCanonicalPath(q));
  const indexable = feedIsIndexable(q);

  const title = q.page > 1 ? `سروا کلاب — صفحهٔ ${q.page}` : "سروا کلاب";

  return {
    title,
    description:
      "جایی برای کسانی که طبع شعر دارند: سروده‌ات را بفرست — با نام خودت یا بی‌نام — و دربارهٔ سروده‌های دیگران بنویس. هر سروده و دیدگاه پیش از انتشار بررسی می‌شود.",
    alternates: { canonical },
    // ⚠️ `follow` حتی وقتی ایندکس نمی‌شود: خزنده باید از فهرستِ فیلترشده رد
    // شود و به خودِ سروده‌ها برسد.
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description: "انجمن شعر سروا — سروده‌ات را با ما بخوان.",
      url: canonical,
    },
  };
}

// the feed depends on who is reading (own drafts, own likes) and changes the
// moment a moderator approves something
export const dynamic = "force-dynamic";

function firstString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * پارامترهای آدرس → حالتِ فهرست.
 *
 * ⚠️ هم `generateMetadata` و هم خودِ صفحه از همین تابع می‌خوانند. اگر هرکدام
 * جدا پالایش می‌کرد، یک آدرسِ نامعتبر می‌توانست canonical و محتوا را به دو
 * چیزِ متفاوت برساند.
 *
 * هر مقدارِ ناشناخته به پیش‌فرض برمی‌گردد و دور انداخته می‌شود — پس
 * `?sort=chert` صفحه‌ای تازه نمی‌سازد، همان فهرستِ عادی را می‌دهد و
 * canonicalش هم به همان می‌رسد.
 */
function readQuery(sp: Record<string, string | string[] | undefined>): FeedQuery {
  const rawSort = firstString(sp.sort);
  const rawForm = firstString(sp.form);
  const rawTag = firstString(sp.tag);
  return {
    page: parseFeedPage(firstString(sp.page)),
    sort: rawSort === "popular" || rawSort === "discussed" ? rawSort : "recent",
    form: POST_FORMS.some((f) => f.id === rawForm) ? rawForm : undefined,
    tag: POST_TAGS.some((t) => t.id === rawTag) ? rawTag : undefined,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = readQuery(await searchParams);
  const { sort, form, tag } = q;

  const viewer = await getClubViewer();
  const [{ posts, hasMore }, stats] = await Promise.all([
    // ⚠️ `page` در آدرس یک‌مبناست و در کوئری صفرمبنا.
    getClubFeed(viewer, { sort, form, tag, page: q.page - 1 }),
    getClubStats(),
  ]);

  return (
    <div dir="rtl" className="relative z-20 mt-6 mb-32">
      {/* The hero gets a wider stage than the feed on purpose: the verse leaves
          float in the margins beside the copy, and inside a max-w-3xl column
          there are no margins for them to float in. */}
      <div className="container mx-auto max-w-6xl px-4">
        <ClubHero signedIn={!!viewer} stats={stats} />
      </div>

      <div className="container mx-auto max-w-3xl px-4">
        {/* کلید عمداً از خودِ فیلترها ساخته می‌شود: با عوض شدن مرتب‌سازی یا
            قالب، React باید کامپوننت را از نو بسازد، وگرنه صفحه‌های بارگذاری‌شدهٔ
            فیلترِ قبلی (که در state آن مانده‌اند) زیر فهرست تازه می‌چسبند. */}
        <ClubFeed
          key={`${sort}|${form ?? ""}|${tag ?? ""}|${q.page}`}
          initialPosts={posts}
          initialHasMore={hasMore}
          viewerName={viewer?.name ?? null}
          filters={{ sort, form, tag }}
          startPage={q.page - 1}
        />

        {/* ⚠️ لینکِ واقعی، در HTMLِ اولیه. دکمهٔ «سروده‌های بیشتر» بالای این
            می‌نشیند و تجربه را روان‌تر می‌کند، ولی پایه این است: بدونش صفحهٔ
            دوم نه خزیده می‌شد، نه قابلِ بوکمارک بود. */}
        <FeedPagination query={q} hasMore={hasMore} />
      </div>
    </div>
  );
}
