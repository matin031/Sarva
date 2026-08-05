import type { Metadata } from "next";
import Link from "next/link";
import ClubFeed from "@/components/UI/club/ClubFeed";
import { getClubFeed, getClubViewer } from "@/lib/club/queries";
import { POST_FORMS, POST_TAGS, type ClubFeedSort } from "@/lib/club/types";

export const metadata: Metadata = {
  title: "سروا کلاب | انجمن شعر سروا",
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
  const { posts, hasMore } = await getClubFeed(viewer, { sort, form, tag });

  return (
    <div dir="rtl" className="container relative z-20 mx-auto mt-10 mb-32 max-w-3xl px-4">
      <header className="mb-8 rounded-3xl border border-border bg-card p-6 text-center sm:p-10">
        <span className="mb-3 inline-block rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
          سروا کلاب
        </span>
        <h1 className="text-2xl font-bold sm:text-3xl">
          طبع شعر داری؟ اینجا بخوانش.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted-foreground">
          خیلی‌ها می‌سرایند و به کسی نشان نمی‌دهند. سروا کلاب برای همان‌هاست:
          بیتی که گفته‌ای را بفرست — اگر خجالت می‌کشی، بی‌نام — بقیه زیرش
          می‌نویسند. هر سروده و هر دیدگاه پیش از نمایش به‌دست مدیران سایت بررسی
          می‌شود، تا اینجا جای امنی برای شعر گفتن بماند.
        </p>
        {viewer && (
          <Link
            href="/panel/club"
            className="mt-5 inline-block text-sm font-semibold text-primary hover:underline"
          >
            سروده‌ها و دیدگاه‌های من ←
          </Link>
        )}
      </header>

      <ClubFeed
        initialPosts={posts}
        initialHasMore={hasMore}
        viewerName={viewer?.name ?? null}
        filters={{ sort, form, tag }}
      />
    </div>
  );
}
