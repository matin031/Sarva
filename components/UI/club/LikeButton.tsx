"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleClubLike } from "@/lib/club/actions";
import { fa } from "@/components/UI/club/ClubBits";

/** «پسندیدم» — the only reaction in the club.
 *
 *  The count flips locally the moment it is pressed and is then replaced by
 *  whatever the database says, so two readers liking the same poem at the same
 *  moment cannot leave one of them looking at a stale number. A signed-out
 *  visitor gets the sign-in message from the action rather than a disabled
 *  button, because a disabled button never explains itself. */
export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
  onNeedsAuth,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  onNeedsAuth?: (message: string) => void;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const press = () => {
    const prev = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleClubLike(postId);
      if (!res.ok) {
        setLiked(prev.liked);
        setCount(prev.count);
        onNeedsAuth?.(res.error);
        return;
      }
      setLiked(res.data.liked);
      setCount(res.data.likeCount);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={press}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "برداشتن پسند" : "پسندیدن"}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        liked
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.7}
        className="size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
      {fa(count)}
    </button>
  );
}
