import type { Metadata } from "next";
import ClubFeed from "@/components/UI/club/ClubFeed";
import ClubHero from "@/components/UI/club/ClubHero";
import { getClubFeed, getClubStats, getClubViewer } from "@/lib/club/queries";
import { POST_FORMS, POST_TAGS, type ClubFeedSort } from "@/lib/club/types";

export const metadata: Metadata = {
  title: "سروا کلاب",
  description:
    "جایی برای کسانی که طبع شعر دارند: سروده‌ات را بفرست — با نام خودت یا بی‌نام — و دربارهٔ سروده‌های دیگران بنویس. هر سروده و دیدگاه پیش از انتشار بررسی می‌شود.",
  alternates: { canonical: "/sarvaclub" },
  openGraph: {
    title: "سروا کلاب",
    description: "انجمن شعر سروا — سروده‌ات را با ما بخوان.",
    url: "/sarvaclub",
  },
};

// the feed depends on who is reading (own drafts, own likes) and changes the
// moment a moderator approves something
export const dynamic = "force-dynamic";

function firstString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawSort = firstString(sp.sort);
  const sort: ClubFeedSort =
    rawSort === "popular" || rawSort === "discussed" ? rawSort : "recent";
  const rawForm = firstString(sp.form);
  const form = POST_FORMS.some((f) => f.id === rawForm) ? rawForm : undefined;
  const rawTag = firstString(sp.tag);
  const tag = POST_TAGS.some((t) => t.id === rawTag) ? rawTag : undefined;

  const viewer = await getClubViewer();
  const [{ posts, hasMore }, stats] = await Promise.all([
    getClubFeed(viewer, { sort, form, tag }),
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
          key={`${sort}|${form ?? ""}|${tag ?? ""}`}
          initialPosts={posts}
          initialHasMore={hasMore}
          viewerName={viewer?.name ?? null}
          filters={{ sort, form, tag }}
        />
      </div>
    </div>
  );
}
