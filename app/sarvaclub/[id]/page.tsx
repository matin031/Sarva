import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PoemBody from "@/components/UI/club/PoemBody";
import PoemActions from "@/components/UI/club/PoemActions";
import CommentThread from "@/components/UI/club/CommentThread";
import { ClubDate, NameAvatar } from "@/components/UI/club/ClubBits";
import { getClubComments, getClubPost, getClubViewer } from "@/lib/club/queries";
import { formLabel, poemExcerpt, tagLabel } from "@/lib/club/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getClubPost(id, await getClubViewer());
  if (!post || post.status !== "approved") {
    return { title: "سروا کلاب", robots: { index: false, follow: false } };
  }
  const name = post.title ?? poemExcerpt(post.body, 1);
  return {
    title: `${name} — سرودهٔ ${post.authorName} | سروا کلاب`,
    description: poemExcerpt(post.body, 2),
    alternates: { canonical: `/sarvaclub/${post.id}` },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getClubViewer();
  const post = await getClubPost(id, viewer);
  // RLS hides an unapproved poem from everyone but its poet, so "not found"
  // and "not yours to see" collapse into the same 404 on purpose
  if (!post) notFound();

  const comments = post.status === "approved" || post.isMine
    ? await getClubComments(post.id, viewer)
    : [];

  return (
    <div dir="rtl" className="container relative z-20 mx-auto mt-10 mb-32 max-w-3xl px-4">
      <Link
        href="/sarvaclub"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
        </svg>
        بازگشت به سروا کلاب
      </Link>

      {post.isMine && post.status !== "approved" && (
        <div
          className={`mb-6 rounded-2xl border p-4 text-sm ${
            post.status === "pending"
              ? "border-gold/40 bg-gold/10"
              : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <p className="font-semibold">
            {post.status === "pending"
              ? "این سروده در انتظار بررسی مدیر است"
              : "این سروده منتشر نشد"}
          </p>
          <p className="mt-1 text-muted-foreground">
            {post.status === "pending"
              ? "تا وقتی تأیید نشود فقط خودت آن را می‌بینی."
              : (post.reviewNote ?? "می‌توانی ویرایشش کنی و دوباره بفرستی.")}
          </p>
        </div>
      )}

      <article className="rounded-3xl border border-border bg-card p-5 sm:p-8">
        <header className="mb-6 flex items-center gap-3">
          <NameAvatar name={post.authorName} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {post.authorName}
              {post.isAnonymous && (
                <span className="me-2 text-xs font-normal text-muted-foreground">
                  (بی‌نام)
                </span>
              )}
            </p>
            <ClubDate iso={post.publishedAt ?? post.createdAt} />
          </div>
          {post.featured && (
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-bold text-[oklch(0.25_0.05_85)]">
              برگزیده
            </span>
          )}
        </header>

        {post.title && (
          <h1 className="mb-5 text-center font-serif text-xl font-bold sm:text-2xl">
            {post.title}
          </h1>
        )}

        <PoemBody body={post.body} className="sm:text-lg" />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-primary">
            {formLabel(post.form)}
          </span>
          {post.meter && (
            <span className="rounded-full border border-gold/30 bg-gold/12 px-2.5 py-0.5 text-gold">
              وزن: {post.meter}
            </span>
          )}
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-muted-foreground"
            >
              {tagLabel(t)}
            </span>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <PoemActions post={post} signedIn={!!viewer} />
        </div>
      </article>

      <div className="mt-8">
        <CommentThread
          postId={post.id}
          comments={comments}
          viewerName={post.status === "approved" ? (viewer?.name ?? null) : null}
        />
      </div>
    </div>
  );
}
