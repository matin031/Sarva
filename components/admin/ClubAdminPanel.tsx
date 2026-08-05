"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";
import PoemBody from "@/components/UI/club/PoemBody";
import {
  clubAdminDeleteComment,
  clubAdminDeletePost,
  clubAdminListComments,
  clubAdminListPosts,
  clubAdminListReports,
  clubAdminResolveReport,
  clubAdminSetCommentStatus,
  clubAdminSetPostFeatured,
  clubAdminSetPostStatus,
  type AdminClubComment,
  type AdminClubPost,
  type ClubAdminStats,
} from "@/lib/club/admin-actions";
import {
  formLabel,
  reasonLabel,
  STATUS_LABEL,
  tagLabel,
  type ClubReport,
  type ClubStatus,
} from "@/lib/club/types";

type Tab = "posts" | "comments" | "reports";
type Filter = ClubStatus | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "در انتظار بررسی" },
  { id: "approved", label: "منتشر شده" },
  { id: "rejected", label: "بازگردانده‌شده" },
  { id: "all", label: "همه" },
];

const fa = (n: number) => n.toLocaleString("fa-IR");
const faDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/** The moderation desk for سروا کلاب.
 *
 *  Nothing a student writes reaches the site without passing through this
 *  screen, so it is built around the one action that matters: read the سروده,
 *  then تأیید or بازگرداندن with a sentence explaining why. The rejection note
 *  is not optional politeness — it is what the poet reads in their panel, and
 *  the difference between "your poem vanished" and "fix this line and resend". */
