"use client";

import "./game-nav.css";

import Link from "next/link";

/**
 * دکمهٔ «بازگشت به بازی‌ها» — یک شکل برای همهٔ بازی‌ها.
 *
 * با `href` پیوند است و با `onClick` دکمه (مثلاً وقتی پوسته اول می‌پرسد «خارج
 * می‌شوی؟»). `compact` فقط تراشهٔ پیکان را نشان می‌دهد؛ `dense` برچسب را فقط
 * روی صفحه‌های کم‌ارتفاع (گوشیِ افقی) جمع می‌کند.
 */
export function GameBackButton({
  href,
  onClick,
  label = "بازی‌ها",
  compact = false,
  dense = false,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const cls = `game-nav-btn game-nav-back ${compact ? "game-nav-icon" : ""} ${className}`;
  const body = (
    <>
      <span className="game-nav-chip" aria-hidden>
        <ArrowBackIcon />
      </span>
      {!compact && <span className="game-nav-label">{label}</span>}
    </>
  );
  const a11y = compact ? { "aria-label": `بازگشت به ${label}`, title: `بازگشت به ${label}` } : {};

  if (href && !onClick) {
    return (
      <Link href={href} className={cls} data-dense={dense || undefined} {...a11y}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} data-dense={dense || undefined} {...a11y}>
      {body}
    </button>
  );
}

/** کلاسِ دکمهٔ آیکونیِ هم‌خانواده (صدا، پاک کردن و …) برای نوارهای بازی. */
export const gameIconButton = "game-nav-btn game-nav-icon";

/** پیکانِ رو به راست: در راست‌به‌چپ، «عقب» سمتِ راست است. */
function ArrowBackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 5 20.5 12l-7 7M20 12H3.5" />
    </svg>
  );
}
