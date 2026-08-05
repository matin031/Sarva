"use client";

import Link from "next/link";
import { useState } from "react";
import PoemBody from "@/components/UI/club/PoemBody";
import LikeButton from "@/components/UI/club/LikeButton";
import ReportDialog from "@/components/UI/club/ReportDialog";
import { Chip, ClubDate, NameAvatar, fa } from "@/components/UI/club/ClubBits";
import { formLabel, poemLines, tagLabel, type ClubPost } from "@/lib/club/types";

/** One سروده in the feed.
 *
 *  The poem comes first and everything else is quiet around it — a byline, the
 *  قالب, the وزن if it is known, and two counters. Long poems are clamped to
 *  eight lines with the rest behind «ادامهٔ سروده», so a قصیده cannot push ten
 *  other poets off the screen. */
export default function PoemCard({
  post,
  signedIn,
  onNeedsAuth,
}: {
  post: ClubPost;
  signedIn: boolean;
  onNeedsAuth?: (message: string) => void;
}) {
  const [reporting, setReporting] = useState(false);
  const lineCount = poemLines(post.body).length;

  return (
    <article
      dir="rtl"
      className={`relative flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors sm:p-6 ${
        post.featured ? "border-gold/50 shadow-[0_0_0_1px_var(--color-gold)_inset]" : "border-border"
      }`}
    >
      {post.featured && (
        <span className="absolute -top-2.5 right-5 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-[oklch(0.25_0.05_85)]">
          برگزیده
        </span>
      )}

      <header className="flex items-center gap-3">
        <NameAvatar name={post.authorName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {post.authorName}
            {post.isAnonymous && (
              <span className="me-2 text-[11px] font-normal text-muted-foreground">
                (بی‌نام)
              </span>
            )}
          </p>
          <ClubDate iso={post.publishedAt ?? post.createdAt} />
        </div>
        <Chip tone="primary">{formLabel(post.form)}</Chip>
      </header>

      {post.title && (
        <h3 className="text-center font-serif text-lg font-bold">{post.title}</h3>
      )}

      <Link href={`/sarvaclub/${post.id}`} className="block">
        <PoemBody body={post.body} clamp={8} />
      </Link>

      {lineCount > 8 && (
        <Link
          href={`/sarvaclub/${post.id}`}
          className="text-center text-xs font-semibold text-primary hover:underline"
        >
          ادامهٔ سروده
        </Link>
      )}

      {(post.meter || post.tags.length > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {post.meter && <Chip tone="gold">وزن: {post.meter}</Chip>}
          {post.tags.map((t) => (
            <Chip key={t}>{tagLabel(t)}</Chip>
          ))}
        </div>
      )}

      <footer className="flex items-center gap-2 border-t border-border pt-3">
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
            signedIn
              ? setReporting(true)
              : onNeedsAuth?.("برای گزارش باید وارد حساب کاربری‌ات شوی.")
          }
          className="ms-auto text-[11px] text-muted-foreground transition-colors hover:text-destructive"
        >
          گزارش
        </button>
      </footer>

      {reporting && (
        <ReportDialog
          targetType="post"
          targetId={post.id}
          onClose={() => setReporting(false)}
        />
      )}
    </article>
  );
}
