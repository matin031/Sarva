"use client";

import Link from "next/link";
import { useState } from "react";
import { useReducedMotion } from "motion/react";
import TiltCard from "@/components/UI/aruz/TiltCard";
import PoemBody from "@/components/UI/club/PoemBody";
import LikeButton from "@/components/UI/club/LikeButton";
import ReportDialog from "@/components/UI/club/ReportDialog";
import { Chip, ClubDate, NameAvatar, fa } from "@/components/UI/club/ClubBits";
import { formLabel, poemLines, tagLabel, type ClubPost } from "@/lib/club/types";

/** One سروده in the feed, presented as a leaf of paper on a lit surface.
 *
 *  The card tilts toward the pointer with a glare that tracks it — the same
 *  `TiltCard` the عروض page uses, so the club feels like part of the site
 *  rather than a bolted-on forum. A برگزیده poem gets a gold ring travelling
 *  around its edge; that ring is a spun conic gradient, one composited
 *  transform, not an animated border.
 *
 *  Long poems clamp to eight lines so a قصیده cannot push ten other poets off
 *  the screen. */
export default function PoemCard({
  post,
  signedIn,
  onNeedsAuth,
}: {
  post: ClubPost;
  signedIn: boolean;
  onNeedsAuth?: (message: string) => void;
}) {
  const reduced = useReducedMotion();
  const [reporting, setReporting] = useState(false);
  const lineCount = poemLines(post.body).length;

  return (
    <TiltCard max={5} glare={!post.featured} disabled={!!reduced} className="rounded-3xl">
      <article
        dir="rtl"
        className={`group relative flex flex-col gap-4 overflow-hidden rounded-3xl border bg-card/80 p-5 backdrop-blur-sm transition-shadow duration-300 sm:p-7 ${
          post.featured
            ? "border-gold/40 shadow-[0_8px_40px_-12px_color-mix(in_oklch,var(--color-gold)_45%,transparent)]"
            : "border-border hover:shadow-[0_10px_44px_-16px_color-mix(in_oklch,var(--color-primary)_55%,transparent)]"
        }`}
      >
        {post.featured && !reduced && <span aria-hidden className="club-halo" />}

        {/* paper grain, and a soft wash that warms on hover */}
        <span aria-hidden className="club-paper pointer-events-none absolute inset-0 opacity-[0.03]" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent)",
          }}
        />

        <header className="relative flex items-center gap-3">
          <span className="rounded-full ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/50">
            <NameAvatar name={post.authorName} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {post.authorName}
              {post.isAnonymous && (
                <span className="me-2 text-[11px] font-normal text-muted-foreground">(بی‌نام)</span>
              )}
            </p>
            <ClubDate iso={post.publishedAt ?? post.createdAt} />
          </div>
          {/* both badges in one shrink-proof group, so «برگزیده» and the قالب
              sit side by side instead of stacking on top of each other */}
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {post.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-[oklch(0.25_0.05_85)]">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-3">
                  <path d="m12 2 2.9 6.2 6.6.9-4.8 4.7 1.2 6.7L12 17.3 6.1 20.5l1.2-6.7L2.5 9.1l6.6-.9L12 2Z" />
                </svg>
                برگزیده
              </span>
            )}
            <Chip tone="primary">{formLabel(post.form)}</Chip>
          </div>
        </header>

        {post.title && (
          <h3 className="relative text-center font-serif text-lg font-bold">{post.title}</h3>
        )}

        {/* the poem sits on its own faint slab, so it reads as quoted paper */}
        <Link
          href={`/sarvaclub/${post.id}`}
          className="relative block rounded-2xl bg-gradient-to-b from-muted/40 to-transparent px-3 py-5"
        >
          {/* two hairlines standing in for the fold of a folio */}
          <span aria-hidden className="absolute inset-y-4 right-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          <span aria-hidden className="absolute inset-y-4 left-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          <PoemBody body={post.body} clamp={8} />
        </Link>

        {lineCount > 8 && (
          <Link
            href={`/sarvaclub/${post.id}`}
            className="relative text-center text-xs font-semibold text-primary hover:underline"
          >
            ادامهٔ سروده
          </Link>
        )}

        {(post.meter || post.tags.length > 0) && (
          <div className="relative flex flex-wrap items-center justify-center gap-2">
            {post.meter && <Chip tone="gold">وزن: {post.meter}</Chip>}
            {post.tags.map((t) => (
              <Chip key={t}>{tagLabel(t)}</Chip>
            ))}
          </div>
        )}

        <footer className="relative flex items-center gap-2 border-t border-border/70 pt-3">
          <LikeButton
            postId={post.id}
            initialLiked={post.likedByMe}
            initialCount={post.likeCount}
            onNeedsAuth={onNeedsAuth}
          />
          <Link
            href={`/sarvaclub/${post.id}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="size-4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
              />
            </svg>
            {fa(post.commentCount)} دیدگاه
          </Link>

          <button
            type="button"
            onClick={() =>
              signedIn ? setReporting(true) : onNeedsAuth?.("برای گزارش باید وارد حساب کاربری‌ات شوی.")
            }
            className="ms-auto text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
          >
            گزارش
          </button>
        </footer>

        {reporting && (
          <ReportDialog targetType="post" targetId={post.id} onClose={() => setReporting(false)} />
        )}
      </article>
    </TiltCard>
  );
}
