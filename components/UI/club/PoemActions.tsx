"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LikeButton from "@/components/UI/club/LikeButton";
import ReportDialog from "@/components/UI/club/ReportDialog";
import PoemComposer from "@/components/UI/club/PoemComposer";
import { fa } from "@/components/UI/club/ClubBits";
import { deleteClubPost } from "@/lib/club/actions";
import type { ClubPost } from "@/lib/club/types";

/** The row under a سروده on its own page: پسند, a comment count, and — for the
 *  poet — edit and delete. Editing opens the same composer the feed uses, and
 *  the poem goes back into the queue when it is saved (the RLS policy insists),
 *  which the button label says out loud so nobody is surprised. */
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
          <div className="ms-auto flex items-center gap-3 text-[11px]">
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              ویرایش
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              حذف
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              signedIn
                ? setReporting(true)
                : setNotice("برای گزارش باید وارد حساب کاربری‌ات شوی.")
            }
            className="ms-auto text-[11px] text-muted-foreground transition-colors hover:text-destructive"
          >
            گزارش
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm">
          <span>{notice}</span>
          <Link href="/auth" className="shrink-0 font-semibold text-primary">
            ورود
          </Link>
        </div>
      )}

      {confirming && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <span>این سروده و همهٔ دیدگاه‌هایش برای همیشه حذف می‌شوند.</span>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await deleteClubPost(post.id);
                router.push("/sarvaclub");
              }}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
            >
              حذف کن
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

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
