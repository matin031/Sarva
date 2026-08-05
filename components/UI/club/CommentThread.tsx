"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReportDialog from "@/components/UI/club/ReportDialog";
import { ClubDate, NameAvatar, StatusBadge } from "@/components/UI/club/ClubBits";
import { createClubComment, deleteClubComment } from "@/lib/club/actions";
import { MAX_COMMENT, type ClubComment } from "@/lib/club/types";

/** دیدگاه‌ها under one سروده.
 *
 *  Two rules from the brief show up literally here: a دیدگاه always carries the
 *  name on the account (there is no anonymous option, unlike the poem itself),
 *  and nothing is visible to other readers until a moderator says so. The
 *  writer sees their own pending comment with a «در انتظار بررسی» badge so the
 *  silence after pressing the button is explained rather than mysterious. */
export default function CommentThread({
  postId,
  comments,
  viewerName,
}: {
  postId: string;
  comments: ClubComment[];
  viewerName: string | null;
}) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<ClubComment | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const send = () => {
    setError(null);
    startTransition(async () => {
      const res = await createClubComment(postId, body, replyTo?.id ?? null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setReplyTo(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteClubComment(id, postId);
      router.refresh();
    });
  };

  const row = (c: ClubComment, isReply = false) => (
    <div className="flex gap-3">
      <NameAvatar name={c.authorName} size={isReply ? 30 : 36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{c.authorName}</span>
          <ClubDate iso={c.createdAt} />
          {c.isMine && c.status !== "approved" && <StatusBadge status={c.status} />}
        </div>

        {c.isMine && c.status === "rejected" && c.reviewNote && (
          <p className="mt-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
            پیام مدیر: {c.reviewNote}
          </p>
        )}

        <p className="mt-1 whitespace-pre-line text-sm leading-7 text-foreground/90">
          {c.body}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {viewerName && c.status === "approved" && !isReply && (
            <button
              onClick={() => {
                setReplyTo(c);
                setError(null);
              }}
              className="transition-colors hover:text-primary"
            >
              پاسخ
            </button>
          )}
          {c.isMine ? (
            <button
              onClick={() => remove(c.id)}
              disabled={pending}
              className="transition-colors hover:text-destructive"
            >
              حذف
            </button>
          ) : (
            viewerName && (
              <button
                onClick={() => setReporting(c.id)}
                className="transition-colors hover:text-destructive"
              >
                گزارش
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section dir="rtl" className="flex flex-col gap-5">
      <h2 className="text-base font-bold">
        دیدگاه‌ها
        <span className="ms-2 text-xs font-normal text-muted-foreground">
          هر دیدگاه پس از تأیید مدیر نمایش داده می‌شود
        </span>
      </h2>

      {viewerName ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
              <span className="truncate text-muted-foreground">
                در پاسخ به <b className="text-foreground">{replyTo.authorName}</b>
              </span>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground">
                انصراف
              </button>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_COMMENT}
            rows={3}
            placeholder="دربارهٔ این سروده بنویس — نقد، پیشنهاد یا فقط تشویق."
            className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-7 outline-none focus:border-primary/60"
          />
          {error && (
            <p className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              با نام <b className="text-foreground">{viewerName}</b> ثبت می‌شود.
            </p>
            <button
              onClick={send}
              disabled={pending || body.trim().length < 2}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
            >
              {pending ? "در حال ارسال…" : "ثبت دیدگاه"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            برای نوشتن دیدگاه وارد حسابت شو — دیدگاه با نام حسابت ثبت می‌شود.
          </p>
          <Link
            href="/auth"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            ورود
          </Link>
        </div>
      )}

      {roots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          هنوز دیدگاهی ثبت نشده. اولین نفر باش.
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {roots.map((c) => {
            const replies = repliesOf(c.id);
            return (
              <li key={c.id} className="flex flex-col gap-4">
                {row(c)}
                {replies.length > 0 && (
                  <ul className="flex flex-col gap-4">
                    {replies.map((r) => (
                      <li
                        key={r.id}
                        className="ms-6 border-s border-border ps-4 sm:ms-10"
                      >
                        {row(r, true)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {reporting && (
        <ReportDialog
          targetType="comment"
          targetId={reporting}
          onClose={() => setReporting(null)}
        />
      )}
    </section>
  );
}
