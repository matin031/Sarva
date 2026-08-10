"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import LikeButton from "@/components/UI/club/LikeButton";
import ReportDialog from "@/components/UI/club/ReportDialog";
import PoemComposer from "@/components/UI/club/PoemComposer";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { fa } from "@/components/UI/club/ClubBits";
import { deleteClubPost } from "@/lib/club/actions";
import type { ClubPost } from "@/lib/club/types";

/** The row under a سروده on its own page: پسند, a comment count, and — for the
 *  poet — edit and delete. Editing opens the same composer the feed uses, and
 *  the poem goes back into the queue when it is saved (`updateClubPost` sets
 *  status back to 'pending'), which the button label says out loud so nobody is
 *  surprised. */
export default function PoemActions({
  post,
  signedIn,
}: {
  post: ClubPost;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** حذف. نتیجه واقعاً خوانده می‌شود.
   *
   *  نسخهٔ قبلی `await deleteClubPost(...)` را می‌نوشت و بی‌قید و شرط به فید
   *  می‌رفت. اگر اکشن شکست می‌خورد — سشن منقضی، شعری که مدیر همین حالا حذفش
   *  کرده — کاربر به فید پرتاب می‌شد و باور می‌کرد سروده‌اش رفته، در حالی که
   *  سر جایش بود. */
  const remove = () => {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const res = await deleteClubPost(post.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/sarvaclub");
      router.refresh();
    });
  };

  if (editing) {
    return (
      <PoemComposer
        authorName={post.authorName}
        editing={post}
        onDone={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByMe}
          initialCount={post.likeCount}
          onNeedsAuth={setNotice}
        />
        <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
          {fa(post.commentCount)} دیدگاه
        </span>

        {post.isMine ? (
          <div className="ms-auto flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="min-h-9 rounded-lg px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              ویرایش
            </button>
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="min-h-9 rounded-lg px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              {pending ? "در حال حذف…" : "حذف"}
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              signedIn
                ? setReporting(true)
                : setNotice("برای گزارش باید وارد حساب کاربری‌ات شوی.")
            }
            className="ms-auto min-h-9 rounded-lg px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            گزارش
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm">
          <span>{notice}</span>
          <Link href="/auth" className="shrink-0 font-semibold text-primary">
            ورود
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="حذف سروده"
        body={post.title ? `«${post.title}» حذف می‌شود.` : "این سروده حذف می‌شود."}
        consequence={
          post.commentCount > 0
            ? `${fa(post.commentCount)} دیدگاهی که زیرش نوشته شده هم حذف می‌شود. این کار برگشت ندارد.`
            : "این کار برگشت ندارد."
        }
        confirmLabel="حذف کن"
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />

      {reporting && (
        <ReportDialog
          targetType="post"
          targetId={post.id}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
