"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ReportDialog from "@/components/UI/club/ReportDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { ClubDate, NameAvatar, StatusBadge, fa } from "@/components/UI/club/ClubBits";
import { createClubComment, deleteClubComment } from "@/lib/club/actions";
import { MAX_COMMENT, type ClubComment } from "@/lib/club/types";

/** دیدگاه‌ها under one سروده.
 *
 *  Two rules from the brief show up literally here: a دیدگاه always carries the
 *  name on the account (there is no anonymous option, unlike the poem itself),
 *  and nothing is visible to other readers until a moderator says so. The
 *  writer sees their own pending comment with a «در انتظار بررسی» badge so the
 *  silence after pressing the button is explained rather than mysterious.
 *
 *  You can reply to a reply. The thread still indents only once — a third
 *  indent is unreadable on a 390px screen — so a deeper reply joins the same
 *  branch carrying a «در پاسخ به …» label instead, which is what YouTube and
 *  Instagram settled on for the same reason. The label's name is read from the
 *  addressed row, never from anything the replier typed. */

/**
 * یک دیدگاه.
 *
 * ⚠️ بیرون از `CommentThread` تعریف شده و نه داخلش. نسخهٔ قبلی این را داخل بدنهٔ
 * رندر می‌ساخت، یعنی هر رندرِ نخ یک *نوعِ* تازهٔ کامپوننت بود؛ React دو نوع
 * متفاوت را یکی نمی‌داند، پس با هر حرفی که کاربر در جعبهٔ دیدگاه تایپ می‌کرد
 * کلِ نخ unmount و دوباره mount می‌شد: انیمیشن ورود از نو پخش می‌شد و همهٔ
 * حباب‌ها می‌پریدند.
 */
