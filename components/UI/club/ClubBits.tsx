"use client";

import { STATUS_LABEL, type ClubStatus } from "@/lib/club/types";

/** Small pieces shared by the feed, the panel and the moderation queue. Kept
 *  together so «در انتظار بررسی» is the same yellow everywhere it appears. */

const STATUS_STYLE: Record<ClubStatus, string> = {
  pending: "bg-gold/15 text-gold border-gold/30",
  approved: "bg-primary/12 text-primary border-primary/30",
  rejected: "bg-destructive/12 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: ClubStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "gold";
}) {
  const tones = {
    muted: "border-border bg-muted/50 text-muted-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    gold: "border-gold/30 bg-gold/12 text-gold",
  } as const;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Persian-digit date, no time — «۱۴ مرداد ۱۴۰۴». */
export function ClubDate({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return (
    <time dateTime={iso} className="text-[11px] text-muted-foreground">
      {new Date(iso).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </time>
  );
}

export function fa(n: number) {
  return n.toLocaleString("fa-IR");
}

/** A round avatar built from the author's initial — no uploads, no gravatar,
 *  no third-party request, and still enough to tell two commenters apart. */
export function NameAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = (name || "؟").trim().charAt(0);
  // stable per name: the same person keeps the same colour down a thread.
  // Sized inline rather than with a `size-N` class — Tailwind cannot see a
  // class name assembled at runtime, so the utility would never be generated.
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      style={{
        width: size,
        height: size,
        backgroundColor: `oklch(0.85 0.06 ${hue})`,
        color: `oklch(0.32 0.09 ${hue})`,
      }}
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
      aria-hidden
    >
      {letter}
    </span>
  );
}
