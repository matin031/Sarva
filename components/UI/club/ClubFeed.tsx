"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import PoemCard from "@/components/UI/club/PoemCard";
import PoemComposer from "@/components/UI/club/PoemComposer";
import { loadMoreClubPosts } from "@/app/sarvaclub/actions";
import {
  POST_FORMS,
  POST_TAGS,
  type ClubFeedSort,
  type ClubPost,
} from "@/lib/club/types";

const SORTS: { id: ClubFeedSort; label: string }[] = [
  { id: "recent", label: "تازه‌ترین" },
  { id: "popular", label: "پرپسندترین" },
  { id: "discussed", label: "پرگفت‌وگوترین" },
];

/** The feed of سروا کلاب: filters, the composer, and the poems.
 *
 *  Filtering is done with links rather than local state so a filtered feed has
 *  its own URL — «غزل‌های عاشقانه» is a page a student can send to a friend.
 *  Only paging is client-side, because appending is the one thing a fresh
 *  server render would get wrong (it would scroll you back to the top). */
export default function ClubFeed({
  initialPosts,
  initialHasMore,
  viewerName,
  filters,
}: {
  initialPosts: ClubPost[];
  initialHasMore: boolean;
  /** null when nobody is signed in */
  viewerName: string | null;
  filters: { sort: ClubFeedSort; form?: string; tag?: string };
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const href = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.sort && next.sort !== "recent") params.set("sort", next.sort);
    if (next.form) params.set("form", next.form);
    if (next.tag) params.set("tag", next.tag);
    const q = params.toString();
    return q ? `/sarvaclub?${q}` : "/sarvaclub";
  };

  const loadMore = () => {
    startTransition(async () => {
      const next = page + 1;
      const res = await loadMoreClubPosts({ ...filters, page: next });
      setPosts((prev) => [...prev, ...res.posts]);
      setHasMore(res.hasMore);
      setPage(next);
    });
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
      active
        ? "border-primary bg-primary/12 font-semibold text-primary"
        : "border-border text-muted-foreground hover:border-primary/40"
    }`;

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      {/* composer */}
      {viewerName ? (
        composing ? (
          <PoemComposer
            authorName={viewerName}
            onDone={() => setComposing(false)}
            onCancel={() => setComposing(false)}
          />
        ) : (
          <button
            onClick={() => setComposing(true)}
            className="group flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-right transition-colors hover:bg-primary/10"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-bold">سرودهٔ تازه‌ای داری؟</span>
              <span className="block text-xs text-muted-foreground">
                بنویس؛ اگر خواستی بی‌نام منتشرش کن.
              </span>
            </span>
          </button>
        )
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            برای فرستادن سروده و نوشتن دیدگاه، وارد حسابت شو.
          </p>
          <Link
            href="/auth"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      {/* filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <Link key={s.id} href={href({ sort: s.id })} className={chip(filters.sort === s.id)}>
              {s.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={href({ form: undefined })} className={chip(!filters.form)}>
            همهٔ قالب‌ها
          </Link>
          {POST_FORMS.map((f) => (
            <Link key={f.id} href={href({ form: f.id })} className={chip(filters.form === f.id)}>
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={href({ tag: undefined })} className={chip(!filters.tag)}>
            همهٔ موضوع‌ها
          </Link>
          {POST_TAGS.map((t) => (
            <Link key={t.id} href={href({ tag: t.id })} className={chip(filters.tag === t.id)}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm">
          <span>{notice}</span>
          <Link href="/auth" className="shrink-0 font-semibold text-primary">
            ورود
          </Link>
        </div>
      )}

      {/* poems */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="font-semibold">هنوز سروده‌ای اینجا نیست</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filters.form || filters.tag
              ? "با این فیلترها چیزی پیدا نشد. فیلترها را بردار."
              : "اولین نفر باش."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {posts.map((p) => (
            <PoemCard key={p.id} post={p} signedIn={!!viewerName} onNeedsAuth={setNotice} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={pending}
          className="mx-auto rounded-xl border border-border px-6 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          {pending ? "در حال بارگذاری…" : "سروده‌های بیشتر"}
        </button>
      )}
    </div>
  );
}