function Bubble({
  c,
  isReply,
  addressee,
  viewerName,
  reduced,
  pending,
  onReply,
  onDelete,
  onReport,
}: {
  c: ClubComment;
  isReply: boolean;
  addressee: ClubComment | null;
  viewerName: string | null;
  reduced: boolean;
  pending: boolean;
  onReply: (c: ClubComment) => void;
  onDelete: (c: ClubComment) => void;
  onReport: (id: string) => void;
}) {
  const waiting = c.isMine && c.status !== "approved";

  return (
    /* Animated on mount, deliberately not `whileInView`: a scroll-triggered
       reveal leaves every comment below the fold sitting at opacity 0 until it
       is scrolled past, and comments are *always* below the fold. Text somebody
       wrote must not depend on an IntersectionObserver firing to exist. */
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3"
    >
      <span
        className={`h-fit rounded-full ring-2 transition-colors ${
          waiting ? "ring-gold/40" : "ring-primary/15"
        }`}
      >
        <NameAvatar name={c.authorName} size={isReply ? 30 : 38} />
      </span>

      {/* the card the whole complaint was about — a دیدگاه now sits on its
          own surface instead of dissolving into the page */}
      <div
        className={`min-w-0 flex-1 rounded-2xl border bg-card p-3.5 transition-colors sm:p-4 ${
          waiting ? "border-gold/40 bg-gold/[0.04]" : "border-border hover:border-primary/30"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{c.authorName}</span>
          <ClubDate iso={c.createdAt} />
          {waiting && <StatusBadge status={c.status} />}
        </div>

        {addressee && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            در پاسخ به {addressee.authorName}
          </span>
        )}

        {c.isMine && c.status === "rejected" && c.reviewNote && (
          <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
            پیام مدیر: {c.reviewNote}
          </p>
        )}

        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground/90">{c.body}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {viewerName && c.status === "approved" && (
            <button
              onClick={() => onReply(c)}
              className="min-h-8 rounded-lg px-2 font-semibold transition-colors hover:bg-primary/10 hover:text-primary"
            >
              پاسخ
            </button>
          )}
          {c.isMine ? (
            <button
              onClick={() => onDelete(c)}
              disabled={pending}
              className="min-h-8 rounded-lg px-2 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              حذف
            </button>
          ) : (
            viewerName && (
              <button
                onClick={() => onReport(c.id)}
                className="min-h-8 rounded-lg px-2 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                گزارش
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}

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
  const reduced = useReducedMotion() ?? false;
  const [replyTo, setReplyTo] = useState<ClubComment | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ClubComment | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(comments.map((c) => [c.id, c])), [comments]);
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);
  const approvedCount = comments.filter((c) => c.status === "approved").length;

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

  /** حذف دیدگاه. مثل حذف سروده، نتیجه خوانده می‌شود: قبلاً اکشن بی‌صدا شکست
   *  می‌خورد و `router.refresh()` همان دیدگاه را دوباره می‌آورد، بدون یک کلمه
   *  توضیح که چرا نرفت. */
  const remove = (c: ClubComment) => {
    setDeleting(null);
    setError(null);
    startTransition(async () => {
      const res = await deleteClubComment(c.id, postId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const startReply = (c: ClubComment) => {
    setReplyTo(c);
    setError(null);
    const box = document.getElementById("club-comment-box");
    box?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    // فوکوس هم می‌رود داخل جعبه: اسکرول به تنهایی برای کاربر صفحه‌کلید کافی
    // نیست — او هنوز روی دکمهٔ «پاسخ» ایستاده و نمی‌داند جایی باز شده.
    box?.querySelector("textarea")?.focus({ preventScroll: true });
  };

  return (
    <section dir="rtl" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold">
          دیدگاه‌ها
          {approvedCount > 0 && (
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              ({fa(approvedCount)})
            </span>
          )}
        </h2>
        <span className="text-xs text-muted-foreground">
          هر دیدگاه پس از تأیید مدیر نمایش داده می‌شود
        </span>
      </div>

      {viewerName ? (
        <div
          id="club-comment-box"
          className="rounded-2xl border border-border bg-card p-4 transition-colors focus-within:border-primary/50"
        >
          <AnimatePresence initial={false}>
            {replyTo && (
              <motion.div
                initial={reduced ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs">
                  <span className="truncate text-muted-foreground">
                    در پاسخ به <b className="text-primary">{replyTo.authorName}</b>
                  </span>
                  <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground">
                    انصراف
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <span className="hidden h-fit rounded-full ring-2 ring-primary/15 sm:block">
              <NameAvatar name={viewerName} size={38} />
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_COMMENT}
              rows={3}
              placeholder="دربارهٔ این سروده بنویس — نقد، پیشنهاد یا فقط تشویق."
              aria-label="متن دیدگاه"
              className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-7 outline-none transition-colors focus:border-primary/60"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              با نام <b className="text-foreground">{viewerName}</b> ثبت می‌شود.
              {/* شمارنده فقط وقتی ظاهر می‌شود که نزدیک سقف باشد — عددی که همیشه
                  هست، همیشه هم نادیده گرفته می‌شود. */}
              {body.length > MAX_COMMENT - 200 && (
                <span className="ms-2 text-gold">
                  {fa(MAX_COMMENT - body.length)} نویسه مانده
                </span>
              )}
            </p>
            <button
              onClick={send}
              disabled={pending || body.trim().length < 2}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
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
            className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            ورود
          </Link>
        </div>
      )}

      {/* وقتی جعبهٔ نوشتن نیست (کاربر مهمان است)، خطا جای دیگری برای نشستن
          ندارد — مثلاً خطای حذف که فقط برای صاحب دیدگاه پیش می‌آید. */}
      {error && !viewerName && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {roots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          هنوز دیدگاهی ثبت نشده. اولین نفر باش.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {roots.map((c) => {
            const replies = repliesOf(c.id);
            return (
              <li key={c.id} className="flex flex-col gap-3">
                <Bubble
                  c={c}
                  isReply={false}
                  addressee={c.replyToId ? (byId.get(c.replyToId) ?? null) : null}
                  viewerName={viewerName}
                  reduced={reduced}
                  pending={pending}
                  onReply={startReply}
                  onDelete={setDeleting}
                  onReport={setReporting}
                />
                {replies.length > 0 && (
                  <ul className="relative flex flex-col gap-3 ps-5 sm:ps-8">
                    {/* the branch line, drawn once for the whole set of replies */}
                    <span
                      aria-hidden
                      className="absolute inset-y-1 right-4 w-px bg-gradient-to-b from-primary/30 via-border to-transparent sm:right-6"
                    />
                    {replies.map((r) => (
                      <li key={r.id}>
                        <Bubble
                          c={r}
                          isReply
                          addressee={r.replyToId ? (byId.get(r.replyToId) ?? null) : null}
                          viewerName={viewerName}
                          reduced={reduced}
                          pending={pending}
                          onReply={startReply}
                          onDelete={setDeleting}
                          onReport={setReporting}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="حذف دیدگاه"
        body="این دیدگاه حذف می‌شود."
        consequence={
          deleting && repliesOf(deleting.id).length > 0
            ? `${fa(repliesOf(deleting.id).length)} پاسخی که زیرش نوشته شده هم حذف می‌شود.`
            : "این کار برگشت ندارد."
        }
        confirmLabel="حذف کن"
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />

      {reporting && (
        <ReportDialog targetType="comment" targetId={reporting} onClose={() => setReporting(null)} />
      )}
    </section>
  );
}
