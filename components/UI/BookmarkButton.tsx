"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { setBookmark } from "@/lib/panel/bookmarks-client";
import {
  bookmarkState,
  preloadBookmarks,
  setBookmarkOptimistic,
  settleBookmark,
  subscribeBookmarks,
} from "@/lib/panel/bookmark-store";
import type { BookmarkArea } from "@/lib/panel/types";

/** Flag a question for later, from anywhere in the site.
 *
 *  Renders nothing for signed-out visitors — there is nowhere to keep the flag
 *  for them, and an inert button that silently fails is worse than no button. */
export default function BookmarkButton({
  area,
  refId,
  title,
  subtitle,
  payload,
  className = "",
  compact = false,
}: {
  area: BookmarkArea;
  refId: string;
  title: string;
  subtitle?: string;
  payload?: Record<string, unknown>;
  className?: string;
  compact?: boolean;
}) {
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /* ⚠️ وضعیت از حافظهٔ مشترک می‌آید، نه از fetchِ خودِ این دکمه.
     پیش از این هر دکمه وضعیتِ خودش را جدا می‌پرسید — روی یک دورِ
     هشت‌سؤالی اندازه گرفته شد و هشت درخواستِ جدا بود. حالا صفحه یک بار
     کلِ دور را می‌گیرد (preloadBookmarks) و دکمه‌ها از همان می‌خوانند.

     اگر کسی این دکمه را جایی بگذارد که preload نشده، همان‌جا برای همان
     یک شناسه صدا زده می‌شود — پس دکمه هرجا کار می‌کند، فقط بهینه‌تر. */
  const known = useSyncExternalStore(
    subscribeBookmarks,
    () => (userId && refId ? bookmarkState(userId, area, refId) : undefined),
    () => undefined,
  );
  if (userId && refId && known === undefined) void preloadBookmarks(userId, area, [refId]);
  const on = known ?? false;

  if (!userId) return null;

  const click = async () => {
    if (busy) return;
    const next = !on;
    setBusy(true);
    setFailed(false);
    // optimistic: the flag should feel instant even on a slow connection
    const seq = setBookmarkOptimistic(userId, area, refId, next);
    try {
      await setBookmark(
        userId,
        { area, refId, title, subtitle, payload },
        next,
      );
      // ⚠️ seq را پس می‌دهیم تا اگر کاربر در این فاصله دوباره زده باشد،
      // این پاسخِ کهنه وضعیتِ تازه را برنگرداند.
      settleBookmark(userId, area, refId, seq, next);
    } catch (err) {
      // never fail quietly: a flag that flicks back with no explanation reads
      // as a bug in the page rather than as a write that did not land
      console.error("bookmark write failed:", err);
      settleBookmark(userId, area, refId, seq, !next);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={click}
      whileTap={{ scale: 0.9 }}
      aria-pressed={on}
      aria-label={on ? "برداشتنِ نشان" : "نشان‌کردنِ این سؤال"}
      title={
        failed
          ? "ذخیره نشد — دوباره بزن (جزئیات در کنسول)"
          : on
            ? "نشان برداشته شود"
            : "نشان‌کردن برای مرور بعدی"
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        failed
          ? "border-red-500 bg-red-500/10 text-red-500"
          : on
            ? "border-gold bg-gold/15 text-gold"
            : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-gold"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
        className="size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
        />
      </svg>
      {!compact && (failed ? "ذخیره نشد" : on ? "نشان‌شده" : "نشان‌کردن")}
    </motion.button>
  );
}
