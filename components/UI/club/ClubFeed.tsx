"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import PoemCard from "@/components/UI/club/PoemCard";
import PoemComposer from "@/components/UI/club/PoemComposer";
import { motion, useReducedMotion } from "motion/react";
import { loadMoreClubPosts } from "@/app/sarvaclub/actions";
import type { ClubFeedSort, ClubPost } from "@/lib/club/types";

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
  startPage = 0,
}: {
  initialPosts: ClubPost[];
  initialHasMore: boolean;
  /** null when nobody is signed in */
  viewerName: string | null;
  filters: { sort: ClubFeedSort; form?: string; tag?: string };
  /** صفحه‌ای که سرور همین حالا داده (صفرمبنا).
   *
   *  ⚠️ لازم شد چون فهرست دیگر همیشه از صفحهٔ صفر شروع نمی‌شود: آدرس
   *  `?page=3` را سرور رندر می‌کند و دکمهٔ «بیشتر» باید صفحهٔ *چهارم* را
   *  بخواهد، نه دوباره صفحهٔ یک را. */
  startPage?: number;
}) {
  const reduced = useReducedMotion();
  // ⚠️ فقط صفحه‌های *بعدی* در state می‌مانند. صفحهٔ اول همیشه همان چیزی است
  // که سرور همین حالا داده.
  //
  // نسخهٔ قبلی `useState(initialPosts)` می‌نوشت، و آن یک بار برای همیشه
  // مقداردهی می‌شود. نتیجه دو باگ بود:
  //
  //   • `router.refresh()` بعد از پسندیدن یا ثبت دیدگاه، داده‌های تازهٔ سرور را
  //     می‌آورد و کلاینت همان فهرست کهنه را نشان می‌داد.
  //   • بدتر: با کلیک روی «پرپسندترین» آدرس عوض می‌شد و سرور فهرست تازه
  //     می‌فرستاد، ولی چون کامپوننت در همان جای درخت باقی می‌ماند React
  //     state اش را نگه می‌داشت — یعنی فیلتر عملاً هیچ کاری نمی‌کرد.
  //
  // حالا `initialPosts` منبع حقیقتِ صفحهٔ اول است و state فقط چیزی را نگه
  // می‌دارد که کاربر خودش خواسته: صفحه‌های بارگذاری‌شدهٔ بعدی.
  const [extra, setExtra] = useState<ClubPost[]>([]);
  const [moreState, setMoreState] = useState<boolean | null>(null);
  const [page, setPage] = useState(startPage);
  const [composing, setComposing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasMore = moreState ?? initialHasMore;

  // اگر مدیر بین دو صفحه سروده‌ای را تأیید کند، همان ردیف می‌تواند هم در
  // صفحهٔ تازهٔ سرور باشد و هم در صفحه‌ای که قبلاً گرفته‌ایم. یک کلید تکراری
  // در React یعنی رندرِ خراب، پس اینجا یکتا می‌شود.
  const posts = useMemo(() => {
    const seen = new Set<string>();
    return [...initialPosts, ...extra].filter((p) => !seen.has(p.id) && seen.add(p.id));
  }, [initialPosts, extra]);

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
    setLoadError(null);
    startTransition(async () => {
      const next = page + 1;
      try {
        const res = await loadMoreClubPosts({ ...filters, page: next });
        setExtra((prev) => [...prev, ...res.posts]);
        setMoreState(res.hasMore);
        setPage(next);
      } catch {
        // شبکه قطع شده یا سرور جواب نداده. بدون این، دکمه فقط از حالت
        // «در حال بارگذاری…» درمی‌آمد و هیچ اتفاقی نمی‌افتاد — که از دید
        // کاربر یعنی دکمه خراب است.
        setLoadError("سروده‌های بیشتر بارگذاری نشد. دوباره تلاش کن.");
      }
    });
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
      active
        ? "border-primary bg-primary/12 font-semibold text-primary"
        : "border-border text-muted-foreground hover:border-primary/40"
    }`;

  return (
    // the hero's «سرودهٔ تازه بفرست» button jumps here — the book itself holds
    // no click targets, so the call to action lands on the real composer
    <div id="club-composer" dir="rtl" className="flex scroll-mt-24 flex-col gap-6">
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

      {/* Ordering only. A wall of قالب and موضوع chips outshouted the poems it
          was meant to organise; both still work as URL parameters for anyone
          who wants /sarvaclub?form=ghazal, and both still label each card. */}
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <Link key={s.id} href={href({ sort: s.id })} className={chip(filters.sort === s.id)}>
            {s.label}
          </Link>
        ))}
        {(filters.form || filters.tag) && (
          <Link href="/sarvaclub" className={chip(false)}>
            برداشتن فیلتر ✕
          </Link>
        )}
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
        // Staggered on mount rather than on scroll. The site's RevealGroup
        // waits for 40% of an element to be in view, and a poem card can be
        // most of a phone screen — a سروده must never be the thing that fails
        // to appear because an observer did not fire.
        <div className="flex flex-col gap-6">
          {posts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
                delay: Math.min(i, 6) * 0.06,
              }}
            >
              <PoemCard post={p} signedIn={!!viewerName} onNeedsAuth={setNotice} />
            </motion.div>
          ))}
        </div>
      )}

      {loadError && (
        <p
          role="alert"
          className="mx-auto rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={pending}
          className="mx-auto min-h-11 rounded-xl border border-border px-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          {pending ? "در حال بارگذاری…" : loadError ? "تلاش دوباره" : "سروده‌های بیشتر"}
        </button>
      )}
    </div>
  );
}