export default function ClubAdminPanel({
  stats,
  initialPosts,
  initialComments,
  initialReports,
}: {
  stats: ClubAdminStats;
  initialPosts: AdminClubPost[];
  initialComments: AdminClubComment[];
  initialReports: ClubReport[];
}) {
  const toast = useAdminToast();
  const [tab, setTab] = useState<Tab>("posts");
  const [postFilter, setPostFilter] = useState<Filter>("pending");
  const [commentFilter, setCommentFilter] = useState<Filter>("pending");
  const [posts, setPosts] = useState(initialPosts);
  const [comments, setComments] = useState(initialComments);
  const [reports, setReports] = useState(initialReports);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const note = (id: string) => notes[id] ?? "";
  const setNote = (id: string, v: string) => setNotes((p) => ({ ...p, [id]: v }));

  const reloadPosts = async (filter: Filter) => {
    try {
      setPosts(await clubAdminListPosts(filter));
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا در بارگذاری سروده‌ها");
    }
  };
  const reloadComments = async (filter: Filter) => {
    try {
      setComments(await clubAdminListComments(filter));
    } catch (e) {
      toast(e instanceof Error ? e.message : "خطا در بارگذاری دیدگاه‌ها");
    }
  };

  const decidePost = (id: string, status: ClubStatus) =>
    startTransition(async () => {
      if (status === "rejected" && !note(id).trim()) {
        toast("برای بازگرداندن یک سروده، دلیلش را بنویس تا شاعر بداند چه کند.");
        return;
      }
      const res = await clubAdminSetPostStatus(id, status, note(id));
      if (!res.ok) return toast(res.error);
      toast(status === "approved" ? "سروده منتشر شد." : "سروده بازگردانده شد.", "success");
      setNote(id, "");
      await reloadPosts(postFilter);
    });

  const decideComment = (id: string, status: ClubStatus) =>
    startTransition(async () => {
      if (status === "rejected" && !note(id).trim()) {
        toast("دلیل رد دیدگاه را بنویس.");
        return;
      }
      const res = await clubAdminSetCommentStatus(id, status, note(id));
      if (!res.ok) return toast(res.error);
      toast(status === "approved" ? "دیدگاه منتشر شد." : "دیدگاه رد شد.", "success");
      setNote(id, "");
      await reloadComments(commentFilter);
    });

  const feature = (id: string, on: boolean) =>
    startTransition(async () => {
      const res = await clubAdminSetPostFeatured(id, on);
      if (!res.ok) return toast(res.error);
      toast(on ? "به برگزیده‌ها افزوده شد." : "از برگزیده‌ها برداشته شد.", "success");
      await reloadPosts(postFilter);
    });

  const removePost = (id: string) =>
    startTransition(async () => {
      const res = await clubAdminDeletePost(id);
      if (!res.ok) return toast(res.error);
      setConfirming(null);
      toast("سروده حذف شد.", "success");
      await reloadPosts(postFilter);
    });

  const removeComment = (id: string) =>
    startTransition(async () => {
      const res = await clubAdminDeleteComment(id);
      if (!res.ok) return toast(res.error);
      setConfirming(null);
      toast("دیدگاه حذف شد.", "success");
      await reloadComments(commentFilter);
    });

  const resolve = (id: string, status: "resolved" | "dismissed") =>
    startTransition(async () => {
      const res = await clubAdminResolveReport(id, status);
      if (!res.ok) return toast(res.error);
      toast("گزارش بسته شد.", "success");
      try {
        setReports(await clubAdminListReports("open"));
      } catch {
        setReports((prev) => prev.filter((r) => r.id !== id));
      }
    });

  const tabs: { id: Tab; label: string; badge: number }[] = [
    { id: "posts", label: "سروده‌ها", badge: stats.pendingPosts },
    { id: "comments", label: "دیدگاه‌ها", badge: stats.pendingComments },
    { id: "reports", label: "گزارش‌ها", badge: stats.openReports },
  ];

  const noteBox = (id: string, placeholder: string) => (
    <input
      value={note(id)}
      onChange={(e) => setNote(id, e.target.value)}
      placeholder={placeholder}
      className="min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/60"
    />
  );

  const filterRow = (active: Filter, onPick: (f: Filter) => void) => (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onPick(f.id)}
          className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
            active === f.id
              ? "bg-primary/15 font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">مدیریت سروا کلاب</h1>
        <p className="text-sm text-muted-foreground">
          سروده‌ها و دیدگاه‌های کاربران، پیش از آنکه روی سایت دیده شوند، از اینجا
          می‌گذرند.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "سرودهٔ بررسی‌نشده", value: stats.pendingPosts, tone: "text-gold" },
          { label: "دیدگاه بررسی‌نشده", value: stats.pendingComments, tone: "text-gold" },
          { label: "گزارش باز", value: stats.openReports, tone: "text-destructive" },
          { label: "سرودهٔ منتشرشده", value: stats.publishedPosts, tone: "text-primary" },
          { label: "شاعر", value: stats.poets, tone: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <span className={`block text-2xl font-bold ${s.tone}`}>{fa(s.value)}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
              tab === t.id
                ? "bg-primary/15 font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-[11px] font-bold text-[oklch(0.25_0.05_85)]">
                {fa(t.badge)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------- سروده‌ها */}
      {tab === "posts" && (
        <div className="flex flex-col gap-4">
          {filterRow(postFilter, (f) => {
            setPostFilter(f);
            startTransition(() => {
              reloadPosts(f);
            });
          })}

          {posts.length === 0 ? (
            <Empty text="سروده‌ای با این وضعیت نیست." />
          ) : (
            posts.map((p) => (
              <article
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <header className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span className="rounded-full border border-primary/30 px-2.5 py-0.5 text-primary">
                    {formLabel(p.form)}
                  </span>
                  {p.featured && (
                    <span className="rounded-full bg-gold px-2.5 py-0.5 font-bold text-[oklch(0.25_0.05_85)]">
                      برگزیده
                    </span>
                  )}
                  {p.openReports > 0 && (
                    <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 font-semibold text-destructive">
                      {fa(p.openReports)} گزارش باز
                    </span>
                  )}
                  <span className="ms-auto text-muted-foreground">{faDate(p.createdAt)}</span>
                </header>

                <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  نمایش با نام{" "}
                  <b className="text-foreground">{p.authorName}</b>
                  {p.isAnonymous && " (بی‌نام)"} — حساب:{" "}
                  <b className="text-foreground">{p.accountName}</b>
                  {p.accountEmail && ` · ${p.accountEmail}`}
                </div>

                {p.title && <h3 className="font-serif text-lg font-bold">{p.title}</h3>}
                <PoemBody body={p.body} />

                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {p.meter && <span>وزن: {p.meter}</span>}
                  {p.tags.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5">
                      {tagLabel(t)}
                    </span>
                  ))}
                  {p.status === "approved" && (
                    <span className="ms-auto">
                      {fa(p.likeCount)} پسند · {fa(p.commentCount)} دیدگاه
                    </span>
                  )}
                </div>

                {p.reviewNote && (
                  <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    یادداشت قبلی: {p.reviewNote}
                  </p>
                )}

                {noteBox(p.id, "پیام به شاعر — الزامی هنگام بازگرداندن")}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {p.status !== "approved" && (
                    <button
                      onClick={() => decidePost(p.id, "approved")}
                      disabled={pending}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      تأیید و انتشار
                    </button>
                  )}
                  {p.status !== "rejected" && (
                    <button
                      onClick={() => decidePost(p.id, "rejected")}
                      disabled={pending}
                      className="rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60"
                    >
                      بازگرداندن به شاعر
                    </button>
                  )}
                  {p.status === "approved" && (
                    <button
                      onClick={() => feature(p.id, !p.featured)}
                      disabled={pending}
                      className="rounded-xl border border-gold/50 px-4 py-2 text-sm text-gold disabled:opacity-60"
                    >
                      {p.featured ? "برداشتن از برگزیده‌ها" : "برگزیده کن"}
                    </button>
                  )}
                  {p.status === "approved" && (
                    <Link
                      href={`/sarvaclub/${p.id}`}
                      target="_blank"
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      دیدن در سایت
                    </Link>
                  )}
                  <button
                    onClick={() => setConfirming(p.id)}
                    className="ms-auto text-xs text-muted-foreground hover:text-destructive"
                  >
                    حذف کامل
                  </button>
                </div>

                {confirming === p.id && (
                  <ConfirmRow
                    text="سروده و همهٔ دیدگاه‌هایش برای همیشه حذف می‌شوند."
                    onYes={() => removePost(p.id)}
                    onNo={() => setConfirming(null)}
                  />
                )}
              </article>
            ))
          )}
        </div>
      )}

      {/* ------------------------------------------------------ دیدگاه‌ها */}
      {tab === "comments" && (
        <div className="flex flex-col gap-4">
          {filterRow(commentFilter, (f) => {
            setCommentFilter(f);
            startTransition(() => {
              reloadComments(f);
            });
          })}

          {comments.length === 0 ? (
            <Empty text="دیدگاهی با این وضعیت نیست." />
          ) : (
            comments.map((c) => (
              <article
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <header className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                    {STATUS_LABEL[c.status]}
                  </span>
                  <b>{c.authorName}</b>
                  {c.accountEmail && (
                    <span className="text-muted-foreground">{c.accountEmail}</span>
                  )}
                  {c.parentId && <span className="text-muted-foreground">(پاسخ)</span>}
                  {c.openReports > 0 && (
                    <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 font-semibold text-destructive">
                      {fa(c.openReports)} گزارش باز
                    </span>
                  )}
                  <span className="ms-auto text-muted-foreground">{faDate(c.createdAt)}</span>
                </header>

                <Link
                  href={`/sarvaclub/${c.postId}`}
                  target="_blank"
                  className="truncate text-xs text-muted-foreground hover:text-primary"
                >
                  زیر سرودهٔ: {c.postTitle || c.postExcerpt || "—"}
                </Link>

                <p className="whitespace-pre-line text-sm leading-7">{c.body}</p>

                {noteBox(c.id, "دلیل رد — الزامی هنگام رد کردن")}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {c.status !== "approved" && (
                    <button
                      onClick={() => decideComment(c.id, "approved")}
                      disabled={pending}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      تأیید و نمایش
                    </button>
                  )}
                  {c.status !== "rejected" && (
                    <button
                      onClick={() => decideComment(c.id, "rejected")}
                      disabled={pending}
                      className="rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-60"
                    >
                      رد کن
                    </button>
                  )}
                  <button
                    onClick={() => setConfirming(c.id)}
                    className="ms-auto text-xs text-muted-foreground hover:text-destructive"
                  >
                    حذف کامل
                  </button>
                </div>

                {confirming === c.id && (
                  <ConfirmRow
                    text="این دیدگاه برای همیشه حذف می‌شود."
                    onYes={() => removeComment(c.id)}
                    onNo={() => setConfirming(null)}
                  />
                )}
              </article>
            ))
          )}
        </div>
      )}

      {/* ------------------------------------------------------- گزارش‌ها */}
      {tab === "reports" && (
        <div className="flex flex-col gap-4">
          {reports.length === 0 ? (
            <Empty text="گزارش بازی وجود ندارد." />
          ) : (
            reports.map((r) => (
              <article
                key={r.id}
                className="flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-card p-4"
              >
                <header className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 font-semibold text-destructive">
                    {r.targetType === "post" ? "سروده" : "دیدگاه"}
                  </span>
                  <span>{reasonLabel(r.reason)}</span>
                  <span className="ms-auto text-muted-foreground">
                    گزارش‌دهنده: {r.reporterName} · {faDate(r.createdAt)}
                  </span>
                </header>

                {r.note && (
                  <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs">{r.note}</p>
                )}

                <p className="text-sm text-muted-foreground">
                  {r.targetExcerpt ?? "این محتوا دیگر وجود ندارد."}
                  {r.targetStatus && (
                    <span className="me-2 text-[11px]">
                      (وضعیت: {STATUS_LABEL[r.targetStatus]})
                    </span>
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {r.targetType === "post" && r.targetStatus && (
                    <Link
                      href={`/sarvaclub/${r.targetId}`}
                      target="_blank"
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      دیدن سروده
                    </Link>
                  )}
                  <button
                    onClick={() => resolve(r.id, "resolved")}
                    disabled={pending}
                    className="ms-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    رسیدگی شد
                  </button>
                  <button
                    onClick={() => resolve(r.id, "dismissed")}
                    disabled={pending}
                    className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-60"
                  >
                    گزارش بی‌مورد بود
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
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

function ConfirmRow({
  text,
  onYes,
  onNo,
}: {
  text: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
      <span>{text}</span>
      <div className="flex gap-2">
        <button
          onClick={onYes}
          className="rounded-lg bg-destructive px-3 py-1 font-semibold text-destructive-foreground"
        >
          حذف کن
        </button>
        <button onClick={onNo} className="rounded-lg border border-border px-3 py-1">
          انصراف
        </button>
      </div>
    </div>
  );
}
