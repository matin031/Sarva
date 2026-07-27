"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/lib/supabase";
import { isBookmarked, toggleBookmark } from "@/lib/panel/bookmarks-client";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (alive) setUserId(data.user?.id ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || !refId) return;
    let alive = true;
    isBookmarked(userId, area, refId).then((v) => {
      if (alive) setOn(v);
    });
    return () => {
      alive = false;
    };
  }, [userId, area, refId]);

  if (!userId) return null;

  const click = async () => {
    if (busy) return;
    setBusy(true);
    // optimistic: the flag should feel instant even on a slow connection
    setOn((v) => !v);
    try {
      const next = await toggleBookmark(userId, {
        area,
        refId,
        title,
        subtitle,
        payload,
      });
      setOn(next);
    } catch {
      setOn((v) => !v); // put it back
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
      title={on ? "نشان برداشته شود" : "نشان‌کردن برای مرور بعدی"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        on
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
      {!compact && (on ? "نشان‌شده" : "نشان‌کردن")}
    </motion.button>
  );
}
