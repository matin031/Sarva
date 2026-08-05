"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PoemBody from "@/components/UI/club/PoemBody";
import PoemComposer from "@/components/UI/club/PoemComposer";
import { Chip, ClubDate, StatusBadge, fa } from "@/components/UI/club/ClubBits";
import { deleteClubComment, deleteClubPost } from "@/lib/club/actions";
import type { MyComment } from "@/lib/club/queries";
import { formLabel, tagLabel, type ClubPost } from "@/lib/club/types";

type Tab = "posts" | "comments" | "liked";

/** «سروا کلاب» inside the user panel.
 *
 *  The reason this section exists is the moderation queue: once a سروده needs a
 *  human's approval, the poet needs somewhere that answers "well, where is it
 *  then?". So the first thing each row shows is its state — در انتظار بررسی,
 *  منتشر شده, or بازگردانده‌شده with the moderator's note underneath and an
 *  edit button next to it. */
export default function ClubPanel({
  viewerName,
  posts,
  comments,
  liked,
}: {
  viewerName: string;
  posts: ClubPost[];
  comments: MyComment[];
  liked: ClubPost[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("posts");
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ClubPost | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const stats = {
    pending: posts.filter((p) => p.status === "pending").length,
    approved: posts.filter((p) => p.status === "approved").length,
    rejected: posts.filter((p) => p.status === "rejected").length,
    likes: posts.reduce((s, p) => s + p.likeCount, 0),
  };

  const removePost = (id: string) =>
    startTransition(async () => {
      await deleteClubPost(id);
      setConfirming(null);
      router.refresh();
    });

  const removeComment = (id: string, postId: string) =>
    startTransition(async () => {
      await deleteClubComment(id, postId);
      router.refresh();
    });

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "posts", label: "سروده‌های من", count: posts.length },
    { id: "comments", label: "دیدگاه‌های من", count: comments.length },
    { id: "liked", label: "پسندیده‌ها", count: liked.length },
  ];

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">سروا کلاب</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سروده‌هایت، وضعیت بررسی‌شان و گفت‌وگوهایی که راه انداخته‌ای.
          </p>
        </div>
        <Link
          href="/sarvaclub"
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          رفتن به کلاب
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "منتشر شده", value: stats.approved, tone: "text-primary" },
          { label: "در انتظار بررسی", value: stats.pending, tone: "text-gold" },
          { label: "بازگردانده‌شده", value: stats.rejected, tone: "text-destructive" },
          { label: "پسند دریافتی", value: stats.likes, tone: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <span className={`block text-2xl font-bold ${s.tone}`}>{fa(s.value)}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {composing ? (
        <PoemComposer
          authorName={viewerName}
          onDone={() => {
            setComposing(false);
            router.refresh();
          }}
          onCancel={() => setComposing(false)}
        />
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          + سرودهٔ تازه
        </button>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
              tab === t.id
                ? "bg-primary/12 font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({fa(t.count)})
          </button>
        ))}
      </div>

      {/* --------------------------------------------------- سروده‌های من */}
      {tab === "posts" &&
        (posts.length === 0 ? (
          <Empty text="هنوز سروده‌ای نفرستاده‌ای." />
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((p) =>
              editing?.id === p.id ? (
                <li key={p.id}>
                  <PoemComposer
                    authorName={viewerName}
                    editing={p}
                    onDone={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditing(null)}
                  />
                </li>
              ) : (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={p.status} />
                    <Chip tone="primary">{formLabel(p.form)}</Chip>
                    {p.featured && <Chip tone="gold">برگزیده</Chip>}
                    <span className="ms-auto">
                      <ClubDate iso={p.createdAt} />
                    </span>
                  </div>

                  {p.title && <h3 className="font-serif font-bold">{p.title}</h3>}
                  <PoemBody body={p.body} clamp={4} />

                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <Chip key={t}>{tagLabel(t)}</Chip>
                      ))}
                    </div>
                  )}

                  {p.status === "rejected" && (
                    <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      پیام مدیر: {p.reviewNote || "دلیلی ثبت نشده است."}
                    </p>
                  )}
                  {p.status === "pending" && (
                    <p className="rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold">
                      در نوبت بررسی است؛ به‌محض تأیید در کلاب دیده می‌شود.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                    {p.status === "approved" && (
                      <>
                        <span>{fa(p.likeCount)} پسند</span>
                        <span>{fa(p.commentCount)} دیدگاه</span>
                        <Link
                          href={`/sarvaclub/${p.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          دیدن در کلاب
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => setEditing(p)}
                      className="ms-auto transition-colors hover:text-primary"
                    >
                      ویرایش
                    </button>
                    <button
                      onClick={() => setConfirming(p.id)}
                      className="transition-colors hover:text-destructive"
                    >
                      حذف
                    </button>
                  </div>

                  {confirming === p.id && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                      <span>حذف این سروده برگشت‌ناپذیر است.</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => removePost(p.id)}
                          className="rounded-lg bg-destructive px-3 py-1 font-semibold text-destructive-foreground"
                        >
                          حذف کن
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="rounded-lg border border-border px-3 py-1"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        ))}

      {/* -------------------------------------------------- دیدگاه‌های من */}
      {tab === "comments" &&
        (comments.length === 0 ? (
          <Empty text="هنوز دیدگاهی ننوشته‌ای." />
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="ms-auto">
                    <ClubDate iso={c.createdAt} />
                  </span>
                </div>
                <Link
                  href={`/sarvaclub/${c.postId}`}
                  className="truncate text-xs text-muted-foreground hover:text-primary"
                >
                  زیر سرودهٔ: {c.postTitle || c.postExcerpt || "—"}
                </Link>
                <p className="whitespace-pre-line text-sm leading-7">{c.body}</p>
                {c.status === "rejected" && c.reviewNote && (
                  <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    پیام مدیر: {c.reviewNote}
                  </p>
                )}
                <button
                  onClick={() => removeComment(c.id, c.postId)}
                  className="self-start text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                >
                  حذف دیدگاه
                </button>
              </li>
            ))}
          </ul>
        ))}

      {/* ------------------------------------------------------ پسندیده‌ها */}
      {tab === "liked" &&
        (liked.length === 0 ? (
          <Empty text="هنوز سروده‌ای را نپسندیده‌ای." />
        ) : (
          <ul className="flex flex-col gap-4">
            {liked.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{p.authorName}</span>
                  <Chip tone="primary">{formLabel(p.form)}</Chip>
                </div>
                <PoemBody body={p.body} clamp={4} />
                <Link
                  href={`/sarvaclub/${p.id}`}
                  className="mt-3 block text-center text-xs font-semibold text-primary hover:underline"
                >
                  دیدن سروده
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
